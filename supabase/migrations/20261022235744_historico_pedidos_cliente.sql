-- Colaboradores podem consultar vendas rápidas associadas a clientes.
-- Vendas sem cliente e alterações no histórico continuam restritas ao owner.
drop policy if exists "vendas_rapidas_member_customer_read" on public.vendas_rapidas;
create policy "vendas_rapidas_member_customer_read" on public.vendas_rapidas
  for select to authenticated
  using (
    user_id = (select public.current_workspace_owner_id())
    and (select public.current_workspace_role()) = 'member'
    and cliente_id is not null
  );
