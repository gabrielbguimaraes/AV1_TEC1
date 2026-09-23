import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";
import { ServicoAutenticacao } from "../servicos/ServicoAutenticacao.js";
import { ServicoOrganizacao } from "../servicos/ServicoOrganizacao.js";
import { ServicoLote } from "../servicos/ServicoLote.js";
import { ServicoEquipamento } from "../servicos/ServicoEquipamento.js";
import { ServicoRelatorio } from "../servicos/ServicoRelatorio.js";
import { Sessao } from "../dominio/Sessao.js";
import { PapelUsuario } from "../enums/PapelUsuario.js";
import { TipoEquipamento } from "../enums/TipoEquipamento.js";
import { EstadoFisico } from "../enums/EstadoFisico.js";
import { StatusRastreamento } from "../enums/StatusRastreamento.js";

export class CLIInterface {
  private servicoAuth: ServicoAutenticacao;
  private servicoOrg: ServicoOrganizacao;
  private servicoLote: ServicoLote;
  private servicoEquip: ServicoEquipamento;
  private servicoRel: ServicoRelatorio;
  private sessaoAtual?: Sessao;
  private arquivoHistorico: string;
  private rl!: readline.Interface;

  private readonly COMANDOS_BASE = [
    "ajuda",
    "login",
    "logout",
    "sessao",
    "usuario criar",
    "org cadastrar",
    "org listar",
    "lote criar",
    "lote listar",
    "equip triar",
    "equip mover",
    "equip listar",
    "auditoria rastrear",
    "auditoria journal",
    "limpar",
    "sair",
  ];

  constructor(
    servicoAuth: ServicoAutenticacao,
    servicoOrg: ServicoOrganizacao,
    servicoLote: ServicoLote,
    servicoEquip: ServicoEquipamento,
    servicoRel: ServicoRelatorio,
    diretorioBase: string = "dados"
  ) {
    this.servicoAuth = servicoAuth;
    this.servicoOrg = servicoOrg;
    this.servicoLote = servicoLote;
    this.servicoEquip = servicoEquip;
    this.servicoRel = servicoRel;
    this.arquivoHistorico = path.join(diretorioBase, ".greencode_history");
  }

  public iniciar(): void {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: (linha: string) => this.autoCompletar(linha),
      prompt: "greencode> ",
    });

    this.carregarHistorico();

    console.log("  GREENCODE - Plataforma de Logística Reversa (CLI)");
    console.log("  Digite 'ajuda' para comandos ou 'login' para autenticar.");

    this.atualizarPrompt();
    this.rl.prompt();

    this.rl.on("line", async (linha: string) => {
      const comandoFormatado = linha.trim();
      if (comandoFormatado.length > 0) {
        this.salvarLinhaHistorico(comandoFormatado);
        await this.processarLinha(comandoFormatado);
      }
      this.atualizarPrompt();
      this.rl.prompt();
    });

    this.rl.on("close", () => {
      console.log("\n[INFO] Sessão finalizada. Até logo!");
      process.exit(0);
    });
  }

  private atualizarPrompt(): void {
    if (this.sessaoAtual && this.sessaoAtual.isAtiva()) {
      this.rl.setPrompt(`greencode [${this.sessaoAtual.getUsuarioNome()}@${this.sessaoAtual.getPapel()}]> `);
    } else {
      this.rl.setPrompt("greencode [nao-autenticado]> ");
    }
  }

  private autoCompletar(linha: string): [string[], string] {
    const correspondencias = this.COMANDOS_BASE.filter((cmd) => cmd.startsWith(linha.trim()));
    return [correspondencias.length > 0 ? correspondencias : this.COMANDOS_BASE, linha];
  }

  private extrairFlags(argumentos: string[]): Record<string, string> {
    const flags: Record<string, string> = {};
    for (let i = 0; i < argumentos.length; i++) {
      const item = argumentos[i];
      if (item.startsWith("--")) {
        const chave = item.substring(2);
        const proximo = argumentos[i + 1];
        if (proximo && !proximo.startsWith("--")) {
          flags[chave] = proximo;
          i++;
        } else {
          flags[chave] = "true";
        }
      }
    }
    return flags;
  }

  private async processarLinha(linha: string): Promise<void> {
    const partes = linha.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((p) => p.replace(/^"|"$/g, "")) || [];
    if (partes.length === 0) return;

    const acaoPrincipal = partes[0].toLowerCase();
    const subAcao = partes[1]?.toLowerCase();
    const flags = this.extrairFlags(partes);

    try {
      if (acaoPrincipal === "sair") {
        this.rl.close();
        return;
      }

      if (acaoPrincipal === "limpar") {
        console.clear();
        return;
      }

      if (acaoPrincipal === "ajuda" || acaoPrincipal === "menu") {
        this.exibirMenu();
        return;
      }

      if (acaoPrincipal === "login") {
        const usuario = partes[1] || flags["usuario"];
        const senha = partes[2] || flags["senha"];
        if (!usuario || !senha) {
          console.log("[ERRO] Uso correto: login <usuario> <senha> ou login --usuario <usr> --senha <pwd>");
          return;
        }
        this.sessaoAtual = this.servicoAuth.login(usuario, senha);
        console.log(`[SUCESSO] Bem-vindo(a), ${this.sessaoAtual.getUsuarioNome()}! Papel: ${this.sessaoAtual.getPapel()}`);
        return;
      }

      if (acaoPrincipal === "logout") {
        if (this.sessaoAtual) {
          this.servicoAuth.logout(this.sessaoAtual.getToken());
          this.sessaoAtual = undefined;
          console.log("[SUCESSO] Desconectado com sucesso.");
        } else {
          console.log("[AVISO] Nenhuma sessão ativa no momento.");
        }
        return;
      }
      if (acaoPrincipal === "paradoxo") {
        console.log("\n[EASTER EGG] V=0, dens=inf: paradoxo QM - Singularidade detectada!\n");
        return;
        }

      // Verificação de sessão para demais comandos
      if (!this.sessaoAtual) {
        console.log("[ERRO] Acesso não autorizado: Faça login antes de executar comandos operacionais.");
        return;
      }

      this.sessaoAtual = this.servicoAuth.validarSessao(this.sessaoAtual.getToken());

      if (acaoPrincipal === "sessao") {
        console.log(`[INFO] Sessão ativa: Usuário=${this.sessaoAtual.getUsuarioNome()} | Perfil=${this.sessaoAtual.getPapel()}`);
        return;
      }

      // Roteamento dos comandos com sub-ações
      if (acaoPrincipal === "usuario" && subAcao === "criar") {
        const usr = flags["usuario"];
        const pwd = flags["senha"];
        const papel = flags["papel"] as PapelUsuario;
        if (!usr || !pwd || !papel) {
          console.log("[ERRO] Parâmetros obrigatórios: usuario criar --usuario <nome> --senha <pwd> --papel <ADMINISTRADOR|OPERADOR_CADASTRO|GESTOR_ALMOXARIFADO|AUDITOR>");
          return;
        }
        const novo = this.servicoAuth.criarUsuario(this.sessaoAtual, usr, pwd, papel);
        console.log(`[SUCESSO] Usuário '${novo.getUsuario()}' [${novo.getPapel()}] criado com sucesso.`);
        return;
      }

      if (acaoPrincipal === "org") {
        if (subAcao === "cadastrar") {
          const id = flags["id"] || `org_${Date.now()}`;
          const razao = flags["razao"];
          const cnpj = flags["cnpj"];
          const email = flags["email"] || "contato@empresa.com";
          const tel = flags["tel"] || "1199999999";
          const cidade = flags["cidade"] || "Sao Paulo";
          const estado = flags["uf"] || "SP";

          if (!razao || !cnpj) {
            console.log("[ERRO] Parâmetros obrigatórios: org cadastrar --razao <nome> --cnpj <14_digitos>");
            return;
          }

          const org = this.servicoOrg.cadastrar(this.sessaoAtual, id, razao, cnpj, email, tel, cidade, estado);
          console.log(`[SUCESSO] Organização cadastrada: ID=${org.getId()} | Razão=${org.getRazaoSocial()}`);
        } else if (subAcao === "listar") {
          const orgs = this.servicoOrg.listar();
          console.table(orgs.map((o) => o.toJSON()));
        }
        return;
      }

      if (acaoPrincipal === "lote") {
        if (subAcao === "criar") {
          const org = flags["org"];
          const contrato = flags["contrato"] || "CTR-PADRAO";
          const nf = flags["nf"];
          const transp = flags["transp"];
          const dataStr = flags["data"];

          if (!org || !nf || !transp) {
            console.log("[ERRO] Parâmetros obrigatórios: lote criar --org <id> --nf <num> --transp <nome> [--data YYYY-MM-DD]");
            return;
          }

          const dataEntrada = dataStr ? new Date(dataStr) : new Date();
          const lote = this.servicoLote.criarLote(
            this.sessaoAtual,
            `RAST-${Date.now()}`,
            org,
            contrato,
            nf,
            transp,
            dataEntrada
          );
          console.log(`[SUCESSO] Lote criado: ID=${lote.getId()} | Código Rastreio=${lote.getCodigoRastreio()}`);
        } else if (subAcao === "listar") {
          const lotes = this.servicoLote.listar();
          console.table(
            lotes.map((l) => ({
              id: l.getId(),
              rastreio: l.getCodigoRastreio(),
              org: l.getOrganizacaoId(),
              status: l.getStatus(),
              pesoKg: l.calcularPesoTotal(),
              equipamentos: l.getEquipamentos().length,
            }))
          );
        }
        return;
      }

      if (acaoPrincipal === "equip") {
        if (subAcao === "triar") {
          const loteId = flags["lote"];
          const tipo = (flags["tipo"] || "NOTEBOOK") as TipoEquipamento;
          const modelo = flags["modelo"] || "Genérico";
          const serie = flags["serie"] || "SN-PADRAO";
          const peso = Number(flags["peso"] || "2.5");
          const valor = Number(flags["valor"] || "1000");
          const estado = (flags["estado"] || "BOM_ESTADO") as EstadoFisico;

          if (!loteId) {
            console.log("[ERRO] Parâmetro obrigatório: equip triar --lote <loteId> --tipo <TIPO> --modelo <nome>");
            return;
          }

          const eq = this.servicoEquip.triarNovoEquipamento(
            this.sessaoAtual,
            loteId,
            tipo,
            modelo,
            serie,
            peso,
            valor,
            estado
          );
          console.log(`[SUCESSO] Equipamento triado com código interno: ${eq.getCodigoInterno()} (ID: ${eq.getId()})`);
        } else if (subAcao === "mover") {
          const id = flags["id"];
          const status = flags["status"] as StatusRastreamento;
          const estado = flags["estado"] as EstadoFisico;
          const motivo = flags["motivo"];

          if (!id || !status || !estado) {
            console.log("[ERRO] Uso: equip mover --id <id> --status <STATUS> --estado <ESTADO> [--motivo <texto>]");
            return;
          }

          const mov = this.servicoEquip.registrarMovimentacao(this.sessaoAtual, id, status, estado, motivo);
          console.log(`[SUCESSO] Movimentação registrada: [${mov.getId()}] Status atualizado para ${status}`);
        } else if (subAcao === "listar") {
          const equips = this.servicoEquip.listar();
          console.table(
            equips.map((e) => ({
              id: e.getId(),
              codigo: e.getCodigoInterno(),
              tipo: e.getTipo(),
              status: e.getStatusRastreamento(),
              estado: e.getEstadoFisico(),
            }))
          );
        }
        return;
      }

      if (acaoPrincipal === "auditoria") {
        if (subAcao === "rastrear") {
          const idOuCodigo = flags["id"] || flags["codigo"] || partes[2];
          if (!idOuCodigo) {
            console.log("[ERRO] Parâmetro obrigatório: auditoria rastrear --id <idOuCodigo>");
            return;
          }
          const relatorio = this.servicoRel.obterRastreabilidadeEquipamento(this.sessaoAtual, idOuCodigo);
          console.log(JSON.stringify(relatorio, null, 2));
        } else if (subAcao === "journal") {
          const registros = this.servicoRel.consultarAuditoriaJournal(this.sessaoAtual);
          console.table(
            registros.map((r) => ({
              id: r.idTransacao,
              data: r.dataHora,
              op: r.operacao,
              entidade: r.entidade,
              alvo: r.identificador,
              usuario: r.usuarioId,
            }))
          );
        }
        return;
      }

      console.log(`[ERRO] Comando desconhecido: '${linha}'. Digite 'ajuda' para instruções.`);
    } catch (erro) {
      console.log(`[FALHA] ${(erro as Error).message}`);
    }
  }

  private exibirMenu(): void {
    console.log("\n--- MENU DE COMANDOS DISPONÍVEIS ---");
    console.log("Comandos Gerais:");
    console.log("  ajuda | menu                      -> Exibe os comandos disponíveis");
    console.log("  login <usuario> <senha>          -> Autentica no sistema");
    console.log("  logout                           -> Encerra a sessão ativa");
    console.log("  limpar                           -> Limpa a tela do terminal");
    console.log("  sair                             -> Sai da aplicação");

    if (!this.sessaoAtual) {
      console.log("\n* Efetue login para visualizar os comandos operacionais da sua função.");
      return;
    }

    const papel = this.sessaoAtual.getPapel();

    if (papel === PapelUsuario.ADMINISTRADOR) {
      console.log("\nAdministração do Sistema:");
      console.log("  usuario criar --usuario <usr> --senha <pwd> --papel <PAPEL>");
    }

    if (papel === PapelUsuario.ADMINISTRADOR || papel === PapelUsuario.OPERADOR_CADASTRO) {
      console.log("\nGestão de Cadastros:");
      console.log("  org cadastrar --razao <nome> --cnpj <14digitos> [--email <e>] [--tel <t>]");
      console.log("  org listar");
    }

    if (papel === PapelUsuario.ADMINISTRADOR || papel === PapelUsuario.GESTOR_ALMOXARIFADO) {
      console.log("\nGestão de Almoxarifado e Triagem:");
      console.log("  lote criar --org <id> --nf <nf> --transp <transp> [--data YYYY-MM-DD]");
      console.log("  lote listar");
      console.log("  equip triar --lote <id> --tipo <TIPO> --modelo <mod> [--peso <kg>] [--valor <R$>]");
      console.log("  equip mover --id <id> --status <STATUS> --estado <ESTADO> [--motivo <texto>]");
      console.log("  equip listar");
    }

    if (papel === PapelUsuario.ADMINISTRADOR || papel === PapelUsuario.AUDITOR) {
      console.log("\nAuditoria e Rastreabilidade:");
      console.log("  auditoria rastrear --id <idOuCodigoInterno>");
      console.log("  auditoria journal");
    }
    console.log("------------------------------------\n");
  }

  private carregarHistorico(): void {
    if (fs.existsSync(this.arquivoHistorico)) {
      try {
        const linhas = fs.readFileSync(this.arquivoHistorico, "utf8").split("\n").filter(Boolean);
        (this.rl as any).history = linhas.reverse();
      } catch {
      }
    }
  }

  private salvarLinhaHistorico(linha: string): void {
    try {
      fs.appendFileSync(this.arquivoHistorico, `${linha}\n`, { encoding: "utf8" });
    } catch {
    }
  }
}