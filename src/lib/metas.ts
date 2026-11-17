import type { Database } from '../types'
import { monthKey, todayISO } from './dates'

export interface MetaMensal {
  mes: string
  custoFixoCentavos: number
  metaFaturamentoCentavos: number
  margemContribuicaoPct: number
}

export interface ProgressoMetas {
  configurada: boolean
  pontoEquilibrioPct: number | null
  metaFaturamentoPct: number | null
}

const STORAGE_KEY = 'graficaLivre:metasMensais'

export function mesAtualMetas(): string {
  return monthKey(todayISO())
}

export function mesValido(mes: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(mes)
}

export function lerMetasLocais(mes: string): MetaMensal | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Record<string, MetaMensal>
    const meta = data[mes]
    return meta && meta.mes === mes ? meta : null
  } catch {
    return null
  }
}

export function salvarMetasLocais(meta: MetaMensal): void {
  const raw = localStorage.getItem(STORAGE_KEY)
  let data: Record<string, MetaMensal> = {}
  try {
    if (raw) data = JSON.parse(raw) as Record<string, MetaMensal>
  } catch {
    // Preserva funcionalidade local mesmo diante de dados antigos inválidos.
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, [meta.mes]: meta }))
}

export function faturamentoMesCentavos(db: Database, mes: string): number {
  const totalFaturas = db.faturas
    .filter((f) => monthKey(f.dataEmissao) === mes && f.status !== 'cancelada')
    .reduce((sum, f) => sum + f.total, 0)
  const totalPDV = db.vendasRapidas
    .filter((v) => monthKey(v.data) === mes)
    .reduce((sum, v) => sum + v.total, 0)
  return totalFaturas + totalPDV
}

export function calcularProgressoMetas(
  meta: MetaMensal | null,
  faturamentoCentavos: number,
): ProgressoMetas {
  if (!meta || meta.custoFixoCentavos <= 0 || meta.metaFaturamentoCentavos <= 0 ||
    meta.margemContribuicaoPct <= 0 || meta.margemContribuicaoPct > 100) {
    return { configurada: false, pontoEquilibrioPct: null, metaFaturamentoPct: null }
  }
  const limitar = (percentual: number) =>
    Math.max(0, Math.min(100, Math.round(percentual * 10) / 10))
  return {
    configurada: true,
    pontoEquilibrioPct: limitar(
      faturamentoCentavos * meta.margemContribuicaoPct / meta.custoFixoCentavos,
    ),
    metaFaturamentoPct: limitar(faturamentoCentavos * 100 / meta.metaFaturamentoCentavos),
  }
}
