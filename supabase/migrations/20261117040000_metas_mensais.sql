-- Metas mensais isoladas: nenhuma tabela operacional é alterada.
-- Custos e metas são privados da administração; a equipe recebe apenas porcentagens.
create table if not exists public.metas_mensais (
  owner_id uuid not null references auth.users(id),
  mes date not null,
  custo_fixo_centavos bigint not null check (custo_fixo_centavos > 0),
  meta_faturamento_centavos bigint not null check (meta_faturamento_centavos > 0),
  margem_contribuicao_pct numeric(5,2) not null
    check (margem_contribuicao_pct > 0 and margem_contribuicao_pct <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, mes),
  constraint metas_mensais_primeiro_dia check (extract(day from mes) = 1)
);

alter table public.metas_mensais enable row level security;
revoke all on table public.metas_mensais from public, anon, authenticated;
grant select, insert, update on table public.metas_mensais to authenticated;

create policy metas_mensais_admin_select on public.metas_mensais
  for select to authenticated
  using (
    owner_id = (select public.current_workspace_owner_id())
    and (select public.current_workspace_role()) = 'owner'
  );

create policy metas_mensais_admin_insert on public.metas_mensais
  for insert to authenticated
  with check (
    owner_id = (select public.current_workspace_owner_id())
    and (select public.current_workspace_role()) = 'owner'
  );

create policy metas_mensais_admin_update on public.metas_mensais
  for update to authenticated
  using (
    owner_id = (select public.current_workspace_owner_id())
    and (select public.current_workspace_role()) = 'owner'
  )
  with check (
    owner_id = (select public.current_workspace_owner_id())
    and (select public.current_workspace_role()) = 'owner'
  );

-- RPC de leitura para o dashboard; deliberadamente não retorna nenhum valor monetário.
-- Usa faturamento do mês (faturas emitidas não canceladas + vendas rápidas)
-- e só atende uma sessão que pertença a um workspace ativo.
-- SECURITY DEFINER é necessária porque colaboradores não podem ler contas/configurações financeiras.
create function public.progresso_metas_mensais()
returns table (
  configurada boolean,
  ponto_equilibrio_pct numeric,
  meta_faturamento_pct numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $func$
declare
  v_owner uuid := (select public.current_workspace_owner_id());
  v_role text := (select public.current_workspace_role());
  v_mes date := date_trunc('month', timezone('America/Bahia', now()))::date;
  v_custo_fixo bigint;
  v_meta bigint;
  v_margem numeric;
  v_faturamento numeric;
begin
  if v_owner is null or v_role is null or v_role not in ('owner', 'member') then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;

  select m.custo_fixo_centavos, m.meta_faturamento_centavos, m.margem_contribuicao_pct
    into v_custo_fixo, v_meta, v_margem
  from public.metas_mensais as m
  where m.owner_id = v_owner and m.mes = v_mes;

  if not found then
    return query select false, null::numeric, null::numeric;
    return;
  end if;

  select
    coalesce((
      select sum(f.total)::numeric
      from public.faturas as f
      where f.user_id = v_owner
        and f.data_emissao >= v_mes
        and f.data_emissao < (v_mes + interval '1 month')
        and f.status <> 'cancelada'
    ), 0::numeric)
    +
    coalesce((
      select sum(v.total)::numeric
      from public.vendas_rapidas as v
      where v.user_id = v_owner
        and v.data >= v_mes
        and v.data < (v_mes + interval '1 month')
    ), 0::numeric)
  into v_faturamento;

  -- Ponto de equilíbrio = custo fixo / (margem de contribuição / 100).
  -- Percentual atingido = faturamento / ponto de equilíbrio, limitado a 100%.
  return query
    select
      true,
      greatest(0::numeric, least(100::numeric,
        round(v_faturamento * v_margem / v_custo_fixo, 1))),
      greatest(0::numeric, least(100::numeric,
        round(v_faturamento * 100::numeric / v_meta, 1)));
end;
$func$;

revoke all on function public.progresso_metas_mensais() from public, anon, authenticated;
grant execute on function public.progresso_metas_mensais() to authenticated;
