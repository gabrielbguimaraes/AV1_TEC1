export interface ResultadoValidacao {
  valido: boolean;
  motivo?: string;
}

export abstract class Validador<T> {
  public abstract validar(dado: T): ResultadoValidacao;
}