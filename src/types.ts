// Todos os valores monetários são armazenados em CENTAVOS (inteiros).

export type OrcamentoStatus = 'pendente' | 'aprovado' | 'faturado' | 'recusado'
export type FaturaStatus = 'pendente' | 'parcial' | 'paga' | 'cancelada'
export type ContaPagarStatus = 'pendente' | 'paga'
export type Categoria = 'produto' | 'servico'

export interface Cliente {
  id: string
  nome: string
  documento: string // CNPJ ou CPF
  email: string // e-mail principal
  emailsAdicionais: string[] // outros e-mails que também recebem orçamentos/faturas
  telefone: string
  endereco: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  observacoes: string
  criadoEm: string // ISO
}

/** Todos os e-mails do cliente (principal + adicionais), sem duplicatas nem vazios. */
export function emailsDoCliente(
  c?: Pick<Cliente, 'email' | 'emailsAdicionais'> | null,
): string[] {
  if (!c) return []
  const todos = [c.email, ...(c.emailsAdicionais ?? [])].map((e) => e.trim()).filter(Boolean)
  return [...new Set(todos)]
}

export interface Item {
  id: string
  nome: string
  categoria: Categoria
  precoM2: number // centavos
  precoUnitario: number // centavos
  descricao: string
}

export interface DocumentoItem {
  itemId: string | null
  descricao: string
  qtd: number
  largura: number // metros
  altura: number // metros
  m2: number
  precoM2: number // centavos
  valorUnit: number // centavos
  total: number // centavos (valor base, sem imposto)
  impostoPct: number // percentual de imposto sobre este item, ex.: 14
}

export interface Orcamento {
  id: string
  numero: string
  clienteId: string
  data: string // yyyy-mm-dd
  validadeDias: number
  prazoEntrega: string
  itens: DocumentoItem[]
  subtotal: number // centavos
  frete: number // centavos
  impostoPadrao: number // % de imposto que preenche novos itens
  desconto: number // centavos
  total: number // centavos
  observacoes: string
  condicoesPagamento: string
  status: OrcamentoStatus
  criadoEm: string
}

export type FormaPagamento =
  | 'dinheiro'
  | 'pix'
  | 'transferencia'
  | 'boleto'
  | 'cartao_credito'
  | 'cartao_debito'

export interface Fatura {
  id: string
  numero: string
  orcamentoId: string | null
  clienteId: string
  dataEmissao: string // yyyy-mm-dd
  dataVencimento: string // yyyy-mm-dd
  formaPagamento: FormaPagamento
  itens: DocumentoItem[]
  subtotal: number // centavos
  frete: number // centavos
  impostoPadrao: number // % de imposto que preenche novos itens
  desconto: number // centavos
  total: number // centavos
  observacoes: string
  condicoesPagamento: string
  status: FaturaStatus
  criadoEm: string
}

export interface Pagamento {
  id: string
  faturaId: string
  data: string // yyyy-mm-dd
  valor: number // centavos
  forma: FormaPagamento
  observacao: string
}

/** Linha de uma venda recebida diretamente no PDV. Não gera fatura nem produção. */
export interface VendaRapidaItem {
  id: string
  itemId: string | null
  descricao: string
  qtd: number
  valorUnit: number // centavos
  total: number // centavos
}

/** Venda recebida no balcão/PDV e lançada diretamente no caixa. */
export interface VendaRapida {
  id: string
  numero: string
  clienteId: string | null
  data: string // yyyy-mm-dd
  formaPagamento: FormaPagamento
  itens: VendaRapidaItem[]
  total: number // centavos
  observacao: string
  criadoEm: string
}

export interface ContaPagar {
  id: string
  descricao: string
  categoria: string
  fornecedor: string
  dataVencimento: string // yyyy-mm-dd
  valor: number // centavos
  status: ContaPagarStatus
  dataPagamento: string | null
  criadoEm: string
}

export interface Empresa {
  nome: string
  cnpj: string
  email: string
  telefone: string
  website: string
  endereco: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  chavePix: string
  logoDataUrl: string
  prefixoOrcamento: string
  proximoNumOrcamento: number
  proximoNumFatura: number
  // Textos padrão de novos orçamentos (editáveis por orçamento)
  observacoesPadraoOrcamento: string
  condicoesPagamentoPadrao: string
}

export type EtapaProducao = 'arte' | 'impressao' | 'acabamento' | 'pronto' | 'entregue'

export const ETAPAS_PRODUCAO: [EtapaProducao, string][] = [
  ['arte', 'Arte'],
  ['impressao', 'Impressão'],
  ['acabamento', 'Acabamento'],
  ['pronto', 'Pronto'],
  ['entregue', 'Entregue'],
]

export interface ProducaoCard {
  id: string
  faturaId: string | null // fatura que originou o card (se houver)
  clienteId: string
  titulo: string
  etapa: EtapaProducao
  prazoEntrega: string // texto livre (copiado do orçamento)
  dataEntrega: string | null // yyyy-mm-dd, opcional (badge de atraso)
  observacao: string
  ordem: number // posição dentro da coluna
  criadoEm: string
}

export interface Database {
  clientes: Cliente[]
  itens: Item[]
  orcamentos: Orcamento[]
  faturas: Fatura[]
  pagamentos: Pagamento[]
  vendasRapidas: VendaRapida[]
  contasPagar: ContaPagar[]
  producaoCards: ProducaoCard[]
  empresa: Empresa
}

export const EMPRESA_PADRAO: Empresa = {
  nome: 'Minha Gráfica',
  cnpj: '',
  email: '',
  telefone: '',
  website: '',
  endereco: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
  chavePix: '',
  logoDataUrl: '',
  prefixoOrcamento: 'ORC-',
  proximoNumOrcamento: 1,
  proximoNumFatura: 1,
  observacoesPadraoOrcamento: 'SERVIÇOS DE INSTALAÇÃO E RETIRADA INCLUSOS.',
  condicoesPagamentoPadrao:
    'Formas de pagamento disponíveis:\n' +
    '• Depósito bancário\n' +
    '• PIX\n' +
    '• Cartão de crédito (com acréscimo de taxas da operadora)\n' +
    '• Cripto',
}
