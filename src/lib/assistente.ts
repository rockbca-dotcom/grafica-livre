import { supabase } from '../data/supabaseClient'

export type AssistenteMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AssistenteAction = {
  name: string
  args: Record<string, unknown>
}

type AssistenteResponse = {
  message?: string
  erro?: string
  confirmation?: AssistenteAction
}

export async function perguntarAssistente(
  messages: AssistenteMessage[],
  confirmAction?: AssistenteAction,
): Promise<{ message: string; confirmation?: AssistenteAction }> {
  if (!supabase) {
    throw new Error('O assistente requer o modo cloud do Supabase.')
  }
  const { data, error } = await supabase.functions.invoke<AssistenteResponse>('assistente-ia', {
    body: { messages, ...(confirmAction ? { confirmAction } : {}) },
  })
  if (error) throw new Error(error.message || 'Não foi possível consultar o assistente.')
  if (!data?.message) throw new Error(data?.erro || 'O assistente não retornou uma resposta.')
  return { message: data.message, confirmation: data.confirmation }
}
