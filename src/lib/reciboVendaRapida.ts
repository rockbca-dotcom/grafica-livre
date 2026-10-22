import type { Cliente, Empresa, FormaPagamento, VendaRapida } from '../types'
import { formatCents } from './money'
import { formatDateBR } from './dates'

const FORMAS_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_debito: 'Cartão de débito',
  cartao_credito: 'Cartão de crédito',
  transferencia: 'Transferência',
  boleto: 'Boleto',
}

export function formaPagamentoLabel(forma: FormaPagamento): string {
  return FORMAS_PAGAMENTO[forma] ?? forma
}

function escaparHtml(valor: unknown): string {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function dataHoraVenda(venda: VendaRapida): string {
  const data = new Date(venda.criadoEm)
  if (Number.isNaN(data.getTime())) return formatDateBR(venda.data)
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(data)
}

function enderecoEmpresa(empresa: Empresa): string {
  return [
    empresa.endereco,
    empresa.bairro,
    [empresa.cidade, empresa.estado].filter(Boolean).join('/'),
    empresa.cep,
  ].filter(Boolean).join(' — ')
}

export function montarHtmlComprovanteVendaRapida(
  venda: VendaRapida,
  cliente: Cliente | undefined,
  empresa: Empresa,
): string {
  const itens = venda.itens.map((item) => `
    <section class="item">
      <div class="descricao">${escaparHtml(item.descricao)}</div>
      <div class="detalhes">
        <span>${item.qtd} x ${formatCents(item.valorUnit)}</span>
        <strong>${formatCents(item.total)}</strong>
      </div>
    </section>
  `).join('')
  const endereco = enderecoEmpresa(empresa)
  const camposEmpresa = [
    empresa.cnpj && `<div>CNPJ: ${escaparHtml(empresa.cnpj)}</div>`,
    empresa.inscricaoEstadual && `<div>IE: ${escaparHtml(empresa.inscricaoEstadual)}</div>`,
    empresa.telefone && `<div>TELEFONE: ${escaparHtml(empresa.telefone)}</div>`,
    endereco && `<div>${escaparHtml(endereco)}</div>`,
  ].filter(Boolean).join('')
  const totalItens = venda.itens.reduce((soma, item) => soma + item.total, 0)

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Comprovante ${escaparHtml(venda.numero)}</title>
  <style>
    @page { size: auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body { width: 88mm; min-height: 100%; margin: 0; background: #fff; }
    body { padding: 2mm; color: #000; font: 11px/1.35 "Courier New", monospace; }
    .ticket { width: 84mm; margin: 0 auto; }
    .company { font-weight: 700; text-transform: uppercase; }
    .center { text-align: center; }
    .separator { margin: 7px 0; border: 0; border-top: 1px dashed #000; }
    .title { margin: 8px 0; font-size: 14px; font-weight: 700; text-align: center; }
    .item { margin: 5px 0; }
    .descricao { overflow-wrap: anywhere; font-weight: 700; }
    .detalhes { display: flex; justify-content: space-between; gap: 6px; }
    .total { font-size: 13px; font-weight: 700; }
    .print-action { width: 84mm; margin: 12px auto; padding: 8px; font-size: 14px; }
    @media screen {
      html, body { min-height: 100%; background: #e5e7eb; }
      .ticket { margin: 10px auto; padding: 4mm; background: #fff; box-shadow: 0 2px 12px #0002; }
    }
    @media print { .print-action { display: none; } }
  </style>
</head>
<body>
  <button class="print-action" onclick="window.print()">Imprimir comprovante</button>
  <main class="ticket">
    <header class="company">${escaparHtml(empresa.nome || 'Gráfica Livre')}</header>
    ${camposEmpresa}
    <hr class="separator">
    <div>DATA: ${escaparHtml(dataHoraVenda(venda))}</div>
    <div>COD.: ${escaparHtml(venda.numero)}</div>
    <h1 class="title">CUPOM NÃO FISCAL</h1>
    <div>CPF/CNPJ: ${escaparHtml(cliente?.documento || '-')}</div>
    <div>CLIENTE: ${escaparHtml(cliente?.nome || 'AO CONSUMIDOR')}</div>
    <div>ATENDENTE/VENDEDOR: ${escaparHtml(venda.vendedorNome || 'NÃO IDENTIFICADO')}</div>
    <hr class="separator">
    <strong>DESCRIÇÃO</strong>
    ${itens || '<div>Nenhum item informado.</div>'}
    <hr class="separator">
    <div class="detalhes"><span>SUBTOTAL:</span><strong>${formatCents(totalItens)}</strong></div>
    <div class="detalhes total"><span>TOTAL:</span><span>${formatCents(venda.total)}</span></div>
    <hr class="separator">
    <div>PAGAMENTO</div>
    <div class="detalhes"><strong>${escaparHtml(formaPagamentoLabel(venda.formaPagamento).toUpperCase())}:</strong><strong>${formatCents(venda.total)}</strong></div>
    <hr class="separator">
    <p class="center">OBRIGADO, VOLTE SEMPRE!</p>
  </main>
</body>
</html>`
}

export function abrirJanelaComprovante(): Window | null {
  const janela = window.open('', '_blank', 'popup,width=440,height=720')
  if (!janela) return null
  janela.document.open()
  janela.document.write('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Preparando comprovante</title><body style="font:16px sans-serif;padding:24px">Preparando comprovante da venda...</body></html>')
  janela.document.close()
  return janela
}

export function preencherJanelaComprovante(
  janela: Window,
  venda: VendaRapida,
  cliente: Cliente | undefined,
  empresa: Empresa,
): void {
  if (janela.closed) return
  janela.document.open()
  janela.document.write(montarHtmlComprovanteVendaRapida(venda, cliente, empresa))
  janela.document.close()
  window.setTimeout(() => {
    if (janela.closed) return
    janela.focus()
    janela.print()
  }, 300)
}

export function imprimirComprovanteVendaRapida(
  venda: VendaRapida,
  cliente: Cliente | undefined,
  empresa: Empresa,
): boolean {
  const janela = abrirJanelaComprovante()
  if (!janela) return false
  preencherJanelaComprovante(janela, venda, cliente, empresa)
  return true
}
