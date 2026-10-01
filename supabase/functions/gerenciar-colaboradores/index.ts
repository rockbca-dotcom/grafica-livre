import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const appUrl = (Deno.env.get('APP_URL') ?? 'https://grafica-rapida.vercel.app').replace(/\/+$/, '')
const allowedOrigins = new Set(
  (Deno.env.get('APP_ALLOWED_ORIGINS') ?? `${appUrl},http://localhost:5173`)
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),
)

function response(body: Record<string, unknown>, status: number, origin: string) {
  const allowedOrigin = allowedOrigins.has(origin) ? origin : appUrl
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
    },
  })
}

Deno.serve(async (req: Request) => {
  const origin = (req.headers.get('origin') ?? '').replace(/\/+$/, '')
  if (req.method === 'OPTIONS') return response({}, 200, origin)
  if (req.method !== 'POST') return response({ error: 'Método não permitido.' }, 405, origin)
  if (origin && !allowedOrigins.has(origin)) {
    return response({ error: 'Origem não autorizada.' }, 403, origin)
  }

  const authorization = req.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return response({ error: 'Sessão inválida. Entre novamente no sistema.' }, 401, origin)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Variáveis padrão do Supabase estão ausentes.')
    return response({ error: 'Serviço de equipe indisponível.' }, 500, origin)
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const { data: authData, error: authError } = await callerClient.auth.getUser()
    const caller = authData.user
    if (authError || !caller) {
      return response({ error: 'Sessão inválida. Entre novamente no sistema.' }, 401, origin)
    }

    const { data: membership, error: membershipError } = await adminClient
      .from('workspace_members')
      .select('owner_id, role, status')
      .eq('user_id', caller.id)
      .maybeSingle()

    if (membershipError || !membership || membership.status === 'revoked') {
      return response({ error: 'Este usuário não tem acesso a uma gráfica ativa.' }, 403, origin)
    }

    const payload = await req.json().catch(() => null) as {
      action?: string
      email?: string
      userId?: string
    } | null
    const action = payload?.action

    if (action === 'accept') {
      if (membership.status === 'invited') {
        const { error } = await adminClient
          .from('workspace_members')
          .update({ status: 'active' })
          .eq('user_id', caller.id)
          .eq('status', 'invited')
        if (error) throw error
      }
      return response({ ok: true }, 200, origin)
    }

    if (membership.role !== 'owner' || membership.owner_id !== caller.id) {
      return response({ error: 'Somente o proprietário pode gerenciar colaboradores.' }, 403, origin)
    }

    if (action === 'invite') {
      const email = payload?.email?.trim().toLowerCase() ?? ''
      if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return response({ error: 'Informe um endereço de e-mail válido.' }, 400, origin)
      }
      if (email === caller.email?.toLowerCase()) {
        return response({ error: 'Este e-mail já é o proprietário da gráfica.' }, 409, origin)
      }

      const { data: existing, error: existingError } = await adminClient
        .from('workspace_members')
        .select('owner_id, user_id, status')
        .eq('email', email)
        .maybeSingle()
      if (existingError) throw existingError
      if (existing) {
        if (existing.owner_id !== membership.owner_id) {
          return response({ error: 'Este e-mail já está vinculado a outra gráfica.' }, 409, origin)
        }
        if (existing.status === 'revoked') {
          return response({ error: 'Este colaborador já teve acesso. Use a opção Reativar na lista.' }, 409, origin)
        }
        return response({ error: 'Este e-mail já foi convidado ou já faz parte da equipe.' }, 409, origin)
      }

      const { data: inviteData, error: inviteError } = await adminClient.auth.admin
        .inviteUserByEmail(email, { redirectTo: `${appUrl}/?invite=1` })
      if (inviteError) {
        const message = inviteError.message.toLowerCase()
        if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
          return response({
            error: 'Este e-mail já possui uma conta no sistema. O colaborador pode acessar com a senha atual ou redefini-la pelo login.',
          }, 409, origin)
        }
        console.error('Falha ao enviar convite:', inviteError.message)
        return response({ error: 'Não foi possível enviar o convite. Verifique a configuração de e-mail do Supabase.' }, 502, origin)
      }

      const invitedUserId = inviteData.user?.id
      if (!invitedUserId) {
        return response({ error: 'O convite foi iniciado, mas o Supabase não retornou o usuário convidado.' }, 502, origin)
      }

      const { error: insertError } = await adminClient.from('workspace_members').insert({
        owner_id: membership.owner_id,
        user_id: invitedUserId,
        email,
        role: 'member',
        status: 'invited',
        invited_at: new Date().toISOString(),
      })
      if (insertError) {
        console.error('Falha ao vincular o colaborador convidado:', insertError.message)
        return response({ error: 'O convite foi enviado, mas não foi possível vincular o acesso. Contate o suporte antes de reenviar.' }, 500, origin)
      }

      return response({ ok: true, message: `Convite enviado para ${email}.` }, 200, origin)
    }

    if (action === 'revoke' || action === 'reactivate') {
      const userId = payload?.userId
      if (!userId || userId === caller.id) {
        return response({ error: 'Selecione um colaborador válido.' }, 400, origin)
      }

      const nextStatus = action === 'revoke' ? 'revoked' : 'active'
      const expectedStatus = action === 'revoke' ? ['active', 'invited'] : ['revoked']
      const { data: target, error: targetError } = await adminClient
        .from('workspace_members')
        .select('user_id, role, status')
        .eq('owner_id', membership.owner_id)
        .eq('user_id', userId)
        .maybeSingle()
      if (targetError) throw targetError
      if (!target || target.role === 'owner') {
        return response({ error: 'Colaborador não encontrado.' }, 404, origin)
      }
      if (action === 'revoke' && target.status === 'revoked') {
        return response({ ok: true }, 200, origin)
      }
      if (action === 'reactivate' && target.status !== 'revoked') {
        return response({ error: 'Este colaborador não está revogado.' }, 409, origin)
      }

      const { error: updateError } = await adminClient
        .from('workspace_members')
        .update({ status: nextStatus })
        .eq('owner_id', membership.owner_id)
        .eq('user_id', userId)
        .in('status', expectedStatus)
      if (updateError) throw updateError
      return response({ ok: true }, 200, origin)
    }

    return response({ error: 'Ação não reconhecida.' }, 400, origin)
  } catch (error) {
    console.error('Erro ao gerenciar colaboradores:', error)
    return response({ error: 'Não foi possível concluir a operação. Tente novamente.' }, 500, origin)
  }
})
