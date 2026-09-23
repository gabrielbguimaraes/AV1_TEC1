import fs from "node:fs";
import path from "node:path";
import { CriptografiaArquivo } from "./CriptografiaArquivo.js";
import { JournalTransacao } from "./JournalTransacao.js";

export class RepositorioArquivo<T extends { getId(): string; toJSON(): any }> {
  private caminhoArquivo: string;
  private cripto: CriptografiaArquivo;
  private journal: JournalTransacao;
  private nomeEntidade: string;
  private conversor: (json: any) => T;

  constructor(
    nomeArquivo: string,
    cripto: CriptografiaArquivo,
    journal: JournalTransacao,
    nomeEntidade: string,
    conversor: (json: any) => T,
    diretorioBase: string = "dados"
  ) {
    this.nomeEntidade = nomeEntidade;
    this.cripto = cripto;
    this.journal = journal;
    this.conversor = conversor;

    if (!fs.existsSync(diretorioBase)) {
      fs.mkdirSync(diretorioBase, { recursive: true });
    }
    this.caminhoArquivo = path.join(diretorioBase, nomeArquivo);
  }

  public carregarTodos(): T[] {
    if (!fs.existsSync(this.caminhoArquivo)) {
      return [];
    }

    try {
      const conteudoCifrado = fs.readFileSync(this.caminhoArquivo, "utf8");
      if (!conteudoCifrado || conteudoCifrado.trim().length === 0) {
        return [];
      }
      const jsonDecriptado = this.cripto.decriptar(conteudoCifrado);
      const listaDados = JSON.parse(jsonDecriptado);
      if (!Array.isArray(listaDados)) {
        return [];
      }
      return listaDados.map((item: any) => this.conversor(item));
    } catch (erro) {
      throw new Error(`Falha ao decifrar e carregar repositório de ${this.nomeEntidade}: ${(erro as Error).message}`);
    }
  }

  public buscarPorId(id: string): T | undefined {
    const itens = this.carregarTodos();
    return itens.find((item) => item.getId() === id);
  }

  public salvar(item: T, usuarioId: string = "SISTEMA"): void {
    const itens = this.carregarTodos();
    const indice = itens.findIndex((i) => i.getId() === item.getId());
    const operacao = indice >= 0 ? "ATUALIZACAO" : "INSERCAO";
    const estadoAnterior = indice >= 0 ? itens[indice].toJSON() : null;

    if (indice >= 0) {
      itens[indice] = item;
    } else {
      itens.push(item);
    }

    this.gravarEmDisco(itens);

    this.journal.registrar(
      operacao,
      this.nomeEntidade,
      item.getId(),
      usuarioId,
      { anterior: estadoAnterior, novo: item.toJSON() }
    );
  }

  public remover(id: string, usuarioId: string = "SISTEMA"): boolean {
    const itens = this.carregarTodos();
    const indice = itens.findIndex((i) => i.getId() === id);
    if (indice === -1) {
      return false;
    }

    const itemRemovido = itens[indice];
    itens.splice(indice, 1);

    this.gravarEmDisco(itens);

    this.journal.registrar(
      "REMOCAO",
      this.nomeEntidade,
      id,
      usuarioId,
      { removido: itemRemovido.toJSON() }
    );

    return true;
  }

  private gravarEmDisco(itens: T[]): void {
    const jsonTexto = JSON.stringify(itens.map((i) => i.toJSON()), null, 2);
    const conteudoCifrado = this.cripto.encriptar(jsonTexto);
    const arquivoTemp = `${this.caminhoArquivo}.tmp`;

    fs.writeFileSync(arquivoTemp, conteudoCifrado, { encoding: "utf8" });
    fs.renameSync(arquivoTemp, this.caminhoArquivo);
  }
}