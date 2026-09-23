import { Equipamento } from "../dominio/Equipamento.js";
import { Movimentacao } from "../dominio/Movimentacao.js";
import { Sessao } from "../dominio/Sessao.js";
import { TipoEquipamento } from "../enums/TipoEquipamento.js";
import { EstadoFisico } from "../enums/EstadoFisico.js";
import { StatusRastreamento } from "../enums/StatusRastreamento.js";
import { PapelUsuario } from "../enums/PapelUsuario.js";
import { RepositorioArquivo } from "../seguranca/RepositorioArquivo.js";
import { ServicoLote } from "./ServicoLote.js";

export class ServicoEquipamento {
  private repoEquipamento: RepositorioArquivo<Equipamento>;
  private servicoLote: ServicoLote;

  constructor(repoEquipamento: RepositorioArquivo<Equipamento>, servicoLote: ServicoLote) {
    this.repoEquipamento = repoEquipamento;
    this.servicoLote = servicoLote;
  }

  private validarPermissao(sessao: Sessao): void {
    const papel = sessao.getPapel();
    if (papel !== PapelUsuario.ADMINISTRADOR && papel !== PapelUsuario.GESTOR_ALMOXARIFADO) {
      throw new Error("Acesso negado: Perfil sem permissão para movimentar equipamentos.");
    }
  }

  public triarNovoEquipamento(
    sessao: Sessao,
    loteId: string,
    tipo: TipoEquipamento,
    modelo: string,
    numeroSerie: string,
    pesoKg: number,
    valorAquisicao: number,
    estadoFisico: EstadoFisico
  ): Equipamento {
    this.validarPermissao(sessao);

    const lote = this.servicoLote.buscarPorId(loteId);
    if (!lote) {
      throw new Error(`Lote associado '${loteId}' não encontrado.`);
    }

    const codigoInterno = `GC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const equipamento = new Equipamento(
      `eq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      codigoInterno,
      loteId,
      tipo,
      modelo,
      numeroSerie,
      pesoKg,
      valorAquisicao,
      estadoFisico,
      StatusRastreamento.EM_TRIAGEM
    );

    lote.adicionarEquipamento(equipamento);
    this.servicoLote.salvarLote(lote, sessao.getUsuarioId());
    this.repoEquipamento.salvar(equipamento, sessao.getUsuarioId());

    return equipamento;
  }

  public registrarMovimentacao(
    sessao: Sessao,
    equipamentoId: string,
    novoStatus: StatusRastreamento,
    novoEstado: EstadoFisico,
    justificativa?: string
  ): Movimentacao {
    this.validarPermissao(sessao);

    const equipamento = this.repoEquipamento.buscarPorId(equipamentoId);
    if (!equipamento) {
      throw new Error(`Equipamento '${equipamentoId}' não encontrado.`);
    }

    const movimentacao = equipamento.registrarTransicao(
      novoStatus,
      novoEstado,
      sessao.getUsuarioId(),
      justificativa
    );

    this.repoEquipamento.salvar(equipamento, sessao.getUsuarioId());
    return movimentacao;
  }

  public buscarPorId(id: string): Equipamento | undefined {
    return this.repoEquipamento.buscarPorId(id);
  }

  public buscarPorCodigoInterno(codigo: string): Equipamento | undefined {
    const todos = this.repoEquipamento.carregarTodos();
    return todos.find((e) => e.getCodigoInterno() === codigo);
  }

  public listar(): Equipamento[] {
    return this.repoEquipamento.carregarTodos();
  }
}