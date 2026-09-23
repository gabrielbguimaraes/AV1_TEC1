import crypto from "node:crypto";

export class CriptografiaArquivo {
  private chaveMestra: Buffer;

  constructor(chaveMestraHex: string) {
    if (!chaveMestraHex || chaveMestraHex.length !== 64) {
      throw new Error("A chave mestra AES-256 deve ser uma string hexadecimal de 64 caracteres (32 bytes).");
    }
    this.chaveMestra = Buffer.from(chaveMestraHex, "hex");
  }

  public encriptar(textoPlano: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", this.chaveMestra, iv);
    let encriptado = cipher.update(textoPlano, "utf8", "hex");
    encriptado += cipher.final("hex");
    return `${iv.toString("hex")}:${encriptado}`;
  }

  public decriptar(textoCifrado: string): string {
    const partes = textoCifrado.split(":");
    if (partes.length !== 2) {
      throw new Error("Formato de conteúdo cifrado inválido.");
    }
    const iv = Buffer.from(partes[0], "hex");
    const conteudo = partes[1];
    const decipher = crypto.createDecipheriv("aes-256-cbc", this.chaveMestra, iv);
    let decriptado = decipher.update(conteudo, "hex", "utf8");
    decriptado += decipher.final("utf8");
    return decriptado;
  }

  public static gerarChaveMestra(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  public static gerarSalt(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  public static hashSenha(senha: string, salt: string): string {
    return crypto.createHash("sha256").update(`${senha}:${salt}`).digest("hex");
  }
}