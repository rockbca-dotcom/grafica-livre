import { Card } from './ui'

export type MetasFaturamentoProgresso = {
  grafica: number | null
  comunicacaoVisual: number | null
  total: number | null
}

const formatar = (valor: number) => valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'

function BarraMeta({ titulo, valor, destaque = false, mensagem }: {
  titulo: string; valor: number | null; destaque?: boolean; mensagem?: string
}) {
  const percentual = valor != null && Number.isFinite(valor) ? Math.max(0, Math.min(100, valor)) : null
  return (
    <div className={destaque ? 'rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2.5' : 'px-1'}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className={destaque ? 'text-sm font-bold text-violet-950' : 'text-sm font-medium text-slate-700'}>{titulo}</p>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-violet-800">
          {percentual == null ? <span className="text-xs font-normal text-slate-500">{mensagem ?? 'Não configurada'}</span> : formatar(percentual)}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-violet-100"
        role={percentual == null ? undefined : 'progressbar'} aria-label={percentual == null ? undefined : titulo}
        aria-valuemin={percentual == null ? undefined : 0} aria-valuemax={percentual == null ? undefined : 100}
        aria-valuenow={percentual ?? undefined}>
        <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500"
          style={{ width: (percentual ?? 0) + '%' }} />
      </div>
    </div>
  )
}

export default function MetasFaturamento({ progresso, carregando = false, erro = false, modoLegado = false, temSemClassificacao = false }: {
  progresso: MetasFaturamentoProgresso
  carregando?: boolean
  erro?: boolean
  modoLegado?: boolean
  temSemClassificacao?: boolean
}) {
  const mensagem = carregando ? 'Carregando…' : erro ? 'Indisponível' : undefined
  return (
    <Card className="h-full">
      <h3 className="text-sm font-semibold text-slate-700">Metas de faturamento</h3>
      <p className="mb-4 text-xs text-slate-500">Progresso do faturamento do mês atual</p>
      <div className="grid gap-3">
        <BarraMeta titulo="Meta Gráfica" valor={mensagem ? null : progresso.grafica} mensagem={mensagem} />
        <BarraMeta titulo="Meta Comunicação Visual" valor={mensagem ? null : progresso.comunicacaoVisual} mensagem={mensagem} />
        <BarraMeta titulo={modoLegado ? "Meta Total (anterior)" : "Meta Total"} valor={mensagem ? null : progresso.total} mensagem={mensagem} destaque />
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        {modoLegado ? 'A meta anterior permanece até que o gestor configure as duas categorias.' : 'Meta Total = Gráfica + Comunicação Visual'}
      </p>
      {!modoLegado && temSemClassificacao && <p className="mt-2 text-xs text-slate-500">
        Há faturamento sem classificação. Ele continua no ponto de equilíbrio, mas não entra nas metas por categoria nem na Meta Total.
      </p>}
    </Card>
  )
}
