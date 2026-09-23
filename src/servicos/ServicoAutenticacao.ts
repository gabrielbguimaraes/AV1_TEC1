import { Autenticavel } from "../interfaces/Autenticavel.js";
import { Credencial } from "../dominio/Credencial.js";
import { Sessao } from "../dominio/Sessao.js";
import { PapelUsuario } from "../enums/PapelUsuario.js";
import { CriptografiaArquivo } from "../seguranca/CriptografiaArquivo.js";
import { RepositorioArquivo } from "../seguranca/RepositorioArquivo.js";
import { JournalTransacao } from "../seguranca/JournalTransacao.js";

export class ServicoAutenticacao implements Autenticavel {
  private repoCredencial: RepositorioArquivo<Credencial>;
  private journal: JournalTransacao;
  private sessoesAtivas: Map<string, Sessao> = new Map();

  constructor(repoCredencial: RepositorioArquivo<Credencial>, journal: JournalTransacao) {
    this.repoCredencial = repoCredencial;
    this.journal = journal;
  }

  public precisaProvisionamento(): boolean {
    const usuarios = this.repoCredencial.carregarTodos();
    return usuarios.length === 0;
  }

  public provisionarAdminInicial(senhaPlana: string): Credencial {
    if (!this.precisaProvisionamento()) {
      throw new Error("O sistema já foi provisionado anteriormente.");
    }
    if (!senhaPlana || senhaPlana.length < 6) {
      throw new Error("A senha do administrador inicial deve ter no mínimo 6 caracteres.");
    }

    const salt = CriptografiaArquivo.gerarSalt();
    const senhaHash = CriptografiaArquivo.hashSenha(senhaPlana, salt);
    const admin = new Credencial(
      "usr_admin_01",
      "admin",
      senhaHash,
      salt,
      PapelUsuario.ADMINISTRADOR
    );

    this.repoCredencial.salvar(admin, "SISTEMA_PROVISIONAMENTO");
    this.journal.registrar("PROVISIONAMENTO", "Credencial", admin.getId(), "SISTEMA", {
      usuario: "admin",
      papel: PapelUsuario.ADMINISTRADOR,
    });

    return admin;
  }

  public autenticar(usuario: string, senhaPlana: string): boolean {
    const credenciais = this.repoCredencial.carregarTodos();
    const credencial = credenciais.find((c) => c.getUsuario() === usuario.trim().toLowerCase());

    if (!credencial || !credencial.isAtivo()) {
      return false;
    }

    const hashCalculado = CriptografiaArquivo.hashSenha(senhaPlana, credencial.getSalt());
    return credencial.validarSenha(hashCalculado);
  }

  public login(usuario: string, senhaPlana: string): Sessao {
    const autenticado = this.autenticar(usuario, senhaPlana);
    if (!autenticado) {
      throw new Error("Credenciais inválidas ou usuário inativo.");
    }

    const credenciais = this.repoCredencial.carregarTodos();
    const credencial = credenciais.find((c) => c.getUsuario() === usuario.trim().toLowerCase())!;
    credencial.registrarAcesso();
    this.repoCredencial.salvar(credencial, credencial.getId());

    const token = this.renovarToken();
    const sessao = new Sessao(token, credencial.getId(), credencial.getUsuario(), credencial.getPapel());
    this.sessoesAtivas.set(token, sessao);

    this.journal.registrar("LOGIN", "Sessao", sessao.getToken(), credencial.getId(), {
      usuario: credencial.getUsuario(),
      papel: credencial.getPapel(),
    });

    return sessao;
  }

  public validarSessao(token: string): Sessao {
    const sessao = this.sessoesAtivas.get(token);
    if (!sessao || !sessao.isAtiva()) {
      throw new Error("Sessão não encontrada ou inativa. Faça login novamente.");
    }

    if (sessao.estaExpirada(30)) {
      sessao.encerrar();
      this.sessoesAtivas.delete(token);
      throw new Error("Sessão expirada por inatividade (limite de 30 minutos). Faça login novamente.");
    }

    sessao.renovarAtividade();
    return sessao;
  }

  public renovarToken(): string {
    return `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  public criarUsuario(
    sessaoAdmin: Sessao,
    novoUsuario: string,
    senhaPlana: string,
    papel: PapelUsuario
  ): Credencial {
    this.validarSessao(sessaoAdmin.getToken());
    if (sessaoAdmin.getPapel() !== PapelUsuario.ADMINISTRADOR) {
      throw new Error("Apenas administradores podem cadastrar novos usuários.");
    }

    const usuarios = this.repoCredencial.carregarTodos();
    const usuarioJaExiste = usuarios.some((u) => u.getUsuario() === novoUsuario.trim().toLowerCase());
    if (usuarioJaExiste) {
      throw new Error(`O usuário '${novoUsuario}' já existe no sistema.`);
    }

    const salt = CriptografiaArquivo.gerarSalt();
    const senhaHash = CriptografiaArquivo.hashSenha(senhaPlana, salt);
    const novo = new Credencial(
      `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      novoUsuario,
      senhaHash,
      salt,
      papel
    );

    this.repoCredencial.salvar(novo, sessaoAdmin.getUsuarioId());
    return novo;
  }

  public logout(token: string): void {
    const sessao = this.sessoesAtivas.get(token);
    if (sessao) {
      sessao.encerrar();
      this.sessoesAtivas.delete(token);
    }
  }
}