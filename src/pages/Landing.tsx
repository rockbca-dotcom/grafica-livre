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
  strokeWidth: 1.8,
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
    <span className="flex items-center gap-2.5" aria-label="GraficaUp Studio">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-cobalt-signal text-base font-bold text-white shadow-[0_5px_14px_rgba(46,98,255,0.2)]">
        G
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-paper-white bg-electric-blue" />
      </span>
      <span className={`text-[17px] font-bold tracking-[-0.04em] ${light ? 'text-paper-white' : 'text-indigo-ink'}`}>
        GraficaUp <span className={light ? 'text-[#a9c0ff]' : 'text-cobalt-signal'}>Studio</span>
      </span>
    </span>
  )
}

function BrowserFrame({
  src,
  alt,
  eager = false,
  badge,
  label = 'GraficaUp Studio',
}: {
  src: string
  alt: string
  eager?: boolean
  badge?: string
  label?: string
}) {
  return (
    <div className="relative rounded-[24px] border border-ash/60 bg-paper-white p-2 shadow-[0_24px_64px_rgba(32,41,90,0.12)] sm:p-3">
      <div className="flex items-center gap-1.5 px-2 pb-3 pt-1 sm:px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#f4a2a2]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f4d28b]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#a9d7c4]" />
        <span className="ml-3 hidden flex-1 rounded-lg border border-mist-gray bg-mist-gray/75 px-3 py-1 text-[11px] text-graphite sm:block">
          {label}
        </span>
      </div>
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        width={1536}
        height={1024}
        className="block aspect-[16/10] w-full rounded-[16px] object-cover object-top"
      />
      {badge ? (
        <div className="absolute bottom-5 right-5 max-w-[min(80%,18rem)] rounded-xl border border-white/70 bg-white/95 px-4 py-3 text-left shadow-[0_8px_28px_rgba(32,41,90,0.14)] backdrop-blur sm:bottom-7 sm:right-7">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-graphite">
            <span className="h-2 w-2 rounded-full bg-cobalt-signal" />
            Fluxo conectado
          </p>
          <p className="mt-1 text-sm font-semibold text-indigo-ink">{badge}</p>
        </div>
      ) : null}
    </div>
  )
}

function FeatureCard({ icon, titulo, texto }: { icon: ReactNode; titulo: string; texto: string }) {
  return (
    <article className="group rounded-lg border border-ash/55 bg-paper-white p-6 transition duration-300 hover:-translate-y-1 hover:border-cobalt-signal/35 hover:shadow-[0_14px_36px_rgba(32,41,90,0.07)] sm:p-7">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-lilac-veil text-indigo-ink transition-colors group-hover:bg-indigo-ink group-hover:text-paper-white">
        {icon}
      </div>
      <h3 className="text-lg font-bold tracking-[-0.025em] text-indigo-ink">{titulo}</h3>
      <p className="mt-2 text-[15px] leading-7 text-graphite">{texto}</p>
    </article>
  )
}

function CheckIcon() {
  return (
    <svg {...iconProps} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

export default function Landing() {
  return (
    <div className="landing-page min-h-screen overflow-hidden bg-mist-gray text-indigo-ink">
      <header className="sticky top-0 z-40 border-b border-ash/40 bg-paper-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="GraficaUp Studio — página inicial">
            <BrandMark />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-graphite md:flex" aria-label="Navegação principal">
            <button type="button" onClick={() => scrollToSection('recursos')} className="transition hover:text-indigo-ink">
              Recursos
            </button>
            <button type="button" onClick={() => scrollToSection('como-funciona')} className="transition hover:text-indigo-ink">
              Como funciona
            </button>
            <button type="button" onClick={() => scrollToSection('sistema')} className="transition hover:text-indigo-ink">
              O sistema
            </button>
          </nav>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-cobalt-signal px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2455e8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt-signal sm:px-5"
          >
            Acessar sistema <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-grid relative px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:pt-20">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-12 h-72 w-72 rounded-full bg-lilac-veil/80 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-white/80 blur-3xl" />
          <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
            <div className="landing-reveal relative z-10 max-w-[570px]">
              <p className="inline-flex items-center gap-2 rounded-full border border-ash/50 bg-paper-white/85 px-4 py-2 text-xs font-semibold tracking-[0.03em] text-indigo-ink shadow-[0_3px_12px_rgba(32,41,90,0.04)] sm:text-sm">
                <span className="h-2 w-2 rounded-full bg-cobalt-signal" />
                Gestão feita para gráficas
              </p>
              <h1 className="mt-6 text-[clamp(2.75rem,5.6vw,4.25rem)] font-bold leading-[0.99] tracking-[-0.055em] text-indigo-ink">
                Tudo da sua gráfica.{' '}
                <span className="text-cobalt-signal">Em um só lugar.</span>
              </h1>
              <p className="mt-6 max-w-[520px] text-base leading-7 text-graphite sm:text-lg sm:leading-8">
                Orçamentos, clientes, faturas, produção e financeiro conectados em um sistema que deixa sua equipe livre para fazer o trabalho acontecer.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-cobalt-signal px-6 py-3.5 text-base font-semibold text-white shadow-[0_8px_20px_rgba(46,98,255,0.2)] transition hover:-translate-y-0.5 hover:bg-[#2455e8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt-signal"
                >
                  Acessar o sistema <span aria-hidden="true">→</span>
                </Link>
                <button
                  type="button"
                  onClick={() => scrollToSection('recursos')}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-ink/20 bg-paper-white px-5 py-3.5 text-sm font-semibold text-indigo-ink transition hover:border-indigo-ink/40 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt-signal"
                >
                  Explorar recursos
                </button>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-graphite">
                {['Orçamentos rápidos', 'Pedidos visíveis', 'Equipe conectada'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <span className="text-cobalt-signal"><CheckIcon /></span>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="landing-reveal-delayed relative mx-auto w-full max-w-[680px] lg:ml-auto">
              <div aria-hidden="true" className="absolute -right-7 -top-7 h-32 w-32 rounded-full border border-indigo-ink/10 sm:-right-10 sm:-top-10 sm:h-44 sm:w-44" />
              <div aria-hidden="true" className="absolute -bottom-7 left-10 h-28 w-28 rounded-full border border-cobalt-signal/15 sm:-bottom-10 sm:left-14 sm:h-36 sm:w-36" />
              <div className="relative">
                <BrowserFrame
                  src={heroShot}
                  eager
                  label="Sua gráfica, em um só fluxo"
                  alt="Materiais impressos e painel ilustrando o fluxo de trabalho do GraficaUp Studio"
                  badge="Do orçamento até a entrega"
                />
                <div className="absolute -bottom-5 -left-2 hidden max-w-[230px] rounded-xl border border-ash/50 bg-paper-white px-4 py-3 shadow-[0_12px_32px_rgba(32,41,90,0.12)] sm:block lg:-left-7">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-graphite">Rotina organizada</p>
                  <p className="mt-1 text-sm font-semibold text-indigo-ink">Cliente · produção · caixa</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-2xl border border-ash/45 bg-paper-white px-5 py-5 sm:gap-x-7 sm:px-8">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone">Um fluxo conectado</span>
            {[
              ['01', 'Cliente'],
              ['02', 'Orçamento'],
              ['03', 'Produção'],
              ['04', 'Financeiro'],
            ].map(([numero, etapa], index) => (
              <div key={etapa} className="flex items-center gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-indigo-ink">
                  <span className="text-xs font-medium text-cobalt-signal">{numero}</span>{etapa}
                </span>
                {index < 3 && <span className="hidden text-ash sm:inline" aria-hidden="true">/</span>}
              </div>
            ))}
          </div>
        </section>

        <section id="recursos" className="scroll-mt-24 bg-paper-white py-20 sm:py-24">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <div className="mx-auto max-w-[700px] text-center">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-cobalt-signal">O que muda na rotina</p>
              <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[1.06] tracking-[-0.045em] text-indigo-ink">
                Uma operação mais leve começa aqui.
              </h2>
              <p className="mx-auto mt-4 max-w-[600px] text-base leading-7 text-graphite sm:text-lg sm:leading-8">
                Cada parte do sistema foi pensada para dar mais velocidade ao atendimento, proteger sua margem e melhorar a experiência do cliente.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <FeatureCard key={feature.titulo} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-24 bg-mist-gray py-20 sm:py-24">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16">
            <div className="max-w-[450px]">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-cobalt-signal">Como funciona</p>
              <h2 className="mt-4 text-[clamp(2rem,4vw,3.3rem)] font-bold leading-[1.06] tracking-[-0.045em] text-indigo-ink">
                Do primeiro pedido à entrega.
              </h2>
              <p className="mt-5 text-base leading-7 text-graphite sm:text-lg sm:leading-8">
                Um caminho simples para sua equipe trabalhar com mais contexto e menos tarefas repetidas.
              </p>
              <Link
                to="/login"
                className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-indigo-ink underline decoration-cobalt-signal/45 underline-offset-4 transition hover:text-cobalt-signal"
              >
                Acessar o sistema <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="grid gap-3">
              {STEPS.map((step) => (
                <article key={step.numero} className="grid gap-3 rounded-xl border border-ash/50 bg-paper-white p-5 sm:grid-cols-[72px_1fr] sm:items-center sm:gap-5 sm:p-6">
                  <span className="text-3xl font-bold tracking-[-0.055em] text-cobalt-signal">{step.numero}</span>
                  <div>
                    <h3 className="text-lg font-bold tracking-[-0.025em] text-indigo-ink">{step.titulo}</h3>
                    <p className="mt-1 text-[15px] leading-7 text-graphite">{step.texto}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="sistema" className="scroll-mt-24 bg-paper-white py-20 sm:py-24">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-20 px-4 sm:px-6">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="max-w-[500px]">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-cobalt-signal">Orçamentos</p>
                <h2 className="mt-4 text-[clamp(2rem,3.6vw,3rem)] font-bold leading-[1.08] tracking-[-0.045em] text-indigo-ink">
                  Mais rapidez para montar e enviar cada proposta.
                </h2>
                <p className="mt-4 text-base leading-7 text-graphite sm:text-lg sm:leading-8">
                  Organize medidas, itens e valores em documentos profissionais. Compartilhe com o cliente e acompanhe a aprovação sem redigitar informações.
                </p>
                <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-indigo-ink">
                  <span className="text-cobalt-signal"><CheckIcon /></span> Do orçamento aprovado à próxima etapa
                </p>
              </div>
              <BrowserFrame src={orcamentosShot} alt="Tela de orçamentos do GraficaUp Studio" badge="Propostas organizadas" label="Orçamentos" />
            </div>

            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="max-w-[500px] lg:order-2 lg:ml-auto">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-cobalt-signal">Financeiro</p>
                <h2 className="mt-4 text-[clamp(2rem,3.6vw,3rem)] font-bold leading-[1.08] tracking-[-0.045em] text-indigo-ink">
                  Saiba o que entra, sai e ainda precisa acontecer.
                </h2>
                <p className="mt-4 text-base leading-7 text-graphite sm:text-lg sm:leading-8">
                  Acompanhe vencimentos, cobranças e pagamentos parciais numa visão direta — para planejar os próximos pedidos com mais segurança.
                </p>
                <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-indigo-ink">
                  <span className="text-cobalt-signal"><CheckIcon /></span> Uma visão mais clara do caixa
                </p>
              </div>
              <div className="lg:order-1">
                <BrowserFrame src={faturasShot} alt="Tela de faturas do GraficaUp Studio" badge="Cobrança acompanhada" label="Financeiro" />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-mist-gray px-4 py-20 sm:px-6 sm:py-24">
          <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[32px] border border-ash/40 bg-paper-white px-6 py-12 text-center sm:px-12 sm:py-16">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-lilac-veil/80 blur-3xl" />
            <div className="relative mx-auto max-w-[720px]">
              <BrandMark />
              <h2 className="mt-7 text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[1.06] tracking-[-0.045em] text-indigo-ink">
                Sua próxima etapa começa com mais clareza.
              </h2>
              <p className="mx-auto mt-4 max-w-[570px] text-base leading-7 text-graphite sm:text-lg sm:leading-8">
                Traga os pedidos, a produção e o financeiro para o mesmo fluxo de trabalho.
              </p>
              <Link
                to="/login"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-cobalt-signal px-6 py-3.5 text-base font-semibold text-white shadow-[0_8px_20px_rgba(46,98,255,0.2)] transition hover:-translate-y-0.5 hover:bg-[#2455e8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt-signal"
              >
                Acessar o sistema <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ash/40 bg-paper-white px-4 py-9 sm:px-6">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <BrandMark />
            <p className="mt-2 text-sm text-graphite">Gestão comercial para gráficas.</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-graphite">
            <button type="button" onClick={() => scrollToSection('recursos')} className="transition hover:text-indigo-ink">Recursos</button>
            <Link to="/login" className="transition hover:text-indigo-ink">Entrar</Link>
            <span className="text-stone">© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
