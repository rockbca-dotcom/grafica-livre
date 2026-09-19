import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
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

function Gate() {
  const { cloudMode, session, loading } = useAuth()

  if (loading) {
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

  return (
    <DataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="orcamentos" element={<Orcamentos />} />
          <Route path="faturas" element={<Faturas />} />
          <Route path="pdv" element={<Pdv />} />
          <Route path="producao" element={<Producao />} />
          <Route path="contas-receber" element={<ContasReceber />} />
          <Route path="contas-pagar" element={<ContasPagar />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="itens" element={<Itens />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DataProvider>
  )
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
