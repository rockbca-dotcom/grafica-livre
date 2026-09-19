import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Fatura, FormaPagamento, Pagamento } from '../types'
import { emailsDoCliente } from '../types'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  Button, Card, ConfirmDialog, DataTable, EmptyState, Field, Modal,
  MoneyInput, PageHeader, SearchBox, StatusBadge, inputClass,
} from '../components/ui'
import ItensEditor, { novoDocumentoItem } from '../components/ItensEditor'
import ClienteSelect from '../components/ClienteSelect'
import DocumentoView from '../components/DocumentoView'
import PixModal from '../components/PixModal'
import EnviarEmailModal from '../components/EnviarEmailModal'
import { formatCents } from '../lib/money'
import { calcularTotais } from '../lib/documento'
import { formatDateBR, todayISO } from '../lib/dates'
import { gerarPayloadPix, gerarQrPixDataUrl } from '../lib/pix'
import { msgCobranca, temWhatsapp, waLink } from '../lib/whatsapp'

// pdfmake é pesado (~1 MB de fontes) — carrega só quando o usuário pede um PDF
async function gerarFaturaPdf(
  ...args: Parameters<typeof import('../pdf/documentoPdf')['gerarFaturaPdf']>
) {
  const mod = await import('../pdf/documentoPdf')
  mod.gerarFaturaPdf(...args)
}

async function faturaPdfBase64(
  ...args: Parameters<typeof import('../pdf/documentoPdf')['faturaPdfBase64']>
) {
  const mod = await import('../pdf/documentoPdf')
  return mod.faturaPdfBase64(...args)
}

async function imprimirGuiaRemessa(
  ...args: Parameters<typeof import('../pdf/documentoPdf')['imprimirGuiaRemessa']>
) {
  const mod = await import('../pdf/documentoPdf')
  mod.imprimirGuiaRemessa(...args)
}

const FORMAS: [FormaPagamento, string][] = [
  ['pix', 'PIX'],
  ['dinheiro', 'Dinheiro'],
  ['transferencia', 'Transferência'],
  ['boleto', 'Boleto'],
  ['cartao_credito', 'Cartão de crédito'],
  ['cartao_debito', 'Cartão de débito'],
]

type Draft = Omit<Fatura, 'id' | 'numero' | 'criadoEm'> & {
  id?: string
  numero?: string
  criadoEm?: string
}

function novoDraft(): Draft {
  return {
    orcamentoId: null,
    clienteId: '',
    dataEmissao: todayISO(),
    dataVencimento: todayISO(),
    formaPagamento: 'pix',
    itens: [novoDocumentoItem()],
    subtotal: 0,
    frete: 0,
    impostoPadrao: 0,
    desconto: 0,
    total: 0,
    observacoes: '',
    condicoesPagamento: '',
    status: 'pendente',
  }
}

export default function Faturas() {
  const {
    db, createFatura, saveFatura, deleteFatura, clienteById,
    registrarPagamento, deletePagamento, pagamentosDaFatura, valorPago,
    faturaStatusEfetivo,
  } = useData()
  const { cloudMode } = useAuth()
  const { showToast } = useToast()

  const [search, setSearch] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('todas')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [deleting, setDeleting] = useState<Fatura | null>(null)
  const [recebendo, setRecebendo] = useState<Fatura | null>(null)
  const [pixFatura, setPixFatura] = useState<Fatura | null>(null)
  const [visualizando, setVisualizando] = useState<Fatura | null>(null)
  const [emailFatura, setEmailFatura] = useState<Fatura | null>(null)
  const [saving, setSaving] = useState(false)

  // QR PIX do saldo em aberto (quando há chave), para embutir no PDF
  const montarQrPix = async (f: Fatura): Promise<string | undefined> => {
    const saldo = f.total - valorPago(f.id)
    if (!db.empresa.chavePix || saldo <= 0) return undefined
    const payload = gerarPayloadPix({
      chave: db.empresa.chavePix,
      nomeRecebedor: db.empresa.nome,
      cidade: db.empresa.cidade,
      valorCents: saldo,
      txid: f.numero,
    })
    return gerarQrPixDataUrl(payload)
  }

  // Gera o PDF, embutindo o QR PIX quando há chave e saldo em aberto
  const baixarPdf = async (f: Fatura) => {
    const qr = await montarQrPix(f)
    await gerarFaturaPdf(f, clienteById(f.clienteId), db.empresa, valorPago(f.id), qr)
  }

  // Abre o WhatsApp com a mensagem de cobrança (inclui PIX copia-e-cola)
  const cobrarWhatsapp = (f: Fatura) => {
    const cliente = clienteById(f.clienteId)
    const saldo = f.total - valorPago(f.id)
    let payload: string | undefined
    if (db.empresa.chavePix && saldo > 0) {
      payload = gerarPayloadPix({
        chave: db.empresa.chavePix,
        nomeRecebedor: db.empresa.nome,
        cidade: db.empresa.cidade,
        valorCents: saldo,
        txid: f.numero,
      })
    }
    const link = waLink(cliente?.telefone ?? '', msgCobranca(f, cliente, db.empresa, saldo, payload))
    if (link) window.open(link, '_blank')
    else showToast('Cliente sem telefone válido para WhatsApp.', 'error')
  }

  const rows = useMemo(() => {
    const sorted = [...db.faturas].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    if (statusFiltro === 'todas') return sorted
    return sorted.filter((f) => faturaStatusEfetivo(f) === statusFiltro)
  }, [db.faturas, statusFiltro, faturaStatusEfetivo])

  const totais = draft
    ? calcularTotais(draft.itens, draft.frete, draft.desconto)
    : { subtotal: 0, impostos: 0, total: 0 }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!draft) return
    if (!draft.clienteId) {
      showToast('Selecione o cliente.', 'error')
      return
    }
    const itens = draft.itens.filter((i) => i.descricao.trim())
    if (itens.length === 0) {
      showToast('Adicione pelo menos um produto.', 'error')
      return
    }
    const t = calcularTotais(itens, draft.frete, draft.desconto)
    const dados = { ...draft, itens, subtotal: t.subtotal, total: t.total }
    setSaving(true)
    try {
      if (draft.id) {
        await saveFatura(dados as Fatura)
        showToast('Fatura atualizada!')
      } else {
        const criada = await createFatura(dados)
        showToast(`Fatura ${criada.numero} criada!`)
      }
      setDraft(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Faturas"
        subtitle={`${db.faturas.length} no total`}
        actions={
          <>
            <select
              className={`${inputClass} w-auto`}
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
            >
              <option value="todas">Todas</option>
              <option value="pendente">Pendentes</option>
              <option value="parcial">Parciais</option>
              <option value="atrasada">Atrasadas</option>
              <option value="paga">Pagas</option>
              <option value="cancelada">Canceladas</option>
            </select>
            <SearchBox value={search} onChange={setSearch} placeholder="Buscar fatura..." />
            <Button onClick={() => setDraft(novoDraft())}>+ Nova Fatura</Button>
          </>
        }
      />

      <Card>
        <DataTable
          rows={rows}
          searchText={search}
          searchFields={(f) => [f.numero, clienteById(f.clienteId)?.nome ?? '']}
          empty={
            <EmptyState
              icon="🧾"
              title="Nenhuma fatura"
              hint="Converta um orçamento em fatura ou crie uma diretamente."
            />
          }
          columns={[
            {
              key: 'numero',
              header: 'Número',
              sortValue: (f) => f.numero,
              render: (f) => <span className="font-medium text-slate-800">{f.numero}</span>,
            },
            {
              key: 'cliente',
              header: 'Cliente',
              sortValue: (f) => clienteById(f.clienteId)?.nome.toLowerCase() ?? '',
              render: (f) => clienteById(f.clienteId)?.nome ?? '—',
            },
            {
              key: 'emissao',
              header: 'Emissão',
              sortValue: (f) => f.dataEmissao,
              render: (f) => formatDateBR(f.dataEmissao),
            },
            {
              key: 'vencimento',
              header: 'Vencimento',
              sortValue: (f) => f.dataVencimento,
              render: (f) => formatDateBR(f.dataVencimento),
            },
            {
              key: 'total',
              header: 'Total',
              sortValue: (f) => f.total,
              className: 'text-right',
              render: (f) => {
                const pago = valorPago(f.id)
                return (
                  <div>
                    <span className="font-semibold">{formatCents(f.total)}</span>
                    {pago > 0 && pago < f.total && (
                      <p className="text-xs text-cyan-700">pago {formatCents(pago)}</p>
                    )}
                  </div>
                )
              },
            },
            {
              key: 'status',
              header: 'Status',
              sortValue: (f) => faturaStatusEfetivo(f),
              render: (f) => <StatusBadge status={faturaStatusEfetivo(f)} />,
            },
            {
              key: 'acoes',
              header: '',
              className: 'text-right whitespace-nowrap',
              render: (f) => {
                const emAberto = f.status !== 'paga' && f.status !== 'cancelada'
                return (
                <div className="flex justify-end gap-1.5">
                  <Button small variant="secondary" onClick={() => setVisualizando(f)}>
                    Ver
                  </Button>
                  <Button small variant="secondary" onClick={() => baixarPdf(f)}>
                    PDF
                  </Button>
                  <Button
                    small
                    variant="secondary"
                    title="Imprimir guia de remessa para o entregador"
                    onClick={() => imprimirGuiaRemessa(f, clienteById(f.clienteId), db.empresa)}
                  >
                    Guia
                  </Button>
                  {cloudMode && (
                    <Button small variant="secondary" onClick={() => setEmailFatura(f)}>
                      E-mail
                    </Button>
                  )}
                  {emAberto && db.empresa.chavePix && (
                    <Button small variant="secondary" onClick={() => setPixFatura(f)}>
                      PIX
                    </Button>
                  )}
                  {emAberto && temWhatsapp(clienteById(f.clienteId)) && (
                    <Button small variant="secondary" onClick={() => cobrarWhatsapp(f)}>
                      WhatsApp
                    </Button>
                  )}
                  {f.status !== 'cancelada' && (
                    <Button
                      small
                      variant="secondary"
                      disabled={f.status === 'paga'}
                      title={f.status === 'paga' ? 'Fatura paga não pode ser editada' : undefined}
                      onClick={() => setDraft({ ...f })}
                    >
                      Editar
                    </Button>
                  )}
                  {emAberto && (
                    <Button small variant="success" onClick={() => setRecebendo(f)}>
                      Receber
                    </Button>
                  )}
                  <Button small variant="danger" onClick={() => setDeleting(f)}>
                    Excluir
                  </Button>
                </div>
                )
              },
            },
          ]}
        />
      </Card>

      {/* Form de fatura */}
      <Modal
        open={draft !== null}
        title={draft?.id ? `Editar Fatura ${draft.numero}` : 'Nova Fatura'}
        onClose={() => setDraft(null)}
        wide
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="fatura-form" disabled={saving}>
              {saving ? 'Salvando...' : draft?.id ? 'Salvar alterações' : 'Criar fatura'}
            </Button>
          </div>
        }
      >
        {draft && (
          <form id="fatura-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Cliente *" className="lg:col-span-2">
                <ClienteSelect
                  value={draft.clienteId}
                  onChange={(id) => setDraft({ ...draft, clienteId: id })}
                />
              </Field>
              <Field label="Emissão">
                <input
                  type="date"
                  className={inputClass}
                  value={draft.dataEmissao}
                  onChange={(e) => setDraft({ ...draft, dataEmissao: e.target.value })}
                />
              </Field>
              <Field label="Vencimento">
                <input
                  type="date"
                  className={inputClass}
                  value={draft.dataVencimento}
                  onChange={(e) => setDraft({ ...draft, dataVencimento: e.target.value })}
                />
              </Field>
            </div>

            <div className="mt-5">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Produtos</h3>
              <ItensEditor
                itens={draft.itens}
                onChange={(itens) => setDraft({ ...draft, itens })}
                impostoPadrao={draft.impostoPadrao}
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-4">
                <Field label="Forma de pagamento">
                  <select
                    className={inputClass}
                    value={draft.formaPagamento}
                    onChange={(e) =>
                      setDraft({ ...draft, formaPagamento: e.target.value as FormaPagamento })
                    }
                  >
                    {FORMAS.map(([v, label]) => (
                      <option key={v} value={v}>{label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Observações">
                  <textarea
                    className={`${inputClass} min-h-16`}
                    value={draft.observacoes}
                    onChange={(e) => setDraft({ ...draft, observacoes: e.target.value })}
                  />
                </Field>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4 py-1 text-sm">
                  <span className="text-slate-500">% Imposto padrão</span>
                  <div className="w-32">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className={`${inputClass} text-right`}
                      value={draft.impostoPadrao || ''}
                      placeholder="0"
                      onChange={(e) => {
                        const pct = parseFloat(e.target.value) || 0
                        const itens = draft.itens.map((i) =>
                          i.impostoPct === draft.impostoPadrao || !i.impostoPct
                            ? { ...i, impostoPct: pct }
                            : i,
                        )
                        setDraft({ ...draft, impostoPadrao: pct, itens })
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span>{formatCents(totais.subtotal)}</span>
                </div>
                {totais.impostos > 0 && (
                  <div className="flex items-center justify-between py-1 text-sm">
                    <span className="text-slate-500">Impostos</span>
                    <span>{formatCents(totais.impostos)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4 py-1 text-sm">
                  <span className="text-slate-500">Frete</span>
                  <div className="w-32">
                    <MoneyInput
                      valueCents={draft.frete}
                      onChangeCents={(v) => setDraft({ ...draft, frete: v })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 py-1 text-sm">
                  <span className="text-slate-500">Desconto</span>
                  <div className="w-32">
                    <MoneyInput
                      valueCents={draft.desconto}
                      onChangeCents={(v) => setDraft({ ...draft, desconto: v })}
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="font-semibold text-slate-700">Total</span>
                  <span className="text-lg font-bold text-blue-700">{formatCents(totais.total)}</span>
                </div>
              </div>
            </div>

          </form>
        )}
      </Modal>

      {/* Receber pagamento */}
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
        open={deleting !== null}
        title="Excluir fatura"
        message={`Excluir a fatura ${deleting?.numero}? Os pagamentos registrados nela também serão apagados.`}
        confirmLabel="Excluir"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await deleteFatura(deleting.id)
            showToast('Fatura excluída.')
          }
          setDeleting(null)
        }}
      />

      <PixModal
        open={pixFatura !== null}
        onClose={() => setPixFatura(null)}
        empresa={db.empresa}
        valorCents={pixFatura ? pixFatura.total - valorPago(pixFatura.id) : 0}
        txid={pixFatura?.numero ?? ''}
        titulo={`Cobrar via PIX — ${pixFatura?.numero ?? ''}`}
      />

      <DocumentoView
        open={visualizando !== null}
        onClose={() => setVisualizando(null)}
        doc={visualizando}
        tipo="fatura"
        onBaixarPdf={visualizando ? () => baixarPdf(visualizando) : undefined}
      />

      {emailFatura && (
        <EnviarEmailModal
          open={emailFatura !== null}
          onClose={() => setEmailFatura(null)}
          destinatarioInicial={emailsDoCliente(clienteById(emailFatura.clienteId)).join(', ')}
          assuntoInicial={`Fatura ${emailFatura.numero} — ${db.empresa.nome}`}
          mensagemInicial={
            `Olá${clienteById(emailFatura.clienteId)?.nome ? ', ' + clienteById(emailFatura.clienteId)!.nome : ''}!\n\n` +
            `Segue em anexo a fatura ${emailFatura.numero} no valor de ${formatCents(emailFatura.total)}, ` +
            `com vencimento em ${formatDateBR(emailFatura.dataVencimento)}.\n\n` +
            `Qualquer dúvida, estamos à disposição.\n\n${db.empresa.nome}`
          }
          nomeArquivo={`fatura-${emailFatura.numero}.pdf`}
          gerarPdfBase64={async () => {
            const qr = await montarQrPix(emailFatura)
            return faturaPdfBase64(
              emailFatura,
              clienteById(emailFatura.clienteId),
              db.empresa,
              valorPago(emailFatura.id),
              qr,
            )
          }}
          remetenteNome={db.empresa.nome}
          replyTo={db.empresa.email || undefined}
        />
      )}
    </div>
  )
}

export function ReceberForm({
  fatura,
  valorPago,
  pagamentos,
  onRegistrar,
  onDeletePagamento,
}: {
  fatura: Fatura
  valorPago: number
  pagamentos: Pagamento[]
  onRegistrar: (p: Omit<Pagamento, 'id'>) => Promise<void>
  onDeletePagamento: (id: string) => Promise<void>
}) {
  const saldo = fatura.total - valorPago
  const [valor, setValor] = useState(saldo)
  const [data, setData] = useState(todayISO())
  const [forma, setForma] = useState<FormaPagamento>(fatura.formaPagamento)
  const [obs, setObs] = useState('')

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Total</p>
          <p className="font-bold">{formatCents(fatura.total)}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-3">
          <p className="text-xs text-emerald-600">Pago</p>
          <p className="font-bold text-emerald-700">{formatCents(valorPago)}</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3">
          <p className="text-xs text-amber-600">Em aberto</p>
          <p className="font-bold text-amber-700">{formatCents(saldo)}</p>
        </div>
      </div>

      {pagamentos.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-1 text-xs font-semibold uppercase text-slate-500">
            Pagamentos registrados
          </h4>
          {pagamentos.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm"
            >
              <span>
                {formatDateBR(p.data)} — {formatCents(p.valor)}
              </span>
              <button
                className="text-xs text-red-500 hover:underline"
                onClick={() => onDeletePagamento(p.id)}
              >
                remover
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (valor <= 0) return
          await onRegistrar({ faturaId: fatura.id, data, valor, forma, observacao: obs })
        }}
        className="grid grid-cols-2 gap-4"
      >
        <Field label="Valor recebido (R$)">
          <MoneyInput valueCents={valor} onChangeCents={setValor} />
        </Field>
        <Field label="Data">
          <input
            type="date"
            className={inputClass}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </Field>
        <Field label="Forma">
          <select
            className={inputClass}
            value={forma}
            onChange={(e) => setForma(e.target.value as FormaPagamento)}
          >
            {FORMAS.map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="Observação">
          <input className={inputClass} value={obs} onChange={(e) => setObs(e.target.value)} />
        </Field>
        <div className="col-span-2 flex justify-end">
          <Button type="submit" variant="success">
            Registrar recebimento
          </Button>
        </div>
      </form>
    </div>
  )
}
