/** Chame no clique para que a aba seja aberta antes da geração assíncrona. */
export async function abrirPdf(gerar: () => Promise<Blob>, nome: string): Promise<'aberto' | 'baixado'> {
  const aba = window.open('about:blank', '_blank')
  if (aba) {
    aba.opener = null
    aba.document.title = 'Preparando PDF'
    if (aba.document.body) aba.document.body.textContent = 'Preparando o documento em PDF…'
  }
  let url: string | undefined
  try {
    const conteudo = await gerar()
    url = URL.createObjectURL(conteudo)
    const local = url
    if (aba && !aba.closed) {
      aba.location.replace(local)
      const observar = window.setInterval(() => {
        if (aba.closed) {
          URL.revokeObjectURL(local)
          window.clearInterval(observar)
        }
      }, 15_000)
      return 'aberto'
    }
    const link = document.createElement('a')
    link.href = local
    link.download = nome
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(local), 60_000)
    return 'baixado'
  } catch (erro) {
    if (aba && !aba.closed) aba.close()
    if (url) URL.revokeObjectURL(url)
    throw erro
  }
}
