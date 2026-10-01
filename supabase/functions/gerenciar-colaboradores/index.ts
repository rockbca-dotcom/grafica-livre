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

function isValidBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsedDate = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsedDate.getTime())
    && parsedDate.toISOString().slice(0, 10) === value
    && value <= new Date().toISOString().slice(0, 10)
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
      birthDate?: string
      email?: string
      fullName?: string
      jobTitle?: string
      password?: string
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

    if (action === 'create') {
      const fullName = payload?.fullName?.trim().replace(/\s+/g, ' ') ?? ''
      const email = payload?.email?.trim().toLowerCase() ?? ''
      const birthDate = payload?.birthDate?.trim() ?? ''
      const jobTitle = payload?.jobTitle?.trim() ?? ''
      const password = payload?.password ?? ''

      if (fullName.length < 2 || fullName.length > 120) {
        return response({ error: 'Informe o nome completo (até 120 caracteres).' }, 400, origin)
      }
      if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return response({ error: 'Informe um endereço de e-mail válido.' }, 400, origin)
      }
      if (!isValidBirthDate(birthDate)) {
        return response({ error: 'Informe uma data de nascimento válida, que não seja futura.' }, 400, origin)
      }
      if (!jobTitle || jobTitle.length > 80) {
        return response({ error: 'Informe a função (até 80 caracteres).' }, 400, origin)
      }
      if (password.length < 8 || password.length > 128) {
        return response({ error: 'A senha deve ter entre 8 e 128 caracteres.' }, 400, origin)
      }
      if (email === caller.email?.toLowerCase()) {
        return response({ error: 'Este e-mail já é o proprietário da gráfica.' }, 409, origin)
      }

      const { data: existing, error: existingError } = await adminClient
        .from('workspace_members')
        .select('owner_id, status')
        .eq('email', email)
        .maybeSingle()
      if (existingError) throw existingError
      if (existing) {
        if (existing.owner_id !== membership.owner_id) {
          return response({ error: 'Este e-mail já está vinculado a outra gráfica.' }, 409, origin)
        }
        if (existing.status === 'revoked') {
          return response({ error: 'Este colaborador já está cadastrado. Use a opção Reativar na lista.' }, 409, origin)
        }
        return response({ error: 'Este e-mail já faz parte da equipe.' }, 409, origin)
      }

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (createError || !created.user) {
        const message = createError?.message.toLowerCase() ?? ''
        if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
          return response({ error: 'Este e-mail já possui uma conta no sistema.' }, 409, origin)
        }
        console.error('Falha ao criar a conta do colaborador:', createError?.message ?? 'usuário não retornado')
        return response({ error: 'Não foi possível criar a conta. Verifique se a senha atende às regras do Supabase.' }, 400, origin)
      }

      const { error: insertError } = await adminClient.from('workspace_members').insert({
        owner_id: membership.owner_id,
        user_id: created.user.id,
        email,
        full_name: fullName,
        birth_date: birthDate,
        job_title: jobTitle,
        role: 'member',
        status: 'active',
      })
      if (insertError) {
        const { error: cleanupError } = await adminClient.auth.admin.deleteUser(created.user.id)
        if (cleanupError) {
          console.error('Falha ao vincular e limpar a conta do colaborador:', insertError.message, cleanupError.message)
          return response({ error: 'A conta foi criada, mas não foi possível vinculá-la à equipe. Contate o suporte antes de tentar novamente.' }, 500, origin)
        }
        console.error('Falha ao vincular a conta do colaborador; a conta foi removida:', insertError.message)
        return response({ error: 'Não foi possível vincular o colaborador à equipe. Revise os dados e tente novamente.' }, 500, origin)
      }

      return response({ ok: true, message: `${fullName} foi cadastrado e já pode acessar o sistema.` }, 200, origin)
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
