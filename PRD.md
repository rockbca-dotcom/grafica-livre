# PRD — Gráfica Livre

**Status:** requisitos organizados; o limite financeiro e o compartilhamento de favoritos precisam de confirmação antes da implementação.
**Data da análise:** 14/10/2026
**Fonte principal:** exportação da conversa do WhatsApp “Sistema Gráfica”, incluindo texto, imagens e um vídeo com áudio.

## 1. Em uma frase

O Gráfica Livre ajuda uma gráfica a registrar clientes e produtos, vender, orçar, faturar, acompanhar a produção e administrar suas finanças; a próxima atualização deve separar o acesso financeiro por papel e tornar o PDV mais rápido para os produtos recorrentes.

## 2. Problemas do cliente

1. Colaboradores não devem ter acesso à parte financeira; o proprietário/administrador deve manter esse acesso.
2. O catálogo do PDV está crescendo. A equipe precisa encontrar os produtos mais vendidos rapidamente sem perder a possibilidade de localizar o restante.

## 3. O que existe hoje

- O app tem papéis de nuvem `owner` e `member`. O primeiro é o proprietário do espaço; o segundo é colaborador.
- As rotas de contas a pagar, contas a receber e relatórios aparecem na navegação e não têm bloqueio por papel.
- As políticas RLS atuais compartilham os registros do espaço com seus membros ativos. A separação por papel ainda não é aplicada aos dados financeiros.
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
| Nuvem | Os registros são compartilhados no espaço da gráfica. RLS separa espaços diferentes, mas hoje não separa permissões por `owner`/`member` dentro do mesmo espaço. |

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
**Regra:** a área financeira deve ficar disponível somente para `owner`.

**Aceite mínimo:**

- O `member` não vê na navegação os módulos financeiros definidos no escopo aprovado.
- Digitar diretamente uma URL financeira não permite abrir os dados ou executar operações sem autorização.
- O servidor/banco rejeita acesso não autorizado aos dados financeiros; esconder os links não basta.
- O `owner` continua usando os módulos financeiros normalmente.
- Clientes, produtos, orçamentos, produção e demais operações aprovadas para colaboradores continuam funcionando.

**Escopo mínimo recomendado, sujeito a confirmação:** restringir `Contas a Receber`, `Contas a Pagar` e `Relatórios`; revisar também valores e indicadores financeiros no Dashboard e no PDV. Manter orçamentos e faturas operacionais para que a equipe possa atender e registrar pedidos.

### PDV-01 — Favoritar produtos de venda frequente

**Prioridade:** P1
**Origem:** fala no vídeo do PDV.
**Regra proposta:** permitir marcar/desmarcar um produto como favorito e usar essa seleção para dar acesso rápido aos itens mais vendidos.

**Aceite proposto:**

- O catálogo de produtos permite marcar e desmarcar favoritos.
- Com favoritos configurados, a tela inicial do PDV destaca somente esses itens.
- A busca continua encontrando qualquer produto do catálogo, favorito ou não.
- Se ainda não houver nenhum favorito, o PDV continua mostrando todos os itens, para não deixar a venda sem catálogo na primeira utilização.
- Favoritos permanecem salvos depois de atualizar a página e em todos os dispositivos no modo nuvem.
- Preços, descrições, orçamentos e demais dados dos produtos não são apagados nem alterados por favoritar.

**Implementação provável:** novo campo persistido no produto; compatibilidade com itens antigos; edição no catálogo; filtro de apresentação no PDV. Confirmar se favoritos são compartilhados por toda a gráfica (recomendado) ou individuais por colaborador.

## 7. Fora do escopo até confirmação

- Bloquear a visualização de preços em orçamentos ou faturas.
- Proibir um colaborador de registrar pagamentos ou vendas no PDV.
- Ocultar valores unitários do catálogo.
- Criar um novo papel `admin` ou alterar o gerenciamento de equipe.
- Criar categorias, relatórios de popularidade ou automação baseada no número de vendas.
- Refazer as telas de orçamento, cliente ou equipe com base apenas nas imagens enviadas.

Esses itens podem afetar o trabalho diário e não estão especificados com clareza na conversa.

## 8. Decisões pendentes

1. **Limite financeiro:** além de `Contas a Receber`, `Contas a Pagar` e `Relatórios`, os colaboradores podem ver indicadores de receita no Dashboard/PDV, valores em faturas e o histórico de pagamentos? Podem registrar pagamentos? Recomendação inicial: esconder a gestão/visão consolidada financeira e manter os valores necessários para fazer orçamentos e faturas.
2. **Favoritos:** a seleção deve ser compartilhada para toda a equipe ou cada pessoa pode montar sua própria lista? Recomendação inicial: compartilhada no catálogo da gráfica.
3. **Modo local:** as regras por papel valem apenas no Supabase, onde existe login. Para controlar equipe, a instalação precisa usar o modo nuvem. Confirme se isso atende.

## 9. Requisitos de segurança e dados

- Aplicar a autorização tanto na interface quanto na API/banco (RLS), incluindo bloqueio de URL direta.
- Não expor dados financeiros pela carga global do app se o papel não tiver permissão.
- Não colocar senhas, chaves de API ou tokens neste PRD nem em `ACESSOS.md`.
- Não reproduzir nos documentos os dados pessoais visíveis nas imagens da conversa.
- Persistir qualquer novo campo de favorito nos dois modos de armazenamento e preservar registros existentes.

## 10. Dependências técnicas observadas

- Papel da sessão: `src/context/AuthContext.tsx` ainda não disponibiliza o papel `owner`/`member` para as telas.
- Navegação/rotas: `src/components/Layout.tsx` e `src/App.tsx` mostram os módulos financeiros sem filtro de papel.
- Autorização de dados: `supabase/schema.sql` permite que membros ativos acessem os registros compartilhados do espaço.
- Produtos e PDV: `src/types.ts`, `src/pages/Itens.tsx`, `src/pages/Pdv.tsx`, `src/data/adapter.ts` e `supabase/schema.sql` são os pontos principais para o favorito.
- Fluxos locais e em nuvem devem continuar compatíveis.

## 11. Critério de conclusão desta atualização

A atualização estará pronta quando o escopo do FIN-01 for confirmado e seus critérios de aceite passarem; o PDV permitir a seleção rápida dos produtos frequentes com pesquisa para todo o catálogo; dados existentes forem preservados; e README, guia, fluxo e roteiro refletirem o comportamento publicado.

Os achados técnicos da auditoria são acompanhados separadamente em [AUDITORIA.md](AUDITORIA.md); eles não são pedidos do cliente nem mudam o escopo do [ROADMAP.md](ROADMAP.md).
