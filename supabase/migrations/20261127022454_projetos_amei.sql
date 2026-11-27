-- Additive only: does not rewrite existing invoices, expenses or customers.
begin;
create schema if not exists grafica_projetos_privados;
revoke all on schema grafica_projetos_privados from public, anon, authenticated;
grant usage on schema grafica_projetos_privados to authenticated;

create table public.projetos_amei (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  titulo text not null check (char_length(titulo) between 1 and 160),
  cliente_id uuid,
  cliente_nome text not null check (char_length(cliente_nome) <= 160),
  data_projeto date not null,
  referencia text not null check (char_length(referencia) between 1 and 60),
  valor_centavos bigint not null check (valor_centavos between 0 and 999999999),
  custo_centavos bigint not null check (custo_centavos between 0 and 999999999),
  execucao text not null check (char_length(execucao) <= 8000),
  custos jsonb not null,
  fotos jsonb not null,
  versao integer not null default 1 check (versao > 0),
  fatura_id uuid unique,
  fatura_numero text,
  conta_paga_id uuid unique,
  faturado_em timestamptz,
  atualizado_em timestamptz not null default now()
);
create index projetos_amei_lista on public.projetos_amei (user_id, atualizado_em desc, id);
alter table public.projetos_amei enable row level security;
revoke all on public.projetos_amei from public, anon, authenticated;
grant select on public.projetos_amei to authenticated;
create policy projetos_amei_gerencia_le on public.projetos_amei
  for select to authenticated using (
    user_id = (select public.current_workspace_owner_id())
    and (select public.current_workspace_role()) = 'owner'
  );

create function grafica_projetos_privados.salvar(p_id uuid, p_versao integer, p_dados jsonb)
returns public.projetos_amei
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid := public.current_workspace_owner_id();
  v_cliente_id uuid := nullif(p_dados->>'cliente_id', '')::uuid;
  v_cliente text := coalesce(btrim(p_dados->>'cliente_nome'), '');
  v_custos jsonb := p_dados->'custos';
  v_fotos jsonb := p_dados->'fotos';
  v_total bigint;
  v_projeto public.projetos_amei;
begin
  if auth.uid() is null or v_owner is null or public.current_workspace_role() is distinct from 'owner' then
    raise exception 'Apenas a gestão pode salvar projetos.' using errcode = '42501';
  end if;
  if p_versao is null or p_versao < 0
    or jsonb_typeof(v_custos) is distinct from 'array'
    or jsonb_typeof(v_fotos->'antes') is distinct from 'array'
    or jsonb_typeof(v_fotos->'depois') is distinct from 'array'
  then raise exception 'Dados do projeto inválidos.'; end if;
  if jsonb_array_length(v_custos) > 80 or jsonb_array_length(v_fotos->'antes') > 6
    or jsonb_array_length(v_fotos->'depois') > 6
    or octet_length(v_fotos::text) > 2900000
    or octet_length(v_custos::text) > 70000
  then raise exception 'O projeto excede o limite de fotos ou custos.'; end if;
  if exists (
    select 1 from jsonb_array_elements(v_custos) c
    where jsonb_typeof(c->'nome') is distinct from 'string'
      or char_length(c->>'nome') > 160
      or coalesce(c->>'quantidadeCentesimos', '') !~ '^[0-9]{1,7}$'
      or coalesce(c->>'unitarioCentavos', '') !~ '^[0-9]{1,9}$'
  ) then raise exception 'Há itens de custo inválidos.'; end if;
  if exists (
    select 1 from jsonb_array_elements_text((v_fotos->'antes') || (v_fotos->'depois')) f
    where f is null or char_length(f) > 240000 or f !~ '^data:image/jpeg;base64,[a-zA-Z0-9+/]+={0,2}$'
  ) then raise exception 'Há fotos inválidas.'; end if;
  select coalesce(sum(((c->>'quantidadeCentesimos')::bigint * (c->>'unitarioCentavos')::bigint + 50) / 100), 0)
    into v_total from jsonb_array_elements(v_custos) c;
  if v_cliente_id is not null then
    select left(nome,160) into v_cliente from public.clientes where id = v_cliente_id and user_id = v_owner;
    if not found then raise exception 'Selecione um cliente cadastrado nesta gráfica.'; end if;
  end if;
  if p_versao = 0 then
    insert into public.projetos_amei (id,user_id,titulo,cliente_id,cliente_nome,data_projeto,referencia,
        valor_centavos,custo_centavos,execucao,custos,fotos)
      values (p_id,v_owner,btrim(p_dados->>'titulo'),v_cliente_id,v_cliente,(p_dados->>'data_projeto')::date,
        btrim(p_dados->>'referencia'),(p_dados->>'valor_centavos')::bigint,v_total,
        coalesce(p_dados->>'execucao',''),v_custos,v_fotos)
      on conflict (id) do nothing returning * into v_projeto;
  else
    update public.projetos_amei set titulo=btrim(p_dados->>'titulo'),cliente_id=v_cliente_id,cliente_nome=v_cliente,
      data_projeto=(p_dados->>'data_projeto')::date,referencia=btrim(p_dados->>'referencia'),
      valor_centavos=(p_dados->>'valor_centavos')::bigint,custo_centavos=v_total,
      execucao=coalesce(p_dados->>'execucao',''),custos=v_custos,fotos=v_fotos,versao=versao+1,atualizado_em=now()
      where id=p_id and user_id=v_owner and versao=p_versao and faturado_em is null returning * into v_projeto;
  end if;
  if not found then raise exception 'O projeto mudou em outra sessão. Reabra o registro antes de salvar novamente.'; end if;
  return v_projeto;
end;
$$;

create function grafica_projetos_privados.faturar(p_id uuid, p_versao integer, p_vencimento date, p_forma text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid := public.current_workspace_owner_id();
  v_data date := (now() at time zone 'America/Sao_Paulo')::date;
  v_p public.projetos_amei;
  v_fatura uuid := gen_random_uuid();
  v_conta uuid;
  v_numero text;
begin
  if auth.uid() is null or v_owner is null or public.current_workspace_role() is distinct from 'owner' then
    raise exception 'Apenas a gestão pode faturar projetos.' using errcode = '42501';
  end if;

  -- Lock the draft before checking status: concurrent retries return the original result.
  select * into v_p from public.projetos_amei where id=p_id and user_id=v_owner for update;
  if not found then raise exception 'Projeto não encontrado.'; end if;
  if v_p.faturado_em is not null then
    return jsonb_build_object('fatura_numero', v_p.fatura_numero, 'conta_paga_id', v_p.conta_paga_id);
  end if;
  if p_versao is null or v_p.versao <> p_versao then raise exception 'O projeto mudou em outra sessão. Reabra antes de faturar.'; end if;
  if v_p.cliente_id is null or v_p.valor_centavos <= 0
    or p_vencimento is null or p_vencimento < v_data
    or p_forma is null or p_forma not in ('pix','dinheiro','transferencia','boleto','cartao_credito','cartao_debito')
    or not exists (select 1 from public.clientes where id=v_p.cliente_id and user_id=v_owner)
  then raise exception 'Confira o cliente cadastrado, o valor de venda e as condições da fatura.'; end if;
  if exists (select 1 from jsonb_array_elements(v_p.custos) c where (c->>'unitarioCentavos')::bigint > 0
      and (btrim(c->>'nome') = '' or (c->>'quantidadeCentesimos')::bigint = 0))
  then raise exception 'Preencha a descrição e a quantidade dos custos lançados.'; end if;

  v_numero := 'FAT-' || public.proximo_numero_documento('fatura');
  insert into public.faturas (id,user_id,numero,cliente_id,data_emissao,data_vencimento,forma_pagamento,itens,subtotal,total,observacoes,status)
    values (v_fatura,v_owner,v_numero,v_p.cliente_id,v_data,p_vencimento,p_forma,
      jsonb_build_array(jsonb_build_object('itemId',null,'descricao',v_p.titulo,'qtd',1,'largura',0,
        'altura',0,'m2',0,'precoM2',0,'valorUnit',v_p.valor_centavos,'total',v_p.valor_centavos,'impostoPct',0)),
      v_p.valor_centavos,v_p.valor_centavos,'Projeto ' || v_p.referencia,'pendente');
  -- Completed work stays out of the Arte queue, including the existing card recovery flow.
  insert into public.producao_cards (id,user_id,fatura_id,cliente_id,titulo,etapa,data_entrega)
    values (gen_random_uuid(),v_owner,v_fatura,v_p.cliente_id,v_p.titulo,'entregue',v_data);
  if v_p.custo_centavos > 0 then
    v_conta := gen_random_uuid();
    insert into public.contas_pagar (id,user_id,descricao,categoria,data_vencimento,valor,status,data_pagamento)
      values (v_conta,v_owner,'Projeto ' || v_p.referencia || ' · ' || v_p.titulo,'projetos',
        v_data,v_p.custo_centavos,'paga',v_data);
  end if;
  update public.projetos_amei set fatura_id=v_fatura,fatura_numero=v_numero,conta_paga_id=v_conta,
    faturado_em=now(),atualizado_em=now(),versao=versao+1 where id=p_id and user_id=v_owner;
  return jsonb_build_object('fatura_numero',v_numero,'conta_paga_id',v_conta);
end;
$$;

create function public.salvar_projeto_amei(p_id uuid,p_versao integer,p_dados jsonb)
returns public.projetos_amei language sql security invoker set search_path = ''
as $$ select grafica_projetos_privados.salvar(p_id,p_versao,p_dados); $$;
create function public.faturar_projeto_amei(p_id uuid,p_versao integer,p_vencimento date,p_forma text)
returns jsonb language sql security invoker set search_path = ''
as $$ select grafica_projetos_privados.faturar(p_id,p_versao,p_vencimento,p_forma); $$;

revoke all on function grafica_projetos_privados.salvar(uuid,integer,jsonb),
  grafica_projetos_privados.faturar(uuid,integer,date,text),
  public.salvar_projeto_amei(uuid,integer,jsonb), public.faturar_projeto_amei(uuid,integer,date,text)
  from public, anon, authenticated;
grant execute on function grafica_projetos_privados.salvar(uuid,integer,jsonb),
  grafica_projetos_privados.faturar(uuid,integer,date,text),
  public.salvar_projeto_amei(uuid,integer,jsonb), public.faturar_projeto_amei(uuid,integer,date,text)
  to authenticated;
commit;
