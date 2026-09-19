import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { EtapaProducao, Fatura, ProducaoCard } from '../types'
import { ETAPAS_PRODUCAO } from '../types'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import {
  Button, ConfirmDialog, CountBadge, EmptyState, Field, Modal, PageHeader, StatusBadge, inputClass,
} from '../components/ui'
import { formatCents } from '../lib/money'
import { formatDateBR, isPast } from '../lib/dates'
import { ReceberForm } from './Faturas'

const ETAPA_INDEX: Record<EtapaProducao, number> = {
  arte: 0, impressao: 1, acabamento: 2, pronto: 3, entregue: 4,
}

const COLUNA_COR: Record<EtapaProducao, string> = {
  arte: 'border-t-purple-400',
  impressao: 'border-t-blue-400',
  acabamento: 'border-t-amber-400',
  pronto: 'border-t-emerald-400',
  entregue: 'border-t-slate-400',
}

function novoCard(): ProducaoCard {
  return {
    id: crypto.randomUUID(),
    faturaId: null,
    clienteId: '',
    titulo: '',
    etapa: 'arte',
    prazoEntrega: '',
    dataEntrega: null,
    observacao: '',
    ordem: -Math.floor(Date.now() / 1000), // segundos: cabe no int do Postgres
    criadoEm: new Date().toISOString(),
  }
}

export default function Producao() {
  const {
    db, clienteById, saveProducaoCard, deleteProducaoCard, moverCard,
    garantirCardsFaturas, valorPago, faturaStatusEfetivo,
    registrarPagamento, deletePagamento, pagamentosDaFatura,
  } = useData()
  const { showToast } = useToast()
  const [editing, setEditing] = useState<ProducaoCard | null>(null)
  const [arquivar, setArquivar] = useState<ProducaoCard | null>(null)
  const [detalhe, setDetalhe] = useState<ProducaoCard | null>(null)
  const [recebendo, setRecebendo] = useState<Fatura | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<EtapaProducao | null>(null)

  // Garante que toda fatura tenha um card (inclui as já existentes)
  useEffect(() => {
    garantirCardsFaturas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const porEtapa = useMemo(() => {
    const mapa: Record<EtapaProducao, ProducaoCard[]> = {
      arte: [], impressao: [], acabamento: [], pronto: [], entregue: [],
    }
    for (const card of db.producaoCards) {
      // Etapa desconhecida cai em "arte" para não quebrar a coluna nem sumir o card
      const etapa = mapa[card.etapa] ? card.etapa : 'arte'
      mapa[etapa].push(card)
    }
    for (const etapa of Object.keys(mapa) as EtapaProducao[]) {
      mapa[etapa].sort((a, b) => a.ordem - b.ordem)
    }
    return mapa
  }, [db.producaoCards])

  const soltarNaColuna = async (etapa: EtapaProducao) => {
    setDragOver(null)
    const id = dragId
    setDragId(null)
    if (!id) return
    const card = db.producaoCards.find((c) => c.id === id)
    if (!card || card.etapa === etapa) return
    // Coloca no fim da coluna de destino
    const maxOrdem = Math.max(0, ...porEtapa[etapa].map((c) => c.ordem))
    await moverCard(id, etapa, maxOrdem + 1)
  }

  const moverPorBotao = async (card: ProducaoCard, delta: 1 | -1) => {
    const novoIndex = ETAPA_INDEX[card.etapa] + delta
    if (novoIndex < 0 || novoIndex > 4) return
    const etapa = ETAPAS_PRODUCAO[novoIndex][0]
    const maxOrdem = Math.max(0, ...porEtapa[etapa].map((c) => c.ordem))
    await moverCard(card.id, etapa, maxOrdem + 1)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    if (!editing.clienteId) {
      showToast('Selecione o cliente.', 'error')
      return
    }
    await saveProducaoCard(editing)
    showToast('Card salvo!')
    setEditing(null)
  }

  const total = db.producaoCards.length

  return (
    <div>
      <PageHeader
        title="Produção"
        subtitle="Acompanhe cada trabalho da arte até a entrega"
        actions={<Button onClick={() => setEditing(novoCard())}>+ Novo card</Button>}
      />

      {total === 0 ? (
        <EmptyState
          icon="🏭"
          title="Nenhum trabalho em produção"
          hint="Ao faturar um orçamento, um card entra automaticamente em “Arte”. Ou crie um card manual."
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ETAPAS_PRODUCAO.map(([etapa, label]) => (
            <div
              key={etapa}
              className={`flex w-[85vw] max-w-xs shrink-0 flex-col rounded-xl border-t-4 bg-slate-50 sm:w-72 ${COLUNA_COR[etapa]} ${
                dragOver === etapa ? 'ring-2 ring-blue-400' : ''
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(etapa)
              }}
              onDragLeave={() => setDragOver((cur) => (cur === etapa ? null : cur))}
              onDrop={() => soltarNaColuna(etapa)}
            >
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                <CountBadge count={porEtapa[etapa].length} />
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3 max-h-[calc(100vh-16rem)]">
                {porEtapa[etapa].map((card) => {
                  const cliente = clienteById(card.clienteId)
                  const fatura = card.faturaId
                    ? db.faturas.find((f) => f.id === card.faturaId)
                    : null
                  const atrasado = card.dataEntrega && isPast(card.dataEntrega)
                  const pago = fatura ? valorPago(fatura.id) : 0
                  const saldo = fatura ? fatura.total - pago : 0
                  const idx = ETAPA_INDEX[card.etapa]
                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => setDragId(card.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setDetalhe(card)}
                      className={`cursor-pointer rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 hover:ring-blue-300 ${
                        dragId === card.id ? 'opacity-50' : ''
                      }`}
                      title="Clique para ver os produtos"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">{card.titulo}</p>
                        <button
                          className="shrink-0 text-slate-300 hover:text-blue-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditing({ ...card })
                          }}
                          title="Editar card"
                          aria-label="Editar card"
                        >
                          ✎
                        </button>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{cliente?.nome ?? '—'}</p>
                      {fatura && (
                        <p className="text-xs text-slate-400">{fatura.numero}</p>
                      )}
                      {card.prazoEntrega && (
                        <p className="mt-1 text-xs text-slate-500">🕒 {card.prazoEntrega}</p>
                      )}
                      {card.dataEntrega && (
                        <p className={`text-xs ${atrasado ? 'font-medium text-red-500' : 'text-slate-400'}`}>
                          📅 {formatDateBR(card.dataEntrega)}
                          {atrasado ? ' (atrasado)' : ''}
                        </p>
                      )}
                      {fatura && (
                        <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                          <div>
                            <p className={`text-xs font-semibold ${saldo > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {saldo > 0 ? `${formatCents(saldo)} em aberto` : 'Pagamento concluído'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {formatCents(pago)} de {formatCents(fatura.total)} pago
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <StatusBadge status={faturaStatusEfetivo(fatura)} />
                            {fatura.status !== 'paga' && fatura.status !== 'cancelada' && (
                              <Button
                                type="button"
                                small
                                variant="success"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setRecebendo(fatura)
                                }}
                              >
                                Receber
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex gap-1">
                          <button
                            disabled={idx === 0}
                            onClick={(e) => { e.stopPropagation(); moverPorBotao(card, -1) }}
                            className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                            title="Etapa anterior"
                            aria-label="Etapa anterior"
                          >
                            ‹
                          </button>
                          <button
                            disabled={idx === 4}
                            onClick={(e) => { e.stopPropagation(); moverPorBotao(card, 1) }}
                            className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                            title="Próxima etapa"
                            aria-label="Próxima etapa"
                          >
                            ›
                          </button>
                        </div>
                        {card.etapa === 'entregue' && (
                          <button
                            className="text-xs text-red-400 hover:text-red-600"
                            onClick={(e) => { e.stopPropagation(); setArquivar(card) }}
                          >
                            arquivar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {porEtapa[etapa].length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-slate-300">
                    Arraste cards para cá
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form de card */}
      <Modal
        open={editing !== null}
        title={
          editing && db.producaoCards.some((c) => c.id === editing.id)
            ? 'Editar card'
            : 'Novo card de produção'
        }
        onClose={() => setEditing(null)}
      >
        {editing && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Título *" className="sm:col-span-2">
              <input
                required
                className={inputClass}
                value={editing.titulo}
                onChange={(e) => setEditing({ ...editing, titulo: e.target.value })}
                placeholder="Ex.: Banner 3x1m para inauguração"
              />
            </Field>
            <Field label="Cliente *">
              <select
                className={inputClass}
                value={editing.clienteId}
                onChange={(e) => setEditing({ ...editing, clienteId: e.target.value })}
              >
                <option value="">— Selecione —</option>
                {[...db.clientes]
                  .sort((a, b) => a.nome.localeCompare(b.nome))
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
              </select>
            </Field>
            <Field label="Etapa">
              <select
                className={inputClass}
                value={editing.etapa}
                onChange={(e) =>
                  setEditing({ ...editing, etapa: e.target.value as EtapaProducao })
                }
              >
                {ETAPAS_PRODUCAO.map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Prazo de entrega (texto)">
              <input
                className={inputClass}
                value={editing.prazoEntrega}
                onChange={(e) => setEditing({ ...editing, prazoEntrega: e.target.value })}
                placeholder="Ex.: 5 dias úteis"
              />
            </Field>
            <Field label="Data de entrega">
              <input
                type="date"
                className={inputClass}
                value={editing.dataEntrega ?? ''}
                onChange={(e) =>
                  setEditing({ ...editing, dataEntrega: e.target.value || null })
                }
              />
            </Field>
            <Field label="Observação" className="sm:col-span-2">
              <textarea
                className={`${inputClass} min-h-16`}
                value={editing.observacao}
                onChange={(e) => setEditing({ ...editing, observacao: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Detalhes do card: itens da fatura */}
      <Modal
        open={detalhe !== null}
        title={detalhe?.titulo ?? 'Detalhes'}
        onClose={() => setDetalhe(null)}
      >
        {detalhe && (() => {
          const fatura = detalhe.faturaId
            ? db.faturas.find((f) => f.id === detalhe.faturaId)
            : undefined
          const cliente = clienteById(detalhe.clienteId)
          return (
            <div className="flex flex-col gap-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-slate-500">Cliente</span>
                <span className="text-right font-medium">{cliente?.nome ?? '—'}</span>
                {fatura && (
                  <>
                    <span className="text-slate-500">Fatura</span>
                    <span className="text-right">{fatura.numero}</span>
                  </>
                )}
                <span className="text-slate-500">Etapa</span>
                <span className="text-right">
                  {ETAPAS_PRODUCAO.find(([e]) => e === detalhe.etapa)?.[1]}
                </span>
                {detalhe.prazoEntrega && (
                  <>
                    <span className="text-slate-500">Prazo</span>
                    <span className="text-right">{detalhe.prazoEntrega}</span>
                  </>
                )}
              </div>

              {fatura ? (
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase text-slate-500">Produtos</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                          <th className="py-1.5 pr-2">Descrição</th>
                          <th className="py-1.5 px-2 text-center">Qtd</th>
                          <th className="py-1.5 px-2 text-center">m²</th>
                          <th className="py-1.5 pl-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fatura.itens.map((it, i) => (
                          <tr key={i} className="border-b border-slate-100 last:border-0">
                            <td className="py-1.5 pr-2">{it.descricao}</td>
                            <td className="py-1.5 px-2 text-center">{it.qtd}</td>
                            <td className="py-1.5 px-2 text-center">
                              {it.m2 ? it.m2.toFixed(2) : '-'}
                            </td>
                            <td className="py-1.5 pl-2 text-right">{formatCents(it.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold">
                    <span>Total</span>
                    <span className="text-blue-700">{formatCents(fatura.total)}</span>
                  </div>
                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase text-slate-500">Pagamento</span>
                      <StatusBadge status={faturaStatusEfetivo(fatura)} />
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="text-slate-500">Total</p>
                        <p className="font-semibold text-slate-700">{formatCents(fatura.total)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Pago</p>
                        <p className="font-semibold text-emerald-700">{formatCents(valorPago(fatura.id))}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Em aberto</p>
                        <p className="font-semibold text-amber-700">
                          {formatCents(Math.max(0, fatura.total - valorPago(fatura.id)))}
                        </p>
                      </div>
                    </div>
                    {fatura.status !== 'paga' && fatura.status !== 'cancelada' && (
                      <div className="mt-3 flex justify-end">
                        <Button small variant="success" onClick={() => {
                          setDetalhe(null)
                          setRecebendo(fatura)
                        }}>
                          Receber pagamento
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-slate-500">
                  {detalhe.observacao || 'Card manual (sem fatura vinculada).'}
                </p>
              )}

              <div className="mt-1 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => { setEditing({ ...detalhe }); setDetalhe(null) }}>
                  Editar card
                </Button>
                <Button onClick={() => setDetalhe(null)}>Fechar</Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      <Modal
        open={recebendo !== null}
        title={`Receber — Fatura ${recebendo?.numero ?? ''}`}
        onClose={() => setRecebendo(null)}
      >
        {recebendo && (
          <ReceberForm
            fatura={recebendo}
            valorPago={valorPago(recebendo.id)}
            pagamentos={pagamentosDaFatura(recebendo.id)}
            onRegistrar={async (p) => {
              await registrarPagamento(p)
              showToast('Pagamento registrado!')
              setRecebendo(null)
            }}
            onDeletePagamento={async (id) => {
              await deletePagamento(id)
              showToast('Pagamento removido.')
              setRecebendo(null)
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={arquivar !== null}
        title="Arquivar card"
        message={`Remover "${arquivar?.titulo}" do quadro? O trabalho já foi entregue.`}
        confirmLabel="Arquivar"
        danger
        onCancel={() => setArquivar(null)}
        onConfirm={async () => {
          if (arquivar) {
            await deleteProducaoCard(arquivar.id)
            showToast('Card arquivado.')
          }
          setArquivar(null)
        }}
      />
    </div>
  )
}
