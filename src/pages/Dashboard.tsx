import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useData } from '../context/DataContext'
import MetasIndicadores from '../components/MetasIndicadores'
import { useAuth } from '../context/AuthContext'
import { Card, KpiCard, PageHeader, StatusBadge } from '../components/ui'
import { formatCents } from '../lib/money'
import { daysUntil, formatDateBR, monthKey, monthLabel, todayISO } from '../lib/dates'

// Animação desligada no modo captura (screenshots congelariam as barras em zero)
const anim = import.meta.env.MODE !== 'capture'

export default function Dashboard() {
  const { db, clienteById, valorPago, faturaStatusEfetivo } = useData()
  const { cloudMode, role } = useAuth()
  const isOwner = !cloudMode || role === 'owner'
  // Por privacidade, os indicadores financeiros começam ocultos a cada acesso.
  const [mostrarValores, setMostrarValores] = useState(false)
  const valorOculto = '••••••'

  const mesAtual = monthKey(todayISO())

  const stats = useMemo(() => {
    const orcamentosMes = db.orcamentos.filter((o) => monthKey(o.data) === mesAtual)
    const recebidoMes = db.pagamentos
      .filter((p) => monthKey(p.data) === mesAtual)
      .reduce((s, p) => s + p.valor, 0) +
      db.vendasRapidas
        .filter((v) => monthKey(v.data) === mesAtual)
        .reduce((s, v) => s + v.total, 0)
    const pagoMes = db.contasPagar
      .filter((c) => c.status === 'paga' && c.dataPagamento && monthKey(c.dataPagamento) === mesAtual)
      .reduce((s, c) => s + c.valor, 0)

    const faturasAbertas = db.faturas.filter(
      (f) => f.status !== 'paga' && f.status !== 'cancelada',
    )
    const aReceber = faturasAbertas.reduce((s, f) => s + (f.total - valorPago(f.id)), 0)
    const vencidasReceber = faturasAbertas
      .filter((f) => faturaStatusEfetivo(f) === 'atrasada')
      .reduce((s, f) => s + (f.total - valorPago(f.id)), 0)

    const contasAbertas = db.contasPagar.filter((c) => c.status === 'pendente')
    const aPagar = contasAbertas.reduce((s, c) => s + c.valor, 0)

    return {
      orcamentosMesQtd: orcamentosMes.length,
      orcamentosMesValor: orcamentosMes.reduce((s, o) => s + o.total, 0),
      recebidoMes,
      pagoMes,
      aReceber,
      vencidasReceber,
      aPagar,
      faturasAbertasQtd: faturasAbertas.length,
    }
  }, [db, mesAtual, valorPago, faturaStatusEfetivo])

  // Recebimentos x despesas dos últimos 6 meses
  const chartData = useMemo(() => {
    const meses: string[] = []
    const hoje = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return meses.map((m) => ({
      mes: monthLabel(m),
      Recebido:
        db.pagamentos
          .filter((p) => monthKey(p.data) === m)
          .reduce((s, p) => s + p.valor, 0) / 100 +
        db.vendasRapidas
          .filter((v) => monthKey(v.data) === m)
          .reduce((s, v) => s + v.total, 0) / 100,
      Despesas:
        db.contasPagar
          .filter((c) => c.status === 'paga' && c.dataPagamento && monthKey(c.dataPagamento) === m)
          .reduce((s, c) => s + c.valor, 0) / 100,
    }))
  }, [db.pagamentos, db.vendasRapidas, db.contasPagar])

  // Funil de orçamentos
  const funil = useMemo(() => {
    const count = (s: string) => db.orcamentos.filter((o) => o.status === s).length
    return [
      { status: 'pendente', qtd: count('pendente') },
      { status: 'faturado', qtd: count('faturado') },
      { status: 'recusado', qtd: count('recusado') },
    ]
  }, [db.orcamentos])

  // Próximos vencimentos (receber + pagar), 8 itens
  const proximos = useMemo(() => {
    const receber = db.faturas
      .filter((f) => f.status !== 'paga' && f.status !== 'cancelada')
      .map((f) => ({
        tipo: 'receber' as const,
        id: f.id,
        titulo: `${f.numero} — ${clienteById(f.clienteId)?.nome ?? '—'}`,
        data: f.dataVencimento,
        valor: f.total - valorPago(f.id),
      }))
    const pagar = db.contasPagar
      .filter((c) => c.status === 'pendente')
      .map((c) => ({
        tipo: 'pagar' as const,
        id: c.id,
        titulo: c.descricao,
        data: c.dataVencimento,
        valor: c.valor,
      }))
    return [...receber, ...pagar].sort((a, b) => a.data.localeCompare(b.data)).slice(0, 8)
  }, [db.faturas, db.contasPagar, clienteById, valorPago])

  const recentes = useMemo(
    () =>
      [...db.orcamentos]
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
        .slice(0, 5),
    [db.orcamentos],
  )

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString('pt-BR', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })}
      />

      {isOwner && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setMostrarValores((valor) => !valor)}
            aria-label={mostrarValores ? 'Ocultar valores financeiros' : 'Mostrar valores financeiros'}
            aria-pressed={mostrarValores}
            className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 shadow-sm transition-colors hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
          >
            {mostrarValores ? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 3l18 18" />
                <path d="M10.6 5.2A10.5 10.5 0 0 1 12 5c5.5 0 9.5 7 9.5 7a16.7 16.7 0 0 1-3.3 4.1" />
                <path d="M6.4 6.5C3.9 8.1 2.5 12 2.5 12s4 7 9.5 7c1.4 0 2.7-.4 3.9-1" />
                <path d="M10 10a3 3 0 0 0 4 4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2.5 12s3.9-7 9.5-7 9.5 7 9.5 7-3.9 7-9.5 7S2.5 12 2.5 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
            {mostrarValores ? 'Ocultar valores' : 'Mostrar valores'}
          </button>
        </div>
      )}

      <div className={`grid grid-cols-1 gap-4 ${isOwner ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2'}`}>
        <KpiCard
          label="Orçamentos do mês"
          value={isOwner && !mostrarValores ? valorOculto : String(stats.orcamentosMesQtd)}
          {...(isOwner ? { hint: mostrarValores ? formatCents(stats.orcamentosMesValor) : 'Valor oculto' } : {})}
          to="/orcamentos"
        />
        {isOwner && (
          <>
            <KpiCard
              label="Entradas no mês"
              value={mostrarValores ? formatCents(stats.recebidoMes) : valorOculto}
              tone="good"
              hint={mostrarValores ? 'Faturas + vendas rápidas' : 'Valor oculto'}
              to="/relatorios"
            />
            <KpiCard
              label="A receber"
              value={mostrarValores ? formatCents(stats.aReceber) : valorOculto}
              hint={mostrarValores
                ? (stats.vencidasReceber > 0
                    ? `${formatCents(stats.vencidasReceber)} vencido`
                    : `${stats.faturasAbertasQtd} fatura(s) em aberto`)
                : 'Valor oculto'
              }
              tone={stats.vencidasReceber > 0 ? 'bad' : 'default'}
              to="/contas-receber"
            />
            <KpiCard
              label="A pagar"
              value={mostrarValores ? formatCents(stats.aPagar) : valorOculto}
              hint={mostrarValores ? `Despesas pagas no mês: ${formatCents(stats.pagoMes)}` : 'Valor oculto'}
              tone="warn"
              to="/contas-pagar"
            />
          </>
        )}
      </div>

      <div className={`mt-5 grid grid-cols-1 gap-4 ${isOwner ? 'xl:grid-cols-3' : ''}`}>
        {isOwner && <Card className="xl:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Recebimentos × Despesas (últimos 6 meses)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis
                  fontSize={12}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={(v) =>
                    (v as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  }
                />
                <Legend />
                <Bar dataKey="Recebido" fill="#7c3aed" radius={[4, 4, 0, 0]} isAnimationActive={anim} />
                <Bar dataKey="Despesas" fill="#f97316" radius={[4, 4, 0, 0]} isAnimationActive={anim} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-5">
            <MetasIndicadores />
          </div>
        </Card>}

        <Card className={isOwner ? '' : 'max-w-3xl'}>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Funil de orçamentos</h3>
          <div className="flex flex-col gap-3">
            {funil.map((f) => {
              const max = Math.max(1, ...funil.map((x) => x.qtd))
              return (
                <div key={f.status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <StatusBadge status={f.status} />
                    <span className="font-semibold">{f.qtd}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${(f.qtd / max) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {isOwner && (
            <>
              <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-700">Próximos vencimentos</h3>
              {proximos.length === 0 && (
                <p className="text-sm text-slate-400">Nada em aberto. 🎉</p>
              )}
              <div className="flex flex-col">
                {proximos.map((p) => {
                  const dias = daysUntil(p.data)
                  return (
                    <div
                      key={`${p.tipo}-${p.id}`}
                      className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate">{p.titulo}</p>
                        <p className={`text-xs ${dias < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                          {formatDateBR(p.data)}
                          {dias < 0 ? ` — ${-dias}d em atraso` : dias === 0 ? ' — hoje' : ''}
                        </p>
                      </div>
                      <span
                        className={`ml-3 shrink-0 font-semibold ${
                          p.tipo === 'receber' ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {p.tipo === 'receber' ? '+' : '−'}
                        {formatCents(p.valor)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Card>
      </div>

      {!isOwner && <div className="mt-5"><MetasIndicadores /></div>}

      <Card className="mt-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Orçamentos recentes</h3>
        {recentes.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nenhum orçamento ainda —{' '}
            <Link to="/orcamentos" className="text-blue-600 hover:underline">
              crie o primeiro
            </Link>
            .
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="px-3 py-2">Número</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Data</th>
                  {isOwner && <th className="px-3 py-2 text-right">Total</th>}
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentes.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-medium">{o.numero}</td>
                    <td className="px-3 py-2">{clienteById(o.clienteId)?.nome ?? '—'}</td>
                    <td className="px-3 py-2">{formatDateBR(o.data)}</td>
                    {isOwner && <td className="px-3 py-2 text-right font-semibold">{formatCents(o.total)}</td>}
                    <td className="px-3 py-2">
                      <StatusBadge status={o.status} />
                    </td>
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
