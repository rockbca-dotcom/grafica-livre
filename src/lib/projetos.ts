import { todayISO } from './dates'

export type CustoProjeto = { nome: string; quantidadeCentesimos: number; unitarioCentavos: number }
export type FotosProjeto = { antes: string[]; depois: string[] }
export type ProjetoResumo = {
  id: string
  titulo: string
  cliente_nome: string
  data_projeto: string
  referencia: string
  valor_centavos: number
  custo_centavos: number
  versao: number
  fatura_id: string | null
  fatura_numero: string | null
  conta_paga_id: string | null
  faturado_em: string | null
}
export type Projeto = ProjetoResumo & {
  cliente_id: string | null
  execucao: string
  custos: CustoProjeto[]
  fotos: FotosProjeto
}

export const MAX_FOTOS = 6
export const MAX_FOTO = 240_000
export const MAX_CUSTOS = 80
export const MAX_VALOR = 999_999_999
const imagemSegura = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/

export const referenciaProjeto = () => 'GA-' + crypto.randomUUID().slice(0, 8).toUpperCase()
export const novoCusto = (nome = ''): CustoProjeto => ({ nome, quantidadeCentesimos: 100, unitarioCentavos: 0 })

export function novoProjeto(): Projeto {
  return {
    id: crypto.randomUUID(), titulo: '', cliente_id: null, cliente_nome: '', data_projeto: todayISO(),
    referencia: referenciaProjeto(), valor_centavos: 0, custo_centavos: 0, versao: 0,
    execucao: '', fotos: { antes: [], depois: [] },
    custos: ['Material', 'Mão de obra', 'Instalação / transporte'].map(novoCusto),
    fatura_id: null, fatura_numero: null, conta_paga_id: null, faturado_em: null,
  }
}

export const custoLinha = (item: CustoProjeto) => Number((BigInt(item.quantidadeCentesimos) * BigInt(item.unitarioCentavos) + 50n) / 100n)
export const custoProjeto = (itens: CustoProjeto[]) => itens.reduce((total, item) => total + custoLinha(item), 0)

export function decimalEmCentavos(input: unknown, limite: number): number {
  if (typeof input !== 'number' && typeof input !== 'string') return 0
  const s = String(input).trim().replace(',', '.')
  if (!s) return 0
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error('Use valores positivos com até duas casas decimais.')
  const [whole, fraction = ''] = s.split('.')
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(value) || value > limite) throw new Error('Um dos valores está acima do limite.')
  return value
}

export const campoDecimal = (valor: number) => Math.floor(valor / 100) + '.' + String(valor % 100).padStart(2, '0')

export async function compactarFoto(source: string | File): Promise<string> {
  const url = typeof source === 'string' ? source : URL.createObjectURL(source)
  try {
    if (typeof source === 'string' && !imagemSegura.test(source)) throw new Error('Use imagens JPG, PNG, WebP ou GIF.')
    const img = new Image()
    img.src = url
    await img.decode()
    const w = img.naturalWidth
    const h = img.naturalHeight
    if (!w || !h || w * h > 50_000_000) throw new Error('Uma foto excede a resolução permitida.')
    const canvas = document.createElement('canvas')
    for (const max of [1280, 1024, 800, 640]) {
      const ratio = Math.min(1, max / Math.max(w, h))
      canvas.width = Math.max(1, Math.round(w * ratio))
      canvas.height = Math.max(1, Math.round(h * ratio))
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const jpeg = canvas.toDataURL('image/jpeg', 0.78)
      if (jpeg.length <= MAX_FOTO) return jpeg
    }
    throw new Error('Não foi possível reduzir uma das fotos.')
  } finally {
    if (typeof source !== 'string') URL.revokeObjectURL(url)
  }
}

export async function importarProjeto(file: File): Promise<Projeto> {
  if (file.size > 32_000_000) throw new Error('O arquivo excede 32 MB.')
  const d = JSON.parse(await file.text())
  if (!d || typeof d.project !== 'string' || !Array.isArray(d.costs)) throw new Error('O arquivo não é um projeto AMEI válido.')
  const txt = (value: unknown, max: number) => typeof value === 'string' ? value.slice(0, max) : ''
  if (d.costs.length > MAX_CUSTOS) throw new Error('O arquivo excede o limite de 80 itens de custo.')
  const grupo = (v: unknown) => Array.isArray(v) ? v : []
  const before = grupo(d.photos?.before ?? (d.photo ? [d.photo] : []))
  const after = grupo(d.photos?.after)
  if (before.length > MAX_FOTOS || after.length > MAX_FOTOS) throw new Error('O limite é de seis fotos por grupo.')
  const p = novoProjeto()
  const costs = d.costs.map((line: { name?: unknown; qty?: unknown; unit?: unknown }) => ({
    nome: txt(line?.name, 160),
    quantidadeCentesimos: decimalEmCentavos(line?.qty ?? 1, 9_999_999),
    unitarioCentavos: decimalEmCentavos(line?.unit, MAX_VALOR),
  }))
  const antes: string[] = []
  const depois: string[] = []
  for (const src of before) {
    if (typeof src !== 'string') throw new Error('Foto inválida no arquivo.')
    antes.push(await compactarFoto(src))
  }
  for (const src of after) {
    if (typeof src !== 'string') throw new Error('Foto inválida no arquivo.')
    depois.push(await compactarFoto(src))
  }
  return {
    ...p, titulo: txt(d.project, 160), cliente_nome: txt(d.client, 160),
    data_projeto: typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : p.data_projeto,
    referencia: txt(d.ref, 60) || p.referencia, execucao: txt(d.execution, 8000),
    valor_centavos: decimalEmCentavos(d.price, MAX_VALOR), custos: costs,
    custo_centavos: custoProjeto(costs), fotos: { antes, depois },
  }
}

export function exportarProjeto(p: Projeto) {
  const arquivo = {
    version: 2, project: p.titulo, client: p.cliente_nome, date: p.data_projeto, ref: p.referencia,
    price: campoDecimal(p.valor_centavos), execution: p.execucao,
    photos: { before: p.fotos.antes, after: p.fotos.depois },
    costs: p.custos.map(c => ({ name: c.nome, qty: campoDecimal(c.quantidadeCentesimos), unit: campoDecimal(c.unitarioCentavos) })),
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(arquivo, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'projeto-amei-' + (p.referencia.replace(/[^a-zA-Z0-9-]/g, '-') || 'rascunho') + '.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
