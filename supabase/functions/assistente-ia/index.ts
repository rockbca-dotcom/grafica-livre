import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const MODEL = 'z-ai/glm-5.3'
const MAX_MESSAGES = 24
const MAX_MESSAGE_LENGTH = 8_000
const MAX_TOOL_ROUNDS = 3

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type ToolCall = {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

type ModelMessage = {
  role: string
  content?: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'resumo_operacional',
      description:
        'Consulta um resumo dos principais indicadores da gráfica. Use para perguntas sobre totais, pendências, faturamento e recebimentos.',
      parameters: {
        type: 'object',
        properties: {
          inicio: { type: 'string', description: 'Data inicial no formato YYYY-MM-DD, opcional.' },
          fim: { type: 'string', description: 'Data final no formato YYYY-MM-DD, opcional.' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscar_clientes',
      description: 'Busca clientes pelo nome, e-mail ou telefone.',
      parameters: {
        type: 'object',
        properties: {
          termo: { type: 'string', description: 'Parte do nome, e-mail ou telefone do cliente.' },
          limite: { type: 'integer', minimum: 1, maximum: 20, description: 'Quantidade máxima de resultados.' },
        },
        required: ['termo'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listar_orcamentos',
      description: 'Lista orçamentos do usuário, opcionalmente filtrados por status.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pendente', 'faturado', 'recusado'] },
          limite: { type: 'integer', minimum: 1, maximum: 30 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listar_faturas',
      description: 'Lista faturas do usuário, opcionalmente filtradas por status.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pendente', 'parcial', 'atrasada', 'paga', 'cancelada'] },
          limite: { type: 'integer', minimum: 1, maximum: 30 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listar_vendas_rapidas',
      description: 'Lista vendas rápidas registradas no PDV.',
      parameters: {
        type: 'object',
        properties: {
          limite: { type: 'integer', minimum: 1, maximum: 30 },
        },
        additionalProperties: false,
      },
    },
  },
]

const ACTION_TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'criar_cliente',
      description: 'Propõe o cadastro de um novo cliente. Nunca execute sem confirmação do usuário.',
      parameters: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Nome completo ou razão social.' },
          documento: { type: 'string' },
          email: { type: 'string' },
          telefone: { type: 'string' },
          cidade: { type: 'string' },
          estado: { type: 'string' },
          observacoes: { type: 'string' },
        },
        required: ['nome'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'criar_orcamento',
      description: 'Propõe a criação de um orçamento. Nunca execute sem confirmação do usuário.',
      parameters: {
        type: 'object',
        properties: {
          cliente_id: { type: 'string', description: 'ID do cliente. Use buscar_clientes antes se necessário.' },
          data: { type: 'string', description: 'Data no formato YYYY-MM-DD, opcional.' },
          validade_dias: { type: 'integer', minimum: 1, maximum: 365 },
          prazo_entrega: { type: 'string' },
          frete_centavos: { type: 'integer', minimum: 0 },
          desconto_centavos: { type: 'integer', minimum: 0 },
          observacoes: { type: 'string' },
          condicoes_pagamento: { type: 'string' },
          itens: {
            type: 'array',
            minItems: 1,
            maxItems: 50,
            items: {
              type: 'object',
              properties: {
                descricao: { type: 'string' },
                qtd: { type: 'number', minimum: 0.01 },
                valor_unit_centavos: { type: 'integer', minimum: 1 },
              },
              required: ['descricao', 'qtd', 'valor_unit_centavos'],
              additionalProperties: false,
            },
          },
        },
        required: ['cliente_id', 'itens'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'criar_venda_rapida',
      description: 'Propõe o registro de uma venda rápida no PDV. Nunca execute sem confirmação do usuário.',
      parameters: {
        type: 'object',
        properties: {
          cliente_id: { type: 'string', description: 'ID do cliente, opcional.' },
          data: { type: 'string', description: 'Data no formato YYYY-MM-DD, opcional.' },
          forma_pagamento: { type: 'string', enum: ['dinheiro', 'pix', 'transferencia', 'boleto', 'cartao_credito', 'cartao_debito'] },
          observacao: { type: 'string' },
          itens: {
            type: 'array',
            minItems: 1,
            maxItems: 50,
            items: {
              type: 'object',
              properties: {
                descricao: { type: 'string' },
                qtd: { type: 'number', minimum: 0.01 },
                valor_unit_centavos: { type: 'integer', minimum: 1 },
              },
              required: ['descricao', 'qtd', 'valor_unit_centavos'],
              additionalProperties: false,
            },
          },
        },
        required: ['itens'],
        additionalProperties: false,
      },
    },
  },
]

const ACTION_NAMES = new Set(['criar_cliente', 'criar_orcamento', 'criar_venda_rapida'])

function json(body: unknown, status = 200, req?: Request) {
  const origin = req?.headers.get('Origin')
  const headers = {
    ...CORS,
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Content-Type': 'application/json',
  }
  return new Response(JSON.stringify(body), { status, headers })
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asLimit(value: unknown, fallback = 20): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(30, Math.max(1, Math.floor(parsed)))
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

function isoDate(value: unknown): string | null {
  const text = asText(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
}

async function executeTool(
  supabase: ReturnType<typeof createClient>,
  name: string,
  rawArguments: string,
) {
  let args: Record<string, unknown>
  try {
    args = asObject(JSON.parse(rawArguments || '{}'))
  } catch {
    return { erro: 'Os argumentos da consulta são inválidos.' }
  }

  if (name === 'buscar_clientes') {
    const termo = asText(args.termo)
    if (!termo) return { erro: 'Informe o termo para buscar clientes.' }
    const filtro = escapeLike(termo)
    const limite = asLimit(args.limite)
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome, email, telefone, cidade, estado')
      .or(`nome.ilike.%${filtro}%,email.ilike.%${filtro}%,telefone.ilike.%${filtro}%`)
      .order('nome')
      .limit(limite)
    if (error) throw error
    return { clientes: data ?? [] }
  }

  if (name === 'listar_orcamentos') {
    const limite = asLimit(args.limite)
    let query = supabase
      .from('orcamentos')
      .select('id, numero, cliente_id, data, validade_dias, total, status, criado_em')
      .order('criado_em', { ascending: false })
      .limit(limite)
    const status = asText(args.status)
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    return { orcamentos: data ?? [] }
  }

  if (name === 'listar_faturas') {
    const limite = asLimit(args.limite)
    let query = supabase
      .from('faturas')
      .select('id, numero, cliente_id, data_emissao, data_vencimento, total, status, forma_pagamento')
      .order('data_emissao', { ascending: false })
      .limit(limite)
    const status = asText(args.status)
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    return { faturas: data ?? [] }
  }

  if (name === 'listar_vendas_rapidas') {
    const limite = asLimit(args.limite)
    const { data, error } = await supabase
      .from('vendas_rapidas')
      .select('id, numero, cliente_id, data, total, forma_pagamento, criado_em')
      .order('data', { ascending: false })
      .limit(limite)
    if (error) throw error
    return { vendas_rapidas: data ?? [] }
  }

  if (name === 'resumo_operacional') {
    const inicio = isoDate(args.inicio)
    const fim = isoDate(args.fim)
    const [clientes, itens, orcamentos, faturas, vendas, contas] = await Promise.all([
      supabase.from('clientes').select('id', { count: 'exact', head: true }),
      supabase.from('itens').select('id', { count: 'exact', head: true }),
      supabase.from('orcamentos').select('status, total, data'),
      supabase.from('faturas').select('status, total, data_emissao, data_vencimento'),
      supabase.from('vendas_rapidas').select('total, data'),
      supabase.from('contas_pagar').select('status, valor, data_vencimento'),
    ])
    const firstError = [clientes, itens, orcamentos, faturas, vendas, contas].find((res) => res.error)
    if (firstError?.error) throw firstError.error
    const inPeriod = (value: unknown) => {
      const date = asText(value)
      return (!inicio || date >= inicio) && (!fim || date <= fim)
    }
    const quoteRows = (orcamentos.data ?? []).filter((row) => inPeriod(row.data))
    const invoiceRows = (faturas.data ?? []).filter((row) => inPeriod(row.data_emissao))
    const saleRows = (vendas.data ?? []).filter((row) => inPeriod(row.data))
    const payableRows = (contas.data ?? []).filter((row) => inPeriod(row.data_vencimento))
    const soma = (rows: Array<Record<string, unknown>>, key: string) =>
      rows.reduce((total, row) => total + (Number(row[key]) || 0), 0)
    return {
      periodo: { inicio, fim },
      clientes: clientes.count ?? 0,
      produtos: itens.count ?? 0,
      orcamentos: {
        quantidade: quoteRows.length,
        pendentes: quoteRows.filter((row) => row.status === 'pendente').length,
        total: soma(quoteRows, 'total'),
      },
      faturas: {
        quantidade: invoiceRows.length,
        em_aberto: invoiceRows.filter((row) => row.status !== 'paga' && row.status !== 'cancelada').length,
        pagas: invoiceRows.filter((row) => row.status === 'paga').length,
        total: soma(invoiceRows, 'total'),
      },
      vendas_rapidas: { quantidade: saleRows.length, total: soma(saleRows, 'total') },
      contas_a_pagar: {
        quantidade: payableRows.length,
        pendentes: payableRows.filter((row) => row.status === 'pendente').length,
        total: soma(payableRows, 'valor'),
      },
    }
  }

  return { erro: `Ferramenta desconhecida: ${name}` }
}

type NormalizedItem = {
  descricao: string
  qtd: number
  valorUnit: number
  total: number
}

function normalizeItems(value: unknown): { items: NormalizedItem[]; total: number } {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    throw new Error('Informe entre 1 e 50 itens.')
  }
  const items = value.map((raw, index) => {
    const item = asObject(raw)
    const descricao = asText(item.descricao)
    const qtd = Number(item.qtd)
    const valorUnit = Number(item.valor_unit_centavos)
    if (!descricao || !Number.isFinite(qtd) || qtd <= 0 || !Number.isInteger(valorUnit) || valorUnit <= 0) {
      throw new Error(`Item ${index + 1} inválido.`)
    }
    return { descricao, qtd, valorUnit, total: Math.round(qtd * valorUnit) }
  })
  return { items, total: items.reduce((sum, item) => sum + item.total, 0) }
}

function actionDate(value: unknown): string {
  return isoDate(value) ?? new Date().toISOString().slice(0, 10)
}

function money(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function itemSummary(value: unknown): string {
  try {
    return normalizeItems(value).items.map((item) => `${item.descricao} (${item.qtd})`).join(', ')
  } catch {
    return 'itens informados'
  }
}

function actionProposal(name: string, args: Record<string, unknown>): string {
  if (name === 'criar_cliente') {
    return `Confirme para cadastrar o cliente "${asText(args.nome)}".`
  }
  if (name === 'criar_orcamento') {
    const normalized = normalizeItems(args.itens)
    const frete = Math.max(0, Number(args.frete_centavos) || 0)
    const desconto = Math.max(0, Number(args.desconto_centavos) || 0)
    const total = Math.max(0, normalized.total + frete - desconto)
    return `Confirme para criar o orçamento com ${normalized.items.length} item(ns) (${itemSummary(args.itens)}), total estimado de ${money(total)}.`
  }
  const normalized = normalizeItems(args.itens)
  return `Confirme para registrar a venda rápida com ${normalized.items.length} item(ns) (${itemSummary(args.itens)}), total de ${money(normalized.total)}.`
}

async function executeAction(
  supabase: ReturnType<typeof createClient>,
  name: string,
  args: Record<string, unknown>,
) {
  if (!ACTION_NAMES.has(name)) throw new Error('Ação não autorizada.')

  if (name === 'criar_cliente') {
    const nome = asText(args.nome)
    if (!nome) throw new Error('Informe o nome do cliente.')
    const row = {
      id: crypto.randomUUID(),
      nome,
      documento: asText(args.documento),
      email: asText(args.email),
      telefone: asText(args.telefone),
      cidade: asText(args.cidade),
      estado: asText(args.estado),
      observacoes: asText(args.observacoes),
      emails_adicionais: [],
      endereco: '',
      numero: '',
      complemento: '',
      bairro: '',
      cep: '',
      criado_em: new Date().toISOString(),
    }
    const { error } = await supabase.from('clientes').insert(row)
    if (error) throw error
    return { message: `Cliente "${nome}" cadastrado com sucesso.` }
  }

  const clienteId = asText(args.cliente_id)
  if (clienteId) {
    const { data, error } = await supabase.from('clientes').select('id').eq('id', clienteId).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Cliente não encontrado ou não pertence ao usuário atual.')
  }

  const normalized = normalizeItems(args.itens)

  if (name === 'criar_orcamento') {
    if (!clienteId) throw new Error('Selecione um cliente para o orçamento.')
    const { data: empresa, error: empresaError } = await supabase
      .from('empresa')
      .select('prefixo_orcamento')
      .maybeSingle()
    if (empresaError) throw empresaError
    const { data: sequence, error: sequenceError } = await supabase.rpc('proximo_numero_documento', {
      p_tipo: 'orcamento',
    })
    if (sequenceError || typeof sequence !== 'number') throw sequenceError ?? new Error('Não foi possível reservar o número do orçamento.')
    const frete = Math.max(0, Number(args.frete_centavos) || 0)
    const desconto = Math.max(0, Number(args.desconto_centavos) || 0)
    const total = Math.max(0, normalized.total + frete - desconto)
    const { error } = await supabase.from('orcamentos').insert({
      id: crypto.randomUUID(),
      numero: `${asText(empresa?.prefixo_orcamento) || 'ORC-'}${sequence}`,
      cliente_id: clienteId,
      data: actionDate(args.data),
      validade_dias: Math.min(365, Math.max(1, Math.floor(Number(args.validade_dias) || 30))),
      prazo_entrega: asText(args.prazo_entrega),
      itens: normalized.items.map((item) => ({
        itemId: null,
        descricao: item.descricao,
        qtd: item.qtd,
        largura: 0,
        altura: 0,
        m2: 0,
        precoM2: 0,
        valorUnit: item.valorUnit,
        total: item.total,
        impostoPct: 0,
      })),
      subtotal: normalized.total,
      frete,
      imposto_padrao: 0,
      desconto,
      total,
      observacoes: asText(args.observacoes),
      condicoes_pagamento: asText(args.condicoes_pagamento),
      status: 'pendente',
      criado_em: new Date().toISOString(),
    })
    if (error) throw error
    return { message: `Orçamento criado com sucesso no valor de ${money(total)}.` }
  }

  const data = actionDate(args.data)
  const id = crypto.randomUUID()
  const sufixo = id.replaceAll('-', '').slice(0, 6).toUpperCase()
  const { error } = await supabase.from('vendas_rapidas').insert({
    id,
    numero: `PDV-${data.replaceAll('-', '')}-${sufixo}`,
    cliente_id: clienteId || null,
    data,
    forma_pagamento: asText(args.forma_pagamento) || 'pix',
    itens: normalized.items.map((item) => ({
      id: crypto.randomUUID(),
      itemId: null,
      descricao: item.descricao,
      qtd: item.qtd,
      valorUnit: item.valorUnit,
      total: item.total,
    })),
    total: normalized.total,
    observacao: asText(args.observacao),
    criado_em: new Date().toISOString(),
  })
  if (error) throw error
  return { message: `Venda rápida registrada com sucesso no valor de ${money(normalized.total)}.` }
}

const SYSTEM_PROMPT = `Você é o assistente do GraficaUp Studio, um sistema de gestão para gráficas.
Responda sempre em português do Brasil, com objetividade e linguagem simples.
Você pode consultar somente os dados do usuário através das ferramentas disponíveis.
Nunca invente números: quando a pergunta depender dos dados do sistema, use uma ferramenta.
Valores monetários retornados pelas ferramentas estão em centavos; apresente-os em reais (R$).
Não solicite, revele ou armazene senhas, chaves de API ou tokens.
Para consultar dados, use as ferramentas de leitura disponíveis.
Para criar cliente, orçamento ou venda rápida, use a ferramenta de ação somente para montar a proposta.
O backend pedirá confirmação explícita antes de executar qualquer ação.
Nunca diga que uma ação foi concluída antes de receber o resultado da execução.`

async function chamarNvidia(messages: ModelMessage[], apiKey: string) {
  const response = await fetch(NVIDIA_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: [...TOOL_DEFINITIONS, ...ACTION_TOOL_DEFINITIONS],
      tool_choice: 'auto',
      temperature: 0.3,
      top_p: 1,
      max_tokens: 1_200,
      stream: false,
    }),
  })
  const text = await response.text()
  let data: Record<string, unknown> = {}
  try {
    data = text ? JSON.parse(text) as Record<string, unknown> : {}
  } catch {
    data = {}
  }
  if (!response.ok) {
    const providerMessage = asText(asObject(data.error).message)
    throw new Error(providerMessage || `A NVIDIA API respondeu com HTTP ${response.status}.`)
  }
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido.' }, 405, req)

  const authHeader = req.headers.get('Authorization') ?? ''
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  if (!supabaseKey) return json({ erro: 'Chave pública do Supabase não configurada.' }, 503, req)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    supabaseKey,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return json({ erro: 'Não autorizado.' }, 401, req)

  const apiKey = Deno.env.get('NVIDIA_API_KEY')
  if (!apiKey) return json({ erro: 'NVIDIA_API_KEY não configurada no Supabase.' }, 503, req)

  let body: { messages?: unknown; confirmAction?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ erro: 'JSON inválido.' }, 400, req)
  }

  const confirmation = asObject(body.confirmAction)
  if (Object.keys(confirmation).length > 0) {
    const name = asText(confirmation.name)
    const args = asObject(confirmation.args)
    if (!ACTION_NAMES.has(name)) return json({ erro: 'Ação não autorizada.' }, 403, req)
    try {
      const result = await executeAction(supabase, name, args)
      return json({ message: result.message, executed: true }, 200, req)
    } catch (error) {
      return json({
        erro: error instanceof Error ? error.message : 'Não foi possível executar a ação.',
      }, 422, req)
    }
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    return json({ erro: `Envie entre 1 e ${MAX_MESSAGES} mensagens.` }, 400, req)
  }
  const messages = body.messages.filter((message): message is ChatMessage => {
    const item = asObject(message)
    return (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string'
  })
  if (messages.length !== body.messages.length || messages.some((message) => message.content.length > MAX_MESSAGE_LENGTH)) {
    return json({ erro: 'Mensagem inválida ou muito longa.' }, 400, req)
  }

  const modelMessages: ModelMessage[] = [
    { role: 'system', content: `${SYSTEM_PROMPT}\nData atual: ${new Date().toISOString().slice(0, 10)}.` },
    ...messages.map((message) => ({ role: message.role, content: message.content })),
  ]

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const data = await chamarNvidia(modelMessages, apiKey)
      const choices = Array.isArray(data.choices) ? data.choices : []
      const message = asObject(asObject(choices[0]).message)
      const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls as ToolCall[] : []
      if (toolCalls.length === 0) {
        const content = asText(message.content) || 'Não consegui gerar uma resposta agora.'
        return json({ message: content, model: MODEL }, 200, req)
      }

      const actionCall = toolCalls.find((toolCall) => ACTION_NAMES.has(toolCall.function?.name))
      if (actionCall) {
        try {
          const args = asObject(JSON.parse(actionCall.function.arguments || '{}'))
          return json({
            message: actionProposal(actionCall.function.name, args),
            confirmation: { name: actionCall.function.name, args },
          }, 200, req)
        } catch (error) {
          return json({
            erro: error instanceof Error ? error.message : 'A ação proposta é inválida.',
          }, 422, req)
        }
      }

      modelMessages.push({
        role: 'assistant',
        content: typeof message.content === 'string' ? message.content : null,
        tool_calls: toolCalls,
      })
      for (const toolCall of toolCalls) {
        const result = await executeTool(supabase, toolCall.function.name, toolCall.function.arguments)
        modelMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        })
      }
    }
    return json({ erro: 'A consulta excedeu o limite de etapas.' }, 422, req)
  } catch (error) {
    console.error('assistente-ia:', error instanceof Error ? error.message : String(error))
    return json({ erro: 'Não foi possível consultar o assistente agora.' }, 502, req)
  }
})
