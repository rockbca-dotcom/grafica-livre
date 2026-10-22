-- Colaboradores podem consultar o histórico completo de vendas rápidas da gráfica.
-- A política permite leitura, sem acesso de alteração ou exclusão.
drop policy if exists "vendas_rapidas_member_customer_read" on public.vendas_rapidas;
drop policy if exists "vendas_rapidas_member_read" on public.vendas_rapidas;
create policy "vendas_rapidas_member_read" on public.vendas_rapidas
  for select to authenticated
  using (
    user_id = (select public.current_workspace_owner_id())
    and (select public.current_workspace_role()) = 'member'
  );
