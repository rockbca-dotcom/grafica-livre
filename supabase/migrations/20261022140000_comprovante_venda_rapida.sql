-- Dados adicionais para o comprovante e a autoria das vendas rápidas.
-- Vendas antigas permanecem sem vendedor identificado.
alter table public.vendas_rapidas
  add column if not exists vendedor_id uuid,
  add column if not exists vendedor_nome text not null default '';

alter table public.empresa
  add column if not exists inscricao_estadual text not null default '';

-- Colaboradores continuam podendo registrar vendas, mas a autoria deve ser a
-- própria sessão autenticada. Leitura continua compartilhada conforme PDV-02.
drop policy if exists "vendas_rapidas_member_insert" on public.vendas_rapidas;
create policy "vendas_rapidas_member_insert" on public.vendas_rapidas
  for insert to authenticated
  with check (
    user_id = (select public.current_workspace_owner_id())
    and (select public.current_workspace_role()) = 'member'
    and vendedor_id = (select auth.uid())
  );
