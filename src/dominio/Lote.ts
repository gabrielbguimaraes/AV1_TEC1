import { StatusLote } from "../enums/StatusLote.js";
import { Equipamento } from "./Equipamento.js";

export class Lote {
  private id: string;
  private codigoRastreio: string;
  private organizacaoId: string;
  private contratoId: string;
  private notaFiscal: string;
  private transportadora: string;
  private dataEntrada: Date;
  private status: StatusLote;
  private equipamentos: Equipamento[];

  constructor(
    id: string,
    codigoRastreio: string,
    organizacaoId: string,
    contratoId: string,
    notaFiscal: string,
    transportadora: string,
    dataEntrada: Date,
    status: StatusLote = StatusLote.RECEBIDO,
    equipamentos: Equipamento[] = []
  ) {
    this.id = id;
    this.codigoRastreio = codigoRastreio;
    this.organizacaoId = organizacaoId;
    this.contratoId = contratoId;
    this.notaFiscal = notaFiscal;
    this.transportadora = transportadora;
    this.dataEntrada = dataEntrada;
    this.status = status;
    this.equipamentos = equipamentos;
  }

  public getId(): string {
    return this.id;
  }

  public getCodigoRastreio(): string {
    return this.codigoRastreio;
  }

  public getOrganizacaoId(): string {
    return this.organizacaoId;
  }

  public getDataEntrada(): Date {
    return this.dataEntrada;
  }

  public getStatus(): StatusLote {
    return this.status;
  }

  public setStatus(status: StatusLote): void {
    this.status = status;
  }

  public getEquipamentos(): Equipamento[] {
    return [...this.equipamentos];
  }

  public adicionarEquipamento(equipamento: Equipamento): void {
    if (this.status === StatusLote.FINALIZADO) {
      throw new Error("Não é possível adicionar equipamentos a um lote já finalizado.");
    }
    this.equipamentos.push(equipamento);
  }

  public calcularPesoTotal(): number {
    return this.equipamentos.reduce((total, eq) => total + eq.getPesoKg(), 0);
  }

  public toJSON(): object {
    return {
      id: this.id,
      codigoRastreio: this.codigoRastreio,
      organizacaoId: this.organizacaoId,
      contratoId: this.contratoId,
      notaFiscal: this.notaFiscal,
      transportadora: this.transportadora,
      dataEntrada: this.dataEntrada.toISOString(),
      status: this.status,
      equipamentos: this.equipamentos.map((e) => e.toJSON()),
    };
  }

  public static fromJSON(dados: any): Lote {
    const equipamentos = Array.isArray(dados.equipamentos)
      ? dados.equipamentos.map((e: any) => Equipamento.fromJSON(e))
      : [];

    return new Lote(
      dados.id,
      dados.codigoRastreio,
      dados.organizacaoId,
      dados.contratoId,
      dados.notaFiscal,
      dados.transportadora,
      new Date(dados.dataEntrada),
      dados.status as StatusLote,
      equipamentos
    );
  }
}