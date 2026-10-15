// Importa o backup JSON do app antigo (chave localStorage "graficaDB",
// exportado pelo botão "Exportar dados") convertendo para o novo modelo:
// - valores em reais (float) -> centavos (int)
// - ids numéricos -> uuid (mantendo o vínculo cliente/orçamento/fatura)
// - fatura antiga tem um único "valor"/"descricao" -> vira fatura de item único
// - fatura com status "pago" gera um registro de pagamento quitando-a

import type {
  Cliente, ContaPagar, Database, DocumentoItem, Fatura, FormaPagamento,
  Item, Orcamento, Pagamento,
} from '../types'
import { EMPRESA_PADRAO } from '../types'
import { emptyDatabase } from './adapter'
import { reaisToCents } from '../lib/money'
import { todayISO } from '../lib/dates'

type LegacyRecord = Record<string, unknown>

const str = (v: unknown): string => (v == null ? '' : String(v))
const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return isNaN(n as number) || n == null ? 0 : (n as number)
}

function normalizeDate(v: unknown): string {
  const s = str(v)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return todayISO()
}

const FORMAS: FormaPagamento[] = [
  'dinheiro', 'pix', 'transferencia', 'boleto', 'cartao_credito', 'cartao_debito',
]

function normalizeForma(v: unknown): FormaPagamento {
  const s = str(v).toLowerCase()
  if ((FORMAS as string[]).includes(s)) return s as FormaPagamento
  if (s.includes('cart')) return 'cartao_credito'
  if (s.includes('transfer')) return 'transferencia'
  if (s.includes('boleto')) return 'boleto'
  if (s.includes('dinheiro')) return 'dinheiro'
  return 'pix'
}

function migrateItens(itens: unknown): DocumentoItem[] {
  if (!Array.isArray(itens)) return []
  return itens.map((raw) => {
    const i = raw as LegacyRecord
    return {
      itemId: null,
      descricao: str(i.descricao),
      qtd: num(i.qtd) || 1,
      largura: num(i.largura),
      altura: num(i.altura),
      m2: num(i.m2),
      precoM2: reaisToCents(num(i.precoM2)),
      valorUnit: reaisToCents(num(i.valorUnit)),
      total: reaisToCents(num(i.total)),
      impostoPct: num(i.impostoPct),
    }
  })
}

export interface MigrationResult {
  db: Database
  resumo: string
}

export function migrateLegacyBackup(raw: unknown): MigrationResult {
  const legacy = raw as LegacyRecord
  if (!legacy || typeof legacy !== 'object') {
    throw new Error('Arquivo inválido: não é um backup do sistema antigo.')
  }

  const db = emptyDatabase()
  const idMap = new Map<string, string>() // id antigo -> uuid novo
  const mapId = (oldId: unknown): string => {
    const key = str(oldId)
    if (!idMap.has(key)) idMap.set(key, crypto.randomUUID())
    return idMap.get(key)!
  }

  // Clientes
  for (const raw of (legacy.clientes as LegacyRecord[]) ?? []) {
    const c: Cliente = {
      id: mapId(raw.id),
      nome: str(raw.nome),
      documento: str(raw.documento ?? raw.cnpj ?? raw.cpf),
      email: str(raw.email),
      emailsAdicionais: [],
      telefone: str(raw.telefone),
      endereco: str(raw.endereco),
      bairro: str(raw.bairro),
      numero: str(raw.numero),
      complemento: str(raw.complemento),
      cidade: str(raw.cidade),
      estado: str(raw.estado),
      cep: str(raw.cep),
      observacoes: str(raw.observacoes),
      criadoEm: new Date().toISOString(),
    }
    if (c.nome) db.clientes.push(c)
  }

  // Itens do catálogo
  for (const raw of (legacy.itens as LegacyRecord[]) ?? []) {
    const i: Item = {
      id: mapId('item-' + str(raw.id)),
      nome: str(raw.nome),
      categoria: str(raw.categoria) === 'servico' ? 'servico' : 'produto',
      precoM2: reaisToCents(num(raw.precoM2)),
      precoUnitario: reaisToCents(num(raw.precoUnitario)),
      descricao: str(raw.descricao),
      favorito: false,
    }
    if (i.nome) db.itens.push(i)
  }

  // Orçamentos
  for (const raw of (legacy.orcamentos as LegacyRecord[]) ?? []) {
    const status = str(raw.status)
    const o: Orcamento = {
      id: mapId('orc-' + str(raw.id)),
      numero: str(raw.numero) || `ORC-${db.orcamentos.length + 1}`,
      clienteId: mapId(raw.clienteId),
      data: normalizeDate(raw.data),
      validadeDias: num(raw.validade) || 30,
      prazoEntrega: str(raw.prazoEntrega ?? raw.prazo_entrega),
      itens: migrateItens(raw.items ?? raw.itens),
      subtotal: reaisToCents(num(raw.subtotal)),
      frete: reaisToCents(num(raw.frete)),
      impostoPadrao: num(raw.impostoPadrao),
      desconto: reaisToCents(num(raw.desconto)),
      total: reaisToCents(num(raw.total)),
      observacoes: str(raw.observacoes),
      condicoesPagamento: str(raw.condicoesPagamento),
      status:
        status === 'aprovado' ? 'faturado'
        : status === 'recusado' ? 'recusado'
        : 'pendente',
      criadoEm: new Date().toISOString(),
    }
    db.orcamentos.push(o)
  }

  // Faturas (no app antigo: valor único + descrição, sem itens)
  for (const raw of (legacy.faturas as LegacyRecord[]) ?? []) {
    const totalCents = reaisToCents(num(raw.valor ?? raw.total))
    const paga = ['pago', 'paga'].includes(str(raw.status).toLowerCase())
    const orcamentoIdOld = raw.orcamentoId
    const itens: DocumentoItem[] = Array.isArray(raw.items)
      ? migrateItens(raw.items)
      : [{
          itemId: null,
          descricao: str(raw.descricao) || 'Serviços gráficos',
          qtd: 1, largura: 0, altura: 0, m2: 0, precoM2: 0,
          valorUnit: totalCents, total: totalCents, impostoPct: 0,
        }]
    const f: Fatura = {
      id: mapId('fat-' + str(raw.id)),
      numero: str(raw.numero) || `FAT-${db.faturas.length + 1}`,
      orcamentoId: orcamentoIdOld != null ? mapId('orc-' + str(orcamentoIdOld)) : null,
      clienteId: mapId(raw.clienteId),
      dataEmissao: normalizeDate(raw.dataEmissao),
      dataVencimento: normalizeDate(raw.dataVencimento),
      formaPagamento: normalizeForma(raw.formaPagamento),
      itens,
      subtotal: totalCents,
      frete: 0,
      impostoPadrao: 0,
      desconto: 0,
      total: totalCents,
      observacoes: str(raw.descricao),
      condicoesPagamento: str(raw.condicoesPagamento),
      status: paga ? 'paga' : 'pendente',
      criadoEm: new Date().toISOString(),
    }
    db.faturas.push(f)
    if (paga) {
      const p: Pagamento = {
        id: crypto.randomUUID(),
        faturaId: f.id,
        data: normalizeDate(raw.dataPagamento ?? raw.dataVencimento),
        valor: totalCents,
        forma: f.formaPagamento,
        observacao: 'Importado do sistema antigo',
      }
      db.pagamentos.push(p)
    }
  }

  // Contas a pagar
  for (const raw of (legacy.contasPagar as LegacyRecord[]) ?? []) {
    const paga = ['pago', 'paga'].includes(str(raw.status).toLowerCase())
    const c: ContaPagar = {
      id: mapId('cp-' + str(raw.id)),
      descricao: str(raw.descricao),
      categoria: str(raw.categoria) || 'outros',
      fornecedor: str(raw.fornecedor),
      dataVencimento: normalizeDate(raw.vencimento ?? raw.dataVencimento),
      valor: reaisToCents(num(raw.valor)),
      status: paga ? 'paga' : 'pendente',
      dataPagamento: paga ? normalizeDate(raw.dataPagamento ?? raw.vencimento) : null,
      criadoEm: new Date().toISOString(),
    }
    if (c.descricao) db.contasPagar.push(c)
  }

  // Empresa
  const emp = (legacy.empresa as LegacyRecord) ?? {}
  db.empresa = {
    ...EMPRESA_PADRAO,
    nome: str(emp.nome) || EMPRESA_PADRAO.nome,
    cnpj: str(emp.cnpj),
    email: str(emp.email),
    telefone: str(emp.telefone),
    website: str(emp.website),
    endereco: str(emp.endereco),
    bairro: str(emp.bairro),
    cidade: str(emp.cidade),
    estado: str(emp.estado),
    cep: str(emp.cep),
    prefixoOrcamento: str(emp.prefixo_orcamento) || EMPRESA_PADRAO.prefixoOrcamento,
    proximoNumOrcamento: num(legacy.nextOrcamentoNum) || 1,
    proximoNumFatura: num(legacy.nextFaturaNum) || 1,
  }

  const resumo =
    `${db.clientes.length} clientes, ${db.itens.length} itens, ` +
    `${db.orcamentos.length} orçamentos, ${db.faturas.length} faturas, ` +
    `${db.contasPagar.length} contas a pagar`
  return { db, resumo }
}

/** Detecta se o JSON é do formato novo (backup deste app) ou do app antigo. */
export function isLegacyBackup(raw: unknown): boolean {
  const r = raw as LegacyRecord
  if (!r || typeof r !== 'object') return false
  // Backup novo tem pagamentos + empresa.proximoNumOrcamento
  const empresa = r.empresa as LegacyRecord | undefined
  return !(Array.isArray(r.pagamentos) && empresa && 'proximoNumOrcamento' in empresa)
}
