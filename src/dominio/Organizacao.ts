export class Organizacao {
  private id: string;
  private razaoSocial: string;
  private cnpj: string;
  private emailContato: string;
  private telefone: string;
  private cidade: string;
  private estado: string;
  private dataCadastro: Date;
  private ativo: boolean;

  constructor(
    id: string,
    razaoSocial: string,
    cnpj: string,
    emailContato: string,
    telefone: string,
    cidade: string,
    estado: string,
    dataCadastro: Date = new Date(),
    ativo: boolean = true
  ) {
    this.id = id;
    this.razaoSocial = razaoSocial;
    this.cnpj = cnpj;
    this.emailContato = emailContato;
    this.telefone = telefone;
    this.cidade = cidade;
    this.estado = estado;
    this.dataCadastro = dataCadastro;
    this.ativo = ativo;
  }

  public getId(): string {
    return this.id;
  }

  public getRazaoSocial(): string {
    return this.razaoSocial;
  }

  public getCnpj(): string {
    return this.cnpj;
  }

  public isAtivo(): boolean {
    return this.ativo;
  }

  public setAtivo(ativo: boolean): void {
    this.ativo = ativo;
  }

  public toJSON(): object {
    return {
      id: this.id,
      razaoSocial: this.razaoSocial,
      cnpj: this.cnpj,
      emailContato: this.emailContato,
      telefone: this.telefone,
      cidade: this.cidade,
      estado: this.estado,
      dataCadastro: this.dataCadastro.toISOString(),
      ativo: this.ativo,
    };
  }

  public static fromJSON(dados: any): Organizacao {
    return new Organizacao(
      dados.id,
      dados.razaoSocial,
      dados.cnpj,
      dados.emailContato,
      dados.telefone,
      dados.cidade,
      dados.estado,
      new Date(dados.dataCadastro),
      dados.ativo
    );
  }
}