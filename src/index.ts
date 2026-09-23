import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { CriptografiaArquivo } from "./seguranca/CriptografiaArquivo.js";
import { JournalTransacao } from "./seguranca/JournalTransacao.js";
import { RepositorioArquivo } from "./seguranca/RepositorioArquivo.js";
import { Credencial } from "./dominio/Credencial.js";
import { Organizacao } from "./dominio/Organizacao.js";
import { Lote } from "./dominio/Lote.js";
import { Equipamento } from "./dominio/Equipamento.js";
import { ServicoAutenticacao } from "./servicos/ServicoAutenticacao.js";
import { ServicoOrganizacao } from "./servicos/ServicoOrganizacao.js";
import { ServicoLote } from "./servicos/ServicoLote.js";
import { ServicoEquipamento } from "./servicos/ServicoEquipamento.js";
import { ServicoRelatorio } from "./servicos/ServicoRelatorio.js";
import { CLIInterface } from "./cli/CLIInterface.js";

async function main(): Promise<void> {
  const DIRETORIO_DADOS = "dados";
  const ARQUIVO_CHAVE_MESTRA = path.join(DIRETORIO_DADOS, "master.key");

  if (!fs.existsSync(DIRETORIO_DADOS)) {
    fs.mkdirSync(DIRETORIO_DADOS, { recursive: true });
  }

  let chaveMestra: string;

  if (!fs.existsSync(ARQUIVO_CHAVE_MESTRA)) {
    console.log("\n[PROVISIONAMENTO] Chave mestra não detectada.");
    console.log("[PROVISIONAMENTO] Gerando nova chave simétrica AES-256...");
    chaveMestra = CriptografiaArquivo.gerarChaveMestra();
    fs.writeFileSync(ARQUIVO_CHAVE_MESTRA, chaveMestra, { encoding: "utf8" });
    console.log("[PROVISIONAMENTO] Chave mestra gerada e salva com sucesso em 'dados/master.key'.\n");
  } else {
    chaveMestra = fs.readFileSync(ARQUIVO_CHAVE_MESTRA, "utf8").trim();
  }

  const cripto = new CriptografiaArquivo(chaveMestra);
  const journal = new JournalTransacao(path.join(DIRETORIO_DADOS, "journal"));

  const repoCredencial = new RepositorioArquivo<Credencial>(
    "credenciais.dat",
    cripto,
    journal,
    "Credencial",
    (json) => Credencial.fromJSON(json),
    DIRETORIO_DADOS
  );

  const repoOrganizacao = new RepositorioArquivo<Organizacao>(
    "organizacoes.dat",
    cripto,
    journal,
    "Organizacao",
    (json) => Organizacao.fromJSON(json),
    DIRETORIO_DADOS
  );

  const repoLote = new RepositorioArquivo<Lote>(
    "lotes.dat",
    cripto,
    journal,
    "Lote",
    (json) => Lote.fromJSON(json),
    DIRETORIO_DADOS
  );

  const repoEquipamento = new RepositorioArquivo<Equipamento>(
    "equipamentos.dat",
    cripto,
    journal,
    "Equipamento",
    (json) => Equipamento.fromJSON(json),
    DIRETORIO_DADOS
  );

  const servicoAuth = new ServicoAutenticacao(repoCredencial, journal);
  const servicoOrg = new ServicoOrganizacao(repoOrganizacao);
  const servicoLote = new ServicoLote(repoLote, servicoOrg);
  const servicoEquip = new ServicoEquipamento(repoEquipamento, servicoLote);
  const servicoRel = new ServicoRelatorio(journal, servicoEquip, servicoLote, servicoOrg);

  if (servicoAuth.precisaProvisionamento()) {
    console.log("[PROVISIONAMENTO] Repositório de credenciais inicial vazio.");
    const rlPrompt = readline.createInterface({ input: process.stdin, output: process.stdout });
    const senhaAdmin = await rlPrompt.question("Defina a senha para o usuário administrador 'admin': ");
    rlPrompt.close();

    const senhaFinal = senhaAdmin.trim().length >= 6 ? senhaAdmin.trim() : "admin123";
    servicoAuth.provisionarAdminInicial(senhaFinal);
    console.log(`[PROVISIONAMENTO] Administrador 'admin' provisionado com sucesso (Senha definida: ${senhaFinal}).\n`);
  }

    const cli = new CLIInterface(
    servicoAuth,
    servicoOrg,
    servicoLote,
    servicoEquip,
    servicoRel,
    DIRETORIO_DADOS
  );

  cli.iniciar();
}

main().catch((erro) => {
  console.error("[ERRO CRÍTICO NA INICIALIZAÇÃO]", erro);
  process.exit(1);
});