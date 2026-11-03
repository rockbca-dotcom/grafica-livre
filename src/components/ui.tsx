import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { centsToInput, parseMoney } from '../lib/money'

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
  footer,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  /** Rodapé fixo (não rola com o conteúdo) — ideal para botões de ação. */
  footer?: ReactNode
}) {
  if (!open) return null
  // Renderiza via portal em document.body: evita <form> aninhado (o form do modal
  // não fica dentro do form da página) e problemas de z-index/overflow.
  // NÃO fecha ao clicar fora — só pelo X ou pelos botões — para não perder dados.
  // Card em coluna com altura máxima: cabeçalho e rodapé fixos, conteúdo rolável.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div
        className={`my-8 flex max-h-[92vh] w-full flex-col ${wide ? 'max-w-5xl' : 'max-w-2xl'} rounded-xl bg-white shadow-2xl`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ---------------------------------------------------------------------------
// Diálogo de confirmação (substitui window.confirm)
// ---------------------------------------------------------------------------

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  // Move o foco para o botão de confirmação ao abrir (acessibilidade/teclado).
  useEffect(() => {
    if (open) confirmRef.current?.focus()
  }, [open])
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="mb-2 text-lg font-semibold text-slate-800">{title}</h3>
        <p className="mb-5 text-sm text-slate-600">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button ref={confirmRef} variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Botões
// ---------------------------------------------------------------------------

const BUTTON_STYLES = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  secondary: 'bg-slate-200 text-slate-700 hover:bg-slate-300',
  ghost: 'text-slate-600 hover:bg-slate-100',
} as const

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: keyof typeof BUTTON_STYLES
    small?: boolean
  }
>(function Button({ variant = 'primary', small, className = '', ...props }, ref) {
  return (
    <button
      ref={ref}
      {...props}
      className={`rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        small ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      } ${BUTTON_STYLES[variant]} ${className}`}
    />
  )
})

// ---------------------------------------------------------------------------
// Campos de formulário
// ---------------------------------------------------------------------------

export function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'

/** Input de dinheiro: digita "1234,56", armazena centavos */
export function MoneyInput({
  valueCents,
  onChangeCents,
  placeholder = '0,00',
  className = '',
  disabled,
}: {
  valueCents: number
  onChangeCents: (cents: number) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const [text, setText] = useState(centsToInput(valueCents))

  useEffect(() => {
    setText(centsToInput(valueCents))
  }, [valueCents])

  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      className={`${inputClass} text-right ${className}`}
      placeholder={placeholder}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const cents = parseMoney(text)
        onChangeCents(cents)
        setText(centsToInput(cents))
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Badge de status
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-800',
  aprovado: 'bg-blue-100 text-blue-800',
  faturado: 'bg-indigo-100 text-indigo-800',
  recusado: 'bg-slate-200 text-slate-600',
  paga: 'bg-emerald-100 text-emerald-800',
  parcial: 'bg-cyan-100 text-cyan-800',
  atrasada: 'bg-red-100 text-red-800',
  cancelada: 'bg-slate-200 text-slate-500',
  // Estados de nota fiscal
  autorizada: 'bg-emerald-100 text-emerald-800',
  processando: 'bg-amber-100 text-amber-800',
  erro: 'bg-red-100 text-red-800',
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  faturado: 'Faturado',
  recusado: 'Recusado',
  paga: 'Paga',
  parcial: 'Parcial',
  atrasada: 'Atrasada',
  cancelada: 'Cancelada',
  autorizada: 'Autorizada',
  processando: 'Processando',
  erro: 'Erro',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Estado vazio
// ---------------------------------------------------------------------------

export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 text-5xl">{icon}</div>
      <p className="font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tabela com busca, ordenação e paginação
// ---------------------------------------------------------------------------

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** valor usado para ordenar; se ausente a coluna não ordena */
  sortValue?: (row: T) => string | number
  className?: string
}

const PAGE_SIZE = 15

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  searchText,
  searchFields,
  empty,
}: {
  columns: Column<T>[]
  rows: T[]
  searchText?: string
  /** campos de texto considerados na busca */
  searchFields?: (row: T) => string[]
  empty: ReactNode
}) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    let result = rows
    if (searchText && searchFields) {
      const q = searchText.toLowerCase()
      result = rows.filter((r) =>
        searchFields(r).some((f) => f.toLowerCase().includes(q)),
      )
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey)
      if (col?.sortValue) {
        result = [...result].sort((x, y) => {
          const a = col.sortValue!(x)
          const b = col.sortValue!(y)
          if (a < b) return -sortDir
          if (a > b) return sortDir
          return 0
        })
      }
    }
    return result
  }, [rows, searchText, searchFields, sortKey, sortDir, columns])

  useEffect(() => {
    setPage(0)
  }, [searchText, rows.length])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (rows.length === 0) return <>{empty}</>

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              {columns.map((col) => {
                const ordenavel = Boolean(col.sortValue)
                const ativo = sortKey === col.key
                const ordenar = () => {
                  if (!ordenavel) return
                  if (ativo) setSortDir((d) => (d === 1 ? -1 : 1))
                  else {
                    setSortKey(col.key)
                    setSortDir(1)
                  }
                }
                return (
                  <th
                    key={col.key}
                    className={`px-3 py-3 font-semibold ${ordenavel ? 'cursor-pointer select-none hover:text-slate-800' : ''} ${col.className ?? ''}`}
                    onClick={ordenar}
                    {...(ordenavel && {
                      role: 'button',
                      tabIndex: 0,
                      'aria-sort': ativo ? (sortDir === 1 ? 'ascending' : 'descending') : 'none',
                      onKeyDown: (e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          ordenar()
                        }
                      },
                    })}
                  >
                    {col.header}
                    {ativo && (sortDir === 1 ? ' ▲' : ' ▼')}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-3 ${col.className ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">
                  Nenhum resultado para a busca.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
          <span>
            {filtered.length} registro{filtered.length !== 1 && 's'}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" small disabled={page === 0} onClick={() => setPage(page - 1)}>
              ← Anterior
            </Button>
            <span>
              {page + 1} / {pageCount}
            </span>
            <Button
              variant="secondary"
              small
              disabled={page >= pageCount - 1}
              onClick={() => setPage(page + 1)}
            >
              Próxima →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cabeçalho de página + caixa de busca
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  )
}

export function SearchBox({
  value,
  onChange,
  placeholder = 'Buscar...',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="search"
      className={`${inputClass} max-w-xs`}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`app-card rounded-xl bg-white p-5 shadow-sm ${className}`}>{children}</div>
  )
}

// ---------------------------------------------------------------------------
// KPI card (indicador) — reutilizável em Dashboard, Contas a Pagar, Relatórios
// ---------------------------------------------------------------------------

const KPI_TONES = {
  default: 'text-slate-800',
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-red-600',
} as const

export function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
  to,
}: {
  label: string
  value: string
  hint?: string
  tone?: keyof typeof KPI_TONES
  to?: string
}) {
  const body = (
    <Card className="app-kpi-card h-full transition-shadow hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${KPI_TONES[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </Card>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

// ---------------------------------------------------------------------------
// Badge de contagem (usado em colunas do Kanban, cabeçalhos de listas)
// ---------------------------------------------------------------------------

const COUNT_TONES = {
  slate: 'bg-slate-200 text-slate-600',
  success: 'bg-emerald-100 text-emerald-700',
  warn: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
} as const

export function CountBadge({
  count,
  tone = 'slate',
}: {
  count: number
  tone?: keyof typeof COUNT_TONES
}) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COUNT_TONES[tone]}`}>
      {count}
    </span>
  )
}
