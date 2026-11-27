import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ContaPagar } from '../types'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import {
  Button, Card, ConfirmDialog, DataTable, EmptyState, Field, KpiCard, Modal,
  MoneyInput, PageHeader, SearchBox, StatusBadge, inputClass,
} from '../components/ui'
import { formatCents } from '../lib/money'
import { daysUntil, formatDateBR, isPast, todayISO } from '../lib/dates'

export const CATEGORIAS_DESPESA = [
  ['insumos', 'Insumos / matéria-prima'],
  ['equipamentos', 'Equipamentos / manutenção'],
  ['aluguel', 'Aluguel'],
  ['energia', 'Energia / água / internet'],
  ['salarios', 'Salários / pró-labore'],
  ['impostos', 'Impostos e taxas'],
  ['marketing', 'Marketing'],
  ['frete', 'Frete / transporte'],
  ['projetos', 'Projetos'],
  ['outros', 'Outros'],
] as const

export function categoriaLabel(key: string): string {
  return CATEGORIAS_DESPESA.find(([k]) => k === key)?.[1] ?? key
}

function novaConta(): ContaPagar {
  return {
    id: crypto.randomUUID(),
    descricao: '',
    categoria: 'insumos',
    fornecedor: '',
    dataVencimento: todayISO(),
    valor: 0,
    status: 'pendente',
    dataPagamento: null,
    criadoEm: new Date().toISOString(),
  }
}

export default function ContasPagar() {
  const { db, saveContaPagar, deleteContaPagar } = useData()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [params] = useSearchParams()
  const [statusFiltro, setStatusFiltro] = useState(() => params.get('status') === 'pagas' ? 'pagas' : 'abertas')
  const [editing, setEditing] = useState<ContaPagar | null>(null)
  const [deleting, setDeleting] = useState<ContaPagar | null>(null)
  const [saving, setSaving] = useState(false)

  const rows = useMemo(() => {
    const sorted = [...db.contasPagar].sort((a, b) =>
      a.dataVencimento.localeCompare(b.dataVencimento),
    )
    if (statusFiltro === 'abertas') return sorted.filter((c) => c.status === 'pendente')
    if (statusFiltro === 'pagas') return sorted.filter((c) => c.status === 'paga')
    return sorted
  }, [db.contasPagar, statusFiltro])

  const abertas = db.contasPagar.filter((c) => c.status === 'pendente')
  const totalAberto = abertas.reduce((s, c) => s + c.valor, 0)
  const vencidas = abertas.filter((c) => isPast(c.dataVencimento))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      await saveContaPagar(editing)
      showToast('Conta salva!')
      setEditing(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  const marcarPaga = async (c: ContaPagar) => {
    await saveContaPagar({ ...c, status: 'paga', dataPagamento: todayISO() })
    showToast('Conta marcada como paga!')
  }

  return (
    <div>
      <PageHeader
        title="Contas a Pagar"
        subtitle="Despesas da empresa"
        actions={
          <>
            <select
              className={`${inputClass} w-auto`}
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
            >
              <option value="abertas">Em aberto</option>
              <option value="pagas">Pagas</option>
              <option value="todas">Todas</option>
            </select>
            <SearchBox value={search} onChange={setSearch} placeholder="Buscar conta..." />
            <Button onClick={() => setEditing(novaConta())}>+ Nova Conta</Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          label="Total em aberto"
          value={formatCents(totalAberto)}
          hint={`${abertas.length} conta(s)`}
        />
        <KpiCard
          label="Vencidas"
          value={formatCents(vencidas.reduce((s, c) => s + c.valor, 0))}
          tone="bad"
          hint={`${vencidas.length} conta(s)`}
        />
      </div>

      <Card>
        <DataTable
          rows={rows}
          searchText={search}
          searchFields={(c) => [c.descricao, c.fornecedor, categoriaLabel(c.categoria)]}
          empty={
            <EmptyState
              icon="💸"
              title="Nenhuma conta encontrada"
              hint="Cadastre despesas como aluguel, insumos e energia."
            />
          }
          columns={[
            {
              key: 'descricao',
              header: 'Descrição',
              sortValue: (c) => c.descricao.toLowerCase(),
              render: (c) => (
                <div>
                  <span className="font-medium text-slate-800">{c.descricao}</span>
                  {c.fornecedor && <p className="text-xs text-slate-400">{c.fornecedor}</p>}
                </div>
              ),
            },
            {
              key: 'categoria',
              header: 'Categoria',
              sortValue: (c) => c.categoria,
              render: (c) => categoriaLabel(c.categoria),
            },
            {
              key: 'vencimento',
              header: 'Vencimento',
              sortValue: (c) => c.dataVencimento,
              render: (c) => {
                const dias = daysUntil(c.dataVencimento)
                return (
                  <div>
                    {formatDateBR(c.dataVencimento)}
                    {c.status === 'pendente' && (
                      <p className={`text-xs ${dias < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {dias < 0
                          ? `${-dias} dia(s) em atraso`
                          : dias === 0
                            ? 'vence hoje'
                            : `em ${dias} dia(s)`}
                      </p>
                    )}
                  </div>
                )
              },
            },
            {
              key: 'valor',
              header: 'Valor',
              sortValue: (c) => c.valor,
              className: 'text-right',
              render: (c) => <span className="font-semibold">{formatCents(c.valor)}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (c) =>
                c.status === 'paga' ? (
                  <StatusBadge status="paga" />
                ) : isPast(c.dataVencimento) ? (
                  <StatusBadge status="atrasada" />
                ) : (
                  <StatusBadge status="pendente" />
                ),
            },
            {
              key: 'acoes',
              header: '',
              className: 'text-right whitespace-nowrap',
              render: (c) => (
                <div className="flex justify-end gap-1.5">
                  {c.status === 'pendente' && (
                    <Button small variant="success" onClick={() => marcarPaga(c)}>
                      Pagar
                    </Button>
                  )}
                  <Button small variant="secondary" onClick={() => setEditing({ ...c })}>
                    Editar
                  </Button>
                  <Button small variant="danger" onClick={() => setDeleting(c)}>
                    Excluir
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={editing !== null}
        title={
          editing && db.contasPagar.some((c) => c.id === editing.id)
            ? 'Editar Conta'
            : 'Nova Conta a Pagar'
        }
        onClose={() => setEditing(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="conta-form" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        }
      >
        {editing && (
          <form id="conta-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Descrição *" className="sm:col-span-2">
              <input
                required
                className={inputClass}
                value={editing.descricao}
                onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
                placeholder="Ex.: Bobina de lona 440g"
              />
            </Field>
            <Field label="Categoria">
              <select
                className={inputClass}
                value={editing.categoria}
                onChange={(e) => setEditing({ ...editing, categoria: e.target.value })}
              >
                {CATEGORIAS_DESPESA.map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Fornecedor">
              <input
                className={inputClass}
                value={editing.fornecedor}
                onChange={(e) => setEditing({ ...editing, fornecedor: e.target.value })}
              />
            </Field>
            <Field label="Vencimento">
              <input
                type="date"
                required
                className={inputClass}
                value={editing.dataVencimento}
                onChange={(e) => setEditing({ ...editing, dataVencimento: e.target.value })}
              />
            </Field>
            <Field label="Valor (R$)">
              <MoneyInput
                valueCents={editing.valor}
                onChangeCents={(v) => setEditing({ ...editing, valor: v })}
              />
            </Field>
            {editing.status === 'paga' && (
              <Field label="Data de pagamento">
                <input
                  type="date"
                  className={inputClass}
                  value={editing.dataPagamento ?? ''}
                  onChange={(e) => setEditing({ ...editing, dataPagamento: e.target.value })}
                />
              </Field>
            )}
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir conta"
        message={`Excluir "${deleting?.descricao}"?`}
        confirmLabel="Excluir"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await deleteContaPagar(deleting.id)
            showToast('Conta excluída.')
          }
          setDeleting(null)
        }}
      />
    </div>
  )
}
