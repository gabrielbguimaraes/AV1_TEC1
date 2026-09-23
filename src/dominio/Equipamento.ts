import { TipoEquipamento } from "../enums/TipoEquipamento.js";
import { EstadoFisico } from "../enums/EstadoFisico.js";
import { StatusRastreamento } from "../enums/StatusRastreamento.js";
import { Movimentacao } from "./Movimentacao.js";

export class Equipamento {
  private id: string;
  private codigoInterno: string;
  private loteId: string;
  private tipo: TipoEquipamento;
  private modelo: string;
  private numeroSerie: string;
  private pesoKg: number;
  private valorAquisicao: number;
  private estadoFisico: EstadoFisico;
  private statusRastreamento: StatusRastreamento;
  private movimentacoes: Movimentacao[];

  private static readonly HIERARQUIA_ESTADO: EstadoFisico[] = [
    EstadoFisico.NOVO,
    EstadoFisico.BOM_ESTADO,
    EstadoFisico.USADO_LEVE,
    EstadoFisico.USADO_MODERADO,
    EstadoFisico.DANIFICADO_LEVE,
    EstadoFisico.DANIFICADO_GRAVE,
    EstadoFisico.INSERVIVEL,
  ];

  constructor(
    id: string,
    codigoInterno: string,
    loteId: string,
    tipo: TipoEquipamento,
    modelo: string,
    numeroSerie: string,
    pesoKg: number,
    valorAquisicao: number,
    estadoFisico: EstadoFisico,
    statusRastreamento: StatusRastreamento = StatusRastreamento.AGUARDANDO_TRIAGEM,
    movimentacoes: Movimentacao[] = []
  ) {
    this.id = id;
    this.codigoInterno = codigoInterno;
    this.loteId = loteId;
    this.tipo = tipo;
    this.modelo = modelo;
    this.numeroSerie = numeroSerie;
    this.pesoKg = pesoKg;
    this.valorAquisicao = valorAquisicao;
    this.estadoFisico = estadoFisico;
    this.statusRastreamento = statusRastreamento;
    this.movimentacoes = movimentacoes;
  }

  public getId(): string {
    return this.id;
  }

  public getCodigoInterno(): string {
    return this.codigoInterno;
  }

  public getLoteId(): string {
    return this.loteId;
  }

  public getPesoKg(): number {
    return this.pesoKg;
  }

  public getTipo(): TipoEquipamento {
    return this.tipo;
  }

  public getEstadoFisico(): EstadoFisico {
    return this.estadoFisico;
  }

  public getStatusRastreamento(): StatusRastreamento {
    return this.statusRastreamento;
  }

  public getMovimentacoes(): Movimentacao[] {
    return [...this.movimentacoes];
  }

  public calcularValorResidual(coeficienteDepreciacao: number, mesesUso: number): number {
    const depreciacaoTotal = this.valorAquisicao * (coeficienteDepreciacao / 100) * (mesesUso / 12);
    const residual = this.valorAquisicao - depreciacaoTotal;
    return Math.max(residual, this.valorAquisicao * 0.05);
  }

  public registrarTransicao(
    novoStatus: StatusRastreamento,
    novoEstado: EstadoFisico,
    operadorId: string,
    justificativa?: string
  ): Movimentacao {
    if (
      novoStatus === StatusRastreamento.AGUARDANDO_DESMONTE ||
      novoStatus === StatusRastreamento.EM_DESMONTE
    ) {
      if (
        this.statusRastreamento !== StatusRastreamento.EM_TRIAGEM &&
        this.statusRastreamento !== StatusRastreamento.AGUARDANDO_DESMONTE
      ) {
        throw new Error(
          "Violação de Regra: O equipamento só pode ser encaminhado para desmonte após passar por triagem."
        );
      }
    }

    const indiceAtual = Equipamento.HIERARQUIA_ESTADO.indexOf(this.estadoFisico);
    const indiceNovo = Equipamento.HIERARQUIA_ESTADO.indexOf(novoEstado);
    const diferencaDegradacao = indiceNovo - indiceAtual;

    if (diferencaDegradacao >= 2 && (!justificativa || justificativa.trim().length === 0)) {
      throw new Error(
        "Violação de Regra: Degradação de estado físico em 2 ou mais categorias exige justificativa textual obrigatória."
      );
    }

    const movimentacao = new Movimentacao(
      `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      this.id,
      this.statusRastreamento,
      novoStatus,
      this.estadoFisico,
      novoEstado,
      operadorId,
      justificativa
    );

    this.statusRastreamento = novoStatus;
    this.estadoFisico = novoEstado;
    this.movimentacoes.push(movimentacao);

    return movimentacao;
  }

  public toJSON(): object {
    return {
      id: this.id,
      codigoInterno: this.codigoInterno,
      loteId: this.loteId,
      tipo: this.tipo,
      modelo: this.modelo,
      numeroSerie: this.numeroSerie,
      pesoKg: this.pesoKg,
      valorAquisicao: this.valorAquisicao,
      estadoFisico: this.estadoFisico,
      statusRastreamento: this.statusRastreamento,
      movimentacoes: this.movimentacoes.map((m) => m.toJSON()),
    };
  }

  public static fromJSON(dados: any): Equipamento {
    const movimentacoes = Array.isArray(dados.movimentacoes)
      ? dados.movimentacoes.map((m: any) => Movimentacao.fromJSON(m))
      : [];

    return new Equipamento(
      dados.id,
      dados.codigoInterno,
      dados.loteId,
      dados.tipo as TipoEquipamento,
      dados.modelo,
      dados.numeroSerie,
      dados.pesoKg,
      dados.valorAquisicao,
      dados.estadoFisico as EstadoFisico,
      dados.statusRastreamento as StatusRastreamento,
      movimentacoes
    );
  }
}