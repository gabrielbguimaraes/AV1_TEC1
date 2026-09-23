import { Lote } from "../dominio/Lote.js";
import { Sessao } from "../dominio/Sessao.js";
import { StatusLote } from "../enums/StatusLote.js";
import { PapelUsuario } from "../enums/PapelUsuario.js";
import { RepositorioArquivo } from "../seguranca/RepositorioArquivo.js";
import { ValidadorDataEntrada } from "../validadores/ValidadorDataEntrada.js";
import { ServicoOrganizacao } from "./ServicoOrganizacao.js";

export class ServicoLote {
  private repoLote: RepositorioArquivo<Lote>;
  private servicoOrg: ServicoOrganizacao;
  private validadorData: ValidadorDataEntrada;

  constructor(repoLote: RepositorioArquivo<Lote>, servicoOrg: ServicoOrganizacao) {
    this.repoLote = repoLote;
    this.servicoOrg = servicoOrg;
    this.validadorData = new ValidadorDataEntrada();
  }

  private validarPermissao(sessao: Sessao): void {
    const papel = sessao.getPapel();
    if (papel !== PapelUsuario.ADMINISTRADOR && papel !== PapelUsuario.GESTOR_ALMOXARIFADO) {
      throw new Error("Acesso negado: Perfil sem permissão para gerenciar lotes.");
    }
  }

  public criarLote(
    sessao: Sessao,
    codigoRastreio: string,
    organizacaoId: string,
    contratoId: string,
    notaFiscal: string,
    transportadora: string,
    dataEntrada: Date
  ): Lote {
    this.validarPermissao(sessao);

    const org = this.servicoOrg.buscarPorId(organizacaoId);
    if (!org) {
      throw new Error(`Organização geradora '${organizacaoId}' não encontrada.`);
    }

    const validacaoData = this.validadorData.validar(dataEntrada);
    if (!validacaoData.valido) {
      throw new Error(`Data de Entrada Rejeitada: ${validacaoData.motivo}`);
    }

    const novoLote = new Lote(
      `lot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      codigoRastreio,
      organizacaoId,
      contratoId,
      notaFiscal,
      transportadora,
      dataEntrada,
      StatusLote.RECEBIDO
    );

    this.repoLote.salvar(novoLote, sessao.getUsuarioId());
    return novoLote;
  }

  public atualizarStatus(sessao: Sessao, loteId: string, novoStatus: StatusLote): Lote {
    this.validarPermissao(sessao);

    const lote = this.repoLote.buscarPorId(loteId);
    if (!lote) {
      throw new Error(`Lote '${loteId}' não encontrado.`);
    }

    lote.setStatus(novoStatus);
    this.repoLote.salvar(lote, sessao.getUsuarioId());
    return lote;
  }

  public buscarPorId(id: string): Lote | undefined {
    return this.repoLote.buscarPorId(id);
  }

  public listar(): Lote[] {
    return this.repoLote.carregarTodos();
  }

  public salvarLote(lote: Lote, usuarioId: string): void {
    this.repoLote.salvar(lote, usuarioId);
  }
}