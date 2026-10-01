import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Card, ConfirmDialog, Field, inputClass, PageHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../data/supabaseClient'
import { useToast } from '../context/ToastContext'

interface WorkspaceMember {
  user_id: string
  email: string
  full_name: string
  birth_date: string | null
  job_title: string
  role: 'owner' | 'member'
  status: 'active' | 'invited' | 'revoked'
  created_at: string
  invited_at: string | null
}

export default function Equipe() {
  const { cloudMode, session } = useAuth()
  const { showToast } = useToast()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
      .select('user_id, email, full_name, birth_date, job_title, role, status, created_at, invited_at')
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

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password !== confirmPassword) {
      showToast('As senhas não coincidem.', 'error')
      return
    }
    setBusy(true)
    try {
      const result = await invoke({
        action: 'create',
        fullName,
        email,
        birthDate,
        jobTitle,
        password,
      })
      showToast(result.message ?? 'Colaborador cadastrado com acesso ativo.')
      setFullName('')
      setEmail('')
      setBirthDate('')
      setJobTitle('')
      setPassword('')
      setConfirmPassword('')
      await loadMembers()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível cadastrar o colaborador.', 'error')
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
        subtitle="Cadastre e gerencie os colaboradores que acessam os dados da gráfica"
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
              <h2 className="mb-1 text-base font-semibold text-slate-800">Cadastrar colaborador</h2>
              <p className="mb-4 text-sm text-slate-500">
                O acesso será criado na hora. A senha é protegida pelo Supabase; compartilhe as credenciais com o colaborador por um canal seguro.
              </p>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Nome completo">
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={120}
                      autoComplete="name"
                      className={inputClass}
                      placeholder="Nome e sobrenome"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                    />
                  </Field>
                  <Field label="E-mail">
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
                  <Field label="Data de nascimento">
                    <input
                      type="date"
                      required
                      autoComplete="bday"
                      className={inputClass}
                      value={birthDate}
                      onChange={(event) => setBirthDate(event.target.value)}
                    />
                  </Field>
                  <Field label="Função">
                    <input
                      type="text"
                      required
                      maxLength={80}
                      autoComplete="organization-title"
                      className={inputClass}
                      placeholder="Ex.: Atendimento, Designer"
                      value={jobTitle}
                      onChange={(event) => setJobTitle(event.target.value)}
                    />
                  </Field>
                  <Field label="Senha inicial">
                    <input
                      type="password"
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      className={inputClass}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </Field>
                  <Field label="Confirmar senha">
                    <input
                      type="password"
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      className={inputClass}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </Field>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={busy} className="w-full sm:w-auto">
                    {busy ? 'Cadastrando...' : 'Cadastrar colaborador'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {!isOwner && !loading && (
            <Card>
              <p className="text-sm text-slate-600">
                Você está acessando os dados compartilhados da gráfica. Somente o proprietário pode
                gerenciar os colaboradores e seus acessos.
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
                        {member.full_name || member.email || 'Nome não disponível'}
                        {member.user_id === session?.user.id && <span className="ml-2 text-xs text-slate-400">(você)</span>}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">{member.email || 'E-mail não disponível'}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {member.role === 'owner' ? 'Proprietário' : 'Colaborador'}
                        {member.job_title ? ` · ${member.job_title}` : ''}
                        {member.birth_date ? ` · Nascimento: ${new Date(`${member.birth_date}T00:00:00`).toLocaleDateString('pt-BR')}` : ''}
                        {' · '}{member.status === 'active' ? 'Ativo' : member.status === 'invited' ? 'Convite enviado' : 'Acesso revogado'}
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
        message={`A pessoa deixará de acessar os dados desta gráfica. O cadastro permanece na lista e poderá ser reativado depois.${pendingRemoval ? ` Colaborador: ${pendingRemoval.full_name || pendingRemoval.email}.` : ''}`}
        confirmLabel={busy ? 'Revogando...' : 'Revogar acesso'}
        danger
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => pendingRemoval && void changeAccess(pendingRemoval, 'revoke')}
      />
    </div>
  )
}
