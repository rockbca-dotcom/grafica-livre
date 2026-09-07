import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import orcamentosShot from '../assets/screens/orcamentos.webp'
import faturasShot from '../assets/screens/faturas.webp'
import heroShot from '../assets/hero-graficaup.png'

const iconProps = {
  width: 20,
  height: 20,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const FEATURES = [
  {
    titulo: 'Orçamentos que vendem',
    texto:
      'Monte propostas profissionais em minutos, calcule por m² e envie para o cliente antes que ele procure outra gráfica.',
    icon: (
      <svg {...iconProps} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M9 13h6M9 17h4" />
      </svg>
    ),
  },
  {
    titulo: 'Cobrança sem atrito',
    texto:
      'Converta aprovações em faturas, receba por PIX e acompanhe pagamentos parciais sem depender de planilhas.',
    icon: (
      <svg {...iconProps} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20M6 15h4" />
      </svg>
    ),
  },
  {
    titulo: 'Produção no ritmo certo',
    texto:
      'Saiba o que está na arte, na impressão ou no acabamento e entregue no prazo combinado com o cliente.',
    icon: (
      <svg {...iconProps} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="5" height="18" rx="1" />
        <rect x="10" y="3" width="5" height="12" rx="1" />
        <rect x="17" y="3" width="5" height="8" rx="1" />
      </svg>
    ),
  },
  {
    titulo: 'Caixa sob controle',
    texto:
      'Veja o que entra, o que sai e quais contas vencem para tomar decisões com margem — não no improviso.',
    icon: (
      <svg {...iconProps} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v18M7 8l5-5 5 5M7 16l5 5 5-5" />
      </svg>
    ),
  },
  {
    titulo: 'Clientes que voltam',
    texto:
      'Centralize contatos, histórico e itens para responder mais rápido e transformar uma venda em recorrência.',
    icon: (
      <svg {...iconProps} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    titulo: 'Decisões com clareza',
    texto:
      'Acompanhe indicadores e relatórios que mostram onde sua gráfica ganha dinheiro — e onde está perdendo tempo.',
    icon: (
      <svg {...iconProps} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 5-6" />
      </svg>
    ),
  },
]

const STEPS = [
  {
    numero: '01',
    titulo: 'Cadastre sua operação',
    texto: 'Clientes, itens e preços ficam organizados para você começar sem retrabalho.',
  },
  {
    numero: '02',
    titulo: 'Venda com velocidade',
    texto: 'Crie orçamentos profissionais, compartilhe e transforme aprovação em faturamento.',
  },
  {
    numero: '03',
    titulo: 'Entregue com margem',
    texto: 'Acompanhe a produção e o caixa em tempo real para crescer com previsibilidade.',
  },
]

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2" aria-label="GraficaUp Studio">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#1ebfbf] text-sm font-extrabold text-[#16191c]">
        G
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#fa3556]" />
      </span>
      <span className={`text-lg font-bold tracking-[-0.03em] ${light ? 'text-white' : 'text-[#16191c]'}`}>
        GraficaUp <span className="text-[#1ebfbf]">Studio</span>
      </span>
    </span>
  )
}

function BrowserFrame({ src, alt, eager = false, badge }: { src: string; alt: string; eager?: boolean; badge?: string }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-[#1e2327] shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#fa3556]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffc200]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#1ebfbf]" />
        <span className="ml-3 hidden flex-1 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/45 sm:block">
          app.graficaup.studio
        </span>
      </div>
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        width={1440}
        height={900}
        className="block aspect-[16/10] w-full object-cover object-top"
      />
      {badge ? (
        <div className="absolute bottom-4 right-4 rounded-2xl border border-white/15 bg-[#16191c]/90 px-4 py-3 text-left backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1ebfbf]">Visão do negócio</p>
          <p className="mt-1 text-sm font-semibold text-white">{badge}</p>
        </div>
      ) : null}
    </div>
  )
}

function FeatureCard({ icon, titulo, texto }: { icon: ReactNode; titulo: string; texto: string }) {
  return (
    <article className="group rounded-[32px] border border-[#dadadd] bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-[#1ebfbf]">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f7f8] text-[#1ebfbf] transition group-hover:bg-[#1ebfbf] group-hover:text-[#16191c]">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-[#16191c]">{titulo}</h3>
      <p className="mt-2 text-base leading-7 text-[#5b6065]">{texto}</p>
    </article>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f9f9f9] text-[#16191c]">
      <div className="bg-[#ffc200] px-4 py-2 text-center text-xs font-semibold tracking-[0.04em] text-[#16191c] sm:text-sm">
        Oferta de lançamento: organize sua gráfica sem mensalidade.
      </div>

      <header className="sticky top-0 z-40 border-b border-[#dadadd]/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" aria-label="Voltar para a página inicial">
            <BrandMark />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#5b6065] md:flex" aria-label="Navegação principal">
            <button type="button" onClick={() => scrollToSection('recursos')} className="transition hover:text-[#16191c]">
              Recursos
            </button>
            <button type="button" onClick={() => scrollToSection('como-funciona')} className="transition hover:text-[#16191c]">
              Como funciona
            </button>
          </nav>
          <Link to="/login" className="rounded-xl bg-[#16191c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#393e41]">
            Acessar sistema
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:pt-10">
          <div className="relative overflow-hidden rounded-[48px] bg-[#16191c] px-6 py-10 sm:px-10 sm:py-14 lg:px-16 lg:py-16">
            <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#1ebfbf]/20 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 left-1/3 h-[28rem] w-[28rem] rounded-full bg-[#fa3556]/10 blur-3xl" />
            <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
              <div className="max-w-xl">
                <p className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#1ebfbf]">
                  <span className="h-2 w-2 rounded-full bg-[#1ebfbf]" />
                  A operação que transforma pedidos em lucro
                </p>
                <h1 className="text-[clamp(2.75rem,6vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.055em] text-white">
                  Venda mais. Produza melhor.{' '}
                  <span className="text-[#1ebfbf]">Controle tudo.</span>
                </h1>
                <p className="mt-6 max-w-lg text-lg leading-8 text-[#dadadd] sm:text-xl">
                  O GraficaUp Studio reúne orçamento, cobrança, produção e caixa em um só lugar — para você parar de apagar incêndio e começar a crescer.
                </p>
                <ul className="mt-7 grid gap-3 text-base text-white sm:grid-cols-2">
                  {['Orçamentos em minutos', 'Acompanhe cada pedido', 'Caixa sempre visível', 'Sem mensalidade para começar'].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1ebfbf] text-xs font-black text-[#16191c]">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <Link to="/login" className="rounded-xl bg-[#fa3556] px-6 py-3.5 text-base font-bold text-white transition hover:bg-[#ff4d6b]">
                    Começar agora — é grátis
                  </Link>
                  <button type="button" onClick={() => scrollToSection('recursos')} className="text-sm font-semibold text-white/80 transition hover:text-white">
                    Conhecer recursos <span aria-hidden="true">→</span>
                  </button>
                </div>
                <p className="mt-5 text-xs font-medium tracking-[0.04em] text-white/45">Sem cartão • Setup em poucos minutos • Acesso online</p>
              </div>
              <div className="relative lg:translate-x-4">
                <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[#1e2327] shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                  <img
                    src={heroShot}
                    alt="Ilustração do GraficaUp Studio com materiais impressos, fluxo de produção e painel de resultados"
                    width={1536}
                    height={1024}
                    className="block aspect-[3/2] w-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                  <div className="absolute bottom-4 right-4 rounded-2xl border border-white/15 bg-[#16191c]/90 px-4 py-3 text-left backdrop-blur">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1ebfbf]">Visão do negócio</p>
                    <p className="mt-1 text-sm font-semibold text-white">Decida com dados, não com achismo</p>
                  </div>
                </div>
                <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-[#dadadd]/50 bg-white px-4 py-3 shadow-xl sm:block">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#5b6065]">Mais clareza</p>
                  <p className="mt-1 text-xl font-bold text-[#16191c]">menos retrabalho</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-3 px-4 pb-20 sm:grid-cols-3">
          {[
            ['Do orçamento ao caixa', 'Tudo conectado em um só fluxo'],
            ['Mais tempo para vender', 'Menos planilha e tarefas repetidas'],
            ['Controle para crescer', 'Informação clara em cada decisão'],
          ].map(([titulo, texto]) => (
            <div key={titulo} className="rounded-[28px] border border-[#dadadd] bg-white px-6 py-5">
              <p className="text-base font-bold text-[#16191c]">{titulo}</p>
              <p className="mt-1 text-sm text-[#5b6065]">{texto}</p>
            </div>
          ))}
        </section>

        <section id="recursos" className="scroll-mt-20 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#1ebfbf]">Tudo em um só lugar</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-[#16191c] sm:text-5xl">Uma operação mais enxuta começa aqui.</h2>
              <p className="mt-4 text-lg leading-8 text-[#5b6065]">Cada recurso foi pensado para você ganhar velocidade, proteger sua margem e entregar uma experiência melhor para o cliente.</p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <FeatureCard key={feature.titulo} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-20 bg-[#e8f7f8] py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-end gap-12 px-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#1ebfbf]">Como funciona</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-[#16191c] sm:text-5xl">Menos etapas. Mais resultado.</h2>
              <p className="mt-5 text-lg leading-8 text-[#5b6065]">O fluxo certo deixa sua equipe mais rápida e seu cliente mais confiante — do primeiro contato à entrega.</p>
              <Link to="/login" className="mt-8 inline-flex items-center rounded-xl bg-[#16191c] px-6 py-3.5 text-base font-bold text-white transition hover:bg-[#393e41]">
                Conhecer o sistema <span className="ml-2" aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="grid gap-3">
              {STEPS.map((step) => (
                <article key={step.numero} className="grid gap-4 rounded-[28px] border border-[#bfe5e6] bg-white p-6 sm:grid-cols-[72px_1fr] sm:items-center sm:p-7">
                  <span className="text-3xl font-bold tracking-[-0.06em] text-[#1ebfbf]">{step.numero}</span>
                  <div>
                    <h3 className="text-xl font-bold text-[#16191c]">{step.titulo}</h3>
                    <p className="mt-1 text-base leading-7 text-[#5b6065]">{step.texto}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f9f9f9] py-20 sm:py-24">
          <div className="mx-auto flex max-w-6xl flex-col gap-20 px-4">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#1ebfbf]">Venda com velocidade</p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-[#16191c] sm:text-4xl">Pare de perder tempo refazendo orçamento.</h2>
                <p className="mt-4 text-lg leading-8 text-[#5b6065]">Crie propostas com medidas, preço por m² e sua marca. Compartilhe em segundos e transforme a aprovação em faturamento sem redigitar nada.</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#16191c]"><span className="text-[#1ebfbf]">✓</span> Mais agilidade no atendimento</div>
              </div>
              <BrowserFrame src={orcamentosShot} alt="Tela de orçamentos do GraficaUp Studio" badge="Orçamento aprovado" />
            </div>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="lg:order-2">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#1ebfbf]">Receba sem perseguir</p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-[#16191c] sm:text-4xl">Cobrança organizada, caixa previsível.</h2>
                <p className="mt-4 text-lg leading-8 text-[#5b6065]">Acompanhe emissão, vencimento e pagamentos parciais na mesma tela. Saiba o que está pendente e proteja sua margem antes do próximo pedido.</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#16191c]"><span className="text-[#1ebfbf]">✓</span> Visão clara do que entra e sai</div>
              </div>
              <div className="lg:order-1"><BrowserFrame src={faturasShot} alt="Tela de faturas do GraficaUp Studio" badge="Cobrança em dia" /></div>
            </div>
          </div>
        </section>

        <section className="bg-[#16191c] px-4 py-20 text-center sm:py-24">
          <div className="mx-auto max-w-3xl">
            <BrandMark light />
            <h2 className="mt-8 text-3xl font-bold tracking-[-0.04em] text-white sm:text-5xl">Pronto para deixar sua gráfica mais lucrativa?</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-[#dadadd]">Entre agora, organize sua operação e veja quanto mais você consegue entregar quando tudo está no lugar.</p>
            <Link to="/login" className="mt-9 inline-flex rounded-xl bg-[#fa3556] px-7 py-3.5 text-base font-bold text-white transition hover:bg-[#ff4d6b]">Começar agora — é grátis</Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#1e2327] px-4 py-10 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <BrandMark light />
            <p className="mt-2 text-sm text-white/55">Gestão comercial para gráficas que querem crescer.</p>
          </div>
          <div className="flex items-center gap-5 text-sm text-white/65">
            <Link to="/login" className="transition hover:text-white">Entrar</Link>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
