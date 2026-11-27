import type { Database } from '../types'
import { monthKey, todayISO } from './dates'

export interface MetaMensal {
  mes: string
  custoFixoCentavos: number
  metaFaturamentoCentavos: number
  metaGraficaCentavos?: number | null
  metaComunicacaoVisualCentavos?: number | null
  margemContribuicaoPct: number
}

export interface ProgressoMetas {
  configurada: boolean
  pontoEquilibrioPct: number | null
  metaFaturamentoPct: number | null
  metaGraficaPct: number | null
  metaComunicacaoVisualPct: number | null
  temSemClassificacao: boolean
  modoLegado: boolean
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

export interface FaturamentoMensal {
  total: number
  grafica: number
  comunicacaoVisual: number
  temSemClassificacao: boolean
}

export const progressoVazio: ProgressoMetas = {
  configurada: false, pontoEquilibrioPct: null, metaFaturamentoPct: null,
  metaGraficaPct: null, metaComunicacaoVisualPct: null,
  temSemClassificacao: false, modoLegado: false,
}

export function dividirLancamento(valor: number, itens: (Database['faturas'][number]['itens'][number] | Database['vendasRapidas'][number]['itens'][number])[], fatura: boolean) {
  let total = 0, grafica = 0, visual = 0
  for (const item of itens) {
    const imposto = fatura && 'impostoPct' in item ? Math.round(item.total * (item.impostoPct || 0) / 100) : 0
    const peso = Math.max(0,item.total + imposto)
    total += peso
    if (item.segmento === 'grafica') grafica += peso
    if (item.segmento === 'comunicacao_visual') visual += peso
  }
  const rateio = (peso: number) => {
    if (!total) return 0
    if (![valor, peso, total].every(Number.isSafeInteger)) return Math.sign(valor) * Math.round(Math.abs(valor) * peso / total)
    return Math.sign(valor) * Number((BigInt(Math.abs(valor))*BigInt(peso)*2n + BigInt(total))/(BigInt(total)*2n))
  }
  const classificados = rateio(grafica+visual), segGrafica = rateio(grafica)
  return { grafica: segGrafica, comunicacaoVisual: classificados-segGrafica, temSemClassificacao: classificados !== valor }
}

export function faturamentoMesSegmentado(db: Database, mes: string): FaturamentoMensal {
  const result = { total: 0, grafica: 0, comunicacaoVisual: 0, temSemClassificacao: false }
  const somar = (valor: number, itens: Parameters<typeof dividirLancamento>[1], fatura: boolean) => {
    const partes = dividirLancamento(valor,itens,fatura)
    result.total += valor
    result.grafica += partes.grafica
    result.comunicacaoVisual += partes.comunicacaoVisual
    result.temSemClassificacao ||= partes.temSemClassificacao
  }
  for (const f of db.faturas) if (monthKey(f.dataEmissao) === mes && f.status !== 'cancelada') somar(f.total,f.itens,true)
  for (const v of db.vendasRapidas) if (monthKey(v.data) === mes) somar(v.total,v.itens,false)
  return result
}

export function calcularProgressoMetas(meta: MetaMensal | null, venda: FaturamentoMensal): ProgressoMetas {
  if (!meta || meta.custoFixoCentavos <= 0 || meta.metaFaturamentoCentavos <= 0 ||
    meta.margemContribuicaoPct <= 0 || meta.margemContribuicaoPct > 100) return progressoVazio
  const limitar = (p: number) => Math.max(0,Math.min(100,Math.round(p*10)/10))
  const g = meta.metaGraficaCentavos ?? 0, cv = meta.metaComunicacaoVisualCentavos ?? 0
  const segmentada = g > 0 && cv > 0
  return {
    configurada: true, modoLegado: !segmentada, temSemClassificacao: venda.temSemClassificacao,
    pontoEquilibrioPct: limitar(venda.total * meta.margemContribuicaoPct / meta.custoFixoCentavos),
    metaFaturamentoPct: segmentada ? limitar((venda.grafica+venda.comunicacaoVisual)*100/(g+cv)) : limitar(venda.total*100/meta.metaFaturamentoCentavos),
    metaGraficaPct: segmentada ? limitar(venda.grafica*100/g) : null,
    metaComunicacaoVisualPct: segmentada ? limitar(venda.comunicacaoVisual*100/cv) : null,
  }
}
