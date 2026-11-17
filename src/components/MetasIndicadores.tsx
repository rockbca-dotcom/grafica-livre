import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { supabase } from '../data/supabaseClient'
import {
  calcularProgressoMetas, faturamentoMesCentavos, lerMetasLocais, mesAtualMetas,
  type ProgressoMetas,
} from '../lib/metas'
import { Card } from './ui'

const VAZIO: ProgressoMetas = {
  configurada: false,
  pontoEquilibrioPct: null,
  metaFaturamentoPct: null,
}

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
  const [progresso, setProgresso] = useState<ProgressoMetas>(VAZIO)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const mes = mesAtualMetas()

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(false)

    if (!cloudMode) {
      const dados = calcularProgressoMetas(
        lerMetasLocais(mes), faturamentoMesCentavos(db, mes),
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
      const { data, error } = await supabase.rpc('progresso_metas_mensais')
      if (!ativo) return
      if (error) {
        setErro(true)
        setProgresso(VAZIO)
      } else {
        const linha = (Array.isArray(data) ? data[0] : data) as {
          configurada?: boolean
          ponto_equilibrio_pct?: number
          meta_faturamento_pct?: number
        } | null
        setProgresso({
          configurada: Boolean(linha?.configurada),
          pontoEquilibrioPct: linha?.configurada ? Number(linha.ponto_equilibrio_pct) : null,
          metaFaturamentoPct: linha?.configurada ? Number(linha.meta_faturamento_pct) : null,
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

      <Card className="h-full">
        <h3 className="text-sm font-semibold text-slate-700">Meta de faturamento</h3>
        <p className="mb-3 text-xs text-slate-500">Progresso do faturamento do mês atual</p>
        <div className="flex h-36 flex-col justify-center gap-3">
          {progresso.configurada && !carregando && !erro && progresso.metaFaturamentoPct != null ? (
            <>
              <div className="text-center text-3xl font-bold text-violet-700">
                {progresso.metaFaturamentoPct.toLocaleString('pt-BR')}%
              </div>
              <div className="h-5 overflow-hidden rounded-full bg-violet-100"
                role="progressbar" aria-label="Meta de faturamento"
                aria-valuemin={0} aria-valuemax={100}
                aria-valuenow={progresso.metaFaturamentoPct}>
                <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all"
                  style={{ width: `${progresso.metaFaturamentoPct}%` }} />
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-slate-500">{textoEstado}</p>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">Meta do mês atual · 0 a 100%</p>
      </Card>
    </div>
  )
}
