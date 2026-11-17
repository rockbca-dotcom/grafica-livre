import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import AssistenteIA from './AssistenteIA'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/orcamentos', label: 'Orçamentos', icon: '📝' },
  { to: '/faturas', label: 'Faturas', icon: '🧾' },
  { to: '/pdv', label: 'PDV — Venda rápida', icon: '🛒' },
  { to: '/producao', label: 'Produção', icon: '🏭' },
  { to: '/contas-receber', label: 'Contas a Receber', icon: '💰' },
  { to: '/contas-pagar', label: 'Contas a Pagar', icon: '💸' },
  { to: '/clientes', label: 'Clientes', icon: '👥' },
  { to: '/itens', label: 'Produtos', icon: '📦' },
  { to: '/relatorios', label: 'Relatórios', icon: '📈' },
  { to: '/metas', label: 'Metas', icon: '🎯' },
  { to: '/perfil', label: 'Perfil da Empresa', icon: '🏢' },
  { to: '/equipe', label: 'Equipe', icon: '👥' },
  { to: '/configuracoes', label: 'Configurações', icon: '⚙️' },
]

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { cloudMode, session, signOut, role } = useAuth()
  const { loading } = useData()

  return (
    <div className="app-shell flex min-h-screen">
      <button
        className="app-menu-toggle fixed left-3 top-3 z-40 rounded-lg bg-slate-800 px-3 py-2 text-white shadow-lg lg:hidden"
        onClick={() => setOpen(!open)}
        aria-label="Menu"
      >
        ☰
      </button>

      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-30 w-64 transform bg-slate-50 text-slate-800 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-slate-800 px-5 py-5">
          <div className="app-sidebar-brand rounded-xl border border-violet-100 bg-white px-2 py-1.5 shadow-sm">
            <img
              src="/brand/graficaup-logo-horizontal-dark.png"
              alt="GraficaUp Studio"
              className="block w-full"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">Gestão para gráficas</p>
        </div>
        <nav className="mt-2 flex max-h-[calc(100vh-11rem)] flex-col gap-0.5 overflow-y-auto px-3 pb-4">
          {NAV.filter((item) => {
            if (item.to === '/equipe') return cloudMode && session
            const financial = ['/contas-receber', '/contas-pagar', '/relatorios', '/metas'].includes(item.to)
            return !financial || !cloudMode || role === 'owner'
          }).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `app-nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive ? 'app-nav-link-active font-medium text-white' : 'app-nav-link-idle text-slate-300'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-slate-800 p-4 text-xs">
          {cloudMode ? (
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-slate-500" title={session?.user.email ?? ''}>
                {session?.user.email}
              </span>
              <button
                onClick={signOut}
                className="shrink-0 rounded px-2 py-1 text-slate-700 hover:bg-slate-200"
              >
                Sair
              </button>
            </div>
          ) : (
            <span className="text-amber-800">
              ⚠ Modo local — dados apenas neste navegador. Configure o Supabase para uso
              profissional.
            </span>
          )}
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <main className="min-w-0 flex-1 px-4 py-6 pt-16 lg:ml-64 lg:px-8 lg:pt-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-slate-500">
            Carregando dados...
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <AssistenteIA />
    </div>
  )
}
