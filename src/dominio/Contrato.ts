export class Contrato {
  private id: string;
  private numeroContrato: string;
  private organizacaoId: string;
  private dataInicio: Date;
  private dataTermino: Date;
  private aliquotaImposto: number;
  private ativo: boolean;

  constructor(
    id: string,
    numeroContrato: string,
    organizacaoId: string,
    dataInicio: Date,
    dataTermino: Date,
    aliquotaImposto: number,
    ativo: boolean = true
  ) {
    this.id = id;
    this.numeroContrato = numeroContrato;
    this.organizacaoId = organizacaoId;
    this.dataInicio = dataInicio;
    this.dataTermino = dataTermino;
    this.aliquotaImposto = aliquotaImposto;
    this.ativo = ativo;
  }

  public getId(): string {
    return this.id;
  }

  public getNumeroContrato(): string {
    return this.numeroContrato;
  }

  public getOrganizacaoId(): string {
    return this.organizacaoId;
  }

  public getAliquotaImposto(): number {
    return this.aliquotaImposto;
  }

  public isVigente(): boolean {
    const agora = new Date();
    return this.ativo && agora >= this.dataInicio && agora <= this.dataTermino;
  }

  public toJSON(): object {
    return {
      id: this.id,
      numeroContrato: this.numeroContrato,
      organizacaoId: this.organizacaoId,
      dataInicio: this.dataInicio.toISOString(),
      dataTermino: this.dataTermino.toISOString(),
      aliquotaImposto: this.aliquotaImposto,
      ativo: this.ativo,
    };
  }

  public static fromJSON(dados: any): Contrato {
    return new Contrato(
      dados.id,
      dados.numeroContrato,
      dados.organizacaoId,
      new Date(dados.dataInicio),
      new Date(dados.dataTermino),
      dados.aliquotaImposto,
      dados.ativo
    );
  }
}