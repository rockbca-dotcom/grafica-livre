-- Compartilhamento seguro dos dados da gráfica entre proprietário e colaboradores.
create table if not exists public.workspace_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  email text not null default '',
  role text not null default 'owner' check (role in ('owner', 'member')),
  status text not null default 'active' check (status in ('active', 'invited', 'revoked')),
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  constraint workspace_owner_is_self check (role <> 'owner' or owner_id = user_id)
);

create index if not exists idx_workspace_members_owner
  on public.workspace_members (owner_id, created_at);
create unique index if not exists idx_workspace_members_email_active
  on public.workspace_members (lower(email))
  where status in ('active', 'invited') and email <> '';

-- Cada conta existente continua como proprietária do próprio espaço.
insert into public.workspace_members (owner_id, user_id, email, role, status)
select u.id, u.id, lower(coalesce(u.email, '')), 'owner', 'active'
from auth.users u
on conflict (user_id) do nothing;

-- Usuários existentes podem criar seu próprio espaço sem tocar em outros.
-- Contas de convite (invited_at não nulo) só entram pelo fluxo da Edge Function.
create or replace function public.ensure_workspace_membership()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_owner_id uuid;
  v_email text;
  v_invited_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'autenticação necessária';
  end if;

  select wm.owner_id into v_owner_id
  from public.workspace_members wm
  where wm.user_id = v_user_id and wm.status in ('active', 'invited')
  limit 1;
  if v_owner_id is not null then
    return v_owner_id;
  end if;

  select lower(coalesce(u.email, '')), u.invited_at
  into v_email, v_invited_at
  from auth.users u where u.id = v_user_id;
  if not found or v_invited_at is not null then
    return null;
  end if;

  insert into public.workspace_members (owner_id, user_id, email, role, status)
  values (v_user_id, v_user_id, v_email, 'owner', 'active')
  on conflict (user_id) do nothing;

  select wm.owner_id into v_owner_id
  from public.workspace_members wm
  where wm.user_id = v_user_id and wm.status = 'active'
  limit 1;
  return v_owner_id;
end;
$$;

revoke all on function public.ensure_workspace_membership() from public, anon;
grant execute on function public.ensure_workspace_membership() to authenticated;

-- Usada pelas policies para encontrar somente o espaço do usuário autenticado.
create or replace function public.current_workspace_owner_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select wm.owner_id
  from public.workspace_members wm
  where wm.user_id = (select auth.uid())
    and wm.status in ('active', 'invited')
  limit 1;
$$;

revoke all on function public.current_workspace_owner_id() from public, anon;
grant execute on function public.current_workspace_owner_id() to authenticated;

alter table public.workspace_members enable row level security;
drop policy if exists "workspace_members_select" on public.workspace_members;
create policy "workspace_members_select" on public.workspace_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or owner_id = (select public.current_workspace_owner_id())
  );
revoke all on table public.workspace_members from public, anon, authenticated;
grant select on table public.workspace_members to authenticated;
grant all on table public.workspace_members to service_role;

-- Permite encerrar a sessão do colaborador quando o proprietário revoga o acesso.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'workspace_members'
     ) then
    alter publication supabase_realtime add table public.workspace_members;
  end if;
end $$;

-- Substitui o isolamento por usuário pelo isolamento do espaço da gráfica.
do $$
declare t text;
begin
  foreach t in array array[
    'clientes', 'itens', 'orcamentos', 'faturas', 'pagamentos',
    'vendas_rapidas', 'contas_pagar', 'producao_cards', 'empresa'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "dono" on public.%I', t);
    execute format(
      'create policy "dono" on public.%I for all to authenticated using (user_id = (select public.current_workspace_owner_id())) with check (user_id = (select public.current_workspace_owner_id()))',
      t
    );
  end loop;
end $$;

-- Números sequenciais continuam atômicos e agora usam o proprietário do espaço.
create or replace function public.proximo_numero_documento(p_tipo text)
returns int
language plpgsql
security invoker
as $$
declare
  v_num int;
  v_owner_id uuid;
begin
  v_owner_id := public.current_workspace_owner_id();
  if v_owner_id is null then
    raise exception 'usuário não está vinculado a uma gráfica ativa';
  end if;

  if p_tipo = 'orcamento' then
    insert into public.empresa (user_id, proximo_num_orcamento)
      values (v_owner_id, 2)
      on conflict (user_id) do update
        set proximo_num_orcamento = public.empresa.proximo_num_orcamento + 1
      returning proximo_num_orcamento - 1 into v_num;
  elsif p_tipo = 'fatura' then
    insert into public.empresa (user_id, proximo_num_fatura)
      values (v_owner_id, 2)
      on conflict (user_id) do update
        set proximo_num_fatura = public.empresa.proximo_num_fatura + 1
      returning proximo_num_fatura - 1 into v_num;
  else
    raise exception 'tipo de documento invalido: %', p_tipo;
  end if;
  return v_num;
end;
$$;

grant execute on function public.proximo_numero_documento(text) to authenticated;
