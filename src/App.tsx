import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Itens from './pages/Itens'
import Orcamentos from './pages/Orcamentos'
import Faturas from './pages/Faturas'
import Pdv from './pages/Pdv'
import Producao from './pages/Producao'
import ContasReceber from './pages/ContasReceber'
import ContasPagar from './pages/ContasPagar'
import Relatorios from './pages/Relatorios'
import Perfil from './pages/Perfil'
import Configuracoes from './pages/Configuracoes'
import Equipe from './pages/Equipe'
import DefinirSenha from './pages/DefinirSenha'

function Gate() {
  const { cloudMode, session, loading, role, roleLoading, signOut } = useAuth()
  const location = useLocation()
  const passwordSetupRequest = new URLSearchParams(window.location.search).has('invite') ||
    new URLSearchParams(window.location.search).has('reset')
  const definingPassword = passwordSetupRequest && location.pathname !== '/login'

  if (loading || (cloudMode && session && roleLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Carregando...
      </div>
    )
  }

  if (cloudMode && !session) {
    return (
      <Routes>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  if (cloudMode && session && definingPassword) return <DefinirSenha />

  if (cloudMode && session && !roleLoading && !role) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center text-slate-600">
        <p className="font-medium">Não encontramos um acesso ativo para esta conta.</p>
        <p className="max-w-md text-sm">Peça ao proprietário para conferir sua associação ou aplicar a migração mais recente do sistema.</p>
        <button type="button" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white" onClick={signOut}>
          Sair
        </button>
      </div>
    )
  }

  return (
    <DataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="orcamentos" element={<Orcamentos />} />
          <Route path="faturas" element={<Faturas />} />
          <Route path="pdv" element={<Pdv />} />
          <Route path="producao" element={<Producao />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="itens" element={<Itens />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="equipe" element={<Equipe />} />
          <Route element={<OwnerOnly />}>
            <Route path="contas-receber" element={<ContasReceber />} />
            <Route path="contas-pagar" element={<ContasPagar />} />
            <Route path="relatorios" element={<Relatorios />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DataProvider>
  )
}

function OwnerOnly() {
  const { cloudMode, role } = useAuth()
  return !cloudMode || role === 'owner'
    ? <Outlet />
    : <Navigate to="/" replace />
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  )
}
