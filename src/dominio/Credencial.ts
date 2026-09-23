import { PapelUsuario } from "../enums/PapelUsuario.js";

export class Credencial {
  private id: string;
  private usuario: string;
  private senhaHash: string;
  private salt: string;
  private papel: PapelUsuario;
  private ativo: boolean;
  private dataCriacao: Date;
  private ultimoAcesso?: Date;

  constructor(
    id: string,
    usuario: string,
    senhaHash: string,
    salt: string,
    papel: PapelUsuario,
    ativo: boolean = true,
    dataCriacao: Date = new Date(),
    ultimoAcesso?: Date
  ) {
    this.id = id;
    this.usuario = usuario.trim().toLowerCase();
    this.senhaHash = senhaHash;
    this.salt = salt;
    this.papel = papel;
    this.ativo = ativo;
    this.dataCriacao = dataCriacao;
    this.ultimoAcesso = ultimoAcesso;
  }

  public getId(): string {
    return this.id;
  }

  public getUsuario(): string {
    return this.usuario;
  }

  public getSenhaHash(): string {
    return this.senhaHash;
  }

  public getSalt(): string {
    return this.salt;
  }

  public getPapel(): PapelUsuario {
    return this.papel;
  }

  public isAtivo(): boolean {
    return this.ativo;
  }

  public setAtivo(ativo: boolean): void {
    this.ativo = ativo;
  }

  public getDataCriacao(): Date {
    return this.dataCriacao;
  }

  public getUltimoAcesso(): Date | undefined {
    return this.ultimoAcesso;
  }

  public registrarAcesso(): void {
    this.ultimoAcesso = new Date();
  }

  public validarSenha(hashComparacao: string): boolean {
    if (!this.ativo) {
      return false;
    }
    return this.senhaHash === hashComparacao;
  }

  public toJSON(): object {
    return {
      id: this.id,
      usuario: this.usuario,
      senhaHash: this.senhaHash,
      salt: this.salt,
      papel: this.papel,
      ativo: this.ativo,
      dataCriacao: this.dataCriacao.toISOString(),
      ultimoAcesso: this.ultimoAcesso ? this.ultimoAcesso.toISOString() : null,
    };
  }

  public static fromJSON(dados: any): Credencial {
    return new Credencial(
      dados.id,
      dados.usuario,
      dados.senhaHash,
      dados.salt,
      dados.papel as PapelUsuario,
      dados.ativo,
      new Date(dados.dataCriacao),
      dados.ultimoAcesso ? new Date(dados.ultimoAcesso) : undefined
    );
  }
}