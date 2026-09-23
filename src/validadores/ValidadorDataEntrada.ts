import { Validador, ResultadoValidacao } from "./Validador.js";

export class ValidadorDataEntrada extends Validador<Date> {
  private static readonly NOVENTA_DIAS_MS = 90 * 24 * 60 * 60 * 1000;

  public validar(data: Date): ResultadoValidacao {
    if (!data || isNaN(data.getTime())) {
      return { valido: false, motivo: "Data de entrada inválida." };
    }

    const agora = new Date();

    if (data.getTime() > agora.getTime() + 60000) {
      return { valido: false, motivo: "A data de entrada do lote não pode ser futura." };
    }

    const limitePassado = agora.getTime() - ValidadorDataEntrada.NOVENTA_DIAS_MS;
    if (data.getTime() < limitePassado) {
      return {
        valido: false,
        motivo: "A data de entrada do lote não pode ser anterior a mais de noventa dias.",
      };
    }

    return { valido: true };
  }
}