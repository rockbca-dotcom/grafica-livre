begin;

alter table public.itens add column segmento text
  check (segmento in ('grafica', 'comunicacao_visual'));

create table public.itens_custos (
  -- Sem cascata: a importação legada do catálogo não deve apagar custos privados.
  item_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  custo_centavos bigint not null check (custo_centavos between 0 and 999999999999)
);
alter table public.itens_custos enable row level security;
revoke all on public.itens_custos from public, anon, authenticated;
grant select, insert, update on public.itens_custos to authenticated;
create policy itens_custos_gestao on public.itens_custos for all to authenticated
  using (user_id = (select public.current_workspace_owner_id())
    and (select public.current_workspace_role()) = 'owner')
  with check (user_id = (select public.current_workspace_owner_id())
    and (select public.current_workspace_role()) = 'owner'
    and exists (select 1 from public.itens i where i.id = item_id and i.user_id = itens_custos.user_id));

-- A via antiga continua válida para o catálogo sem dados financeiros.
create function public.salvar_item_com_custo(
  p_id uuid, p_nome text, p_tipo text, p_preco_m2 bigint, p_preco_unitario bigint,
  p_descricao text, p_favorito boolean, p_segmento text, p_custo bigint
) returns void language plpgsql security invoker set search_path = ''
as $$
declare
  v_owner uuid := public.current_workspace_owner_id();
begin
  if v_owner is null or public.current_workspace_role() is distinct from 'owner' then
    raise exception 'Apenas a gestão pode salvar custos.' using errcode = '42501';
  end if;
  if p_custo is null or p_custo < 0 or btrim(coalesce(p_nome,'')) = ''
    or p_tipo not in ('produto','servico') then
    raise exception 'Nome, tipo ou custo inválido.';
  end if;
  insert into public.itens(id,user_id,nome,categoria,preco_m2,preco_unitario,descricao,favorito,segmento)
    values(p_id,v_owner,p_nome,p_tipo,p_preco_m2,p_preco_unitario,p_descricao,p_favorito,p_segmento)
    on conflict(id) do update set nome=excluded.nome,categoria=excluded.categoria,preco_m2=excluded.preco_m2,
      preco_unitario=excluded.preco_unitario,descricao=excluded.descricao,favorito=excluded.favorito,segmento=excluded.segmento;
  insert into public.itens_custos(item_id,user_id,custo_centavos)
    values(p_id,v_owner,p_custo) on conflict(item_id) do update set custo_centavos=excluded.custo_centavos;
end;
$$;
revoke all on function public.salvar_item_com_custo(uuid,text,text,bigint,bigint,text,boolean,text,bigint)
  from public, anon, authenticated;
grant execute on function public.salvar_item_com_custo(uuid,text,text,bigint,bigint,text,boolean,text,bigint)
  to authenticated;

alter table public.metas_mensais
  add column meta_grafica_centavos bigint,
  add column meta_comunicacao_visual_centavos bigint,
  add constraint metas_segmentos_preenchidos_juntos check (
    (meta_grafica_centavos is null and meta_comunicacao_visual_centavos is null)
    or (meta_grafica_centavos is not null and meta_comunicacao_visual_centavos is not null
        and meta_grafica_centavos between 1 and 999999999999
        and meta_comunicacao_visual_centavos between 1 and 999999999999)
  );

-- A RPC antiga permanece para builds anteriores. O novo retorno só revela
-- percentuais e estados, nunca valores vendidos, custos ou metas monetárias.
create function public.progresso_metas_segmentadas()
returns table (
  configurada boolean, ponto_equilibrio_pct numeric, meta_total_pct numeric,
  meta_grafica_pct numeric, meta_comunicacao_visual_pct numeric,
  tem_sem_classificacao boolean, modo_legado boolean
) language plpgsql stable security definer set search_path = ''
as $$
declare
  v_owner uuid := public.current_workspace_owner_id();
  v_mes date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
  v_limite date := (v_mes + interval '1 month')::date;
  v_m public.metas_mensais;
  v_t numeric;
  v_g numeric;
  v_cv numeric;
  v_sem boolean;
begin
  if auth.uid() is null or v_owner is null
    or coalesce(public.current_workspace_role(), '') not in ('owner', 'member') then
    return query select false, null::numeric, null::numeric, null::numeric, null::numeric, false, false;
    return;
  end if;
  select * into v_m from public.metas_mensais where owner_id=v_owner and mes=v_mes;
  if not found then
    return query select false, null::numeric, null::numeric, null::numeric, null::numeric, false, false;
    return;
  end if;
  with docs as (
    select total::numeric, itens, true as fatura from public.faturas
      where user_id=v_owner and data_emissao>=v_mes and data_emissao<v_limite and status<>'cancelada'
    union all
    select total::numeric, itens, false from public.vendas_rapidas
      where user_id=v_owner and data>=v_mes and data<v_limite
  ), pesos as (
    select d.total, p.t, p.g, p.cv
    from docs d
    cross join lateral (
      select coalesce(sum(w),0) t,
        coalesce(sum(w) filter (where segmento='grafica'),0) g,
        coalesce(sum(w) filter (where segmento='comunicacao_visual'),0) cv
      from (
        select j->>'segmento' as segmento,
          greatest(0,n.base + case when d.fatura then round(n.base*n.imposto/100) else 0 end) as w
        from jsonb_array_elements(case when jsonb_typeof(d.itens)='array' then d.itens else '[]'::jsonb end) as a(j)
        cross join lateral (
          select case when jsonb_typeof(j->'total')='number' then (j->>'total')::numeric else 0 end as base,
                 case when jsonb_typeof(j->'impostoPct')='number' then (j->>'impostoPct')::numeric else 0 end as imposto
        ) n
      ) linhas
    ) p
  ), partes as (
    select total, case when t>0 then round(total*g/t,0) else 0 end as g,
      case when t>0 then round(total*(g+cv)/t,0) else 0 end as classificados
    from pesos
  )
  select coalesce(sum(total),0), coalesce(sum(g),0), coalesce(sum(classificados-g),0),
    coalesce(bool_or(total <> classificados),false)
  into v_t,v_g,v_cv,v_sem from partes;

  return query select true,
    greatest(0::numeric,least(100::numeric,round(v_t*v_m.margem_contribuicao_pct/v_m.custo_fixo_centavos,1))),
    greatest(0::numeric,least(100::numeric,round(
      case when v_m.meta_grafica_centavos is null then v_t * 100 / v_m.meta_faturamento_centavos
      else (v_g+v_cv)*100/(v_m.meta_grafica_centavos+v_m.meta_comunicacao_visual_centavos) end,1))),
    case when v_m.meta_grafica_centavos is not null then
      greatest(0::numeric,least(100::numeric,round(v_g*100/v_m.meta_grafica_centavos,1))) end,
    case when v_m.meta_comunicacao_visual_centavos is not null then
      greatest(0::numeric,least(100::numeric,round(v_cv*100/v_m.meta_comunicacao_visual_centavos,1))) end,
    v_sem, v_m.meta_grafica_centavos is null;
end;
$$;
revoke all on function public.progresso_metas_segmentadas() from public, anon, authenticated;
grant execute on function public.progresso_metas_segmentadas() to authenticated;
commit;
