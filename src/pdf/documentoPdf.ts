import pdfMake from 'pdfmake/build/pdfmake'
import * as pdfFontsModule from 'pdfmake/build/vfs_fonts'
import type { Content, TDocumentDefinitions, TableCell } from 'pdfmake/interfaces'
import type { Cliente, Empresa, Fatura, Orcamento } from '../types'
import { formatCents } from '../lib/money'
import { addDays, formatDateBR } from '../lib/dates'

// Localiza o mapa de fontes (base64) — o formato do vfs_fonts varia entre versões:
// em algumas fica em .vfs / .pdfMake.vfs / .default; na 0.3.x o módulo É o mapa
// (chaves "Roboto-Regular.ttf" etc.). Procuramos o objeto que tem arquivos .ttf.
const fontsAny = pdfFontsModule as unknown as Record<string, unknown>
function acharVfs(m: Record<string, unknown>): Record<string, string> | undefined {
  const temFontes = (o: unknown): o is Record<string, unknown> =>
    !!o && typeof o === 'object' && Object.keys(o as object).some((k) => k.endsWith('.ttf'))
  const d = m.default as Record<string, unknown> | undefined
  // Prioriza o .default (mapa limpo no Vite) antes do namespace do módulo, que
  // carrega chaves extras (default/__esModule) que não são fontes.
  const candidatos: unknown[] = [
    m.vfs,
    (m.pdfMake as Record<string, unknown> | undefined)?.vfs,
    d,
    d?.vfs,
    (d?.pdfMake as Record<string, unknown> | undefined)?.vfs,
    m,
  ]
  const bruto = candidatos.find(temFontes)
  if (!bruto) return undefined
  // Mantém só as entradas string (base64) — addVirtualFileSystem quebra se um
  // valor não for string (ex.: a chave "default" do namespace do Vite).
  const limpo: Record<string, string> = {}
  for (const [k, v] of Object.entries(bruto)) {
    if (typeof v === 'string') limpo[k] = v
  }
  return Object.keys(limpo).length ? limpo : undefined
}
const vfs = acharVfs(fontsAny)
if (vfs) {
  // pdfmake 0.3.x usa addVirtualFileSystem(); versões antigas usam a propriedade .vfs
  const pm = pdfMake as unknown as {
    addVirtualFileSystem?: (v: Record<string, string>) => void
    vfs?: Record<string, string>
  }
  if (typeof pm.addVirtualFileSystem === 'function') pm.addVirtualFileSystem(vfs)
  else pm.vfs = vfs
}

// Paleta do template (definida pelo cliente)
const AZUL = '#3B90EC' // azul de destaque (título, cabeçalho da tabela, total, PIX)
const CINZA = '#595959' // cinza (mais escuro) dos textos secundários (CNPJ, datas, rótulos)
const PRETO = '#000000' // texto principal

const FORMA_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  transferencia: 'Transferência bancária',
  boleto: 'Boleto',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
}

function cabecalho(empresa: Empresa, titulo: string, numero: string): Content {
  // Coluna da esquerda: logo em cima e, abaixo dela, os dados da empresa.
  // O nome fica no mesmo tamanho do restante dos dados (só em negrito).
  const esquerda: Content = {
    stack: [
      ...(empresa.logoDataUrl
        ? [{ image: empresa.logoDataUrl, fit: [130, 60] as [number, number], margin: [0, 0, 0, 6] as [number, number, number, number] }]
        : []),
      { text: empresa.nome, bold: true },
      ...(empresa.cnpj ? [{ text: `CNPJ: ${empresa.cnpj}`, color: CINZA }] : []),
      ...(empresa.endereco
        ? [{
            text: `${empresa.endereco}${empresa.bairro ? ', ' + empresa.bairro : ''} — ${empresa.cidade}/${empresa.estado} ${empresa.cep}`,
            color: CINZA,
          }]
        : []),
      {
        text: [empresa.telefone, empresa.email, empresa.website]
          .filter(Boolean)
          .join('  •  '),
        color: CINZA,
      },
    ],
    fontSize: 9,
  }

  const tituloBloco: Content = {
    stack: [
      { text: titulo, fontSize: 20, bold: true, color: AZUL, alignment: 'right' },
      { text: numero, fontSize: 12, alignment: 'right', color: CINZA },
    ],
  }

  return {
    columns: [esquerda, tituloBloco],
    columnGap: 14,
    margin: [0, 0, 0, 16],
  }
}

function blocoCliente(cliente: Cliente | undefined): Content {
  return {
    stack: [
      { text: 'CLIENTE', fontSize: 8, bold: true, color: CINZA, margin: [0, 0, 0, 2] },
      { text: cliente?.nome ?? '-', bold: true },
      ...(cliente?.documento ? [{ text: `CNPJ/CPF: ${cliente.documento}`, fontSize: 9 }] : []),
      ...(cliente?.endereco
        ? [{
            text: `${cliente.endereco}${cliente.bairro ? ', ' + cliente.bairro : ''} — ${cliente.cidade}/${cliente.estado}`,
            fontSize: 9,
          }]
        : []),
      {
        text: [cliente?.telefone, cliente?.email].filter(Boolean).join('  •  '),
        fontSize: 9,
      },
    ],
    margin: [0, 0, 0, 14],
  }
}

function tabelaItens(doc: Orcamento | Fatura): Content {
  const temMedidas = doc.itens.some((i) => i.m2 > 0)
  const header: TableCell[] = temMedidas
    ? ['Descrição', 'Qtd', 'Larg. (m)', 'Alt. (m)', 'm²', 'V. unit.', 'Total']
    : ['Descrição', 'Qtd', 'V. unit.', 'Total']

  const body: TableCell[][] = [
    header.map((h) => ({
      text: String(h), bold: true, fontSize: 9, color: 'white', fillColor: AZUL,
    })),
    ...doc.itens.map((i): TableCell[] => {
      const base: TableCell[] = [
        { text: i.descricao, fontSize: 9 },
        { text: String(i.qtd), alignment: 'center', fontSize: 9 },
      ]
      if (temMedidas) {
        base.push(
          { text: i.largura ? i.largura.toFixed(2) : '-', alignment: 'center', fontSize: 9 },
          { text: i.altura ? i.altura.toFixed(2) : '-', alignment: 'center', fontSize: 9 },
          { text: i.m2 ? i.m2.toFixed(2) : '-', alignment: 'center', fontSize: 9 },
        )
      }
      base.push(
        { text: formatCents(i.valorUnit), alignment: 'right', fontSize: 9 },
        { text: formatCents(i.total), alignment: 'right', fontSize: 9 },
      )
      return base
    }),
  ]

  return {
    table: {
      headerRows: 1,
      widths: temMedidas
        ? ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto']
        : ['*', 'auto', 'auto', 'auto'],
      body,
    },
    layout: {
      hLineColor: () => '#e2e8f0',
      vLineColor: () => '#e2e8f0',
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      paddingTop: () => 5,
      paddingBottom: () => 5,
      paddingLeft: () => 6,
      paddingRight: () => 6,
    },
    margin: [0, 0, 0, 12],
  }
}

function blocoTotais(doc: Orcamento | Fatura): Content {
  const L = (label: string, valor: string): [string, string, boolean] => [label, valor, false]
  const impostos = doc.itens.reduce(
    (s, i) => s + Math.round((i.total * (i.impostoPct || 0)) / 100),
    0,
  )
  const linhas: [string, string, boolean][] = [
    L('Subtotal', formatCents(doc.subtotal)),
    ...(impostos ? [L('Impostos', formatCents(impostos))] : []),
    ...(doc.frete ? [L('Frete', formatCents(doc.frete))] : []),
    ...(doc.desconto ? [L('Desconto', '- ' + formatCents(doc.desconto))] : []),
    ['TOTAL', formatCents(doc.total), true],
  ]
  return {
    columns: [
      { text: '' },
      {
        width: 200,
        table: {
          widths: ['*', 'auto'],
          body: linhas.map(([label, valor, destaque]) => [
            {
              text: label, bold: destaque, fontSize: destaque ? 12 : 10,
              color: destaque ? AZUL : CINZA, border: [false, false, false, false],
            },
            {
              text: valor, bold: destaque, fontSize: destaque ? 12 : 10,
              alignment: 'right', border: [false, false, false, false],
            },
          ]),
        },
        layout: 'noBorders',
      },
    ],
    margin: [0, 0, 0, 16],
  }
}

function rodape(texto: string): Content {
  return {
    text: texto,
    fontSize: 8,
    color: CINZA,
    alignment: 'center',
    margin: [0, 24, 0, 0],
  }
}

// Bloco de texto rotulado (Observações, Condições de Pagamento). Vazio → nada.
function blocoTexto(titulo: string, texto: string): Content[] {
  if (!texto) return []
  return [
    { text: titulo, bold: true, fontSize: 10, margin: [0, 6, 0, 0] },
    { text: texto, fontSize: 9, color: CINZA, margin: [0, 2, 0, 0] },
  ]
}

function orcamentoDocDef(
  orcamento: Orcamento,
  cliente: Cliente | undefined,
  empresa: Empresa,
): TDocumentDefinitions {
  const validade = addDays(orcamento.data, orcamento.validadeDias)
  const docDef: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 50],
    defaultStyle: { color: PRETO },
    content: [
      cabecalho(empresa, 'ORÇAMENTO', orcamento.numero),
      blocoCliente(cliente),
      {
        columns: [
          { text: [{ text: 'Data: ', bold: true }, formatDateBR(orcamento.data)], fontSize: 9 },
          { text: [{ text: 'Válido até: ', bold: true }, formatDateBR(validade)], fontSize: 9 },
          ...(orcamento.prazoEntrega
            ? [{ text: [{ text: 'Prazo de entrega: ', bold: true }, orcamento.prazoEntrega], fontSize: 9 } as Content]
            : []),
        ],
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      tabelaItens(orcamento),
      blocoTotais(orcamento),
      ...blocoTexto('Observações', orcamento.observacoes),
      ...blocoTexto('Condições de Pagamento', orcamento.condicoesPagamento),
      rodape(`${empresa.nome} — orçamento gerado em ${formatDateBR(orcamento.data)}. Valores sujeitos a alteração após o vencimento.`),
    ],
  }
  return docDef
}

export function gerarOrcamentoPdf(
  orcamento: Orcamento,
  cliente: Cliente | undefined,
  empresa: Empresa,
) {
  pdfMake.createPdf(orcamentoDocDef(orcamento, cliente, empresa)).download(`orcamento-${orcamento.numero}.pdf`)
}

// Converte o documento pdfmake em base64 (sem o prefixo "data:...;base64,").
// Na 0.3.x o getBlob() retorna uma Promise e ignora callback; usamos o Blob
// (nativo do navegador) + FileReader — evita o getBase64, que depende do
// Buffer do Node (ausente no build do Vite) e nunca retornava.
type CreatedPdf = { getBlob: () => Promise<Blob> }
async function pdfParaBase64(docDef: TDocumentDefinitions): Promise<string> {
  const pdf = pdfMake.createPdf(docDef) as unknown as CreatedPdf
  const blob = await pdf.getBlob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const res = String(reader.result)
      const virgula = res.indexOf(',')
      resolve(virgula >= 0 ? res.slice(virgula + 1) : res)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler o PDF'))
    reader.readAsDataURL(blob)
  })
}

/** Gera o PDF do orçamento como base64 (sem o prefixo data:), para anexo de e-mail. */
export function orcamentoPdfBase64(
  orcamento: Orcamento,
  cliente: Cliente | undefined,
  empresa: Empresa,
): Promise<string> {
  return pdfParaBase64(orcamentoDocDef(orcamento, cliente, empresa))
}

function faturaDocDef(
  fatura: Fatura,
  cliente: Cliente | undefined,
  empresa: Empresa,
  valorPago: number,
  qrPixDataUrl?: string,
): TDocumentDefinitions {
  const saldo = fatura.total - valorPago
  const docDef: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 50],
    defaultStyle: { color: PRETO },
    content: [
      cabecalho(empresa, 'FATURA', fatura.numero),
      blocoCliente(cliente),
      {
        columns: [
          { text: [{ text: 'Emissão: ', bold: true }, formatDateBR(fatura.dataEmissao)], fontSize: 9 },
          { text: [{ text: 'Vencimento: ', bold: true }, formatDateBR(fatura.dataVencimento)], fontSize: 9 },
          { text: [{ text: 'Pagamento: ', bold: true }, FORMA_LABELS[fatura.formaPagamento] ?? fatura.formaPagamento], fontSize: 9 },
        ],
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      tabelaItens(fatura),
      blocoTotais(fatura),
      ...(valorPago > 0
        ? [{
            text: `Pago: ${formatCents(valorPago)} — Saldo em aberto: ${formatCents(saldo)}`,
            fontSize: 10, bold: true, color: saldo > 0 ? '#b45309' : '#047857',
            margin: [0, 0, 0, 10] as [number, number, number, number],
          }]
        : []),
      ...(empresa.chavePix
        ? [
            qrPixDataUrl
              ? ({
                  columns: [
                    { image: qrPixDataUrl, width: 90 },
                    {
                      stack: [
                        { text: 'Pague com PIX', bold: true, fontSize: 11, color: AZUL },
                        { text: 'Aponte a câmera do seu banco para o QR Code.', fontSize: 9, color: CINZA, margin: [0, 2, 0, 4] },
                        { text: [{ text: 'Chave PIX: ', bold: true }, empresa.chavePix], fontSize: 9 },
                      ],
                      margin: [10, 8, 0, 0],
                    },
                  ],
                  margin: [0, 4, 0, 10],
                } as Content)
              : ({
                  text: [{ text: 'Chave PIX para pagamento: ', bold: true }, empresa.chavePix],
                  fontSize: 10,
                  margin: [0, 0, 0, 8],
                } as Content),
          ]
        : []),
      ...blocoTexto('Observações', fatura.observacoes),
      ...blocoTexto('Condições de Pagamento', fatura.condicoesPagamento),
      rodape(`${empresa.nome} — documento comercial sem valor fiscal.`),
    ],
  }
  return docDef
}

export function gerarFaturaPdf(
  fatura: Fatura,
  cliente: Cliente | undefined,
  empresa: Empresa,
  valorPago: number,
  qrPixDataUrl?: string,
) {
  pdfMake.createPdf(faturaDocDef(fatura, cliente, empresa, valorPago, qrPixDataUrl)).download(`fatura-${fatura.numero}.pdf`)
}

/** Gera o PDF da fatura como base64 (sem o prefixo data:), para anexo de e-mail. */
export function faturaPdfBase64(
  fatura: Fatura,
  cliente: Cliente | undefined,
  empresa: Empresa,
  valorPago: number,
  qrPixDataUrl?: string,
): Promise<string> {
  return pdfParaBase64(faturaDocDef(fatura, cliente, empresa, valorPago, qrPixDataUrl))
}

// ---------------------------------------------------------------------------
// Guia de remessa (romaneio de entrega) — para os entregadores.
// Sem valores monetários: mostra apenas o que entregar, para quem e onde,
// mais uma área de assinatura de recebimento.
// ---------------------------------------------------------------------------

// Bloco "ENTREGAR PARA" com o endereço completo em destaque (moldura azul).
function blocoEntrega(cliente: Cliente | undefined): Content {
  const linhaEndereco = [cliente?.endereco, cliente?.numero].filter(Boolean).join(', ')
  const linhaCompl = [cliente?.complemento, cliente?.bairro].filter(Boolean).join(' — ')
  const linhaCidade = [
    [cliente?.cidade, cliente?.estado].filter(Boolean).join('/'),
    cliente?.cep,
  ]
    .filter(Boolean)
    .join('  •  ')
  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            border: [true, true, true, true],
            stack: [
              { text: 'ENTREGAR PARA', fontSize: 8, bold: true, color: CINZA, margin: [0, 0, 0, 3] },
              { text: cliente?.nome ?? '-', bold: true, fontSize: 13 },
              ...(linhaEndereco ? [{ text: linhaEndereco, fontSize: 10 }] : []),
              ...(linhaCompl ? [{ text: linhaCompl, fontSize: 10 }] : []),
              ...(linhaCidade ? [{ text: linhaCidade, fontSize: 10 }] : []),
              ...(cliente?.telefone
                ? [{ text: [{ text: 'Tel: ', bold: true }, cliente.telefone], fontSize: 10, margin: [0, 2, 0, 0] as [number, number, number, number] }]
                : []),
            ],
          },
        ],
      ],
    },
    layout: {
      hLineColor: () => AZUL,
      vLineColor: () => AZUL,
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      paddingTop: () => 8,
      paddingBottom: () => 8,
      paddingLeft: () => 10,
      paddingRight: () => 10,
    },
    margin: [0, 0, 0, 14],
  }
}

// Tabela de itens da remessa — quantidades e medidas, sem preços.
function tabelaItensRemessa(doc: Orcamento | Fatura): Content {
  const temMedidas = doc.itens.some((i) => i.m2 > 0)
  const header: TableCell[] = temMedidas
    ? ['#', 'Descrição', 'Qtd', 'Larg. (m)', 'Alt. (m)', 'm²', 'Conf.']
    : ['#', 'Descrição', 'Qtd', 'Conf.']

  const body: TableCell[][] = [
    header.map((h) => ({
      text: String(h), bold: true, fontSize: 9, color: 'white', fillColor: AZUL,
    })),
    ...doc.itens.map((i, idx): TableCell[] => {
      const base: TableCell[] = [
        { text: String(idx + 1), alignment: 'center', fontSize: 9 },
        { text: i.descricao, fontSize: 9 },
        { text: String(i.qtd), alignment: 'center', fontSize: 9 },
      ]
      if (temMedidas) {
        base.push(
          { text: i.largura ? i.largura.toFixed(2) : '-', alignment: 'center', fontSize: 9 },
          { text: i.altura ? i.altura.toFixed(2) : '-', alignment: 'center', fontSize: 9 },
          { text: i.m2 ? i.m2.toFixed(2) : '-', alignment: 'center', fontSize: 9 },
        )
      }
      // Coluna "Conf." (conferência): quadradinho para o entregador marcar
      base.push({ text: '', alignment: 'center', fontSize: 9 })
      return base
    }),
  ]

  return {
    table: {
      headerRows: 1,
      widths: temMedidas
        ? ['auto', '*', 'auto', 'auto', 'auto', 'auto', 28]
        : ['auto', '*', 'auto', 28],
      body,
    },
    layout: {
      hLineColor: () => '#e2e8f0',
      vLineColor: () => '#e2e8f0',
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      paddingTop: () => 6,
      paddingBottom: () => 6,
      paddingLeft: () => 6,
      paddingRight: () => 6,
    },
    margin: [0, 0, 0, 12],
  }
}

// Área de assinatura: recebimento conferido pelo cliente.
function blocoRecebimento(): Content {
  const linha = (largura: number, rotulo: string, width?: number): Content => ({
    ...(width ? { width } : {}),
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: largura, y2: 0, lineWidth: 0.5 }] },
      { text: rotulo, fontSize: 8, color: CINZA, margin: [0, 3, 0, 0] },
    ],
  })
  return {
    stack: [
      {
        text: 'Declaro ter recebido os itens acima, conferidos e em conformidade.',
        fontSize: 9,
        color: CINZA,
        margin: [0, 14, 0, 28],
      },
      {
        columns: [
          linha(240, 'Nome legível / Assinatura'),
          linha(100, 'Data', 110),
        ],
        columnGap: 24,
      },
    ],
  }
}

function retiradaProdutosDocDef(
  orcamento: Orcamento,
  cliente: Cliente | undefined,
  empresa: Empresa,
): TDocumentDefinitions {
  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 50],
    defaultStyle: { color: PRETO },
    content: [
      cabecalho(empresa, 'RETIRADA DE PRODUTOS', orcamento.numero),
      blocoCliente(cliente),
      {
        columns: [
          { text: [{ text: 'Data do orçamento: ', bold: true }, formatDateBR(orcamento.data)], fontSize: 9 },
          { text: [{ text: 'Prazo de entrega: ', bold: true }, orcamento.prazoEntrega || '—'], fontSize: 9 },
          { text: [{ text: 'Retirado em: ', bold: true }, '____/____/______'], fontSize: 9, alignment: 'right' },
        ],
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      tabelaItensRemessa(orcamento),
      ...blocoTexto('Observações', orcamento.observacoes),
      blocoRecebimento(),
      rodape(`${empresa.nome} — comprovante de retirada sem valores comerciais.`),
    ],
  }
}

/** Abre a impressão dos itens do orçamento sem exibir valores comerciais. */
export function imprimirRetiradaProdutos(
  orcamento: Orcamento,
  cliente: Cliente | undefined,
  empresa: Empresa,
) {
  pdfMake.createPdf(retiradaProdutosDocDef(orcamento, cliente, empresa)).print()
}

function guiaRemessaDocDef(
  fatura: Fatura,
  cliente: Cliente | undefined,
  empresa: Empresa,
): TDocumentDefinitions {
  const totalVolumes = fatura.itens.reduce((s, i) => s + (i.qtd || 0), 0)
  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 50],
    defaultStyle: { color: PRETO },
    content: [
      cabecalho(empresa, 'GUIA DE REMESSA', fatura.numero),
      blocoEntrega(cliente),
      {
        columns: [
          { text: [{ text: 'Emissão: ', bold: true }, formatDateBR(fatura.dataEmissao)], fontSize: 9 },
          { text: [{ text: 'Fatura ref.: ', bold: true }, fatura.numero], fontSize: 9 },
          { text: [{ text: 'Volumes: ', bold: true }, String(totalVolumes)], fontSize: 9, alignment: 'right' },
        ],
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      tabelaItensRemessa(fatura),
      ...blocoTexto('Observações', fatura.observacoes),
      blocoRecebimento(),
      rodape(`${empresa.nome} — guia de remessa sem valor fiscal.`),
    ],
  }
}

/** Abre o diálogo de impressão da guia de remessa (romaneio de entrega). */
export function imprimirGuiaRemessa(
  fatura: Fatura,
  cliente: Cliente | undefined,
  empresa: Empresa,
) {
  pdfMake.createPdf(guiaRemessaDocDef(fatura, cliente, empresa)).print()
}
