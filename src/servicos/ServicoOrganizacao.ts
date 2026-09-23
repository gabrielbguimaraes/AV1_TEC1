import { Organizacao } from "../dominio/Organizacao.js";
import { Sessao } from "../dominio/Sessao.js";
import { PapelUsuario } from "../enums/PapelUsuario.js";
import { RepositorioArquivo } from "../seguranca/RepositorioArquivo.js";
import { ValidadorCNPJ } from "../validadores/ValidadorCNPJ.js";

export class ServicoOrganizacao {
  private repo: RepositorioArquivo<Organizacao>;
  private validadorCNPJ: ValidadorCNPJ;

  constructor(repo: RepositorioArquivo<Organizacao>) {
    this.repo = repo;
    this.validadorCNPJ = new ValidadorCNPJ();
  }

  private validarPermissao(sessao: Sessao): void {
    const papel = sessao.getPapel();
    if (papel !== PapelUsuario.ADMINISTRADOR && papel !== PapelUsuario.OPERADOR_CADASTRO) {
      throw new Error("Acesso negado: Perfil sem permissão para cadastrar organizações.");
    }
  }

  public cadastrar(
    sessao: Sessao,
    id: string,
    razaoSocial: string,
    cnpj: string,
    emailContato: string,
    telefone: string,
    cidade: string,
    estado: string
  ): Organizacao {
    this.validarPermissao(sessao);

    const validacao = this.validadorCNPJ.validar(cnpj);
    if (!validacao.valido) {
      throw new Error(`CNPJ Inválido: ${validacao.motivo}`);
    }

    const organizacoes = this.repo.carregarTodos();
    const cnpjNormalizado = cnpj.replace(/\D/g, "");
    const cnpjExiste = organizacoes.some((o) => o.getCnpj().replace(/\D/g, "") === cnpjNormalizado);
    if (cnpjExiste) {
      throw new Error(`Violação de Unicidade: O CNPJ informado já está cadastrado.`);
    }

    const novaOrg = new Organizacao(
      id,
      razaoSocial,
      cnpjNormalizado,
      emailContato,
      telefone,
      cidade,
      estado
    );

    this.repo.salvar(novaOrg, sessao.getUsuarioId());
    return novaOrg;
  }

  public buscarPorId(id: string): Organizacao | undefined {
    return this.repo.buscarPorId(id);
  }

  public listar(): Organizacao[] {
    return this.repo.carregarTodos();
  }
}