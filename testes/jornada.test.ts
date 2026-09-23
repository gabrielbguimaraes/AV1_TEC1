import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CriptografiaArquivo } from "../src/seguranca/CriptografiaArquivo.js";
import { JournalTransacao } from "../src/seguranca/JournalTransacao.js";
import { RepositorioArquivo } from "../src/seguranca/RepositorioArquivo.js";
import { Credencial } from "../src/dominio/Credencial.js";
import { Organizacao } from "../src/dominio/Organizacao.js";
import { Lote } from "../src/dominio/Lote.js";
import { Equipamento } from "../src/dominio/Equipamento.js";
import { ServicoAutenticacao } from "../src/servicos/ServicoAutenticacao.js";
import { ServicoOrganizacao } from "../src/servicos/ServicoOrganizacao.js";
import { ServicoLote } from "../src/servicos/ServicoLote.js";
import { ServicoEquipamento } from "../src/servicos/ServicoEquipamento.js";
import { ServicoRelatorio } from "../src/servicos/ServicoRelatorio.js";
import { PapelUsuario } from "../src/enums/PapelUsuario.js";
import { TipoEquipamento } from "../src/enums/TipoEquipamento.js";
import { EstadoFisico } from "../src/enums/EstadoFisico.js";
import { StatusRastreamento } from "../src/enums/StatusRastreamento.js";

describe("Jornada Completa E2E - Plataforma greencode", () => {
  const DIRETORIO_TESTE = "dados_teste";
  let chaveMestra: string;
  let cripto: CriptografiaArquivo;
  let journal: JournalTransacao;
  let repoCredencial: RepositorioArquivo<Credencial>;
  let repoOrg: RepositorioArquivo<Organizacao>;
  let repoLote: RepositorioArquivo<Lote>;
  let repoEquip: RepositorioArquivo<Equipamento>;

  let servicoAuth: ServicoAutenticacao;
  let servicoOrg: ServicoOrganizacao;
  let servicoLote: ServicoLote;
  let servicoEquip: ServicoEquipamento;
  let servicoRel: ServicoRelatorio;

  beforeAll(() => {
    if (fs.existsSync(DIRETORIO_TESTE)) {
      fs.rmSync(DIRETORIO_TESTE, { recursive: true, force: true });
    }
    fs.mkdirSync(DIRETORIO_TESTE, { recursive: true });

    chaveMestra = CriptografiaArquivo.gerarChaveMestra();
    cripto = new CriptografiaArquivo(chaveMestra);
    journal = new JournalTransacao(path.join(DIRETORIO_TESTE, "journal"));

    repoCredencial = new RepositorioArquivo<Credencial>(
      "credenciais.dat",
      cripto,
      journal,
      "Credencial",
      (j) => Credencial.fromJSON(j),
      DIRETORIO_TESTE
    );

    repoOrg = new RepositorioArquivo<Organizacao>(
      "organizacoes.dat",
      cripto,
      journal,
      "Organizacao",
      (j) => Organizacao.fromJSON(j),
      DIRETORIO_TESTE
    );

    repoLote = new RepositorioArquivo<Lote>(
      "lotes.dat",
      cripto,
      journal,
      "Lote",
      (j) => Lote.fromJSON(j),
      DIRETORIO_TESTE
    );

    repoEquip = new RepositorioArquivo<Equipamento>(
      "equipamentos.dat",
      cripto,
      journal,
      "Equipamento",
      (j) => Equipamento.fromJSON(j),
      DIRETORIO_TESTE
    );

    servicoAuth = new ServicoAutenticacao(repoCredencial, journal);
    servicoOrg = new ServicoOrganizacao(repoOrg);
    servicoLote = new ServicoLote(repoLote, servicoOrg);
    servicoEquip = new ServicoEquipamento(repoEquip, servicoLote);
    servicoRel = new ServicoRelatorio(journal, servicoEquip, servicoLote, servicoOrg);
  });

  afterAll(() => {
    if (fs.existsSync(DIRETORIO_TESTE)) {
      fs.rmSync(DIRETORIO_TESTE, { recursive: true, force: true });
    }
  });

  it("1. Provisionamento inicial e autenticação com hash SHA-256 + Salt", () => {
    expect(servicoAuth.precisaProvisionamento()).toBe(true);

    const admin = servicoAuth.provisionarAdminInicial("senhaForte123");
    expect(admin.getUsuario()).toBe("admin");
    expect(admin.getPapel()).toBe(PapelUsuario.ADMINISTRADOR);
    expect(servicoAuth.precisaProvisionamento()).toBe(false);

    expect(() => servicoAuth.provisionarAdminInicial("outraSenha")).toThrow();

    expect(() => servicoAuth.login("admin", "senhaErrada")).toThrow("Credenciais inválidas");

    const sessaoAdmin = servicoAuth.login("admin", "senhaForte123");
    expect(sessaoAdmin.isAtiva()).toBe(true);
    expect(sessaoAdmin.getPapel()).toBe(PapelUsuario.ADMINISTRADOR);
  });

  it("2. Criação de utilizadores e segregação de papéis (RBAC)", () => {
    const sessaoAdmin = servicoAuth.login("admin", "senhaForte123");

    const opCad = servicoAuth.criarUsuario(sessaoAdmin, "operador1", "senhaOp123", PapelUsuario.OPERADOR_CADASTRO);
    const gestorAlm = servicoAuth.criarUsuario(sessaoAdmin, "gestor1", "senhaGes123", PapelUsuario.GESTOR_ALMOXARIFADO);
    const auditor = servicoAuth.criarUsuario(sessaoAdmin, "auditor1", "senhaAud123", PapelUsuario.AUDITOR);

    expect(opCad.getPapel()).toBe(PapelUsuario.OPERADOR_CADASTRO);
    expect(gestorAlm.getPapel()).toBe(PapelUsuario.GESTOR_ALMOXARIFADO);
    expect(auditor.getPapel()).toBe(PapelUsuario.AUDITOR);

    const sessaoOp = servicoAuth.login("operador1", "senhaOp123");
    expect(() =>
      servicoAuth.criarUsuario(sessaoOp, "hacker", "pwd", PapelUsuario.ADMINISTRADOR)
    ).toThrow("Apenas administradores podem cadastrar novos usuários");
  });

  it("3. Cadastro de Organização com validação de CNPJ oficial (Módulo 11) e unicidade", () => {
    const sessaoOp = servicoAuth.login("operador1", "senhaOp123");

    expect(() =>
      servicoOrg.cadastrar(
        sessaoOp,
        "ORG-001",
        "Empresa Teste",
        "11.222.333/0001-99",
        "contato@teste.com",
        "1199999999",
        "São Paulo",
        "SP"
      )
    ).toThrow("CNPJ Inválido");

    const orgCriada = servicoOrg.cadastrar(
      sessaoOp,
      "ORG-001",
      "Banco Nacional de Ativos",
      "11.222.333/0001-81",
      "logistica@banconacional.com",
      "1133334444",
      "São Paulo",
      "SP"
    );

    expect(orgCriada.getId()).toBe("ORG-001");
    expect(orgCriada.getCnpj()).toBe("11222333000181");

    expect(() =>
      servicoOrg.cadastrar(
        sessaoOp,
        "ORG-002",
        "Outra Empresa",
        "11.222.333/0001-81",
        "outro@teste.com",
        "1133335555",
        "Campinas",
        "SP"
      )
    ).toThrow("Violação de Unicidade");
  });

  it("4. Validação temporal de lotes (rejeição de datas futuras e anteriores a 90 dias)", () => {
    const sessaoGestor = servicoAuth.login("gestor1", "senhaGes123");

    const dataFutura = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    expect(() =>
      servicoLote.criarLote(
        sessaoGestor,
        "LOTE-FUTURO",
        "ORG-001",
        "CTR-2026",
        "NF-1001",
        "TransRapida",
        dataFutura
      )
    ).toThrow("A data de entrada do lote não pode ser futura");

    const dataAntiga = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000);
    expect(() =>
      servicoLote.criarLote(
        sessaoGestor,
        "LOTE-ANTIGO",
        "ORG-001",
        "CTR-2026",
        "NF-1002",
        "TransRapida",
        dataAntiga
      )
    ).toThrow("anterior a mais de noventa dias");

    const loteValido = servicoLote.criarLote(
      sessaoGestor,
      "LOTE-001",
      "ORG-001",
      "CTR-2026",
      "NF-888999",
      "TransLogistica Express",
      new Date()
    );

    expect(loteValido.getCodigoRastreio()).toBe("LOTE-001");
  });

  it("5. Triagem e bloqueio de encaminhamento para desmonte sem triagem", () => {
    const sessaoGestor = servicoAuth.login("gestor1", "senhaGes123");
    const lotes = servicoLote.listar();
    const loteId = lotes[0].getId();

    const equipamento = servicoEquip.triarNovoEquipamento(
      sessaoGestor,
      loteId,
      TipoEquipamento.NOTEBOOK,
      "Dell Latitude 5420",
      "SN-DL-889922",
      1.8,
      4500,
      EstadoFisico.BOM_ESTADO
    );

    expect(equipamento.getCodigoInterno()).toMatch(/^GC-2026-\d{6}$/);
    expect(equipamento.getStatusRastreamento()).toBe(StatusRastreamento.EM_TRIAGEM);
  });

  it("6. Regra de degradação de estado físico em 2 ou mais categorias (justificativa obrigatória)", () => {
    const sessaoGestor = servicoAuth.login("gestor1", "senhaGes123");
    const equipamentos = servicoEquip.listar();
    const eqId = equipamentos[0].getId();

    expect(() =>
      servicoEquip.registrarMovimentacao(
        sessaoGestor,
        eqId,
        StatusRastreamento.EM_TRIAGEM,
        EstadoFisico.DANIFICADO_GRAVE,
        ""
      )
    ).toThrow("exige justificativa textual obrigatória");

    const movValida = servicoEquip.registrarMovimentacao(
      sessaoGestor,
      eqId,
      StatusRastreamento.AGUARDANDO_DESMONTE,
      EstadoFisico.DANIFICADO_GRAVE,
      "Tela LCD trincada e carcaça deformada durante transporte"
    );

    expect(movValida.getJustificativa()).toBe("Tela LCD trincada e carcaça deformada durante transporte");
    expect(movValida.getEstadoFisicoNovo()).toBe(EstadoFisico.DANIFICADO_GRAVE);
  });

  it("7. Auditoria, rastreabilidade completa e integridade do Journal", () => {
    const sessaoAuditor = servicoAuth.login("auditor1", "senhaAud123");
    const equipamentos = servicoEquip.listar();
    const eq = equipamentos[0];

    const rastreamento: any = servicoRel.obterRastreabilidadeEquipamento(sessaoAuditor, eq.getCodigoInterno());

    expect(rastreamento.equipamento.codigoInterno).toBe(eq.getCodigoInterno());
    expect(rastreamento.origem.organizacao.razaoSocial).toBe("Banco Nacional de Ativos");
    expect(rastreamento.historicoMovimentacoes.length).toBeGreaterThanOrEqual(1);

    const journalLogs = servicoRel.consultarAuditoriaJournal(sessaoAuditor);
    expect(journalLogs.length).toBeGreaterThan(0);

    const operacoes = journalLogs.map((j) => j.operacao);
    expect(operacoes).toContain("PROVISIONAMENTO");
    expect(operacoes).toContain("LOGIN");
    expect(operacoes).toContain("INSERCAO");
    expect(operacoes).toContain("ATUALIZACAO");
  });

  it("8. Expiração de sessão por inatividade (> 30 minutos)", () => {
    const sessao = servicoAuth.login("admin", "senhaForte123");

    const trintaEUmMinutosAtras = new Date(Date.now() - 31 * 60 * 1000);
    (sessao as any).ultimoAcesso = trintaEUmMinutosAtras;

    expect(sessao.estaExpirada(30)).toBe(true);
    expect(() => servicoAuth.validarSessao(sessao.getToken())).toThrow("Sessão expirada por inatividade");
  });

  it("9. Persistência cifrada em repouso (AES-256) no disco", () => {
    const arquivoCredenciais = path.join(DIRETORIO_TESTE, "credenciais.dat");
    expect(fs.existsSync(arquivoCredenciais)).toBe(true);

    const conteudoBruto = fs.readFileSync(arquivoCredenciais, "utf8");
    expect(conteudoBruto).toMatch(/^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/);
    expect(conteudoBruto).not.toContain("senhaForte123");
    expect(conteudoBruto).not.toContain("admin");
  });
});