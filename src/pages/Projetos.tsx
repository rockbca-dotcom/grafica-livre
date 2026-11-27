import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Button, Modal, inputClass } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { abrirProjeto, faturarProjeto, listarProjetos, salvarProjeto } from '../data/projetosApi'
import { formatDateBR, todayISO } from '../lib/dates'
import { formatCents } from '../lib/money'
import {
  compactarFoto, custoLinha, custoProjeto, decimalEmCentavos, exportarProjeto, importarProjeto,
  MAX_CUSTOS, MAX_FOTOS, MAX_VALOR, novoCusto, novoProjeto, referenciaProjeto,
} from '../lib/projetos'
import type { FotosProjeto, Projeto, ProjetoResumo } from '../lib/projetos'
import type { FormaPagamento } from '../types'
import './projetos.css'

const formas: Record<FormaPagamento, string> = {
  pix: 'Pix', dinheiro: 'Dinheiro', transferencia: 'Transferência', boleto: 'Boleto',
  cartao_credito: 'Cartão de crédito', cartao_debito: 'Cartão de débito',
}
const mensagem = (error: unknown) =>
  typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Não foi possível concluir esta operação.'

function Secao({ n, titulo, children }: { n: string; titulo: string; children: ReactNode }) {
  return <section className="projeto-bloco">
    <h2><span>{n}</span>{titulo}</h2>
    {children}
  </section>
}

function Decimal({ valor, limite, onChange, label }: {
  valor: number; limite: number; onChange: (n: number) => void; label?: string
}) {
  const [texto, setTexto] = useState(valor ? String(valor / 100).replace('.', ',') : '')
  return <input className={inputClass} aria-label={label} inputMode="decimal" placeholder="0,00" value={texto} onChange={e => {
    const value = e.target.value
    setTexto(value)
    try {
      const n = decimalEmCentavos(value, limite)
      e.target.setCustomValidity('')
      onChange(n)
    } catch (err) { e.target.setCustomValidity(mensagem(err)) }
  }} />
}

function margem(valor: number, custo: number) {
  return valor > 0 ? ((valor - custo) / valor).toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 1 }) : 'Não calculada'
}

function Relatorio({ p, tipo }: { p: Projeto; tipo: 'financeiro' | 'execucao' }) {
  const total = custoProjeto(p.custos)
  return createPortal(<article className="projeto-impressao" aria-hidden="true">
    <header><div><strong>AMEI</strong><p>Comunicação visual</p></div><h1>{tipo === 'financeiro' ? 'Relatório financeiro' : 'Relatório de execução'}</h1></header>
    <h2>{p.titulo || 'Projeto sem título'}</h2>
    <p>{p.cliente_nome || 'Cliente não informado'} · {p.referencia} · {formatDateBR(p.data_projeto)}</p>
    {tipo === 'financeiro' && <>
      <h3>Custos do projeto</h3>
      <table><thead><tr><th>Item</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead>
        <tbody>{p.custos.map((c, i) => <tr key={i}><td>{c.nome || '—'}</td><td>{c.quantidadeCentesimos / 100}</td><td>{formatCents(c.unitarioCentavos)}</td><td>{formatCents(custoLinha(c))}</td></tr>)}</tbody>
      </table>
      <p>Valor de venda: {formatCents(p.valor_centavos)} · Custos: {formatCents(total)}</p>
      <p>Lucro estimado: {formatCents(p.valor_centavos - total)} · Margem: {margem(p.valor_centavos, total)}</p>
    </>}
    <h3>Descrição da execução</h3><p className="whitespace-pre-wrap">{p.execucao || 'Nenhuma observação registrada.'}</p>
    {(['antes', 'depois'] as const).map(chave => p.fotos[chave].length > 0 && <section key={chave}>
      <h3>{chave === 'antes' ? 'Antes' : 'Depois'}</h3>
      <div>{p.fotos[chave].map((foto, i) => <img key={i} src={foto} alt={(chave === 'antes' ? 'Antes ' : 'Depois ') + (i + 1)} />)}</div>
    </section>)}
  </article>, document.body)
}

export default function Projetos() {
  const { cloudMode } = useAuth()
  const { db, refreshFinanceAfterProject } = useData()
  const { showToast } = useToast()
  const [lista, setLista] = useState<ProjetoResumo[]>([])
  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [carregando, setCarregando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [alterado, setAlterado] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [vencimento, setVencimento] = useState(todayISO)
  const [forma, setForma] = useState<FormaPagamento>('pix')
  const [impressao, setImpressao] = useState<'financeiro' | 'execucao' | null>(null)
  const form = useRef<HTMLFormElement>(null)
  const envio = useRef(false)
  const importador = useRef<HTMLInputElement>(null)
  const listaAtual = useCallback(async () => { setLista(await listarProjetos()) }, [])

  useEffect(() => {
    let ativo = true
    listarProjetos().then(rows => { if (ativo) setLista(rows) })
      .catch(() => { if (ativo) setErro('Não foi possível carregar os projetos. Verifique a conexão ou a ativação do módulo.') })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [])

  useEffect(() => {
    if (!alterado) return
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [alterado])

  useEffect(() => {
    if (!impressao) return
    let ativo = true
    const frame = requestAnimationFrame(async () => {
      const imagens = Array.from(document.querySelectorAll<HTMLImageElement>('.projeto-impressao img'))
      await Promise.allSettled(imagens.map(img => img.decode()))
      if (!ativo) return
      document.body.classList.add('projeto-imprimindo')
      try { window.print() } finally { document.body.classList.remove('projeto-imprimindo'); setImpressao(null) }
    })
    return () => { ativo = false; cancelAnimationFrame(frame); document.body.classList.remove('projeto-imprimindo') }
  }, [impressao])

  const trocar = (p: Projeto | null) => {
    setErro('')
    setProjeto(p)
    setAlterado(false)
    if (p) window.scrollTo(0, 0)
  }
  const podeSair = () => !alterado || window.confirm('Descartar as alterações ainda não salvas da ficha atual?')
  const editar = (patch: Partial<Projeto>) => {
    setProjeto(p => p ? { ...p, ...patch } : p)
    setAlterado(true)
  }
  const editarCusto = (index: number, patch: Partial<Projeto['custos'][number]>) => {
    setProjeto(p => p ? { ...p, custos: p.custos.map((c, i) => i === index ? { ...c, ...patch } : c) } : p)
    setAlterado(true)
  }
  const executar = async (acao: () => Promise<void>) => {
    if (envio.current) return
    envio.current = true
    setOcupado(true)
    setErro('')
    try { await acao() } catch (err) { setErro(mensagem(err)) } finally { envio.current = false; setOcupado(false) }
  }
  const salvar = async (p: Projeto) => {
    if (!p.titulo.trim() || !p.referencia.trim() || !p.data_projeto) throw new Error('Preencha o nome, a data e a referência do projeto.')
    if (custoProjeto(p.custos) > MAX_VALOR) throw new Error('O custo total está acima do limite permitido.')
    const salvo = await salvarProjeto(p)
    setProjeto(salvo)
    setAlterado(false)
    return salvo
  }
  const anexar = (chave: keyof FotosProjeto, arquivos: File[]) => {
    if (!projeto || !arquivos.length) return
    const fotos = projeto.fotos[chave]
    void executar(async () => {
      if (fotos.length + arquivos.length > MAX_FOTOS) throw new Error('O limite é de seis fotos por grupo.')
      const novas: string[] = []
      for (const arquivo of arquivos) {
        if (!/^image\/(jpeg|png|webp|gif)$/.test(arquivo.type) || arquivo.size > 12_000_000) {
          throw new Error('Selecione arquivos JPG, PNG, WebP ou GIF com até 12 MB cada.')
        }
        novas.push(await compactarFoto(arquivo))
      }
      editar({ fotos: { ...projeto.fotos, [chave]: [...fotos, ...novas] } })
    })
  }
  const solicitarFaturamento = () => {
    if (!projeto || !form.current?.reportValidity()) return
    if (!projeto.cliente_id || projeto.valor_centavos <= 0) {
      setErro('Para faturar, vincule um cliente cadastrado e informe o valor de venda.'); return
    }
    if (projeto.custos.some(c => c.unitarioCentavos > 0 && (!c.nome.trim() || c.quantidadeCentesimos <= 0))) {
      setErro('Informe a descrição e a quantidade de cada custo com valor.'); return
    }
    setErro('')
    setVencimento(todayISO())
    setForma('pix')
    setConfirmando(true)
  }
  const total = projeto ? custoProjeto(projeto.custos) : 0
  const filtrados = lista.filter(p => {
    const texto = [p.titulo, p.cliente_nome, p.referencia].join(' ').toLocaleLowerCase('pt-BR')
    return texto.includes(busca.trim().toLocaleLowerCase('pt-BR')) &&
      (filtro === 'todos' || (filtro === 'faturados' ? p.faturado_em : !p.faturado_em))
  })

  return <div className="projetos-app">
    <header className="projeto-hero">
      <div>
        <span className="projeto-kicker">AMEI · COMUNICAÇÃO VISUAL</span>
        <h1>Projetos</h1>
        <p>Organize a execução, controle os custos e feche cada projeto em um só lugar.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {projeto
          ? <Button variant="secondary" onClick={() => podeSair() && trocar(null)} disabled={ocupado}>Voltar à lista</Button>
          : <>
            <Button variant="secondary" onClick={() => importador.current?.click()} disabled={ocupado}>Importar JSON</Button>
            <button type="button" className="projeto-primario" disabled={ocupado} onClick={() => trocar(novoProjeto())}>+ Novo projeto</button>
          </>}
        <input ref={importador} type="file" hidden accept=".json,application/json" onChange={e => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void executar(async () => {
            trocar(await importarProjeto(file))
            setAlterado(true)
            showToast('Projeto importado como novo rascunho.')
          })
        }} />
      </div>
    </header>

    {erro && !confirmando && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
    {!cloudMode && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Modo local. Os rascunhos ficam neste navegador; o faturamento exige o sistema conectado.</p>}

    {!projeto ? <section className="projeto-bloco">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2><span>{lista.length}</span>Projetos cadastrados</h2>
        <div className="flex flex-wrap gap-2">
          <input value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar projetos" placeholder="Nome, cliente ou referência" className={inputClass} />
          <select value={filtro} onChange={e => setFiltro(e.target.value)} aria-label="Filtrar projetos" className={inputClass}>
            <option value="todos">Todos</option><option value="rascunhos">Rascunhos</option><option value="faturados">Faturados</option>
          </select>
        </div>
      </div>
      {carregando ? <p className="projeto-vazio">Carregando projetos…</p> : filtrados.length === 0
        ? <p className="projeto-vazio">{lista.length ? 'Nenhum resultado para esta busca.' : 'Crie seu primeiro projeto ou importe um arquivo do gerador AMEI.'}</p>
        : <ul className="projeto-lista">{filtrados.map(p => <li key={p.id}>
          <div><p className="projeto-ref">{p.referencia} · {formatDateBR(p.data_projeto)}</p><h3>{p.titulo}</h3><p>{p.cliente_nome || 'Cliente não informado'}</p></div>
          <div><p className="projeto-ref">Valor de venda</p><strong>{formatCents(p.valor_centavos)}</strong><p>Custo: {formatCents(p.custo_centavos)}</p></div>
          <span className={'projeto-status' + (p.faturado_em ? ' faturado' : '')}>{p.faturado_em ? 'Faturado' : 'Rascunho'}</span>
          <Button small variant="secondary" disabled={ocupado} onClick={() => void executar(async () => trocar(await abrirProjeto(p.id)))}>Abrir</Button>
        </li>)}</ul>}
    </section> : <>
      <div className="projeto-ficha-bar">
        <div><p className="projeto-ref">{projeto.referencia}</p><h2>{projeto.titulo || 'Nova ficha de projeto'}</h2></div>
        <span className={'projeto-status' + (projeto.faturado_em ? ' faturado' : '')}>{projeto.faturado_em ? 'Faturado' : 'Rascunho'}</span>
      </div>
      {projeto.faturado_em && <aside className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        Fatura <strong>{projeto.fatura_numero}</strong> emitida. {projeto.conta_paga_id ? 'Os custos foram lançados em Contas a Pagar → Pagas.' : 'Não havia custos para lançar.'}
        <div className="mt-2 flex flex-wrap gap-4"><Link className="underline" to="/faturas">Ver faturas</Link>{projeto.conta_paga_id && <Link className="underline" to="/contas-pagar?status=pagas">Ver despesas pagas</Link>}</div>
      </aside>}

      <form key={projeto.id} ref={form} onSubmit={e => {
        e.preventDefault()
        void executar(async () => { await salvar(projeto); showToast('Projeto salvo.'); await listaAtual() })
      }}>
        <fieldset disabled={ocupado || Boolean(projeto.faturado_em)} className="projeto-campos">
          <Secao n="01" titulo="Identificação">
            <div className="projeto-grid">
              <label>Nome do projeto<input required maxLength={160} value={projeto.titulo} onChange={e => editar({ titulo: e.target.value })} className={inputClass} placeholder="Ex.: Fachada em ACM" /></label>
              <label>Data do projeto<input required type="date" value={projeto.data_projeto} onChange={e => editar({ data_projeto: e.target.value })} className={inputClass} /></label>
              <label>Nome do cliente<input maxLength={160} value={projeto.cliente_nome} readOnly={Boolean(projeto.cliente_id)} onChange={e => editar({ cliente_nome: e.target.value })} className={inputClass} placeholder="Nome na ficha" /></label>
              <label>Cliente cadastrado para faturar<select className={inputClass} value={projeto.cliente_id ?? ''} onChange={e => {
                const cliente = db.clientes.find(c => c.id === e.target.value)
                editar({ cliente_id: cliente?.id ?? null, cliente_nome: cliente?.nome ?? projeto.cliente_nome })
              }}><option value="">Selecione o cadastro</option>{[...db.clientes].sort((a, b) => a.nome.localeCompare(b.nome)).map(c => <option value={c.id} key={c.id}>{c.nome}</option>)}</select></label>
              <div className="min-w-0">
                <label htmlFor="projeto-referencia">Número / Referência</label>
                <div className="mt-1 flex gap-2"><input id="projeto-referencia" required maxLength={60} value={projeto.referencia} onChange={e => editar({ referencia: e.target.value })} className={inputClass} /><Button variant="secondary" type="button" onClick={() => editar({ referencia: referenciaProjeto() })}>Gerar código</Button></div>
              </div>
              <label>Valor cobrado (R$)<Decimal valor={projeto.valor_centavos} limite={MAX_VALOR} onChange={n => editar({ valor_centavos: n })} /></label>
            </div>
          </Secao>
          <Secao n="02" titulo="Custos do projeto">
            <div className="projeto-custos">
              {projeto.custos.map((item, i) => <div className="projeto-custo" key={i + '-' + projeto.custos.length}>
                <label>Item / Descrição<input maxLength={160} value={item.nome} onChange={e => editarCusto(i, { nome: e.target.value })} className={inputClass} placeholder="Material ou serviço" aria-label={'Descrição do custo ' + (i + 1)} /></label>
                <label>Qtd.<Decimal label={'Quantidade do custo ' + (i + 1)} valor={item.quantidadeCentesimos} limite={9_999_999} onChange={n => editarCusto(i, { quantidadeCentesimos: n })} /></label>
                <label>Unitário (R$)<Decimal label={'Valor unitário do custo ' + (i + 1)} valor={item.unitarioCentavos} limite={MAX_VALOR} onChange={n => editarCusto(i, { unitarioCentavos: n })} /></label>
                <div className="projeto-total-linha"><span>Total</span><strong>{formatCents(custoLinha(item))}</strong></div>
                <Button type="button" variant="ghost" aria-label={'Remover custo ' + (i + 1)} onClick={() => editar({ custos: projeto.custos.filter((_, j) => i !== j) })}>×</Button>
              </div>)}
              {projeto.custos.length < MAX_CUSTOS && <Button variant="secondary" type="button" onClick={() => editar({ custos: [...projeto.custos, novoCusto()] })}>+ Adicionar custo</Button>}
            </div>
            <dl className="projeto-metricas">
              <div><dt>Valor de venda</dt><dd>{formatCents(projeto.valor_centavos)}</dd></div>
              <div><dt>Custos totais</dt><dd>{formatCents(total)}</dd></div>
              <div><dt>Lucro estimado</dt><dd className={projeto.valor_centavos < total ? 'text-red-800' : ''}>{formatCents(projeto.valor_centavos - total)}</dd></div>
              <div><dt>Margem sobre a venda</dt><dd>{margem(projeto.valor_centavos, total)}</dd></div>
            </dl>
          </Secao>
          <Secao n="03" titulo="Registro fotográfico">
            <div className="projeto-grid">
              {(['antes', 'depois'] as const).map(chave => <div className="projeto-fotos" key={chave}>
                <h3>{chave === 'antes' ? 'Antes' : 'Depois'} <small>{projeto.fotos[chave].length}/{MAX_FOTOS}</small></h3>
                {projeto.fotos[chave].length === 0 && <p>Nenhuma foto anexada.</p>}
                <div className="projeto-fotos-grid">{projeto.fotos[chave].map((foto, i) =>
                  <figure key={i}><img src={foto} alt={(chave === 'antes' ? 'Antes ' : 'Depois ') + (i + 1)} /><button type="button" aria-label={'Remover foto ' + chave + ' ' + (i + 1)} onClick={() => editar({ fotos: { ...projeto.fotos, [chave]: projeto.fotos[chave].filter((_, j) => i !== j) } })}>×</button></figure>
                )}</div>
                {projeto.fotos[chave].length < MAX_FOTOS && !projeto.faturado_em && <label className="projeto-upload">+ Anexar fotos<input className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" aria-label={'Anexar fotos ' + chave} onChange={e => { anexar(chave, Array.from(e.target.files ?? [])); e.target.value = '' }} /></label>}
              </div>)}
            </div>
          </Secao>
          <Secao n="04" titulo="Descrição da execução">
            <label>Etapas, materiais, instalação e observações<textarea rows={5} maxLength={8000} className={inputClass} value={projeto.execucao} onChange={e => editar({ execucao: e.target.value })} placeholder="Descreva o serviço e os acabamentos." /></label>
          </Secao>
        </fieldset>
        <div className="projeto-acao">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={ocupado} onClick={() => setImpressao('execucao')}>Relatório de execução / PDF</Button>
            <Button type="button" variant="secondary" disabled={ocupado} onClick={() => setImpressao('financeiro')}>Relatório financeiro / PDF</Button>
            <Button type="button" variant="secondary" disabled={ocupado} onClick={() => exportarProjeto(projeto)}>Exportar JSON</Button>
          </div>
          {!projeto.faturado_em && <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary" disabled={ocupado}>Salvar rascunho</Button>
            {cloudMode && <button type="button" className="projeto-primario" disabled={ocupado} onClick={solicitarFaturamento}>Concluir e faturar</button>}
          </div>}
        </div>
      </form>
      {impressao && <Relatorio p={projeto} tipo={impressao} />}
      <Modal open={confirmando} title="Concluir e faturar projeto" onClose={() => { if (!ocupado) setConfirmando(false) }}>
        <form className="space-y-4" onSubmit={e => {
          e.preventDefault()
          void executar(async () => {
            const salvo = alterado || !projeto.versao ? await salvar(projeto) : projeto
            const resultado = await faturarProjeto(salvo, vencimento, forma)
            const concluido = { ...salvo, fatura_numero: resultado.fatura_numero, conta_paga_id: resultado.conta_paga_id, faturado_em: new Date().toISOString() }
            trocar(concluido)
            setConfirmando(false)
            showToast('Projeto faturado: ' + resultado.fatura_numero)
            const sincronizacao = await Promise.allSettled([listaAtual(), refreshFinanceAfterProject()])
            if (sincronizacao.some(r => r.status === 'rejected')) {
              setErro('A fatura foi criada. Atualize a página para recarregar os dados.')
            }
          })
        }}>
          {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
          <p className="text-sm text-slate-700">Será emitida uma fatura em aberto de <strong>{formatCents(projeto.valor_centavos)}</strong>. {total > 0 ? <>O custo de <strong>{formatCents(total)}</strong> será registrado como já pago em Contas a Pagar.</> : 'Como não há despesas, não será criada conta paga.'}</p>
          <p className="text-sm text-slate-700">Use esta opção quando o projeto estiver concluído e essas despesas já tiverem sido pagas. Depois de faturada, a ficha não pode ser editada.</p>
          <div className="projeto-grid">
            <label>Vencimento da fatura<input required min={todayISO()} type="date" className={inputClass} value={vencimento} onChange={e => setVencimento(e.target.value)} /></label>
            <label>Forma de pagamento<select className={inputClass} value={forma} onChange={e => setForma(e.target.value as FormaPagamento)}>{Object.entries(formas).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></label>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" disabled={ocupado} onClick={() => setConfirmando(false)}>Cancelar</Button>
            <button type="submit" className="projeto-primario" disabled={ocupado}>{ocupado ? 'Faturando…' : 'Confirmar faturamento'}</button>
          </div>
        </form>
      </Modal>
    </>}
  </div>
}
