-- Persistência de favoritos compartilhados no catálogo da gráfica.
alter table public.itens
  add column if not exists favorito boolean not null default false;

-- Convites pendentes e acessos revogados não recebem dados do espaço.
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
    and wm.status = 'active'
  limit 1;
$$;

revoke all on function public.current_workspace_owner_id() from public, anon;
grant execute on function public.current_workspace_owner_id() to authenticated;

-- O cliente usa esta função para resolver o papel da própria sessão.
create or replace function public.current_workspace_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select wm.role
  from public.workspace_members wm
  where wm.user_id = (select auth.uid())
    and wm.status = 'active'
  limit 1;
$$;

revoke all on function public.current_workspace_role() from public, anon;
grant execute on function public.current_workspace_role() to authenticated;

-- Retira a política compartilhada e libera a tabela somente ao proprietário.
alter table public.contas_pagar enable row level security;
drop policy if exists "dono" on public.contas_pagar;
drop policy if exists "contas_pagar_owner_only" on public.contas_pagar;
create policy "contas_pagar_owner_only" on public.contas_pagar
  for all to authenticated
  using (
    user_id = (select public.current_workspace_owner_id())
    and (select public.current_workspace_role()) = 'owner'
  )
  with check (
    user_id = (select public.current_workspace_owner_id())
    and (select public.current_workspace_role()) = 'owner'
  );

-- Colaboradores podem registrar vendas, mas não consultar nem alterar o histórico financeiro.
drop policy if exists "dono" on public.vendas_rapidas;
drop policy if exists "vendas_rapidas_owner_all" on public.vendas_rapidas;
drop policy if exists "vendas_rapidas_member_insert" on public.vendas_rapidas;
create policy "vendas_rapidas_owner_all" on public.vendas_rapidas
  for all to authenticated
  using (
    user_id = (select public.current_workspace_owner_id())
    and (select public.current_workspace_role()) = 'owner'
  )
  with check (
    user_id = (select public.current_workspace_owner_id())
    and (select public.current_workspace_role()) = 'owner'
  );
create policy "vendas_rapidas_member_insert" on public.vendas_rapidas
  for insert to authenticated
  with check (
    user_id = (select public.current_workspace_owner_id())
    and (select public.current_workspace_role()) = 'member'
  );
