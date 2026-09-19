-- Gráfica Livre — schema do Supabase
-- Execute este arquivo no SQL Editor do seu projeto Supabase.
--
-- Valores monetários são inteiros em CENTAVOS.
-- Itens de orçamento/fatura ficam em coluna JSONB (escrita atômica, sem joins).
-- Todas as tabelas têm user_id preenchido automaticamente com auth.uid()
-- e RLS que restringe cada linha ao seu dono.

create table if not exists public.clientes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null,
  documento text not null default '',
  email text not null default '',
  emails_adicionais jsonb not null default '[]',
  telefone text not null default '',
  endereco text not null default '',
  numero text not null default '',
  complemento text not null default '',
  bairro text not null default '',
  cidade text not null default '',
  estado text not null default '',
  cep text not null default '',
  observacoes text not null default '',
  criado_em timestamptz not null default now()
);

create table if not exists public.itens (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null,
  categoria text not null default 'produto',
  preco_m2 bigint not null default 0,
  preco_unitario bigint not null default 0,
  descricao text not null default ''
);

create table if not exists public.orcamentos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  numero text not null,
  cliente_id uuid not null,
  data date not null,
  validade_dias int not null default 30,
  prazo_entrega text not null default '',
  itens jsonb not null default '[]',
  subtotal bigint not null default 0,
  frete bigint not null default 0,
  imposto_padrao numeric not null default 0,
  desconto bigint not null default 0,
  total bigint not null default 0,
  observacoes text not null default '',
  condicoes_pagamento text not null default '',
  status text not null default 'pendente',
  criado_em timestamptz not null default now()
);

create table if not exists public.faturas (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  numero text not null,
  orcamento_id uuid,
  cliente_id uuid not null,
  data_emissao date not null,
  data_vencimento date not null,
  forma_pagamento text not null default 'pix',
  itens jsonb not null default '[]',
  subtotal bigint not null default 0,
  frete bigint not null default 0,
  imposto_padrao numeric not null default 0,
  desconto bigint not null default 0,
  total bigint not null default 0,
  observacoes text not null default '',
  condicoes_pagamento text not null default '',
  status text not null default 'pendente',
  criado_em timestamptz not null default now()
);

create table if not exists public.pagamentos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fatura_id uuid not null,
  data date not null,
  valor bigint not null default 0,
  forma text not null default 'pix',
  observacao text not null default ''
);

-- Vendas recebidas diretamente no PDV. Não são faturas e não geram produção.
create table if not exists public.vendas_rapidas (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  numero text not null,
  cliente_id uuid,
  data date not null,
  forma_pagamento text not null default 'pix',
  itens jsonb not null default '[]',
  total bigint not null default 0,
  observacao text not null default '',
  criado_em timestamptz not null default now()
);

create table if not exists public.contas_pagar (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  descricao text not null,
  categoria text not null default 'outros',
  fornecedor text not null default '',
  data_vencimento date not null,
  valor bigint not null default 0,
  status text not null default 'pendente',
  data_pagamento date,
  criado_em timestamptz not null default now()
);

-- Kanban de produção
create table if not exists public.producao_cards (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fatura_id uuid,
  cliente_id uuid not null,
  titulo text not null default '',
  etapa text not null default 'arte',
  prazo_entrega text not null default '',
  data_entrega date,
  observacao text not null default '',
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

-- Perfil da empresa: uma linha por usuário
create table if not exists public.empresa (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  nome text not null default '',
  cnpj text not null default '',
  email text not null default '',
  telefone text not null default '',
  website text not null default '',
  endereco text not null default '',
  bairro text not null default '',
  cidade text not null default '',
  estado text not null default '',
  cep text not null default '',
  chave_pix text not null default '',
  logo_data_url text not null default '',
  prefixo_orcamento text not null default 'ORC-',
  proximo_num_orcamento int not null default 1,
  proximo_num_fatura int not null default 1,
  observacoes_padrao_orcamento text not null default '',
  condicoes_pagamento_padrao text not null default ''
);

-- Migrações incrementais: adicionam colunas novas sem recriar as tabelas.
-- Seguro rodar várias vezes.
alter table public.clientes add column if not exists numero text not null default '';
alter table public.clientes add column if not exists complemento text not null default '';
-- Imposto por documento e desconto
alter table public.orcamentos add column if not exists imposto_padrao numeric not null default 0;
alter table public.orcamentos add column if not exists desconto bigint not null default 0;
alter table public.faturas add column if not exists imposto_padrao numeric not null default 0;
alter table public.faturas add column if not exists desconto bigint not null default 0;
-- Texto padrão de observações do orçamento
alter table public.empresa add column if not exists observacoes_padrao_orcamento text not null default '';
-- Condições de pagamento (campo separado das observações)
alter table public.empresa add column if not exists condicoes_pagamento_padrao text not null default '';
alter table public.orcamentos add column if not exists condicoes_pagamento text not null default '';
alter table public.faturas add column if not exists condicoes_pagamento text not null default '';
-- Vários e-mails por cliente (além do principal)
alter table public.clientes add column if not exists emails_adicionais jsonb not null default '[]';

-- Row Level Security: cada usuário só enxerga as próprias linhas
do $$
declare t text;
begin
  foreach t in array array['clientes','itens','orcamentos','faturas','pagamentos','vendas_rapidas','contas_pagar','producao_cards','empresa']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "dono" on public.%I', t);
    execute format(
      'create policy "dono" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- Numeração atômica de documentos (evita ORC-/FAT- duplicados)
-- Antes, o próximo número era lido do cliente, incrementado e regravado
-- (ler-incrementar-gravar). Com duas abas/dispositivos, ambos liam o mesmo
-- contador e geravam o mesmo número (lost update). Esta função incrementa o
-- contador da empresa do usuário de forma ATÔMICA no servidor e devolve o
-- número a ser usado. O INSERT ... ON CONFLICT serializa chamadas concorrentes
-- via lock de linha, garantindo números distintos. Seguro rodar várias vezes.
create or replace function public.proximo_numero_documento(p_tipo text)
returns int
language plpgsql
security invoker
as $$
declare
  v_num int;
begin
  if p_tipo = 'orcamento' then
    insert into public.empresa (user_id, proximo_num_orcamento)
      values (auth.uid(), 2)
      on conflict (user_id) do update
        set proximo_num_orcamento = public.empresa.proximo_num_orcamento + 1
      returning proximo_num_orcamento - 1 into v_num;
  elsif p_tipo = 'fatura' then
    insert into public.empresa (user_id, proximo_num_fatura)
      values (auth.uid(), 2)
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

-- Índices para as consultas mais comuns
create index if not exists idx_orcamentos_cliente on public.orcamentos (user_id, cliente_id);
create index if not exists idx_faturas_cliente on public.faturas (user_id, cliente_id);
create index if not exists idx_faturas_vencimento on public.faturas (user_id, data_vencimento);
create index if not exists idx_pagamentos_fatura on public.pagamentos (user_id, fatura_id);
create index if not exists idx_vendas_rapidas_data on public.vendas_rapidas (user_id, data);
create index if not exists idx_contas_pagar_venc on public.contas_pagar (user_id, data_vencimento);
create index if not exists idx_producao_cards_etapa on public.producao_cards (user_id, etapa, ordem);
