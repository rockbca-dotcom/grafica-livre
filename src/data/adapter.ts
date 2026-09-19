import type {
  Cliente,
  ContaPagar,
  Database,
  Empresa,
  Fatura,
  Item,
  Orcamento,
  Pagamento,
  ProducaoCard,
  VendaRapida,
} from '../types'
import { EMPRESA_PADRAO } from '../types'
import { supabase } from './supabaseClient'

export type CollectionName =
  | 'clientes'
  | 'itens'
  | 'orcamentos'
  | 'faturas'
  | 'pagamentos'
  | 'vendasRapidas'
  | 'contasPagar'
  | 'producaoCards'

export type CollectionRow =
  | Cliente
  | Item
  | Orcamento
  | Fatura
  | Pagamento
  | VendaRapida
  | ContaPagar
  | ProducaoCard

export interface DataAdapter {
  load(): Promise<Database>
  upsert(collection: CollectionName, row: CollectionRow): Promise<void>
  remove(collection: CollectionName, id: string): Promise<void>
  saveEmpresa(empresa: Empresa): Promise<void>
  /**
   * Reserva de forma atômica o próximo número de documento (orçamento/fatura)
   * e devolve o valor a ser usado, incrementando o contador da empresa. Evita
   * números duplicados quando há criação concorrente (abas/dispositivos).
   */
  proximoNumero(tipo: 'orcamento' | 'fatura'): Promise<number>
  /** Substitui todo o banco (usado na importação de backup). */
  replaceAll(db: Database): Promise<void>
}

export function emptyDatabase(): Database {
  return {
    clientes: [],
    itens: [],
    orcamentos: [],
    faturas: [],
    pagamentos: [],
    vendasRapidas: [],
    contasPagar: [],
    producaoCards: [],
    empresa: { ...EMPRESA_PADRAO },
  }
}

// ---------------------------------------------------------------------------
// Adapter local (localStorage) — modo demonstração / sem Supabase configurado
// ---------------------------------------------------------------------------

const LOCAL_KEY = 'graficaLivre'

export class LocalAdapter implements DataAdapter {
  private db: Database = emptyDatabase()

  async load(): Promise<Database> {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        this.db = { ...emptyDatabase(), ...parsed, empresa: { ...EMPRESA_PADRAO, ...parsed.empresa } }
      } catch {
        this.db = emptyDatabase()
      }
    }
    return structuredClone(this.db)
  }

  private persist() {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(this.db))
  }

  async upsert(collection: CollectionName, row: CollectionRow): Promise<void> {
    const list = this.db[collection] as CollectionRow[]
    const idx = list.findIndex((r) => r.id === row.id)
    if (idx >= 0) list[idx] = row
    else list.push(row)
    this.persist()
  }

  async remove(collection: CollectionName, id: string): Promise<void> {
    const list = this.db[collection] as CollectionRow[]
    this.db[collection] = list.filter((r) => r.id !== id) as never
    this.persist()
  }

  async saveEmpresa(empresa: Empresa): Promise<void> {
    this.db.empresa = empresa
    this.persist()
  }

  async proximoNumero(tipo: 'orcamento' | 'fatura'): Promise<number> {
    const campo = tipo === 'orcamento' ? 'proximoNumOrcamento' : 'proximoNumFatura'
    const atual = this.db.empresa[campo]
    this.db.empresa = { ...this.db.empresa, [campo]: atual + 1 }
    this.persist()
    return atual
  }

  async replaceAll(db: Database): Promise<void> {
    this.db = structuredClone(db)
    this.persist()
  }
}

// ---------------------------------------------------------------------------
// Adapter Supabase — produção
// ---------------------------------------------------------------------------

const TABLE_BY_COLLECTION: Record<CollectionName, string> = {
  clientes: 'clientes',
  itens: 'itens',
  orcamentos: 'orcamentos',
  faturas: 'faturas',
  pagamentos: 'pagamentos',
  vendasRapidas: 'vendas_rapidas',
  contasPagar: 'contas_pagar',
  producaoCards: 'producao_cards',
}

/* Conversão camelCase <-> snake_case por coleção. Itens de orçamento/fatura
   são guardados em coluna JSONB, mantendo a escrita atômica. */

function toRow(collection: CollectionName, r: CollectionRow): Record<string, unknown> {
  switch (collection) {
    case 'clientes': {
      const c = r as Cliente
      return {
        id: c.id, nome: c.nome, documento: c.documento, email: c.email,
        emails_adicionais: c.emailsAdicionais ?? [],
        telefone: c.telefone, endereco: c.endereco, numero: c.numero,
        complemento: c.complemento, bairro: c.bairro,
        cidade: c.cidade, estado: c.estado, cep: c.cep,
        observacoes: c.observacoes, criado_em: c.criadoEm,
      }
    }
    case 'itens': {
      const i = r as Item
      return {
        id: i.id, nome: i.nome, categoria: i.categoria,
        preco_m2: i.precoM2, preco_unitario: i.precoUnitario, descricao: i.descricao,
      }
    }
    case 'orcamentos': {
      const o = r as Orcamento
      return {
        id: o.id, numero: o.numero, cliente_id: o.clienteId, data: o.data,
        validade_dias: o.validadeDias, prazo_entrega: o.prazoEntrega,
        itens: o.itens, subtotal: o.subtotal, frete: o.frete,
        imposto_padrao: o.impostoPadrao, desconto: o.desconto, total: o.total,
        observacoes: o.observacoes, condicoes_pagamento: o.condicoesPagamento,
        status: o.status, criado_em: o.criadoEm,
      }
    }
    case 'faturas': {
      const f = r as Fatura
      return {
        id: f.id, numero: f.numero, orcamento_id: f.orcamentoId,
        cliente_id: f.clienteId, data_emissao: f.dataEmissao,
        data_vencimento: f.dataVencimento, forma_pagamento: f.formaPagamento,
        itens: f.itens, subtotal: f.subtotal, frete: f.frete,
        imposto_padrao: f.impostoPadrao, desconto: f.desconto, total: f.total,
        observacoes: f.observacoes, condicoes_pagamento: f.condicoesPagamento,
        status: f.status, criado_em: f.criadoEm,
      }
    }
    case 'pagamentos': {
      const p = r as Pagamento
      return {
        id: p.id, fatura_id: p.faturaId, data: p.data,
        valor: p.valor, forma: p.forma, observacao: p.observacao,
      }
    }
    case 'vendasRapidas': {
      const v = r as VendaRapida
      return {
        id: v.id, numero: v.numero, cliente_id: v.clienteId,
        data: v.data, forma_pagamento: v.formaPagamento, itens: v.itens,
        total: v.total, observacao: v.observacao, criado_em: v.criadoEm,
      }
    }
    case 'contasPagar': {
      const c = r as ContaPagar
      return {
        id: c.id, descricao: c.descricao, categoria: c.categoria,
        fornecedor: c.fornecedor, data_vencimento: c.dataVencimento,
        valor: c.valor, status: c.status, data_pagamento: c.dataPagamento,
        criado_em: c.criadoEm,
      }
    }
    case 'producaoCards': {
      const p = r as ProducaoCard
      return {
        id: p.id, fatura_id: p.faturaId, cliente_id: p.clienteId,
        titulo: p.titulo, etapa: p.etapa, prazo_entrega: p.prazoEntrega,
        data_entrega: p.dataEntrega, observacao: p.observacao,
        ordem: p.ordem, criado_em: p.criadoEm,
      }
    }
  }
}

function fromRow(collection: CollectionName, r: Record<string, unknown>): CollectionRow {
  const s = (k: string) => (r[k] ?? '') as string
  const n = (k: string) => (r[k] ?? 0) as number
  switch (collection) {
    case 'clientes':
      return {
        id: s('id'), nome: s('nome'), documento: s('documento'), email: s('email'),
        emailsAdicionais: (r.emails_adicionais ?? []) as string[],
        telefone: s('telefone'), endereco: s('endereco'), numero: s('numero'),
        complemento: s('complemento'), bairro: s('bairro'),
        cidade: s('cidade'), estado: s('estado'), cep: s('cep'),
        observacoes: s('observacoes'), criadoEm: s('criado_em'),
      } as Cliente
    case 'itens':
      return {
        id: s('id'), nome: s('nome'), categoria: s('categoria') as Item['categoria'],
        precoM2: n('preco_m2'), precoUnitario: n('preco_unitario'), descricao: s('descricao'),
      } as Item
    case 'orcamentos':
      return {
        id: s('id'), numero: s('numero'), clienteId: s('cliente_id'), data: s('data'),
        validadeDias: n('validade_dias'), prazoEntrega: s('prazo_entrega'),
        itens: (r.itens ?? []) as Orcamento['itens'], subtotal: n('subtotal'),
        frete: n('frete'), impostoPadrao: n('imposto_padrao'), desconto: n('desconto'),
        total: n('total'), observacoes: s('observacoes'),
        condicoesPagamento: s('condicoes_pagamento'),
        status: s('status') as Orcamento['status'], criadoEm: s('criado_em'),
      } as Orcamento
    case 'faturas':
      return {
        id: s('id'), numero: s('numero'),
        orcamentoId: (r.orcamento_id as string | null) ?? null,
        clienteId: s('cliente_id'), dataEmissao: s('data_emissao'),
        dataVencimento: s('data_vencimento'),
        formaPagamento: s('forma_pagamento') as Fatura['formaPagamento'],
        itens: (r.itens ?? []) as Fatura['itens'], subtotal: n('subtotal'),
        frete: n('frete'), impostoPadrao: n('imposto_padrao'), desconto: n('desconto'),
        total: n('total'), observacoes: s('observacoes'),
        condicoesPagamento: s('condicoes_pagamento'),
        status: s('status') as Fatura['status'], criadoEm: s('criado_em'),
      } as Fatura
    case 'pagamentos':
      return {
        id: s('id'), faturaId: s('fatura_id'), data: s('data'),
        valor: n('valor'), forma: s('forma') as Pagamento['forma'],
        observacao: s('observacao'),
      } as Pagamento
    case 'vendasRapidas':
      return {
        id: s('id'), numero: s('numero'),
        clienteId: (r.cliente_id as string | null) ?? null,
        data: s('data'), formaPagamento: s('forma_pagamento') as VendaRapida['formaPagamento'],
        itens: (r.itens ?? []) as VendaRapida['itens'], total: n('total'),
        observacao: s('observacao'), criadoEm: s('criado_em'),
      } as VendaRapida
    case 'contasPagar':
      return {
        id: s('id'), descricao: s('descricao'), categoria: s('categoria'),
        fornecedor: s('fornecedor'), dataVencimento: s('data_vencimento'),
        valor: n('valor'), status: s('status') as ContaPagar['status'],
        dataPagamento: (r.data_pagamento as string | null) ?? null,
        criadoEm: s('criado_em'),
      } as ContaPagar
    case 'producaoCards':
      return {
        id: s('id'), faturaId: (r.fatura_id as string | null) ?? null,
        clienteId: s('cliente_id'), titulo: s('titulo'),
        etapa: s('etapa') as ProducaoCard['etapa'],
        prazoEntrega: s('prazo_entrega'),
        dataEntrega: (r.data_entrega as string | null) ?? null,
        observacao: s('observacao'), ordem: n('ordem'), criadoEm: s('criado_em'),
      } as ProducaoCard
  }
}

function empresaToRow(e: Empresa): Record<string, unknown> {
  return {
    nome: e.nome, cnpj: e.cnpj, email: e.email, telefone: e.telefone,
    website: e.website, endereco: e.endereco, bairro: e.bairro,
    cidade: e.cidade, estado: e.estado, cep: e.cep, chave_pix: e.chavePix,
    logo_data_url: e.logoDataUrl, prefixo_orcamento: e.prefixoOrcamento,
    proximo_num_orcamento: e.proximoNumOrcamento,
    proximo_num_fatura: e.proximoNumFatura,
    observacoes_padrao_orcamento: e.observacoesPadraoOrcamento,
    condicoes_pagamento_padrao: e.condicoesPagamentoPadrao,
  }
}

function empresaFromRow(r: Record<string, unknown>): Empresa {
  const s = (k: string, fallback = '') => (r[k] ?? fallback) as string
  return {
    nome: s('nome', EMPRESA_PADRAO.nome), cnpj: s('cnpj'), email: s('email'),
    telefone: s('telefone'), website: s('website'), endereco: s('endereco'),
    bairro: s('bairro'), cidade: s('cidade'), estado: s('estado'), cep: s('cep'),
    chavePix: s('chave_pix'), logoDataUrl: s('logo_data_url'),
    prefixoOrcamento: s('prefixo_orcamento', EMPRESA_PADRAO.prefixoOrcamento),
    proximoNumOrcamento: (r.proximo_num_orcamento ?? 1) as number,
    proximoNumFatura: (r.proximo_num_fatura ?? 1) as number,
    observacoesPadraoOrcamento: s('observacoes_padrao_orcamento', EMPRESA_PADRAO.observacoesPadraoOrcamento),
    condicoesPagamentoPadrao: s('condicoes_pagamento_padrao', EMPRESA_PADRAO.condicoesPagamentoPadrao),
  }
}

const COLLECTIONS: CollectionName[] = [
  'clientes', 'itens', 'orcamentos', 'faturas', 'pagamentos', 'vendasRapidas', 'contasPagar',
  'producaoCards',
]

export class SupabaseAdapter implements DataAdapter {
  private get client() {
    if (!supabase) throw new Error('Supabase não configurado')
    return supabase
  }

  async load(): Promise<Database> {
    const db = emptyDatabase()
    const results = await Promise.all(
      COLLECTIONS.map((c) => this.client.from(TABLE_BY_COLLECTION[c]).select('*')),
    )
    results.forEach((res, i) => {
      if (res.error) throw res.error
      const collection = COLLECTIONS[i]
      db[collection] = (res.data ?? []).map((row) => fromRow(collection, row)) as never
    })
    const empresaRes = await this.client.from('empresa').select('*').maybeSingle()
    if (empresaRes.error) throw empresaRes.error
    if (empresaRes.data) db.empresa = empresaFromRow(empresaRes.data)
    return db
  }

  async upsert(collection: CollectionName, row: CollectionRow): Promise<void> {
    const { error } = await this.client
      .from(TABLE_BY_COLLECTION[collection])
      .upsert(toRow(collection, row))
    if (error) throw error
  }

  async remove(collection: CollectionName, id: string): Promise<void> {
    const { error } = await this.client
      .from(TABLE_BY_COLLECTION[collection])
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  async saveEmpresa(empresa: Empresa): Promise<void> {
    const { data: userData } = await this.client.auth.getUser()
    const userId = userData.user?.id
    if (!userId) throw new Error('Sessão expirada')
    const { error } = await this.client
      .from('empresa')
      .upsert({ user_id: userId, ...empresaToRow(empresa) })
    if (error) throw error
  }

  async proximoNumero(tipo: 'orcamento' | 'fatura'): Promise<number> {
    // Incremento atômico no servidor (função proximo_numero_documento).
    const { data, error } = await this.client.rpc('proximo_numero_documento', {
      p_tipo: tipo,
    })
    if (error) throw error
    if (typeof data !== 'number') {
      throw new Error('Não foi possível gerar o número do documento')
    }
    return data
  }

  async replaceAll(db: Database): Promise<void> {
    // Apaga tudo e regrava (importação de backup)
    for (const c of [...COLLECTIONS].reverse()) {
      const { error } = await this.client
        .from(TABLE_BY_COLLECTION[c])
        .delete()
        .not('id', 'is', null)
      if (error) throw error
    }
    for (const c of COLLECTIONS) {
      const rows = (db[c] as CollectionRow[]).map((r) => toRow(c, r))
      if (rows.length === 0) continue
      // Insere em lotes para não estourar o payload
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await this.client
          .from(TABLE_BY_COLLECTION[c])
          .insert(rows.slice(i, i + 200))
        if (error) throw error
      }
    }
    await this.saveEmpresa(db.empresa)
  }
}

export function createAdapter(useSupabase: boolean): DataAdapter {
  return useSupabase ? new SupabaseAdapter() : new LocalAdapter()
}
