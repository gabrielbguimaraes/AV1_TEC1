import { PapelUsuario } from "../enums/PapelUsuario.js";

export class Sessao {
  private token: string;
  private usuarioId: string;
  private usuarioNome: string;
  private papel: PapelUsuario;
  private momentoCriacao: Date;
  private ultimoAcesso: Date;
  private ativa: boolean;

  constructor(
    token: string,
    usuarioId: string,
    usuarioNome: string,
    papel: PapelUsuario,
    momentoCriacao: Date = new Date(),
    ultimoAcesso: Date = new Date(),
    ativa: boolean = true
  ) {
    this.token = token;
    this.usuarioId = usuarioId;
    this.usuarioNome = usuarioNome;
    this.papel = papel;
    this.momentoCriacao = momentoCriacao;
    this.ultimoAcesso = ultimoAcesso;
    this.ativa = ativa;
  }

  public getToken(): string {
    return this.token;
  }

  public getUsuarioId(): string {
    return this.usuarioId;
  }

  public getUsuarioNome(): string {
    return this.usuarioNome;
  }

  public getPapel(): PapelUsuario {
    return this.papel;
  }

  public getMomentoCriacao(): Date {
    return this.momentoCriacao;
  }

  public getUltimoAcesso(): Date {
    return this.ultimoAcesso;
  }

  public isAtiva(): boolean {
    return this.ativa;
  }

  public renovarAtividade(): void {
    if (!this.ativa) {
      throw new Error("Não é possível renovar uma sessão encerrada.");
    }
    this.ultimoAcesso = new Date();
  }

  public estaExpirada(limiteMinutosInatividade: number = 30): boolean {
    if (!this.ativa) {
      return true;
    }
    const diferencaMilissegundos = Date.now() - this.ultimoAcesso.getTime();
    const minutosInativo = diferencaMilissegundos / (1000 * 60);
    return minutosInativo > limiteMinutosInatividade;
  }

  public encerrar(): void {
    this.ativa = false;
  }
}