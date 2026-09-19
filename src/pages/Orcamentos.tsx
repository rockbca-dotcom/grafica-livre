import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { FormaPagamento, Orcamento } from '../types'
import { EMPRESA_PADRAO, emailsDoCliente } from '../types'
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
import EnviarEmailModal from '../components/EnviarEmailModal'
import { formatCents } from '../lib/money'
import { calcularTotais } from '../lib/documento'
import { addDays, formatDateBR, todayISO } from '../lib/dates'
import { msgOrcamento, temWhatsapp, waLink } from '../lib/whatsapp'

// pdfmake é pesado (~1 MB de fontes) — carrega só quando o usuário pede um PDF
async function gerarOrcamentoPdf(
  ...args: Parameters<typeof import('../pdf/documentoPdf')['gerarOrcamentoPdf']>
) {
  const mod = await import('../pdf/documentoPdf')
  mod.gerarOrcamentoPdf(...args)
}

async function orcamentoPdfBase64(
  ...args: Parameters<typeof import('../pdf/documentoPdf')['orcamentoPdfBase64']>
) {
  const mod = await import('../pdf/documentoPdf')
  return mod.orcamentoPdfBase64(...args)
}

type Draft = Omit<Orcamento, 'id' | 'numero' | 'criadoEm'> & {
  id?: string
  numero?: string
  criadoEm?: string
}

function novoDraft(observacoes = '', condicoesPagamento = ''): Draft {
  return {
    clienteId: '',
    data: todayISO(),
    validadeDias: 30,
    prazoEntrega: '',
    itens: [novoDocumentoItem()],
    subtotal: 0,
    frete: 0,
    impostoPadrao: 0,
    desconto: 0,
    total: 0,
    observacoes,
    condicoesPagamento,
    status: 'pendente',
  }
}

const STATUS_FILTROS = [
  ['todos', 'Todos'],
  ['pendente', 'Pendentes'],
  ['faturado', 'Faturados'],
  ['recusado', 'Recusados'],
] as const

export default function Orcamentos() {
  const {
    db, createOrcamento, saveOrcamento, deleteOrcamento, faturarOrcamento,
    setOrcamentoStatus, clienteById,
  } = useData()
  const { cloudMode } = useAuth()
  const { showToast } = useToast()

  const [search, setSearch] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<string>('todos')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [deleting, setDeleting] = useState<Orcamento | null>(null)
  const [faturando, setFaturando] = useState<Orcamento | null>(null)
  const [visualizando, setVisualizando] = useState<Orcamento | null>(null)
  const [emailOrcamento, setEmailOrcamento] = useState<Orcamento | null>(null)
  const [saving, setSaving] = useState(false)

  const rows = useMemo(() => {
    const sorted = [...db.orcamentos].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    if (statusFiltro === 'todos') return sorted
    return sorted.filter((o) => o.status === statusFiltro)
  }, [db.orcamentos, statusFiltro])

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
      showToast('Adicione pelo menos um produto com descrição.', 'error')
      return
    }
    const t = calcularTotais(itens, draft.frete, draft.desconto)
    const dados = { ...draft, itens, subtotal: t.subtotal, total: t.total }
    setSaving(true)
    try {
      if (draft.id) {
        await saveOrcamento(dados as Orcamento)
        showToast('Orçamento atualizado!')
      } else {
        const criado = await createOrcamento(dados)
        showToast(`Orçamento ${criado.numero} criado!`)
      }
      setDraft(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  const duplicarOrcamento = async (o: Orcamento) => {
    const { id: _id, numero: _num, criadoEm: _c, ...resto } = o
    void _id; void _num; void _c
    const criado = await createOrcamento({ ...resto, status: 'pendente' })
    showToast(`Orçamento ${criado.numero} criado (cópia).`)
  }

  const handleFaturar = async (e: FormEvent) => {
    e.preventDefault()
    if (!faturando) return
    const form = new FormData(e.target as HTMLFormElement)
    const vencimento = form.get('vencimento') as string
    const forma = form.get('forma') as FormaPagamento
    const fatura = await faturarOrcamento(faturando, vencimento, forma)
    showToast(`Fatura ${fatura.numero} gerada!`)
    setFaturando(null)
  }

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        subtitle={`${db.orcamentos.length} no total`}
        actions={
          <>
            <select
              className={`${inputClass} w-auto`}
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
            >
              {STATUS_FILTROS.map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
            <SearchBox value={search} onChange={setSearch} placeholder="Buscar orçamento..." />
            <Button
              onClick={() =>
                setDraft(
                  novoDraft(
                    db.empresa.observacoesPadraoOrcamento ||
                      EMPRESA_PADRAO.observacoesPadraoOrcamento,
                    db.empresa.condicoesPagamentoPadrao ||
                      EMPRESA_PADRAO.condicoesPagamentoPadrao,
                  ),
                )
              }
            >
              + Novo Orçamento
            </Button>
          </>
        }
      />

      <Card>
        <DataTable
          rows={rows}
          searchText={search}
          searchFields={(o) => [o.numero, clienteById(o.clienteId)?.nome ?? '', o.observacoes]}
          empty={
            <EmptyState
              icon="📝"
              title="Nenhum orçamento"
              hint="Crie um orçamento com cálculo automático por m²."
            />
          }
          columns={[
            {
              key: 'numero',
              header: 'Número',
              sortValue: (o) => o.numero,
              render: (o) => <span className="font-medium text-slate-800">{o.numero}</span>,
            },
            {
              key: 'cliente',
              header: 'Cliente',
              sortValue: (o) => clienteById(o.clienteId)?.nome.toLowerCase() ?? '',
              render: (o) => clienteById(o.clienteId)?.nome ?? '—',
            },
            {
              key: 'data',
              header: 'Data',
              sortValue: (o) => o.data,
              render: (o) => formatDateBR(o.data),
            },
            {
              key: 'validade',
              header: 'Válido até',
              render: (o) => formatDateBR(addDays(o.data, o.validadeDias)),
            },
            {
              key: 'total',
              header: 'Total',
              sortValue: (o) => o.total,
              className: 'text-right',
              render: (o) => <span className="font-semibold">{formatCents(o.total)}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              sortValue: (o) => o.status,
              render: (o) => <StatusBadge status={o.status} />,
            },
            {
              key: 'acoes',
              header: '',
              className: 'text-right whitespace-nowrap',
              render: (o) => (
                <div className="flex justify-end gap-1.5">
                  <Button small variant="secondary" onClick={() => setVisualizando(o)}>
                    Ver
                  </Button>
                  <Button
                    small
                    variant="secondary"
                    onClick={() => gerarOrcamentoPdf(o, clienteById(o.clienteId), db.empresa)}
                  >
                    PDF
                  </Button>
                  {cloudMode && (
                    <Button small variant="secondary" onClick={() => setEmailOrcamento(o)}>
                      E-mail
                    </Button>
                  )}
                  {temWhatsapp(clienteById(o.clienteId)) && (
                    <Button
                      small
                      variant="secondary"
                      onClick={() => {
                        const cliente = clienteById(o.clienteId)
                        const link = waLink(
                          cliente?.telefone ?? '',
                          msgOrcamento(o, cliente, db.empresa),
                        )
                        if (link) window.open(link, '_blank')
                        else showToast('Cliente sem telefone válido para WhatsApp.', 'error')
                      }}
                    >
                      WhatsApp
                    </Button>
                  )}
                  {o.status === 'pendente' && (
                    <Button small variant="secondary" onClick={() => duplicarOrcamento(o)}>
                      Duplicar
                    </Button>
                  )}
                  <Button small variant="secondary" onClick={() => setDraft({ ...o })}>
                    Editar
                  </Button>
                  {o.status === 'pendente' && (
                    <>
                      <Button small variant="success" onClick={() => setFaturando(o)}>
                        Faturar
                      </Button>
                      <Button
                        small
                        variant="ghost"
                        onClick={async () => {
                          await setOrcamentoStatus(o.id, 'recusado')
                          showToast('Orçamento marcado como recusado.')
                        }}
                      >
                        Recusar
                      </Button>
                    </>
                  )}
                  <Button small variant="danger" onClick={() => setDeleting(o)}>
                    Excluir
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Form de orçamento */}
      <Modal
        open={draft !== null}
        title={draft?.id ? `Editar Orçamento ${draft.numero}` : 'Novo Orçamento'}
        onClose={() => setDraft(null)}
        wide
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="orcamento-form" disabled={saving}>
              {saving ? 'Salvando...' : draft?.id ? 'Salvar alterações' : 'Criar orçamento'}
            </Button>
          </div>
        }
      >
        {draft && (
          <form id="orcamento-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Cliente *" className="lg:col-span-2">
                <ClienteSelect
                  value={draft.clienteId}
                  onChange={(id) => setDraft({ ...draft, clienteId: id })}
                />
              </Field>
              <Field label="Data">
                <input
                  type="date"
                  className={inputClass}
                  value={draft.data}
                  onChange={(e) => setDraft({ ...draft, data: e.target.value })}
                />
              </Field>
              <Field label="Validade (dias)">
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={draft.validadeDias}
                  onChange={(e) =>
                    setDraft({ ...draft, validadeDias: parseInt(e.target.value) || 30 })
                  }
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
                <Field label="Prazo de entrega">
                  <input
                    className={inputClass}
                    placeholder="Ex.: 5 dias úteis"
                    value={draft.prazoEntrega}
                    onChange={(e) => setDraft({ ...draft, prazoEntrega: e.target.value })}
                  />
                </Field>
                <Field label="Observações">
                  <textarea
                    className={`${inputClass} min-h-20`}
                    value={draft.observacoes}
                    onChange={(e) => setDraft({ ...draft, observacoes: e.target.value })}
                  />
                </Field>
                <Field label="Condições de Pagamento">
                  <textarea
                    className={`${inputClass} min-h-20`}
                    value={draft.condicoesPagamento}
                    onChange={(e) => setDraft({ ...draft, condicoesPagamento: e.target.value })}
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
                        // aplica em todos os itens que estavam com o padrão anterior ou 0
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

      {/* Converter em fatura */}
      <Modal
        open={faturando !== null}
        title={`Faturar orçamento ${faturando?.numero ?? ''}`}
        onClose={() => setFaturando(null)}
      >
        {faturando && (
          <form onSubmit={handleFaturar} className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">
              Cliente: <strong>{clienteById(faturando.clienteId)?.nome}</strong> — Total:{' '}
              <strong>{formatCents(faturando.total)}</strong>
            </p>
            <PrazoVencimento />
            <Field label="Forma de pagamento">
              <select name="forma" className={inputClass} defaultValue="pix">
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="transferencia">Transferência</option>
                <option value="boleto">Boleto</option>
                <option value="cartao_credito">Cartão de crédito</option>
                <option value="cartao_debito">Cartão de débito</option>
              </select>
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setFaturando(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant="success">
                Gerar fatura
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <DocumentoView
        open={visualizando !== null}
        onClose={() => setVisualizando(null)}
        doc={visualizando}
        tipo="orcamento"
        onBaixarPdf={
          visualizando
            ? () => gerarOrcamentoPdf(visualizando, clienteById(visualizando.clienteId), db.empresa)
            : undefined
        }
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir orçamento"
        message={`Excluir o orçamento ${deleting?.numero}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await deleteOrcamento(deleting.id)
            showToast('Orçamento excluído.')
          }
          setDeleting(null)
        }}
      />

      {emailOrcamento && (
        <EnviarEmailModal
          open={emailOrcamento !== null}
          onClose={() => setEmailOrcamento(null)}
          destinatarioInicial={emailsDoCliente(clienteById(emailOrcamento.clienteId)).join(', ')}
          assuntoInicial={`Orçamento ${emailOrcamento.numero} — ${db.empresa.nome}`}
          mensagemInicial={
            `Olá${clienteById(emailOrcamento.clienteId)?.nome ? ', ' + clienteById(emailOrcamento.clienteId)!.nome : ''}!\n\n` +
            `Segue em anexo o orçamento ${emailOrcamento.numero} no valor de ${formatCents(emailOrcamento.total)}, ` +
            `válido até ${formatDateBR(addDays(emailOrcamento.data, emailOrcamento.validadeDias))}.\n\n` +
            `Ficamos à disposição para dúvidas e para seguir com o pedido.\n\n${db.empresa.nome}`
          }
          nomeArquivo={`orcamento-${emailOrcamento.numero}.pdf`}
          gerarPdfBase64={() =>
            orcamentoPdfBase64(emailOrcamento, clienteById(emailOrcamento.clienteId), db.empresa)
          }
          remetenteNome={db.empresa.nome}
          replyTo={db.empresa.email || undefined}
        />
      )}
    </div>
  )
}

function PrazoVencimento() {
  const [vencimento, setVencimento] = useState(todayISO())
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Prazo">
        <select
          className={inputClass}
          defaultValue="0"
          onChange={(e) => setVencimento(addDays(todayISO(), parseInt(e.target.value)))}
        >
          <option value="0">À vista</option>
          <option value="7">7 dias</option>
          <option value="15">15 dias</option>
          <option value="30">30 dias</option>
        </select>
      </Field>
      <Field label="Vencimento">
        <input
          type="date"
          name="vencimento"
          className={inputClass}
          value={vencimento}
          onChange={(e) => setVencimento(e.target.value)}
          required
        />
      </Field>
    </div>
  )
}

