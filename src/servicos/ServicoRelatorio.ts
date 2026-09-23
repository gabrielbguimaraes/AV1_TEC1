import { Sessao } from "../dominio/Sessao.js";
import { JournalTransacao, EntradaJournal } from "../seguranca/JournalTransacao.js";
import { ServicoEquipamento } from "./ServicoEquipamento.js";
import { ServicoLote } from "./ServicoLote.js";
import { ServicoOrganizacao } from "./ServicoOrganizacao.js";

export class ServicoRelatorio {
  private journal: JournalTransacao;
  private servicoEquip: ServicoEquipamento;
  private servicoLote: ServicoLote;
  private servicoOrg: ServicoOrganizacao;

  constructor(
    journal: JournalTransacao,
    servicoEquip: ServicoEquipamento,
    servicoLote: ServicoLote,
    servicoOrg: ServicoOrganizacao
  ) {
    this.journal = journal;
    this.servicoEquip = servicoEquip;
    this.servicoLote = servicoLote;
    this.servicoOrg = servicoOrg;
  }

  public obterRastreabilidadeEquipamento(sessao: Sessao, idOuCodigo: string): object {
    let eq = this.servicoEquip.buscarPorId(idOuCodigo);
    if (!eq) {
      eq = this.servicoEquip.buscarPorCodigoInterno(idOuCodigo);
    }
    if (!eq) {
      throw new Error(`Equipamento '${idOuCodigo}' não localizado para auditoria.`);
    }

    const lote = this.servicoLote.buscarPorId(eq.getLoteId());
    const org = lote ? this.servicoOrg.buscarPorId(lote.getOrganizacaoId()) : undefined;

    return {
      equipamento: eq.toJSON(),
      origem: {
        lote: lote ? lote.toJSON() : null,
        organizacao: org ? org.toJSON() : null,
      },
      historicoMovimentacoes: eq.getMovimentacoes().map((m) => m.toJSON()),
    };
  }

  public consultarAuditoriaJournal(sessao: Sessao): EntradaJournal[] {
    return this.journal.listarHistorico();
  }
}