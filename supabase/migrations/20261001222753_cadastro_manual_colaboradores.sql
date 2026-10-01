-- Dados do cadastro manual da equipe e restrição de leitura do perfil.
alter table public.workspace_members
  add column if not exists full_name text not null default '',
  add column if not exists birth_date date,
  add column if not exists job_title text not null default '';

-- Reaproveita nomes que já estavam salvos nos metadados de usuários antigos.
update public.workspace_members wm
set full_name = coalesce(
  nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
  ''
)
from auth.users u
where wm.user_id = u.id
  and wm.full_name = '';

-- O proprietário vê sua equipe; cada colaborador vê apenas o próprio perfil.
drop policy if exists "workspace_members_select" on public.workspace_members;
create policy "workspace_members_select" on public.workspace_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or owner_id = (select auth.uid())
  );
