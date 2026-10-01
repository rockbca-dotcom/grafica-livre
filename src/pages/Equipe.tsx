import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Card, ConfirmDialog, Field, inputClass, PageHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../data/supabaseClient'
import { useToast } from '../context/ToastContext'

interface WorkspaceMember {
  user_id: string
  email: string
  role: 'owner' | 'member'
  status: 'active' | 'invited' | 'revoked'
  created_at: string
  invited_at: string | null
}

export default function Equipe() {
  const { cloudMode, session } = useAuth()
  const { showToast } = useToast()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<WorkspaceMember | null>(null)

  const myMembership = members.find((member) => member.user_id === session?.user.id)
  const isOwner = myMembership?.role === 'owner'

  const loadMembers = useCallback(async () => {
    if (!supabase || !session) {
      setLoading(false)
      return
    }
    setLoadError(null)
    const { data, error } = await supabase
      .from('workspace_members')
      .select('user_id, email, role, status, created_at, invited_at')
      .order('created_at', { ascending: true })
    if (error) {
      setLoadError('Não foi possível carregar os colaboradores. Atualize a página e tente novamente.')
    } else {
      setMembers((data ?? []) as WorkspaceMember[])
    }
    setLoading(false)
  }, [session])

  useEffect(() => {
    void loadMembers()
  }, [loadMembers])

  const invoke = async (body: Record<string, string>) => {
    if (!supabase) throw new Error('Supabase não está configurado.')
    const { data, error } = await supabase.functions.invoke('gerenciar-colaboradores', { body })
    if (error) {
      const context = error.context
      if (context instanceof Response) {
        const detail = await context.json().catch(() => null) as { error?: string } | null
        if (detail?.error) throw new Error(detail.error)
      }
      throw new Error(error.message || 'Não foi possível concluir a operação.')
    }
    return data as { message?: string }
  }

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await invoke({ action: 'invite', email })
      showToast(result.message ?? 'Convite enviado por e-mail.')
      setEmail('')
      await loadMembers()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível enviar o convite.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const changeAccess = async (member: WorkspaceMember, action: 'revoke' | 'reactivate') => {
    setBusy(true)
    try {
      await invoke({ action, userId: member.user_id })
      showToast(action === 'revoke' ? 'Acesso do colaborador revogado.' : 'Acesso do colaborador reativado.')
      setPendingRemoval(null)
      await loadMembers()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível atualizar o acesso.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Equipe"
        subtitle="Convide colaboradores para trabalhar nos mesmos dados da gráfica"
      />

      {!cloudMode && (
        <Card>
          <p className="text-sm text-slate-600">
            O cadastro de colaboradores exige uma conta conectada ao Supabase.
          </p>
        </Card>
      )}

      {cloudMode && (
        <div className="space-y-4">
          {isOwner && (
            <Card>
              <h2 className="mb-1 text-base font-semibold text-slate-800">Convidar colaborador</h2>
              <p className="mb-4 text-sm text-slate-500">
                A pessoa receberá um convite por e-mail e criará a própria senha. Os colaboradores
                compartilham clientes, produtos, orçamentos, faturas e demais dados desta gráfica.
              </p>
              <form onSubmit={handleInvite} className="flex flex-col items-end gap-3 sm:flex-row">
                <Field label="E-mail do colaborador" className="w-full flex-1">
                  <input
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    className={inputClass}
                    placeholder="colaborador@empresa.com.br"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </Field>
                <Button type="submit" disabled={busy} className="w-full sm:w-auto">
                  {busy ? 'Enviando...' : 'Enviar convite'}
                </Button>
              </form>
            </Card>
          )}

          {!isOwner && !loading && (
            <Card>
              <p className="text-sm text-slate-600">
                Você está acessando os dados compartilhados da gráfica. Somente o proprietário pode
                gerenciar os convites e os acessos da equipe.
              </p>
            </Card>
          )}

          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Colaboradores</h2>
                <p className="mt-1 text-sm text-slate-500">Acesso à mesma gráfica e aos mesmos registros.</p>
              </div>
              <Button variant="secondary" small disabled={loading} onClick={() => void loadMembers()}>
                Atualizar
              </Button>
            </div>

            {loading ? (
              <p className="py-6 text-center text-sm text-slate-500">Carregando equipe...</p>
            ) : loadError ? (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{loadError}</p>
            ) : members.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Nenhum colaborador encontrado.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {members.map((member) => (
                  <div key={member.user_id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {member.email || 'E-mail não disponível'}
                        {member.user_id === session?.user.id && <span className="ml-2 text-xs text-slate-400">(você)</span>}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {member.role === 'owner' ? 'Proprietário' : 'Colaborador'} ·{' '}
                        {member.status === 'active' ? 'Ativo' : member.status === 'invited' ? 'Convite enviado' : 'Acesso revogado'}
                      </p>
                    </div>
                    {isOwner && member.role === 'member' && (
                      <div className="flex shrink-0 gap-2">
                        {member.status === 'revoked' ? (
                          <Button
                            variant="secondary"
                            small
                            disabled={busy}
                            onClick={() => void changeAccess(member, 'reactivate')}
                          >
                            Reativar
                          </Button>
                        ) : (
                          <Button
                            variant="danger"
                            small
                            disabled={busy}
                            onClick={() => setPendingRemoval(member)}
                          >
                            Revogar acesso
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        title="Revogar acesso do colaborador?"
        message={`A pessoa deixará de acessar os dados desta gráfica. O cadastro permanece na lista e poderá ser reativado depois.${pendingRemoval ? ` Colaborador: ${pendingRemoval.email}.` : ''}`}
        confirmLabel={busy ? 'Revogando...' : 'Revogar acesso'}
        danger
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => pendingRemoval && void changeAccess(pendingRemoval, 'revoke')}
      />
    </div>
  )
}
