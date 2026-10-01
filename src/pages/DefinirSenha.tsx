import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, inputClass } from '../components/ui'
import { supabase } from '../data/supabaseClient'

export default function DefinirSenha() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const isInvite = new URLSearchParams(window.location.search).has('invite')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!supabase) {
      setError('O serviço de autenticação não está disponível.')
      return
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirmation) {
      setError('As senhas não são iguais.')
      return
    }

    setBusy(true)
    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password })
      if (passwordError) throw passwordError

      const { error: acceptError } = await supabase.functions.invoke('gerenciar-colaboradores', {
        body: { action: 'accept' },
      })
      if (acceptError) {
        const context = acceptError.context
        if (context instanceof Response) {
          const detail = await context.json().catch(() => null) as { error?: string } | null
          if (detail?.error) throw new Error(detail.error)
        }
        throw acceptError
      }

      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.hash}`)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a senha. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="mb-2 text-center text-2xl font-bold text-slate-800">
          {isInvite ? 'Ative seu acesso' : 'Defina uma nova senha'}
        </h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          {isInvite
            ? 'Crie uma senha pessoal para acessar os dados compartilhados da gráfica.'
            : 'Escolha uma nova senha para continuar usando o sistema.'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Nova senha">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <Field label="Confirme a nova senha">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Salvando...' : 'Salvar senha e acessar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
