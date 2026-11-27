export const SEGMENTOS = [['grafica', 'Gráfica'], ['comunicacao_visual', 'Comunicação Visual']] as const
export type Segmento = (typeof SEGMENTOS)[number][0]

export function segmentoValido(value: unknown): Segmento | null {
  return value === 'grafica' || value === 'comunicacao_visual' ? value : null
}

export function rotuloSegmento(value: unknown): string {
  return SEGMENTOS.find(([key]) => key === value)?.[1] ?? 'Sem classificação'
}
