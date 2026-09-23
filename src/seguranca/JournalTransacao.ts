import fs from "node:fs";
import path from "node:path";

export interface EntradaJournal {
  idTransacao: string;
  dataHora: string;
  operacao: "INSERCAO" | "ATUALIZACAO" | "REMOCAO" | "PROVISIONAMENTO" | "LOGIN";
  entidade: string;
  identificador: string;
  usuarioId: string;
  detalhes: any;
}

export class JournalTransacao {
  private diretorioJournal: string;
  private arquivoAtual: string;
  private readonly LIMITE_ROTACAO_BYTES = 10 * 1024 * 1024; // 10 MB
  private readonly DIAS_RETENCAO = 180;

  constructor(diretorioJournal: string = "dados/journal") {
    this.diretorioJournal = diretorioJournal;
    this.arquivoAtual = path.join(this.diretorioJournal, "transacoes.log");

    if (!fs.existsSync(this.diretorioJournal)) {
      fs.mkdirSync(this.diretorioJournal, { recursive: true });
    }
    this.aplicarPoliticaRetencao();
  }

  public registrar(
    operacao: "INSERCAO" | "ATUALIZACAO" | "REMOCAO" | "PROVISIONAMENTO" | "LOGIN",
    entidade: string,
    identificador: string,
    usuarioId: string,
    detalhes: any
  ): void {
    this.verificarRotacao();

    const entrada: EntradaJournal = {
      idTransacao: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      dataHora: new Date().toISOString(),
      operacao,
      entidade,
      identificador,
      usuarioId,
      detalhes,
    };

    const linha = JSON.stringify(entrada) + "\n";
    fs.appendFileSync(this.arquivoAtual, linha, { encoding: "utf8" });
  }

  private verificarRotacao(): void {
    if (!fs.existsSync(this.arquivoAtual)) {
      return;
    }

    const estatisticas = fs.statSync(this.arquivoAtual);
    if (estatisticas.size >= this.LIMITE_ROTACAO_BYTES) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const arquivoRotacionado = path.join(this.diretorioJournal, `transacoes_${timestamp}.log`);
      fs.renameSync(this.arquivoAtual, arquivoRotacionado);
    }
  }

  public aplicarPoliticaRetencao(): void {
    if (!fs.existsSync(this.diretorioJournal)) {
      return;
    }

    const limiteData = Date.now() - this.DIAS_RETENCAO * 24 * 60 * 60 * 1000;
    const arquivos = fs.readdirSync(this.diretorioJournal);

    for (const arquivo of arquivos) {
      if (arquivo === "transacoes.log") {
        continue;
      }
      const caminhoCompleto = path.join(this.diretorioJournal, arquivo);
      const stats = fs.statSync(caminhoCompleto);
      if (stats.mtimeMs < limiteData) {
        fs.unlinkSync(caminhoCompleto);
      }
    }
  }

  public listarHistorico(): EntradaJournal[] {
    if (!fs.existsSync(this.arquivoAtual)) {
      return [];
    }

    const conteudo = fs.readFileSync(this.arquivoAtual, "utf8");
    const linhas = conteudo.trim().split("\n").filter((l) => l.length > 0);
    return linhas.map((linha) => JSON.parse(linha));
  }
}