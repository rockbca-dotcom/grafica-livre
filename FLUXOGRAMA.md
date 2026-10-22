# Fluxo do Gráfica Livre

**Revisão:** 22/10/2026
**Estado:** FIN-01, PDV-01, HIST-01, PDV-02, PDV-03, PDV-04, PDV-05 e EMP-01 implementados no código. Lint, build e conferência manual do PDV concluídos localmente; o modo local não simula `member` nem autoria autenticada. Aplicar migração, validar RLS/autoria online e publicar ainda estão pendentes.
**Regras detalhadas:** [PRD.md](PRD.md). Este desenho explica o caminho, não substitui os critérios de aceite.

## 1. Abrir o sistema e decidir o acesso

```mermaid
flowchart TD
    A[Pessoa abre o sistema] --> B{Supabase configurado?}
    B -- Não --> L[Modo local no navegador]
    L --> L1[Sem login ou papel individual]
    L1 --> APP[Telas disponíveis neste navegador]
    B -- Sim --> LOGIN[Login Supabase]
    LOGIN --> S{Sessão válida?}
    S -- Não --> LOGIN
    S -- Sim --> R[Consultar associação ativa e papel]
    R --> ROLE{Papel da pessoa}
    ROLE -- owner --> OWNER[Área operacional e gestão financeira]
    ROLE -- member --> MEMBER[Área operacional sem gestão financeira]
    MEMBER --> M1[Contas a Pagar, Contas a Receber e Relatórios bloqueados]
    MEMBER --> M2[Faturas, valores e pagamentos operacionais liberados]
    MEMBER --> M3[Histórico individual por cliente liberado]
```

O menu e a rota bloqueiam as telas financeiras para `member`. RLS libera `contas_pagar` somente a `owner`; em `vendas_rapidas`, o colaborador pode inserir uma venda e consultar o histórico completo do próprio espaço. Faturas e pagamentos permanecem compartilhados porque são usados no atendimento e na cobrança.

### 1.1 O que acontece com uma venda rápida

```mermaid
flowchart TD
    PDV[Abrir PDV] --> CLIENTE{Selecionar cliente?}
    CLIENTE -->|Sim| ASSOCIAR[Associar cliente à venda]
    CLIENTE -->|Não| SEM[Venda de balcão sem cliente]
    ASSOCIAR --> ADD[Montar carrinho e registrar venda]
    SEM --> ADD
    ADD --> USER[Obter vendedor da sessão, se houver login]
    USER --> ROLE{Modo e papel}
    ROLE -->|Local| LOCAL[Salvar no navegador; sem separar usuários]
    ROLE -->|Supabase: owner| OWNER[Inserir e consultar vendas]
    ROLE -->|Supabase: member| MEMBER[Inserir venda; consultar a lista de vendas da gráfica]
    MEMBER --> TOTAL[Ver total do carrinho para concluir]
    ASSOCIAR --> HIST[Venda fica disponível no histórico desse cliente]
    OWNER --> RECEIPT[Salvar venda e abrir comprovante 88 mm]
    MEMBER --> RECEIPT
    LOCAL --> RECEIPT
    RECEIPT --> PRINT[Diálogo de impressão do navegador]
```

No Supabase, a RLS permite ao colaborador consultar as vendas rápidas do próprio espaço, inclusive as vendas sem cliente; não permite alteração ou exclusão. A inserção exige que o ID do vendedor corresponda à sessão autenticada. No modo local, o navegador não identifica quem está usando o sistema, então a venda fica “Não identificado”. Cancelar a janela de impressão não desfaz o registro.

### 1.2 Buscar e reimprimir uma venda

```mermaid
flowchart TD
    LISTA[Lista completa de vendas rápidas] --> PESQ[Pesquisar número, data, cliente/balcão, vendedor ou pagamento]
    PESQ --> RESULT[Ordenar da mais recente para a mais antiga]
    RESULT --> PAGE[Mostrar 10 vendas por página]
    PAGE --> NAV{Selecionar ação}
    NAV -->|Anterior / próxima| PAGE
    NAV -->|Imprimir| REC[Montar comprovante da venda escolhida]
    REC --> DADOS[Usar dados atuais do Perfil da Empresa]
    DADOS --> IMP[Diálogo de impressão do navegador]
```

### 1.3 Consultar pedidos de um cliente

```mermaid
flowchart TD
    CL[Clientes] --> SEL[Escolher o cliente]
    SEL --> ABRIR[Clicar em Histórico]
    ABRIR --> BUSCA[Reunir orçamentos e vendas diretas associados ao cliente]
    BUSCA --> ORD[Ordenar do mais recente ao mais antigo]
    ORD --> EXIBE[Mostrar data, tipo, número, itens, total e status]
    EXIBE --> VAZIO{Há pedidos?}
    VAZIO -->|Sim| CONSULTA[Owner e member consultam a lista]
    VAZIO -->|Não| SEM[Exibir mensagem de histórico vazio]
```

## 2. O que cada papel enxerga no resumo

```mermaid
flowchart LR
    D[Dashboard] --> O{owner ou modo local?}
    O -- Sim --> FIN[Entradas, saldos, despesas, vencimentos e gráfico]
    O -- Não --> OP[Quantidade/funil de orçamentos e lista operacional]
    P[PDV] --> P2{owner ou modo local?}
    P2 -- Sim --> PFIN[Indicador recebido hoje e totais no histórico]
    P2 -- Não --> PQUIET[Sem indicadores; vê últimas vendas com o total de cada uma]
    F[Faturas] --> F1[Valores, status e registro de pagamentos disponíveis]
    A[Assistente] --> A1{owner ou member?}
    A1 -- owner --> A2[Resumo financeiro e consultas do assistente]
    A1 -- member --> A3[Consultas operacionais e faturas; sem resumo consolidado ou listagem geral do PDV]
```

Orçamentos e faturas continuam mostrando os valores necessários para preparar documentos. O total do carrinho também continua visível para a pessoa concluir uma venda.

## 3. Orçamento, fatura e produção

```mermaid
flowchart LR
    CLI[Cadastro do cliente] --> ORC[Orçamento]
    PROD[Catálogo] --> ORC
    ORC -->|Converter| FAT[Fatura pendente]
    FAT --> PAG[Registrar pagamentos]
    FAT -->|Ao faturar| ARTE[Card na etapa Arte]
    ARTE --> IMP[Impressão]
    IMP --> ACA[Acabamento]
    ACA --> PRONTO[Pronto]
    PRONTO --> ENT[Entregue]
    FAT --> PDF[PDF, PIX, e-mail ou cobrança por WhatsApp]
    ORC --> PDF2[PDF, e-mail ou WhatsApp]
```

Um orçamento exige cliente e item descrito. O valor é calculado em centavos. A conversão cria uma fatura e um card de produção; pagamentos ficam ligados à fatura e definem seu status.

## 4. Favoritos e busca no PDV

```mermaid
flowchart TD
    CAT[Equipe marca estrelas no catálogo] --> SH[Favoritos compartilhados e salvos no item]
    SH --> PDV[Abrir PDV]
    PDV --> Q{Digitou uma busca?}
    Q -- Não --> HAS{Existem favoritos?}
    HAS -- Sim --> FAV[Mostrar somente favoritos]
    HAS -- Não --> TODOS[Mostrar todo o catálogo]
    Q -- Sim --> BUSCA[Pesquisar nome/descrição em todo o catálogo]
    FAV --> ITEM[Selecionar item]
    TODOS --> ITEM
    BUSCA --> ITEM
    ITEM --> CART[Adicionar ao carrinho e concluir venda]
```

Marcar um item como favorito não altera preço nem histórico. Se a equipe ainda não marcou nenhum, o PDV continua mostrando todos os itens; quando a pessoa pesquisa, a busca sempre inclui também os não favoritos.

## 5. Passos simples para a equipe

1. O proprietário cadastra produtos e marca com estrela os que saem com frequência.
2. Para achar um desses produtos, a equipe abre o PDV e seleciona um dos favoritos.
3. Para qualquer outro produto, basta pesquisar pelo nome ou pela descrição.
4. O valor e a quantidade da venda continuam no carrinho para finalizar o atendimento.
5. Para um serviço que exige proposta, crie um orçamento, depois converta em fatura e acompanhe o card na Produção.
6. Registre recebimentos na própria fatura. O colaborador não usa Contas a Receber; essa tela e Contas a Pagar ficam para o proprietário.
7. No PDV, proprietário e colaborador pesquisam a lista completa de vendas rápidas e consultam 10 registros por página, incluindo os de balcão; cada registro mostra vendedor e tem botão **Imprimir**.
8. Ao concluir uma venda, o comprovante não fiscal de 88 mm abre para impressão. A pessoa escolhe a impressora no navegador; cancelar a impressão mantém a venda salva.
9. Preencha a Inscrição Estadual em **Perfil da Empresa** para que ela apareça no comprovante.
10. Na lista de Clientes, clique em **Histórico** para consultar orçamentos e vendas associados ao cliente. Ao registrar uma venda no PDV, selecione o cliente para que ela apareça nesse histórico individual.
11. O Dashboard de colaborador mostra o acompanhamento operacional sem entradas, despesas ou saldos financeiros consolidados.

## 6. Limites do modo local e da publicação

- O modo local não sabe quem é proprietário ou colaborador; quem usa o mesmo perfil do navegador vê os mesmos dados.
- No modo Supabase, os papéis `owner` e `member` são carregados da associação ativa da gráfica.
- O bloqueio do acesso de `member` a `contas_pagar`, favoritos compartilhados e permissão de leitura das vendas rápidas dependem das migrações SQL descritas em [DEPLOY.md](DEPLOY.md) no banco online.
- Este fluxograma descreve a versão em código. Não significa que o ambiente de produção já recebeu a migração ou o frontend.
