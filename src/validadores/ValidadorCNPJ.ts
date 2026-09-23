import { Validador, ResultadoValidacao } from "./Validador.js";

export class ValidadorCNPJ extends Validador<string> {
  public validar(cnpjBruto: string): ResultadoValidacao {
    if (!cnpjBruto) {
      return { valido: false, motivo: "CNPJ não informado." };
    }

    const cnpj = cnpjBruto.replace(/\D/g, "");

    if (cnpj.length !== 14) {
      return { valido: false, motivo: "CNPJ deve conter exatamente 14 dígitos numéricos." };
    }

    if (/^(\d)\1+$/.test(cnpj)) {
      return { valido: false, motivo: "CNPJ composto por sequência repetida inválida." };
    }

    let tamanho = 12;
    let numeros = cnpj.substring(0, tamanho);
    const digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += Number(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) {
        pos = 9;
      }
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== Number(digitos.charAt(0))) {
      return { valido: false, motivo: "Primeiro dígito verificador do CNPJ inválido." };
    }

    tamanho = 13;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += Number(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) {
        pos = 9;
      }
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== Number(digitos.charAt(1))) {
      return { valido: false, motivo: "Segundo dígito verificador do CNPJ inválido." };
    }

    return { valido: true };
  }
}