import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  Cliente, ContaPagar, Database, Empresa, EtapaProducao, Fatura,
  FaturaStatus, FormaPagamento, Item, Orcamento, Pagamento, ProducaoCard,
  VendaRapida,
} from '../types'
import { createAdapter, emptyDatabase } from '../data/adapter'
import type { DataAdapter } from '../data/adapter'
import { isLegacyBackup, migrateLegacyBackup } from '../data/migrateLegacy'
import { supabase } from '../data/supabaseClient'
import { useToast } from './ToastContext'
import { useAuth } from './AuthContext'
import { isPast, todayISO } from '../lib/dates'

/** Título do card de produção a partir dos itens da fatura. */
function tituloCardFatura(fatura: Fatura): string {
  const primeiro = fatura.itens[0]?.descricao || 'Trabalho'
  const extras = fatura.itens.length - 1
  return extras > 0 ? `${primeiro} +${extras}` : primeiro
}

/** Ordem "no topo da coluna": negativa e decrescente no tempo. Em SEGUNDOS
 *  para caber no tipo integer do Postgres (-Date.now() em ms estoura o int). */
export function ordemTopo(): number {
  return -Math.floor(Date.now() / 1000)
}

/** Cria um card de produção (etapa Arte) para uma fatura. */
function novoCardParaFatura(fatura: Fatura): ProducaoCard {
  return {
    id: crypto.randomUUID(),
    faturaId: fatura.id,
    clienteId: fatura.clienteId,
    titulo: tituloCardFatura(fatura),
    etapa: 'arte',
    prazoEntrega: '',
    dataEntrega: null,
    observacao: '',
    ordem: ordemTopo(),
    criadoEm: new Date().toISOString(),
  }
}

interface DataContextValue {
  db: Database
  loading: boolean
  // Clientes
  saveCliente: (c: Cliente) => Promise<void>
  deleteCliente: (id: string) => Promise<void>
  clienteById: (id: string) => Cliente | undefined
  // Itens
  saveItem: (i: Item) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  // Orçamentos
  saveOrcamento: (o: Orcamento) => Promise<void>
  createOrcamento: (o: Omit<Orcamento, 'id' | 'numero' | 'criadoEm'>) => Promise<Orcamento>
  deleteOrcamento: (id: string) => Promise<void>
  setOrcamentoStatus: (id: string, status: Orcamento['status']) => Promise<void>
  // Faturas
  createFatura: (f: Omit<Fatura, 'id' | 'numero' | 'criadoEm'>) => Promise<Fatura>
  saveFatura: (f: Fatura) => Promise<void>
  deleteFatura: (id: string) => Promise<void>
  faturarOrcamento: (
    orcamento: Orcamento,
    dataVencimento: string,
    formaPagamento: FormaPagamento,
  ) => Promise<Fatura>
  registrarPagamento: (p: Omit<Pagamento, 'id'>) => Promise<void>
  deletePagamento: (id: string) => Promise<void>
  createVendaRapida: (
    v: Omit<VendaRapida, 'id' | 'numero' | 'criadoEm'>,
  ) => Promise<VendaRapida>
  deleteVendaRapida: (id: string) => Promise<void>
  pagamentosDaFatura: (faturaId: string) => Pagamento[]
  valorPago: (faturaId: string) => number
  /** Status de exibição: considera atraso pelo vencimento */
  faturaStatusEfetivo: (f: Fatura) => FaturaStatus | 'atrasada'
  // Contas a pagar
  saveContaPagar: (c: ContaPagar) => Promise<void>
  deleteContaPagar: (id: string) => Promise<void>
  // Produção (Kanban)
  saveProducaoCard: (c: ProducaoCard) => Promise<void>
  deleteProducaoCard: (id: string) => Promise<void>
  moverCard: (id: string, etapa: EtapaProducao, ordem: number) => Promise<void>
  /** Cria cards para faturas (não canceladas) que ainda não têm um. */
  garantirCardsFaturas: () => Promise<void>
  /** Envia um documento (PDF em base64) por e-mail via Edge Function + Resend. */
  enviarEmailDocumento: (payload: {
    para: string
    assunto: string
    html: string
    pdfBase64: string
    nomeArquivo: string
    replyTo?: string
    remetenteNome?: string
  }) => Promise<void>
  // Empresa
  saveEmpresa: (e: Empresa) => Promise<void>
  // Backup
  exportBackup: () => void
  importBackup: (file: File) => Promise<string>
}

const DataContext = createContext<DataContextValue | null>(null)

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData fora do DataProvider')
  return ctx
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { cloudMode, session } = useAuth()
  const { showToast } = useToast()
  const [db, setDb] = useState<Database>(emptyDatabase())
  const [loading, setLoading] = useState(true)
  const adapterRef = useRef<DataAdapter>(createAdapter(false))

  const ready = !cloudMode || Boolean(session)

  useEffect(() => {
    if (!ready) return
    adapterRef.current = createAdapter(cloudMode)
    setLoading(true)
    adapterRef.current
      .load()
      .then(setDb)
      .catch((err) => {
        console.error(err)
        showToast('Erro ao carregar dados: ' + (err.message ?? err), 'error')
      })
      .finally(() => setLoading(false))
  }, [ready, cloudMode, showToast])

  const run = useCallback(
    async (op: () => Promise<void>, update: (prev: Database) => Database) => {
      try {
        await op()
        setDb((prev) => update(prev))
      } catch (err) {
        console.error(err)
        // Erros do Supabase são objetos { message, ... }, não instâncias de Error
        const msg =
          err instanceof Error
            ? err.message
            : (err as { message?: string })?.message || String(err)
        showToast('Erro ao salvar: ' + msg, 'error')
        throw err
      }
    },
    [showToast],
  )

  const upsertIn = <T extends { id: string }>(list: T[], row: T): T[] => {
    const idx = list.findIndex((r) => r.id === row.id)
    if (idx >= 0) {
      const copy = [...list]
      copy[idx] = row
      return copy
    }
    return [...list, row]
  }

  const value = useMemo<DataContextValue>(() => {
    const a = () => adapterRef.current

    const saveEmpresa = async (e: Empresa) => {
      await run(
        () => a().saveEmpresa(e),
        (prev) => ({ ...prev, empresa: e }),
      )
    }

    const recomputeFaturaStatus = async (faturaId: string, pagamentos: Pagamento[]) => {
      const fatura = db.faturas.find((f) => f.id === faturaId)
      if (!fatura || fatura.status === 'cancelada') return
      const pago = pagamentos
        .filter((p) => p.faturaId === faturaId)
        .reduce((sum, p) => sum + p.valor, 0)
      const status: FaturaStatus = pago >= fatura.total ? 'paga' : pago > 0 ? 'parcial' : 'pendente'
      if (status !== fatura.status) {
        const updated = { ...fatura, status }
        await a().upsert('faturas', updated)
        setDb((prev) => ({ ...prev, faturas: upsertIn(prev.faturas, updated) }))
      }
    }

    return {
      db,
      loading,

      saveCliente: (c) =>
        run(
          () => a().upsert('clientes', c),
          (prev) => ({ ...prev, clientes: upsertIn(prev.clientes, c) }),
        ),
      deleteCliente: (id) =>
        run(
          () => a().remove('clientes', id),
          (prev) => ({ ...prev, clientes: prev.clientes.filter((c) => c.id !== id) }),
        ),
      clienteById: (id) => db.clientes.find((c) => c.id === id),

      saveItem: (i) =>
        run(
          () => a().upsert('itens', i),
          (prev) => ({ ...prev, itens: upsertIn(prev.itens, i) }),
        ),
      deleteItem: (id) =>
        run(
          () => a().remove('itens', id),
          (prev) => ({ ...prev, itens: prev.itens.filter((i) => i.id !== id) }),
        ),

      createOrcamento: async (data) => {
        // Reserva o número de forma atômica no servidor (evita duplicatas).
        const seq = await a().proximoNumero('orcamento')
        const numero = `${db.empresa.prefixoOrcamento}${seq}`
        const orcamento: Orcamento = {
          ...data,
          id: crypto.randomUUID(),
          numero,
          criadoEm: new Date().toISOString(),
        }
        await run(
          () => a().upsert('orcamentos', orcamento),
          (prev) => ({
            ...prev,
            orcamentos: upsertIn(prev.orcamentos, orcamento),
            // O contador já foi incrementado no servidor; só espelha localmente.
            empresa: {
              ...prev.empresa,
              proximoNumOrcamento: Math.max(prev.empresa.proximoNumOrcamento, seq + 1),
            },
          }),
        )
        return orcamento
      },
      saveOrcamento: (o) =>
        run(
          () => a().upsert('orcamentos', o),
          (prev) => ({ ...prev, orcamentos: upsertIn(prev.orcamentos, o) }),
        ),
      deleteOrcamento: (id) =>
        run(
          () => a().remove('orcamentos', id),
          (prev) => ({ ...prev, orcamentos: prev.orcamentos.filter((o) => o.id !== id) }),
        ),
      setOrcamentoStatus: async (id, status) => {
        const o = db.orcamentos.find((x) => x.id === id)
        if (!o) return
        const updated = { ...o, status }
        await run(
          () => a().upsert('orcamentos', updated),
          (prev) => ({ ...prev, orcamentos: upsertIn(prev.orcamentos, updated) }),
        )
      },

      createFatura: async (data) => {
        const seq = await a().proximoNumero('fatura')
        const numero = `FAT-${seq}`
        const fatura: Fatura = {
          ...data,
          id: crypto.randomUUID(),
          numero,
          criadoEm: new Date().toISOString(),
        }
        const card = novoCardParaFatura(fatura)
        await run(
          async () => {
            await a().upsert('faturas', fatura)
            await a().upsert('producaoCards', card)
          },
          (prev) => ({
            ...prev,
            faturas: upsertIn(prev.faturas, fatura),
            producaoCards: [...prev.producaoCards, card],
            empresa: {
              ...prev.empresa,
              proximoNumFatura: Math.max(prev.empresa.proximoNumFatura, seq + 1),
            },
          }),
        )
        return fatura
      },
      saveFatura: (f) =>
        run(
          () => a().upsert('faturas', f),
          (prev) => ({ ...prev, faturas: upsertIn(prev.faturas, f) }),
        ),
      deleteFatura: async (id) => {
        const pagamentos = db.pagamentos.filter((p) => p.faturaId === id)
        const cards = db.producaoCards.filter((c) => c.faturaId === id)
        await run(
          async () => {
            for (const p of pagamentos) await a().remove('pagamentos', p.id)
            for (const c of cards) await a().remove('producaoCards', c.id)
            await a().remove('faturas', id)
          },
          (prev) => ({
            ...prev,
            faturas: prev.faturas.filter((f) => f.id !== id),
            pagamentos: prev.pagamentos.filter((p) => p.faturaId !== id),
            producaoCards: prev.producaoCards.filter((c) => c.faturaId !== id),
          }),
        )
      },

      createVendaRapida: async (data) => {
        const id = crypto.randomUUID()
        const sufixo = id.replaceAll('-', '').slice(0, 6).toUpperCase()
        const venda: VendaRapida = {
          ...data,
          id,
          numero: `PDV-${data.data.replaceAll('-', '')}-${sufixo}`,
          criadoEm: new Date().toISOString(),
        }
        await run(
          () => a().upsert('vendasRapidas', venda),
          (prev) => ({ ...prev, vendasRapidas: [...prev.vendasRapidas, venda] }),
        )
        return venda
      },
      deleteVendaRapida: (id) =>
        run(
          () => a().remove('vendasRapidas', id),
          (prev) => ({
            ...prev,
            vendasRapidas: prev.vendasRapidas.filter((v) => v.id !== id),
          }),
        ),

      faturarOrcamento: async (orcamento, dataVencimento, formaPagamento) => {
        const seq = await a().proximoNumero('fatura')
        const numero = `FAT-${seq}`
        const fatura: Fatura = {
          id: crypto.randomUUID(),
          numero,
          orcamentoId: orcamento.id,
          clienteId: orcamento.clienteId,
          dataEmissao: todayISO(),
          dataVencimento,
          formaPagamento,
          itens: orcamento.itens,
          subtotal: orcamento.subtotal,
          frete: orcamento.frete,
          impostoPadrao: orcamento.impostoPadrao,
          desconto: orcamento.desconto,
          total: orcamento.total,
          observacoes: `Referente ao orçamento ${orcamento.numero}`,
          condicoesPagamento: orcamento.condicoesPagamento,
          status: 'pendente',
          criadoEm: new Date().toISOString(),
        }
        const updatedOrc: Orcamento = { ...orcamento, status: 'faturado' }

        // Cria um card de produção na primeira etapa (Arte), no topo da coluna
        const primeiro = orcamento.itens[0]?.descricao || 'Trabalho'
        const extras = orcamento.itens.length - 1
        const card: ProducaoCard = {
          id: crypto.randomUUID(),
          faturaId: fatura.id,
          clienteId: orcamento.clienteId,
          titulo: extras > 0 ? `${primeiro} +${extras}` : primeiro,
          etapa: 'arte',
          prazoEntrega: orcamento.prazoEntrega,
          dataEntrega: null,
          observacao: '',
          ordem: ordemTopo(), // topo da coluna (menor = primeiro)
          criadoEm: new Date().toISOString(),
        }

        await run(
          async () => {
            await a().upsert('faturas', fatura)
            await a().upsert('orcamentos', updatedOrc)
            await a().upsert('producaoCards', card)
          },
          (prev) => ({
            ...prev,
            faturas: upsertIn(prev.faturas, fatura),
            orcamentos: upsertIn(prev.orcamentos, updatedOrc),
            producaoCards: [...prev.producaoCards, card],
            empresa: {
              ...prev.empresa,
              proximoNumFatura: Math.max(prev.empresa.proximoNumFatura, seq + 1),
            },
          }),
        )
        return fatura
      },

      registrarPagamento: async (data) => {
        const pagamento: Pagamento = { ...data, id: crypto.randomUUID() }
        await run(
          () => a().upsert('pagamentos', pagamento),
          (prev) => ({ ...prev, pagamentos: [...prev.pagamentos, pagamento] }),
        )
        await recomputeFaturaStatus(pagamento.faturaId, [...db.pagamentos, pagamento])
      },
      deletePagamento: async (id) => {
        const pagamento = db.pagamentos.find((p) => p.id === id)
        await run(
          () => a().remove('pagamentos', id),
          (prev) => ({ ...prev, pagamentos: prev.pagamentos.filter((p) => p.id !== id) }),
        )
        if (pagamento) {
          await recomputeFaturaStatus(
            pagamento.faturaId,
            db.pagamentos.filter((p) => p.id !== id),
          )
        }
      },
      pagamentosDaFatura: (faturaId) => db.pagamentos.filter((p) => p.faturaId === faturaId),
      valorPago: (faturaId) =>
        db.pagamentos
          .filter((p) => p.faturaId === faturaId)
          .reduce((sum, p) => sum + p.valor, 0),
      faturaStatusEfetivo: (f) => {
        if (f.status === 'pendente' || f.status === 'parcial') {
          if (isPast(f.dataVencimento)) return 'atrasada'
        }
        return f.status
      },

      saveContaPagar: (c) =>
        run(
          () => a().upsert('contasPagar', c),
          (prev) => ({ ...prev, contasPagar: upsertIn(prev.contasPagar, c) }),
        ),
      deleteContaPagar: (id) =>
        run(
          () => a().remove('contasPagar', id),
          (prev) => ({ ...prev, contasPagar: prev.contasPagar.filter((c) => c.id !== id) }),
        ),

      saveProducaoCard: (c) =>
        run(
          () => a().upsert('producaoCards', c),
          (prev) => ({ ...prev, producaoCards: upsertIn(prev.producaoCards, c) }),
        ),
      garantirCardsFaturas: async () => {
        const faltando = db.faturas.filter(
          (f) => f.status !== 'cancelada' && !db.producaoCards.some((c) => c.faturaId === f.id),
        )
        if (faltando.length === 0) return
        const novos = faltando.map(novoCardParaFatura)
        await run(
          async () => {
            for (const c of novos) await a().upsert('producaoCards', c)
          },
          (prev) => ({ ...prev, producaoCards: [...prev.producaoCards, ...novos] }),
        )
      },
      deleteProducaoCard: (id) =>
        run(
          () => a().remove('producaoCards', id),
          (prev) => ({
            ...prev,
            producaoCards: prev.producaoCards.filter((c) => c.id !== id),
          }),
        ),
      moverCard: async (id, etapa, ordem) => {
        const card = db.producaoCards.find((c) => c.id === id)
        if (!card) return
        const updated = { ...card, etapa, ordem }
        await run(
          () => a().upsert('producaoCards', updated),
          (prev) => ({ ...prev, producaoCards: upsertIn(prev.producaoCards, updated) }),
        )
      },

      enviarEmailDocumento: async (payload) => {
        if (!cloudMode || !supabase) {
          throw new Error('O envio de e-mail só funciona no modo nuvem. Configure o Supabase.')
        }
        const { data, error } = await supabase.functions.invoke('enviar-email', { body: payload })
        if (error) throw error
        if (data && data.ok === false) throw new Error(data.erro || 'Falha ao enviar o e-mail')
      },

      saveEmpresa,

      exportBackup: () => {
        const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `backup_grafica_${todayISO()}.json`
        link.click()
        URL.revokeObjectURL(url)
      },

      importBackup: async (file) => {
        const text = await file.text()
        const parsed = JSON.parse(text)
        let newDb: Database
        let resumo: string
        if (isLegacyBackup(parsed)) {
          const result = migrateLegacyBackup(parsed)
          newDb = result.db
          resumo = result.resumo + ' (convertidos do sistema antigo)'
        } else {
          newDb = { ...emptyDatabase(), ...parsed }
          resumo = 'backup restaurado'
        }
        await a().replaceAll(newDb)
        setDb(newDb)
        return resumo
      },
    }
  }, [db, loading, run, cloudMode])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
