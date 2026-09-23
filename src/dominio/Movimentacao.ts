import { StatusRastreamento } from "../enums/StatusRastreamento.js";
import { EstadoFisico } from "../enums/EstadoFisico.js";

export class Movimentacao {
  private id: string;
  private equipamentoId: string;
  private dataHora: Date;
  private statusAnterior: StatusRastreamento;
  private statusNovo: StatusRastreamento;
  private estadoFisicoAnterior: EstadoFisico;
  private estadoFisicoNovo: EstadoFisico;
  private operadorId: string;
  private justificativa?: string;

  constructor(
    id: string,
    equipamentoId: string,
    statusAnterior: StatusRastreamento,
    statusNovo: StatusRastreamento,
    estadoFisicoAnterior: EstadoFisico,
    estadoFisicoNovo: EstadoFisico,
    operadorId: string,
    justificativa?: string,
    dataHora: Date = new Date()
  ) {
    this.id = id;
    this.equipamentoId = equipamentoId;
    this.statusAnterior = statusAnterior;
    this.statusNovo = statusNovo;
    this.estadoFisicoAnterior = estadoFisicoAnterior;
    this.estadoFisicoNovo = estadoFisicoNovo;
    this.operadorId = operadorId;
    this.justificativa = justificativa;
    this.dataHora = dataHora;
  }

  public getId(): string {
    return this.id;
  }

  public getEquipamentoId(): string {
    return this.equipamentoId;
  }

  public getDataHora(): Date {
    return this.dataHora;
  }

  public getStatusAnterior(): StatusRastreamento {
    return this.statusAnterior;
  }

  public getStatusNovo(): StatusRastreamento {
    return this.statusNovo;
  }

  public getEstadoFisicoAnterior(): EstadoFisico {
    return this.estadoFisicoAnterior;
  }

  public getEstadoFisicoNovo(): EstadoFisico {
    return this.estadoFisicoNovo;
  }

  public getOperadorId(): string {
    return this.operadorId;
  }

  public getJustificativa(): string | undefined {
    return this.justificativa;
  }

  public toJSON(): object {
    return {
      id: this.id,
      equipamentoId: this.equipamentoId,
      dataHora: this.dataHora.toISOString(),
      statusAnterior: this.statusAnterior,
      statusNovo: this.statusNovo,
      estadoFisicoAnterior: this.estadoFisicoAnterior,
      estadoFisicoNovo: this.estadoFisicoNovo,
      operadorId: this.operadorId,
      justificativa: this.justificativa || null,
    };
  }

  public static fromJSON(dados: any): Movimentacao {
    return new Movimentacao(
      dados.id,
      dados.equipamentoId,
      dados.statusAnterior as StatusRastreamento,
      dados.statusNovo as StatusRastreamento,
      dados.estadoFisicoAnterior as EstadoFisico,
      dados.estadoFisicoNovo as EstadoFisico,
      dados.operadorId,
      dados.justificativa || undefined,
      new Date(dados.dataHora)
    );
  }
}