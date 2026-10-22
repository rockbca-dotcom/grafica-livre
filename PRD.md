# PRD — Gráfica Livre

**Status:** FIN-01 e PDV-01 implementados no código. A nova solicitação HIST-01 foi confirmada em 22/10/2026 e ainda precisa ser implementada. Conferência manual, migrações e publicação online anteriores também estão pendentes.
**Data da análise:** 14/10/2026; decisões confirmadas em 15/10/2026 e 22/10/2026.
**Fonte principal:** exportação da conversa do WhatsApp “Sistema Gráfica”, incluindo texto, imagens e um vídeo com áudio; nova mensagem do cliente recebida em 22/10/2026.

## 1. Em uma frase

O Gráfica Livre ajuda uma gráfica a registrar clientes e produtos, vender, orçar, faturar, acompanhar a produção e administrar suas finanças; o código atual restringe a gestão financeira por papel e agiliza o PDV com favoritos compartilhados, mas a versão online depende da migração e publicação descritas em [DEPLOY.md](DEPLOY.md).

## 2. Problemas do cliente

1. Colaboradores não devem ter acesso à parte financeira; o proprietário/administrador deve manter esse acesso.
2. O catálogo do PDV está crescendo. A equipe precisa encontrar os produtos mais vendidos rapidamente sem perder a possibilidade de localizar o restante.
3. A equipe precisa consultar, por cliente, os orçamentos e as vendas diretas já feitas para ele.

## 3. Comportamento anterior à atualização

- O app tem papéis de nuvem `owner` e `member`. O primeiro é o proprietário do espaço; o segundo é colaborador.
- As rotas de contas a pagar, contas a receber e relatórios apareciam na navegação sem bloqueio por papel.
- As políticas RLS anteriores compartilhavam todos os registros do espaço com membros ativos.
- O PDV lista todos os itens em ordem alfabética. A busca existente procura pelo nome e pela descrição.
- O cadastro do item não tem um campo de favorito.
- No modo local, os dados ficam no navegador e não há identidade por pessoa; portanto, não é possível separar proprietário e colaborador.

### 3.1 Regras atuais do produto

Esta seção registra o comportamento existente para que uma atualização não quebre o trabalho da gráfica.

| Área | Regra atual |
|---|---|
| Dinheiro | O sistema guarda dinheiro em centavos inteiros. O total do documento é a soma dos itens, mais os impostos calculados por item, mais o frete, menos o desconto. |
| Catálogo | Um item pode ter preço unitário e preço por m². No PDV, o preço unitário tem preferência; se estiver vazio/zero, o PDV usa o preço por m². Um produto sem preço não entra pelo catálogo, mas pode ser lançado como item avulso com descrição e valor. |
| Orçamento | Requer cliente e ao menos um item descrito. Pode ter validade, prazo, observações, condições de pagamento, frete, desconto e imposto por item. A aplicação gera número, visualização/PDF e opções de compartilhamento. |
| Conversão | Ao faturar um orçamento, cria uma fatura `pendente`, muda o orçamento para `faturado` e cria card de produção na etapa `Arte`. |
| Fatura | Também pode ser cadastrada diretamente. Tem emissão, vencimento, forma de pagamento, itens e totais. Atraso é calculado com base no vencimento. |
| Recebimento | Pagamentos são registros separados. A soma dos pagamentos altera o status da fatura para `pendente`, `parcial` ou `paga`; uma fatura vencida e ainda pendente/parcial aparece como atrasada. |
| PDV | Registra venda simples de balcão direto como venda rápida. Ela não gera fatura nem card de produção. Cliente é opcional; permite forma de pagamento, observação e item avulso. |
| Produção | Cards caminham por Arte → Impressão → Acabamento → Pronto → Entregue. A tela também pode criar cards manualmente. |
| Contas a pagar | Cada despesa tem descrição, categoria, fornecedor, vencimento, valor e status pendente/paga. Não há controle de parcelas nesta versão. |
| Exclusão de cliente | Excluir cliente não apaga orçamentos ou faturas associados; o documento histórico permanece. |
| Nuvem | Os registros operacionais são compartilhados no espaço da gráfica. RLS separa espaços diferentes; esta atualização acrescenta distinção para Contas a Pagar e telas de gestão financeira. |

O inventário de módulos, entidades e integrações está em [ARQUITETURA.md](ARQUITETURA.md). Problemas verificados no código estão em [AUDITORIA.md](AUDITORIA.md).

## 4. Evidências e leitura da conversa

| Evidência | O que ela sustenta | Confiança |
|---|---|---|
| Mensagem de texto, 14/10/2026 às 10:23 | “Remover a parte financeira para os usuários deixar apenas para o adm.” | Alta: pedido explícito. |
| Vídeo de tela com áudio, 55 segundos, mostrando o PDV | O catálogo demonstrado tem 51 itens e continua crescendo. O áudio pede destacar/favoritar os produtos que mais saem e encontrar os demais pela pesquisa. | Média: o objetivo é claro; alguns trechos da fala não permitem determinar todos os detalhes da interação. |
| Imagens de orçamento, cadastro de cliente, equipe e ações do orçamento | Contextualizam telas usadas pelo cliente. Não há texto que confirme uma alteração específica nessas telas. | Baixa como pedido; são referências visuais. |

Os trechos do áudio que mencionam preço/descrição e a forma exata de ocultar os itens são ambíguos. Não os transformamos em regras adicionais. A pesquisa já existe hoje; o pedido é reduzir a dificuldade causada pela lista extensa.

## 5. Atores e vocabulário

| Termo do cliente | Papel já existente no sistema | Acesso pretendido |
|---|---|---|
| ADM / proprietário | `owner` | Acesso administrativo e financeiro completo. |
| Usuário / colaborador | `member` | Operação da gráfica sem a área financeira restrita. |

Não há um papel `admin` separado no código atual. Esta atualização deve usar `owner` para representar o ADM, a menos que o cliente aprove outra estrutura.

## 6. Requisitos funcionais

### FIN-01 — Restringir a gestão financeira

**Prioridade:** P0
**Origem:** mensagem explícita do cliente.
**Regra confirmada pelo cliente:** restringir gestão e indicadores financeiros a `owner`, mantendo faturas, valores de faturas e operações de pagamento disponíveis para o trabalho diário de `member`.

**Aceite mínimo:**

- O `member` não vê no menu nem acessa diretamente `Contas a Receber`, `Contas a Pagar` e `Relatórios`.
- O Dashboard não mostra ao `member` entradas, saldos, despesas nem próximos vencimentos com valores; o PDV não mostra indicadores nem a lista geral de vendas. A consulta de vendas vinculadas a um cliente é tratada separadamente em HIST-01. O carrinho e o registro de venda continuam disponíveis.
- A tabela `contas_pagar` só pode ser lida ou alterada por `owner` via RLS.
- `member` pode inserir vendas no PDV; a consulta das vendas pelo cliente e os limites para registros sem cliente seguem HIST-01.
- A tela Faturas continua disponível para `member`, incluindo valores, status e registrar/remover pagamentos.
- O `member` continua podendo registrar venda no PDV e ver o total do carrinho para concluir a operação.
- O assistente não fornece resumo consolidado financeiro nem histórico de vendas rápidas a `member`; consultas de faturas para operação permanecem disponíveis.
- O `owner` continua usando os módulos financeiros normalmente.
- Clientes, produtos, orçamentos, faturas e produção continuam operacionais para colaboradores.

**Limite técnico importante:** `Contas a Receber` e Faturas usam as mesmas tabelas de `faturas` e `pagamentos`. Como o cliente autorizou valores e pagamentos na operação de faturas, a restrição dessa tela é aplicada na navegação e na rota; esses registros seguem acessíveis pela API para a tela Faturas. `contas_pagar` continua restrita por RLS. No código atual, só `owner` lê o histórico de `vendas_rapidas`; HIST-01 altera esse acesso para permitir a consulta de vendas vinculadas a clientes por `member`.

### PDV-01 — Favoritar produtos de venda frequente

**Prioridade:** P1
**Origem:** fala no vídeo do PDV.
**Regra confirmada:** permitir marcar/desmarcar favoritos compartilhados por toda a gráfica e usar essa seleção para dar acesso rápido aos itens mais vendidos.

**Critérios de aceite:**

- O catálogo de produtos permite marcar e desmarcar favoritos.
- Com favoritos configurados, a tela inicial do PDV mostra somente esses itens.
- A busca continua encontrando qualquer produto do catálogo, favorito ou não.
- Se ainda não houver nenhum favorito, o PDV continua mostrando todos os itens, para não deixar a venda sem catálogo na primeira utilização.
- Favoritos são compartilhados por todos os membros da gráfica, permanecem salvos após atualizar a página e sincronizam entre dispositivos no modo nuvem.
- Preços, descrições, orçamentos e demais dados dos produtos não são apagados nem alterados por favoritar.

**Implementação:** campo booleano persistido no produto; itens antigos começam desmarcados; estrela de marcação no catálogo; filtro inicial do PDV com busca sobre o catálogo inteiro.

### HIST-01 — Consultar histórico de pedidos por cliente

**Prioridade:** P1

**Origem:** mensagem do cliente em 22/10/2026.

**Regra confirmada:** exibir o histórico de orçamentos e vendas diretas do PDV vinculados ao cliente para todos os papéis da equipe (`owner` e `member`).

**Critérios de aceite:**

- A tela de Clientes oferece acesso a um histórico do cliente selecionado.
- O histórico reúne orçamentos e vendas rápidas cujo `clienteId` corresponda ao cliente selecionado, em ordem da mais recente para a mais antiga.
- Cada linha identifica o tipo, a data, o número e os itens; exibe também total e status quando existirem no registro.
- Um orçamento convertido em fatura aparece uma vez, com o status `faturado`, sem duplicar a entrada.
- `owner` e `member` podem consultar esse histórico no modo Supabase. As telas de relatórios, Contas a Pagar e indicadores financeiros consolidados continuam restritas conforme FIN-01.
- Vendas rápidas registradas sem cliente não aparecem no histórico de nenhum cliente. Para associar uma nova venda, a equipe seleciona o cliente no PDV antes de registrar.
- Registros antigos que já tenham `clienteId` podem aparecer sem migração de dados; vendas antigas sem cliente não podem ser atribuídas automaticamente.

**Impacto de acesso:** hoje a RLS bloqueia a leitura de `vendas_rapidas` para `member`. Para cumprir esta decisão, uma migração deve permitir que colaboradores leiam as vendas rápidas associadas a clientes. Essa permissão de banco torna essas vendas consultáveis pela sessão autenticada, não apenas pelo botão do histórico; vendas sem cliente continuam fora da consulta do colaborador.

## 7. Fora do escopo desta atualização

- Bloquear valores, status e operações de pagamento dentro da tela Faturas.
- Proibir colaborador de registrar pagamentos em Faturas ou vendas no PDV.
- Ocultar preços de produtos e valores de orçamentos/faturas necessários ao atendimento.
- Criar um novo papel `admin` ou alterar o gerenciamento de equipe.
- Criar categorias, relatórios de popularidade ou automação baseada no número de vendas.
- Refazer as telas de orçamento, cliente ou equipe com base apenas nas imagens enviadas.

Os itens acima não fazem parte do escopo confirmado pelo cliente.

## 8. Decisões confirmadas

1. **Financeiro — 15/10/2026:** restringir gestão e indicadores. Bloquear Contas a Pagar, Contas a Receber, Relatórios e indicadores financeiros consolidados para `member`; manter faturas, valores e pagamentos acessíveis para a operação.
2. **Favoritos — 15/10/2026:** lista compartilhada por toda a gráfica.
3. **Modo local:** sem usuário e sem papel individual, não é possível separar acesso por colaborador. A regra por papel se aplica ao modo Supabase; favoritos funcionam também no armazenamento local.
4. **Histórico por cliente — 22/10/2026:** mostrar orçamentos e vendas diretas do PDV associadas ao cliente para proprietário e colaboradores. A leitura de vendas rápidas por `member` precisa ser liberada por migração RLS; relatórios e indicadores financeiros permanecem restritos.

## 9. Requisitos de segurança e dados

- Aplicar autorização na interface e no banco às coleções de gestão financeira; bloquear URL direta das telas financeiras.
- Aplicar RLS coerente com HIST-01: `owner` consulta e administra vendas rápidas; `member` pode inserir vendas e consultar apenas as vendas vinculadas a clientes, sem alterar ou excluir registros nem ler vendas sem cliente.
- Não apresentar indicadores consolidados ou dados de Contas a Pagar a `member`. Manter dados de faturas/pagamentos carregados por serem necessários às operações que o cliente preservou.
- Não colocar senhas, chaves de API ou tokens neste PRD nem em `ACESSOS.md`.
- Não reproduzir nos documentos os dados pessoais visíveis nas imagens da conversa.
- Persistir qualquer novo campo de favorito nos dois modos de armazenamento e preservar registros existentes.

## 10. Dependências técnicas observadas

- Papel da sessão: `src/context/AuthContext.tsx` fornece o papel `owner`/`member` por uma função Supabase.
- Navegação/rotas: `src/components/Layout.tsx` e `src/App.tsx` escondem e protegem as telas de gestão financeira.
- Autorização de dados: RLS restringe `contas_pagar` ao `owner`. Atualmente, só `owner` lê vendas rápidas; para HIST-01, a RLS deverá permitir que `member` leia as vinculadas a clientes e continue sem acesso às não vinculadas. As tabelas de faturas/pagamentos permanecem compartilhadas conforme a decisão de negócio.
- Produtos e PDV: `src/types.ts`, `src/pages/Itens.tsx`, `src/pages/Pdv.tsx`, `src/data/adapter.ts` e `supabase/schema.sql` são os pontos principais para o favorito.
- Fluxos locais e em nuvem devem continuar compatíveis.

## 11. Critério de conclusão desta atualização

A atualização estará pronta quando FIN-01, PDV-01 e HIST-01 passarem pelos critérios acima, os dados existentes forem preservados e README, guia, fluxo e roteiro refletirem o comportamento efetivamente publicado. A alteração de código, sozinha, não significa que a migração e o frontend já foram publicados.

Os achados técnicos da auditoria são acompanhados separadamente em [AUDITORIA.md](AUDITORIA.md); eles não são pedidos do cliente nem mudam o escopo do [ROADMAP.md](ROADMAP.md).
