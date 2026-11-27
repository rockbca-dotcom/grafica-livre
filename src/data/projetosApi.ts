import { supabase } from './supabaseClient'
import { custoProjeto, type Projeto, type ProjetoResumo } from '../lib/projetos'
import type { FormaPagamento } from '../types'

const camposResumo = 'id,titulo,cliente_nome,data_projeto,referencia,valor_centavos,custo_centavos,versao,fatura_id,fatura_numero,conta_paga_id,faturado_em'
const chaveLocal = 'graficaup.projetos.amei'
const lerLocal = (): Projeto[] => JSON.parse(localStorage.getItem(chaveLocal) ?? '[]')

export async function listarProjetos(): Promise<ProjetoResumo[]> {
  if (!supabase) return lerLocal().reverse()
  const rows: ProjetoResumo[] = []
  for (let from = 0; ; from += 100) {
    const { data, error } = await supabase.from('projetos_amei')
      .select(camposResumo).order('atualizado_em', { ascending: false }).order('id').range(from, from + 99)
    if (error) throw error
    rows.push(...data as ProjetoResumo[])
    if (data.length < 100) return rows
  }
}

export async function abrirProjeto(id: string): Promise<Projeto> {
  if (!supabase) {
    const p = lerLocal().find(p => p.id === id)
    if (!p) throw new Error('Projeto não encontrado.')
    return p
  }
  const { data, error } = await supabase.from('projetos_amei')
    .select(camposResumo + ',cliente_id,execucao,custos,fotos').eq('id', id).single()
  if (error) throw error
  return data as unknown as Projeto
}

export async function salvarProjeto(p: Projeto): Promise<Projeto> {
  const dados = {
    titulo: p.titulo.trim(), cliente_id: p.cliente_id, cliente_nome: p.cliente_nome.trim(),
    data_projeto: p.data_projeto, referencia: p.referencia.trim(), valor_centavos: p.valor_centavos,
    execucao: p.execucao, custos: p.custos, fotos: p.fotos,
  }
  if (!supabase) {
    const local = lerLocal()
    const existente = local.find(x => x.id === p.id)
    if ((existente?.versao ?? 0) !== p.versao) throw new Error('Reabra o projeto: ele mudou em outra aba.')
    const novo = { ...p, ...dados, custo_centavos: custoProjeto(p.custos), versao: p.versao + 1 }
    localStorage.setItem(chaveLocal, JSON.stringify([...local.filter(x => x.id !== p.id), novo]))
    return novo
  }
  const { data, error } = await supabase.rpc('salvar_projeto_amei', { p_id: p.id, p_versao: p.versao, p_dados: dados })
  if (error) throw error
  // O PostgREST pode representar um retorno composto como uma lista de uma linha.
  const row = (Array.isArray(data) ? (data.length === 1 ? data[0] : null) : data) as Projeto | null
  if (!row || row.id !== p.id || !Number.isInteger(row.versao)) {
    throw new Error('Não foi possível confirmar o salvamento. Reabra a lista antes de tentar novamente.')
  }
  return row
}

export async function faturarProjeto(p: Projeto, vencimento: string, forma: FormaPagamento) {
  if (!supabase) throw new Error('O faturamento de projetos exige o modo conectado.')
  const { data, error } = await supabase.rpc('faturar_projeto_amei', {
    p_id: p.id, p_versao: p.versao, p_vencimento: vencimento, p_forma: forma,
  })
  if (error) throw error
  return data as { fatura_numero: string; conta_paga_id: string | null }
}
