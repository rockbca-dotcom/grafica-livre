import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { FormaPagamento, Item, VendaRapidaItem } from '../types'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import {
  Button, Card, EmptyState, Field, KpiCard, MoneyInput, PageHeader, inputClass,
} from '../components/ui'
import { formatCents } from '../lib/money'
import { formatDateBR, todayISO } from '../lib/dates'

const FORMAS_PAGAMENTO: [FormaPagamento, string][] = [
  ['pix', 'PIX'],
  ['dinheiro', 'Dinheiro'],
  ['cartao_debito', 'Cartão de débito'],
  ['cartao_credito', 'Cartão de crédito'],
  ['transferencia', 'Transferência'],
  ['boleto', 'Boleto'],
]

function formaPagamentoLabel(forma: FormaPagamento): string {
  return FORMAS_PAGAMENTO.find(([value]) => value === forma)?.[1] ?? forma
}

function precoPadrao(item: Item): number {
  return item.precoUnitario || item.precoM2
}

function tipoPreco(item: Item): string {
  return item.precoUnitario ? 'preço unitário' : item.precoM2 ? 'preço por m²' : 'sem preço'
}

export default function Pdv() {
  const { db, clienteById, createVendaRapida } = useData()
  const { showToast } = useToast()
  const [busca, setBusca] = useState('')
  const [carrinho, setCarrinho] = useState<VendaRapidaItem[]>([])
  const [clienteId, setClienteId] = useState('')
  const [data, setData] = useState(todayISO())
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix')
  const [observacao, setObservacao] = useState('')
  const [descricaoAvulsa, setDescricaoAvulsa] = useState('')
  const [valorAvulso, setValorAvulso] = useState(0)
  const [salvando, setSalvando] = useState(false)

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return db.itens
      .filter((item) => !termo || `${item.nome} ${item.descricao}`.toLowerCase().includes(termo))
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [db.itens, busca])

  const total = carrinho.reduce((sum, linha) => sum + linha.total, 0)
  const vendasHoje = useMemo(
    () => db.vendasRapidas.filter((venda) => venda.data === todayISO()),
    [db.vendasRapidas],
  )
  const totalHoje = vendasHoje.reduce((sum, venda) => sum + venda.total, 0)
  const recentes = useMemo(
    () => [...db.vendasRapidas].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).slice(0, 8),
    [db.vendasRapidas],
  )

  const adicionarItem = (item: Item) => {
    const valorUnit = precoPadrao(item)
    if (!valorUnit) {
      showToast('Defina um preço no catálogo antes de adicionar este item.', 'error')
      return
    }
    setCarrinho((atual) => {
      const existente = atual.find((linha) => linha.itemId === item.id)
      if (existente) {
        return atual.map((linha) =>
          linha.id === existente.id
            ? { ...linha, qtd: linha.qtd + 1, total: (linha.qtd + 1) * linha.valorUnit }
            : linha,
        )
      }
      return [
        ...atual,
        {
          id: crypto.randomUUID(),
          itemId: item.id,
          descricao: item.nome,
          qtd: 1,
          valorUnit,
          total: valorUnit,
        },
      ]
    })
  }

  const adicionarAvulso = () => {
    const descricao = descricaoAvulsa.trim()
    if (!descricao || valorAvulso <= 0) {
      showToast('Informe a descrição e um valor válido para o item avulso.', 'error')
      return
    }
    setCarrinho((atual) => [
      ...atual,
      {
        id: crypto.randomUUID(),
        itemId: null,
        descricao,
        qtd: 1,
        valorUnit: valorAvulso,
        total: valorAvulso,
      },
    ])
    setDescricaoAvulsa('')
    setValorAvulso(0)
  }

  const atualizarLinha = (id: string, patch: Partial<VendaRapidaItem>) => {
    setCarrinho((atual) =>
      atual.map((linha) => {
        if (linha.id !== id) return linha
        const qtd = Math.max(1, Number(patch.qtd ?? linha.qtd))
        const valorUnit = Math.max(0, Number(patch.valorUnit ?? linha.valorUnit))
        return { ...linha, ...patch, qtd, valorUnit, total: qtd * valorUnit }
      }),
    )
  }

  const finalizarVenda = async (event: FormEvent) => {
    event.preventDefault()
    if (carrinho.length === 0) {
      showToast('Adicione pelo menos um item à venda.', 'error')
      return
    }
    if (total <= 0) {
      showToast('O total da venda precisa ser maior que zero.', 'error')
      return
    }
    setSalvando(true)
    try {
      const venda = await createVendaRapida({
        clienteId: clienteId || null,
        data,
        formaPagamento,
        itens: carrinho,
        total,
        observacao: observacao.trim(),
      })
      showToast(`Venda ${venda.numero} registrada no caixa.`)
      setCarrinho([])
      setClienteId('')
      setObservacao('')
      setData(todayISO())
      setFormaPagamento('pix')
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="PDV — Venda rápida"
        subtitle="Registre vendas de balcão diretamente no caixa, sem criar pedidos."
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Vendas hoje" value={String(vendasHoje.length)} to="/pdv" />
        <KpiCard label="Recebido hoje" value={formatCents(totalHoje)} tone="good" to="/relatorios" />
        <KpiCard
          label="Itens no carrinho"
          value={String(carrinho.reduce((sum, linha) => sum + linha.qtd, 0))}
          hint={carrinho.length ? formatCents(total) : 'Pronto para começar'}
        />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden border border-slate-200 p-0">
          <div className="bg-slate-900 px-5 py-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                  Balcão aberto
                </p>
                <h2 className="mt-1 text-xl font-bold">Escolha os itens da venda</h2>
              </div>
              <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-300">
                {db.itens.length} no catálogo
              </span>
            </div>
            <input
              className="mt-5 w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/30"
              placeholder="Buscar produto ou serviço..."
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              aria-label="Buscar produto ou serviço"
            />
          </div>

          <div className="p-5">
            {itensFiltrados.length === 0 ? (
              <EmptyState
                icon="📦"
                title="Nenhum item encontrado"
                hint="Cadastre itens no catálogo ou lance um item avulso abaixo."
              />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {itensFiltrados.map((item) => {
                  const preco = precoPadrao(item)
                  return (
                    <button
                      type="button"
                      key={item.id}
                      disabled={!preco}
                      onClick={() => adicionarItem(item)}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-800">{item.nome}</span>
                        <span className="mt-0.5 block text-xs text-slate-400">{tipoPreco(item)}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-semibold text-slate-700">
                          {preco ? formatCents(preco) : 'Sem preço'}
                        </span>
                        <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                          + adicionar
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-slate-700">Item avulso</h3>
                <p className="text-xs text-slate-400">Para uma venda que ainda não está no catálogo.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_150px_auto] sm:items-end">
                <Field label="Descrição">
                  <input
                    className={inputClass}
                    placeholder="Ex.: ajuste de arte"
                    value={descricaoAvulsa}
                    onChange={(event) => setDescricaoAvulsa(event.target.value)}
                  />
                </Field>
                <Field label="Valor">
                  <MoneyInput valueCents={valorAvulso} onChangeCents={setValorAvulso} />
                </Field>
                <Button type="button" variant="secondary" onClick={adicionarAvulso}>
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="xl:sticky xl:top-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Venda atual</p>
              <h2 className="text-xl font-bold text-slate-800">Carrinho</h2>
            </div>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
              {carrinho.length} linha(s)
            </span>
          </div>

          {carrinho.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <div className="mb-2 text-4xl">🛒</div>
              <p className="text-sm font-medium text-slate-600">Seu carrinho está vazio</p>
              <p className="mt-1 text-xs text-slate-400">Clique em um item para iniciar a venda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {carrinho.map((linha) => (
                <div key={linha.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-700">{linha.descricao}</p>
                    <button
                      type="button"
                      onClick={() => setCarrinho((atual) => atual.filter((item) => item.id !== linha.id))}
                      className="text-xs font-medium text-slate-400 hover:text-red-500"
                      aria-label={`Remover ${linha.descricao}`}
                    >
                      Remover
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-[70px_1fr_auto] items-end gap-2">
                    <Field label="Qtd.">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className={inputClass}
                        value={linha.qtd}
                        onChange={(event) => atualizarLinha(linha.id, { qtd: Number(event.target.value) })}
                      />
                    </Field>
                    <Field label="Valor unit.">
                      <MoneyInput
                        valueCents={linha.valorUnit}
                        onChangeCents={(value) => atualizarLinha(linha.id, { valorUnit: value })}
                      />
                    </Field>
                    <span className="pb-2 text-right text-sm font-bold text-slate-800">
                      {formatCents(linha.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={finalizarVenda}>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <div className="mb-4 flex items-end justify-between">
                <span className="text-sm font-medium text-slate-500">Total da venda</span>
                <span className="text-3xl font-black tracking-tight text-slate-900">{formatCents(total)}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Forma de pagamento">
                  <select
                    className={inputClass}
                    value={formaPagamento}
                    onChange={(event) => setFormaPagamento(event.target.value as FormaPagamento)}
                  >
                    {FORMAS_PAGAMENTO.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Data">
                  <input
                    type="date"
                    className={inputClass}
                    value={data}
                    onChange={(event) => setData(event.target.value)}
                  />
                </Field>
              </div>
              <Field label="Cliente (opcional)" className="mt-3">
                <select
                  className={inputClass}
                  value={clienteId}
                  onChange={(event) => setClienteId(event.target.value)}
                >
                  <option value="">Venda balcão — sem cliente</option>
                  {db.clientes
                    .slice()
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                    .map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
                </select>
              </Field>
              <Field label="Observação" className="mt-3">
                <textarea
                  className={`${inputClass} min-h-16 resize-y`}
                  placeholder="Opcional"
                  value={observacao}
                  onChange={(event) => setObservacao(event.target.value)}
                />
              </Field>
              <Button type="submit" className="mt-4 w-full py-3" disabled={salvando || carrinho.length === 0}>
                {salvando ? 'Registrando...' : 'Registrar venda no caixa'}
              </Button>
              <p className="mt-2 text-center text-xs text-slate-400">
                Esta venda entra no financeiro, mas não vira fatura nem pedido de produção.
              </p>
            </div>
          </form>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Últimas vendas rápidas</h2>
            <p className="text-xs text-slate-400">Histórico separado das faturas e dos pedidos.</p>
          </div>
          <span className="text-xs text-slate-400">{db.vendasRapidas.length} no total</span>
        </div>
        {recentes.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Nenhuma venda rápida registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Número</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Pagamento</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentes.map((venda) => (
                  <tr key={venda.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-medium text-slate-700">{venda.numero}</td>
                    <td className="px-3 py-2">{formatDateBR(venda.data)}</td>
                    <td className="px-3 py-2">{venda.clienteId ? clienteById(venda.clienteId)?.nome ?? 'Cliente removido' : 'Balcão'}</td>
                    <td className="px-3 py-2">{formaPagamentoLabel(venda.formaPagamento)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatCents(venda.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
