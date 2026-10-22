# PRD — Gráfica Livre

**Status:** FIN-01, PDV-01, HIST-01, PDV-02, PDV-03, PDV-04, PDV-05 e EMP-01 implementados no código. Lint, build e teste manual local concluídos; aplicar a nova migração e validar autoria/RLS no Supabase online ainda está pendente.
**Data da análise:** 14/10/2026; decisões confirmadas em 15/10/2026 e 22/10/2026.
**Fonte principal:** exportação da conversa do WhatsApp “Sistema Gráfica”, incluindo texto, imagens e um vídeo com áudio; solicitações adicionais sobre histórico, vendas rápidas e comprovante térmico recebidas em 22/10/2026.

## 1. Em uma frase

O Gráfica Livre ajuda uma gráfica a registrar clientes e produtos, vender, orçar, faturar, acompanhar a produção e consultar pedidos e vendas por cliente; o código restringe a gestão financeira por papel, mantém favoritos do PDV compartilhados e libera a lista de vendas rápidas para colaboradores, mas a versão online depende das migrações e publicação descritas em [DEPLOY.md](DEPLOY.md).

## 2. Problemas do cliente

1. Colaboradores não devem ter acesso à parte financeira; o proprietário/administrador deve manter esse acesso.
2. O catálogo do PDV está crescendo. A equipe precisa encontrar os produtos mais vendidos rapidamente sem perder a possibilidade de localizar o restante.
3. A equipe precisa consultar, por cliente, os orçamentos e as vendas diretas já feitas para ele.
4. Colaboradores precisam consultar a lista das últimas vendas rápidas, inclusive vendas de balcão sem cliente.
5. A equipe precisa imprimir um comprovante estreito após a venda e reimprimi-lo pela lista.
6. A lista de vendas rápidas precisa de busca e de 10 vendas por página.
7. O comprovante precisa mostrar a Inscrição Estadual da gráfica e quem registrou a venda.

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
| PDV | Registra venda simples de balcão direto como venda rápida. Ela não gera fatura nem card de produção. Cliente é opcional; permite forma de pagamento, observação e item avulso. A lista permite busca, paginação de 10 vendas e impressão de comprovante térmico não fiscal. |
| Produção | Cards caminham por Arte → Impressão → Acabamento → Pronto → Entregue. A tela também pode criar cards manualmente. |
| Contas a pagar | Cada despesa tem descrição, categoria, fornecedor, vencimento, valor e status pendente/paga. Não há controle de parcelas nesta versão. |
| Exclusão de cliente | Excluir cliente não apaga orçamentos ou faturas associados; o documento histórico permanece. |
| Nuvem | Os registros operacionais são compartilhados no espaço da gráfica. RLS separa espaços diferentes, restringe Contas a Pagar e permite que colaboradores consultem o histórico de vendas rápidas da própria gráfica. |

O inventário de módulos, entidades e integrações está em [ARQUITETURA.md](ARQUITETURA.md). Problemas verificados no código estão em [AUDITORIA.md](AUDITORIA.md).

## 4. Evidências e leitura da conversa

| Evidência | O que ela sustenta | Confiança |
|---|---|---|
| Mensagem de texto, 14/10/2026 às 10:23 | “Remover a parte financeira para os usuários deixar apenas para o adm.” | Alta: pedido explícito. |
| Vídeo de tela com áudio, 55 segundos, mostrando o PDV | O catálogo demonstrado tem 51 itens e continua crescendo. O áudio pede destacar/favoritar os produtos que mais saem e encontrar os demais pela pesquisa. | Média: o objetivo é claro; alguns trechos da fala não permitem determinar todos os detalhes da interação. |
| Imagens de orçamento, cadastro de cliente, equipe e ações do orçamento | Contextualizam telas usadas pelo cliente. Não há texto que confirme uma alteração específica nessas telas. | Baixa como pedido; são referências visuais. |
| Captura e pedido para liberar a lista de vendas rápidas | A equipe deve consultar a lista de últimas vendas do PDV, inclusive o total de cada registro. | Alta: pedido explícito do usuário em 22/10/2026. |
| Mensagens e imagens de referência da impressão térmica e da lista | Imprimir após salvar uma venda, reimprimir pela lista, usar papel de 88 mm, pesquisar e exibir 10 vendas por página. | Alta: decisões expressas pelo usuário em 22/10/2026; as imagens orientam o formato visual. |
| Decisões sobre cadastro e autoria | Adicionar Inscrição Estadual ao perfil da gráfica e identificar quem registrou cada nova venda. | Alta: decisões expressas pelo usuário em 22/10/2026. |

Os trechos do áudio que mencionam preço/descrição e a forma exata de ocultar os itens são ambíguos. Não os transformamos em regras adicionais. A pesquisa já existe hoje; o pedido é reduzir a dificuldade causada pela lista extensa.

## 5. Atores e vocabulário

| Termo do cliente | Papel já existente no sistema | Acesso pretendido |
|---|---|---|
| ADM / proprietário | `owner` | Acesso administrativo e financeiro completo. |
| Usuário / colaborador | `member` | Operação da gráfica sem gestão e indicadores financeiros restritos; consulta a lista de vendas rápidas conforme PDV-02. |

Não há um papel `admin` separado no código atual. Esta atualização deve usar `owner` para representar o ADM, a menos que o cliente aprove outra estrutura.

## 6. Requisitos funcionais

### FIN-01 — Restringir a gestão financeira

**Prioridade:** P0
**Origem:** mensagem explícita do cliente.
**Regra confirmada pelo cliente:** restringir gestão e indicadores financeiros a `owner`, mantendo faturas, valores de faturas e operações de pagamento disponíveis para o trabalho diário de `member`.

**Aceite mínimo:**

- O `member` não vê no menu nem acessa diretamente `Contas a Receber`, `Contas a Pagar` e `Relatórios`.
- O Dashboard não mostra ao `member` entradas, saldos, despesas nem próximos vencimentos com valores. No PDV, não mostra indicadores financeiros, mas pode consultar a lista de vendas rápidas e o total individual de cada venda, conforme PDV-02. O carrinho e o registro de venda continuam disponíveis.
- A tabela `contas_pagar` só pode ser lida ou alterada por `owner` via RLS.
- `member` pode inserir vendas no PDV e consultar a lista de vendas rápidas da gráfica, inclusive registros sem cliente, conforme PDV-02.
- A tela Faturas continua disponível para `member`, incluindo valores, status e registrar/remover pagamentos.
- O `member` continua podendo registrar venda no PDV e ver o total do carrinho para concluir a operação.
- O assistente não fornece resumo consolidado financeiro nem listagem de vendas rápidas a `member`; essa restrição do assistente não impede a consulta da lista no PDV.
- O `owner` continua usando os módulos financeiros normalmente.
- Clientes, produtos, orçamentos, faturas e produção continuam operacionais para colaboradores.

**Limite técnico importante:** `Contas a Receber` e Faturas usam as mesmas tabelas de `faturas` e `pagamentos`. Como o cliente autorizou valores e pagamentos na operação de faturas, a restrição dessa tela é aplicada na navegação e na rota; esses registros seguem acessíveis pela API para a tela Faturas. `contas_pagar` continua restrita por RLS. Com PDV-02, `member` consulta todas as vendas rápidas da gráfica, inclusive as sem cliente, mas não pode alterá-las ou excluí-las. Essa permissão de leitura no banco expõe à sessão os campos gravados na linha da venda; a migração está pronta, mas ainda depende de aplicação no banco online.

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

**Implementação:** campo booleano persistido no produto; itens antigos começam desmarcados; estrela de marcação no catálogo; filtro inicial do PDV com busca sobre o catálogo inteiro. Implementado no código; ativação online depende da migração Supabase e publicação.

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
- A ação **Histórico** na lista de Clientes abre a relação; não altera nem duplica os registros originais.
- Vendas rápidas registradas sem cliente não aparecem no histórico de nenhum cliente. Para associar uma nova venda, a equipe seleciona o cliente no PDV antes de registrar.
- Registros antigos que já tenham `clienteId` podem aparecer sem migração de dados; vendas antigas sem cliente não podem ser atribuídas automaticamente.

**Implementação e impacto de acesso:** a interface combina orçamentos e vendas rápidas associadas ao cliente em ordem decrescente de data. A migração `20261022120000_historico_pedidos_cliente.sql` iniciou a permissão de leitura para vendas vinculadas; a solicitação PDV-02 ampliou depois essa permissão para todas as vendas rápidas da gráfica, inclusive sem cliente. A regra final está na migração `20261022130000_vendas_rapidas_member_history.sql`. O modo local não aplica papéis.

### PDV-02 — Mostrar últimas vendas rápidas para colaboradores

**Prioridade:** P1

**Origem:** pedido do usuário em 22/10/2026 para liberar a lista mostrada na captura aos colaboradores.

**Regra:** a lista **Últimas vendas rápidas** do PDV, hoje disponível para `owner`, também deve aparecer para `member`.

**Critérios de aceite:**

- `member` vê no PDV o contador de vendas e consulta a lista paginada das vendas rápidas mais recentes, inclusive vendas de balcão sem cliente; PDV-04 define o limite de 10 por página.
- As colunas visíveis para ambos os papéis são número, data, cliente (ou “Balcão”), forma de pagamento e total.
- A liberação é somente para consulta na interface; `member` não pode editar ou excluir vendas rápidas existentes. O registro de novas vendas permanece disponível.
- Indicadores do Dashboard/PDV, Contas a Pagar, Contas a Receber e Relatórios continuam restritos conforme FIN-01.
- No Supabase, `member` pode ler os registros de venda rápida do seu espaço (`user_id` do proprietário); a política não libera registros de outras gráficas nem operações de escrita além da inserção já permitida.

**Impacto técnico de acesso:** a política RLS concede leitura das linhas completas de `vendas_rapidas` ao membro da gráfica. A tela mostra apenas o resumo acima, mas campos como itens e observações também ficam acessíveis pela API autenticada. A permissão não é limitada a vendas associadas a cliente.

### PDV-03 — Imprimir comprovante térmico da venda rápida

**Prioridade:** P1

**Origem:** solicitação do cliente com exemplos de comprovante e botão de impressão, em 22/10/2026.

**Regra:** depois que a venda for salva, abrir o comprovante em formato de 88 mm para impressão; cada linha da lista também terá uma ação de reimpressão.

**Critérios de aceite:**

- O comprovante tem largura de 88 mm e apresenta a gráfica, CNPJ e Inscrição Estadual quando cadastrados, data, número, indicação “CUPOM NÃO FISCAL”, cliente ou consumidor, vendedor, itens, quantidades, preços, total e forma de pagamento.
- Depois de salvar uma venda pelo PDV, o sistema abre a janela do comprovante e solicita a impressão pelo navegador.
- A lista de vendas rápidas tem um botão para imprimir novamente o comprovante daquela venda.
- Cancelar a janela de impressão não cancela nem apaga a venda já registrada.
- A impressão usa o diálogo e o driver do navegador/computador; não controla a impressora diretamente nem emite documento fiscal.
- Se o navegador bloquear a janela, a venda continua registrada e a pessoa recebe orientação para permitir pop-ups ou usar o botão de reimpressão.
- Na reimpressão, os dados comerciais são da venda salva e os dados cadastrais da gráfica são os atuais do Perfil da Empresa.

### PDV-04 — Pesquisar e paginar a lista de vendas rápidas

**Prioridade:** P1

**Origem:** decisão do cliente em 22/10/2026.

**Regra:** permitir pesquisa na lista completa, mostrando 10 vendas por página, mais recentes primeiro.

**Critérios de aceite:**

- A pesquisa encontra pelo número, data, cliente/balcão, vendedor ou forma de pagamento, sem diferenciar maiúsculas, minúsculas ou acentos.
- São exibidas no máximo 10 vendas por página, com controles anterior/próxima e indicação da página e da quantidade encontrada.
- Uma pesquisa nova retorna à primeira página; resultado vazio tem mensagem clara.
- O botão de impressão aparece em cada venda, independentemente da página.
- A pesquisa não altera os dados nem as permissões atuais de consulta de `owner` e `member`.

### PDV-05 — Registrar o responsável pela venda

**Prioridade:** P1

**Origem:** decisão do cliente em 22/10/2026.

**Regra:** salvar o identificador e uma cópia do nome da pessoa autenticada quando ela registrar uma venda rápida no modo Supabase.

**Critérios de aceite:**

- O nome vem do cadastro de equipe da própria pessoa; se estiver vazio, usa o nome/e-mail da sessão como alternativa.
- O vendedor é gravado junto da venda, mostrado na lista e impresso no comprovante.
- A inserção por `member` só aceita `vendedor_id` igual ao usuário autenticado.
- Vendas antigas sem autoria continuam disponíveis e exibem “Não identificado”; nenhuma pessoa é atribuída por suposição.
- No modo local não há identidade autenticada. A venda continua funcionando e exibe “Não identificado”.
- O identificador é guardado sem chave estrangeira para preservar o registro se a conta do colaborador for removida; o nome salvo é a referência histórica visível.

### EMP-01 — Cadastrar Inscrição Estadual da gráfica

**Prioridade:** P1

**Origem:** decisão do cliente em 22/10/2026 para compor o comprovante térmico.

**Regra:** adicionar campo opcional de Inscrição Estadual no Perfil da Empresa e exibi-lo no comprovante quando preenchido.

**Critérios de aceite:**

- O valor pode ser digitado e salvo sem máscara fixa nem obrigatoriedade.
- O valor persiste nos modos local e Supabase e é preservado em backups antigos/novos.
- Quando não preenchido, o comprovante não mostra uma linha de IE vazia.

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
4. **Histórico por cliente — 22/10/2026:** mostrar orçamentos e vendas diretas do PDV associadas ao cliente para proprietário e colaboradores. Implementado e testado manualmente no modo local; a migração RLS está pronta, mas ainda deve ser aplicada no banco online. Relatórios e indicadores financeiros permanecem restritos.
5. **Lista de vendas rápidas — 22/10/2026:** liberar para colaboradores a lista paginada e o contador total no PDV, incluindo balcão sem cliente e exibindo os totais de cada venda. A decisão posterior define 10 vendas por página; edição e exclusão continuam indisponíveis.
6. **Comprovante térmico — 22/10/2026:** imprimir em largura de 88 mm logo após registrar uma venda e oferecer reimpressão em cada linha da lista. É um comprovante não fiscal e o usuário escolhe a impressora no diálogo do navegador.
7. **Lista de vendas — 22/10/2026:** acrescentar busca por número, data, cliente/balcão, vendedor e pagamento; mostrar 10 vendas por página.
8. **Inscrição Estadual — 22/10/2026:** acrescentar campo opcional ao Perfil da Empresa e mostrá-lo no comprovante quando estiver preenchido.
9. **Vendedor — 22/10/2026:** salvar a identidade e o nome da pessoa autenticada nas vendas novas do modo nuvem. Vendas antigas e o modo local sem login não recebem atribuição presumida.

## 9. Requisitos de segurança e dados

- Aplicar autorização na interface e no banco às coleções de gestão financeira; bloquear URL direta das telas financeiras.
- Aplicar RLS coerente com HIST-01 e PDV-02: `owner` consulta e administra vendas rápidas; `member` pode inserir vendas e ler todas as vendas rápidas do próprio espaço, sem alterar ou excluir registros. A política atualizada está no esquema e na migração `20261022130000_vendas_rapidas_member_history.sql`.
- Não apresentar indicadores consolidados ou dados de Contas a Pagar a `member`. Manter dados de faturas/pagamentos carregados por serem necessários às operações que o cliente preservou.
- Não colocar senhas, chaves de API ou tokens neste PRD nem em `ACESSOS.md`.
- Não reproduzir nos documentos os dados pessoais visíveis nas imagens da conversa.
- Persistir qualquer novo campo de favorito nos dois modos de armazenamento e preservar registros existentes.
- Restringir a autoria enviada por colaborador à identidade da sessão Supabase; preservar vendas antigas com autoria nula.
- Manter Inscrição Estadual opcional e compatível com bancos, armazenamento local e backups existentes.

## 10. Dependências técnicas observadas

- Papel e identidade da sessão: `src/context/AuthContext.tsx` fornece papel `owner`/`member` e sessão Supabase; o cadastro `workspace_members.full_name` identifica o vendedor online.
- Navegação/rotas: `src/components/Layout.tsx` e `src/App.tsx` escondem e protegem as telas de gestão financeira.
- Autorização de dados: RLS restringe `contas_pagar` ao `owner`. Para HIST-01 e PDV-02, `member` pode ler todas as vendas rápidas do próprio espaço, mas não alterar/excluir registros. As tabelas de faturas/pagamentos permanecem compartilhadas conforme a decisão de negócio.
- Produtos e PDV: `src/types.ts`, `src/pages/Itens.tsx`, `src/pages/Pdv.tsx`, `src/lib/reciboVendaRapida.ts`, `src/data/adapter.ts` e o esquema/migração Supabase cobrem favoritos, lista, autoria e impressão.
- Perfil da gráfica: `src/pages/Perfil.tsx`, `src/types.ts`, `src/data/adapter.ts` e o esquema/migração Supabase persistem Inscrição Estadual.
- Histórico do cliente: `src/pages/Clientes.tsx` combina orçamentos e vendas por `clienteId`; a consulta no Supabase também depende da política RLS da migração HIST-01.
- Fluxos locais e em nuvem devem continuar compatíveis.

## 11. Critério de conclusão desta atualização

A atualização estará pronta quando FIN-01, PDV-01, HIST-01, PDV-02, PDV-03, PDV-04, PDV-05 e EMP-01 passarem pelos critérios acima, os dados existentes forem preservados e README, guia, fluxo e roteiro refletirem o comportamento do código. A alteração de código, sozinha, não significa que a migração e o frontend já foram publicados.

Os achados técnicos da auditoria são acompanhados separadamente em [AUDITORIA.md](AUDITORIA.md); eles não são pedidos do cliente nem mudam o escopo do [ROADMAP.md](ROADMAP.md).
