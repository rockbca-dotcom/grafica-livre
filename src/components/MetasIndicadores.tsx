import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { supabase } from '../data/supabaseClient'
import {
  calcularProgressoMetas, faturamentoMesSegmentado, lerMetasLocais, mesAtualMetas, progressoVazio,
  type ProgressoMetas,
} from '../lib/metas'
import { Card } from './ui'
import MetasFaturamento from './MetasFaturamento'

function CircularGauge({ valor }: { valor: number }) {
  const raio = 49
  const circunferencia = 2 * Math.PI * raio
  return (
    <div className="relative mx-auto h-36 w-36" role="progressbar"
      aria-label="Ponto de equilíbrio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={valor}>
      <svg viewBox="0 0 128 128" className="h-full w-full" aria-hidden="true">
        <circle cx="64" cy="64" r={raio} fill="none" stroke="#ede9fe" strokeWidth="12" />
        <circle cx="64" cy="64" r={raio} fill="none" stroke="#7c3aed" strokeWidth="12"
          strokeLinecap="round" transform="rotate(-90 64 64)"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - valor / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold text-violet-700">{valor.toLocaleString('pt-BR')}%</span>
      </div>
    </div>
  )
}

export default function MetasIndicadores() {
  const { cloudMode, session } = useAuth()
  const { db } = useData()
  const [progresso, setProgresso] = useState<ProgressoMetas>(progressoVazio)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const mes = mesAtualMetas()

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(false)

    if (!cloudMode) {
      const dados = calcularProgressoMetas(
        lerMetasLocais(mes), faturamentoMesSegmentado(db, mes),
      )
      setProgresso(dados)
      setCarregando(false)
      return () => { ativo = false }
    }

    if (!supabase || !session) {
      setCarregando(false)
      setErro(true)
      return () => { ativo = false }
    }

    void (async () => {
      const { data, error } = await supabase.rpc('progresso_metas_segmentadas')
      if (!ativo) return
      if (error) {
        setErro(true)
        setProgresso(progressoVazio)
      } else {
        const linha = (Array.isArray(data) ? data[0] : data) as {
          configurada?: boolean
          ponto_equilibrio_pct?: number
          meta_total_pct?: number | null
          meta_grafica_pct?: number | null
          meta_comunicacao_visual_pct?: number | null
          tem_sem_classificacao?: boolean
          modo_legado?: boolean
        } | null
        setProgresso({
          configurada: Boolean(linha?.configurada),
          pontoEquilibrioPct: linha?.configurada ? Number(linha.ponto_equilibrio_pct) : null,
          metaFaturamentoPct: linha?.meta_total_pct != null ? Number(linha.meta_total_pct) : null,
          metaGraficaPct: linha?.meta_grafica_pct != null ? Number(linha.meta_grafica_pct) : null,
          metaComunicacaoVisualPct: linha?.meta_comunicacao_visual_pct != null ? Number(linha.meta_comunicacao_visual_pct) : null,
          temSemClassificacao: Boolean(linha?.tem_sem_classificacao),
          modoLegado: Boolean(linha?.modo_legado),
        })
      }
      setCarregando(false)
    })()

    return () => { ativo = false }
  }, [cloudMode, session?.user.id, mes, db.faturas, db.vendasRapidas])

  const textoEstado = carregando
    ? 'Carregando indicadores...'
    : erro
      ? 'Indicadores indisponíveis no momento.'
      : 'Aguardando configuração das metas deste mês.'

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card className="h-full">
        <h3 className="text-sm font-semibold text-slate-700">Ponto de equilíbrio</h3>
        <p className="mb-3 text-xs text-slate-500">Progresso do faturamento do mês atual</p>
        {progresso.configurada && !carregando && !erro && progresso.pontoEquilibrioPct != null ? (
          <CircularGauge valor={progresso.pontoEquilibrioPct} />
        ) : (
          <div className="flex h-36 items-center justify-center px-3 text-center text-sm text-slate-500">
            {textoEstado}
          </div>
        )}
        <p className="mt-3 text-center text-xs text-slate-500">
          {progresso.configurada && !erro ? 'Percentual atingido até o ponto de equilíbrio' : 'Somente percentual, sem valores financeiros'}
        </p>
      </Card>

      <MetasFaturamento progresso={{
          grafica: progresso.metaGraficaPct,
          comunicacaoVisual: progresso.metaComunicacaoVisualPct,
          total: progresso.metaFaturamentoPct,
        }}
        carregando={carregando} erro={erro}
        modoLegado={progresso.modoLegado} temSemClassificacao={progresso.temSemClassificacao} />
    </div>
  )
}
