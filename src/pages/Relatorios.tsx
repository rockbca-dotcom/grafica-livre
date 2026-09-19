import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { Button, Card, Field, KpiCard, PageHeader, inputClass } from '../components/ui'
import { formatCents } from '../lib/money'
import { formatDateBR, monthKey, monthLabel, todayISO } from '../lib/dates'
import { downloadCsv } from '../lib/csv'
import { categoriaLabel } from './ContasPagar'

type Aba = 'vendas' | 'fluxo' | 'clientes'

function inicioDoAno(): string {
  return `${todayISO().slice(0, 4)}-01-01`
}

export default function Relatorios() {
  const { db, clienteById, valorPago } = useData()
  const [aba, setAba] = useState<Aba>('vendas')
  const [de, setDe] = useState(inicioDoAno())
  const [ate, setAte] = useState(todayISO())

  const dentro = (data: string) => data >= de && data <= ate

  // ----- Vendas: faturas emitidas no período -----
  const vendas = useMemo(() => {
    const faturas = db.faturas.filter(
      (f) => f.status !== 'cancelada' && dentro(f.dataEmissao),
    )
    const vendasRapidas = db.vendasRapidas.filter((v) => dentro(v.data))
    const porMes = new Map<string, { faturado: number; qtd: number }>()
    for (const f of faturas) {
      const m = monthKey(f.dataEmissao)
      const cur = porMes.get(m) ?? { faturado: 0, qtd: 0 }
      cur.faturado += f.total
      cur.qtd += 1
      porMes.set(m, cur)
    }
    const porMesPdv = new Map<string, { total: number; qtd: number }>()
    for (const venda of vendasRapidas) {
      const m = monthKey(venda.data)
      const cur = porMesPdv.get(m) ?? { total: 0, qtd: 0 }
      cur.total += venda.total
      cur.qtd += 1
      porMesPdv.set(m, cur)
    }
    const recebidoFaturas = db.pagamentos
      .filter((p) => dentro(p.data))
      .reduce((s, p) => s + p.valor, 0)
    const recebido = recebidoFaturas + vendasRapidas.reduce((s, v) => s + v.total, 0)
    return {
      faturas,
      vendasRapidas,
      totalFaturado: faturas.reduce((s, f) => s + f.total, 0),
      totalPdv: vendasRapidas.reduce((s, v) => s + v.total, 0),
      recebidoFaturas,
      recebido,
      porMes: [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b)),
      porMesPdv: [...porMesPdv.entries()].sort(([a], [b]) => a.localeCompare(b)),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.faturas, db.vendasRapidas, db.pagamentos, de, ate])

  // ----- Fluxo de caixa: entradas x saídas por mês -----
  const fluxo = useMemo(() => {
    const meses = new Map<string, { entradas: number; saidas: number }>()
    const touch = (m: string) => {
      if (!meses.has(m)) meses.set(m, { entradas: 0, saidas: 0 })
      return meses.get(m)!
    }
    for (const p of db.pagamentos.filter((p) => dentro(p.data))) {
      touch(monthKey(p.data)).entradas += p.valor
    }
    for (const venda of db.vendasRapidas.filter((v) => dentro(v.data))) {
      touch(monthKey(venda.data)).entradas += venda.total
    }
    for (const c of db.contasPagar.filter(
      (c) => c.status === 'paga' && c.dataPagamento && dentro(c.dataPagamento),
    )) {
      touch(monthKey(c.dataPagamento!)).saidas += c.valor
    }
    const linhas = [...meses.entries()].sort(([a], [b]) => a.localeCompare(b))
    const totalEntradas = linhas.reduce((s, [, v]) => s + v.entradas, 0)
    const totalSaidas = linhas.reduce((s, [, v]) => s + v.saidas, 0)

    // Despesas por categoria (pagas no período)
    const porCategoria = new Map<string, number>()
    for (const c of db.contasPagar.filter(
      (c) => c.status === 'paga' && c.dataPagamento && dentro(c.dataPagamento),
    )) {
      porCategoria.set(c.categoria, (porCategoria.get(c.categoria) ?? 0) + c.valor)
    }
    return {
      linhas,
      totalEntradas,
      totalSaidas,
      saldo: totalEntradas - totalSaidas,
      porCategoria: [...porCategoria.entries()].sort(([, a], [, b]) => b - a),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.pagamentos, db.vendasRapidas, db.contasPagar, de, ate])

  // ----- Clientes -----
  const clientes = useMemo(() => {
    return db.clientes
      .map((c) => {
        const faturas = db.faturas.filter(
          (f) => f.clienteId === c.id && f.status !== 'cancelada' && dentro(f.dataEmissao),
        )
        const faturado = faturas.reduce((s, f) => s + f.total, 0)
        const recebido = faturas.reduce((s, f) => s + Math.min(valorPago(f.id), f.total), 0)
        const orcamentos = db.orcamentos.filter(
          (o) => o.clienteId === c.id && dentro(o.data),
        ).length
        return { cliente: c, orcamentos, faturas: faturas.length, faturado, recebido, emAberto: faturado - recebido }
      })
      .filter((r) => r.orcamentos > 0 || r.faturas > 0)
      .sort((a, b) => b.faturado - a.faturado)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, de, ate, valorPago])

  const exportar = () => {
    if (aba === 'vendas') {
      downloadCsv(
        `vendas_${de}_${ate}.csv`,
        ['Origem', 'Número', 'Cliente', 'Emissão', 'Vencimento', 'Total (R$)', 'Status'],
        [
          ...vendas.faturas.map((f) => [
            'Fatura',
            f.numero,
            clienteById(f.clienteId)?.nome ?? '',
            formatDateBR(f.dataEmissao),
            formatDateBR(f.dataVencimento),
            (f.total / 100).toFixed(2).replace('.', ','),
            f.status,
          ]),
          ...vendas.vendasRapidas.map((v) => [
            'PDV',
            v.numero,
            v.clienteId ? clienteById(v.clienteId)?.nome ?? '' : 'Balcão',
            formatDateBR(v.data),
            '-',
            (v.total / 100).toFixed(2).replace('.', ','),
            'paga',
          ]),
        ],
      )
    } else if (aba === 'fluxo') {
      downloadCsv(
        `fluxo_caixa_${de}_${ate}.csv`,
        ['Mês', 'Entradas (R$)', 'Saídas (R$)', 'Saldo (R$)'],
        fluxo.linhas.map(([m, v]) => [
          monthLabel(m),
          (v.entradas / 100).toFixed(2).replace('.', ','),
          (v.saidas / 100).toFixed(2).replace('.', ','),
          ((v.entradas - v.saidas) / 100).toFixed(2).replace('.', ','),
        ]),
      )
    } else {
      downloadCsv(
        `clientes_${de}_${ate}.csv`,
        ['Cliente', 'Orçamentos', 'Faturas', 'Faturado (R$)', 'Recebido (R$)', 'Em aberto (R$)'],
        clientes.map((r) => [
          r.cliente.nome,
          r.orcamentos,
          r.faturas,
          (r.faturado / 100).toFixed(2).replace('.', ','),
          (r.recebido / 100).toFixed(2).replace('.', ','),
          (r.emAberto / 100).toFixed(2).replace('.', ','),
        ]),
      )
    }
  }

  const ABAS: [Aba, string][] = [
    ['vendas', 'Vendas'],
    ['fluxo', 'Fluxo de Caixa'],
    ['clientes', 'Clientes'],
  ]

  return (
    <div>
      <PageHeader
        title="Relatórios"
        actions={
          <Button variant="secondary" onClick={exportar}>
            ⬇ Exportar CSV
          </Button>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {ABAS.map(([v, label]) => (
              <button
                key={v}
                onClick={() => setAba(v)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  aba === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Field label="De">
            <input
              type="date"
              className={inputClass}
              value={de}
              onChange={(e) => setDe(e.target.value)}
            />
          </Field>
          <Field label="Até">
            <input
              type="date"
              className={inputClass}
              value={ate}
              onChange={(e) => setAte(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      {aba === 'vendas' && (
        <>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-xs font-semibold uppercase text-slate-500">Faturado em faturas</p>
              <p className="mt-1 text-2xl font-bold">{formatCents(vendas.totalFaturado)}</p>
              <p className="text-xs text-slate-400">{vendas.faturas.length} fatura(s)</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase text-blue-600">Vendas rápidas (PDV)</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">{formatCents(vendas.totalPdv)}</p>
              <p className="text-xs text-slate-400">{vendas.vendasRapidas.length} venda(s) no caixa</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase text-emerald-600">Recebido</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {formatCents(vendas.recebido)}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase text-amber-600">Diferença</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">
                {formatCents(vendas.totalFaturado - vendas.recebidoFaturas)}
              </p>
            </Card>
          </div>
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Faturamento por mês — faturas</h3>
            <TabelaSimples
              header={['Mês', 'Faturas', 'Faturado']}
              rows={vendas.porMes.map(([m, v]) => [
                monthLabel(m),
                String(v.qtd),
                formatCents(v.faturado),
              ])}
            />
          </Card>
          <Card className="mt-4">
            <h3 className="mb-1 text-sm font-semibold text-slate-700">Vendas rápidas por mês — PDV</h3>
            <p className="mb-3 text-xs text-slate-400">Recebimentos de balcão separados das faturas e dos pedidos.</p>
            <TabelaSimples
              header={['Mês', 'Vendas', 'Total recebido']}
              rows={vendas.porMesPdv.map(([m, v]) => [
                monthLabel(m),
                String(v.qtd),
                formatCents(v.total),
              ])}
            />
          </Card>
        </>
      )}

      {aba === 'fluxo' && (
        <>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard label="Entradas" value={formatCents(fluxo.totalEntradas)} tone="good" />
            <KpiCard label="Saídas" value={formatCents(fluxo.totalSaidas)} tone="bad" />
            <KpiCard
              label="Saldo"
              value={formatCents(fluxo.saldo)}
              tone={fluxo.saldo >= 0 ? 'good' : 'bad'}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Por mês</h3>
              <TabelaSimples
                header={['Mês', 'Entradas', 'Saídas', 'Saldo']}
                rows={fluxo.linhas.map(([m, v]) => [
                  monthLabel(m),
                  formatCents(v.entradas),
                  formatCents(v.saidas),
                  formatCents(v.entradas - v.saidas),
                ])}
              />
            </Card>
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Despesas por categoria
              </h3>
              <TabelaSimples
                header={['Categoria', 'Total']}
                rows={fluxo.porCategoria.map(([cat, v]) => [
                  categoriaLabel(cat),
                  formatCents(v),
                ])}
              />
            </Card>
          </div>
        </>
      )}

      {aba === 'clientes' && (
        <Card>
          <TabelaSimples
            header={['Cliente', 'Orçamentos', 'Faturas', 'Faturado', 'Recebido', 'Em aberto']}
            rows={clientes.map((r) => [
              r.cliente.nome,
              String(r.orcamentos),
              String(r.faturas),
              formatCents(r.faturado),
              formatCents(r.recebido),
              formatCents(r.emAberto),
            ])}
          />
        </Card>
      )}
    </div>
  )
}

function TabelaSimples({ header, rows }: { header: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Sem dados no período.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            {header.map((h, i) => (
              <th key={h} className={`px-3 py-2 font-semibold ${i > 0 ? 'text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-2 ${j > 0 ? 'text-right' : ''}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
