# Fluxo do Gráfica Livre

**Revisão:** 15/10/2026
**Estado:** comportamento implementado no código; aplicação da migração e publicação online ainda pendentes.
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
```

O menu e a rota bloqueiam as telas financeiras para `member`. RLS libera `contas_pagar` somente a `owner`; em `vendas_rapidas`, o colaborador pode inserir uma venda, mas não ler o histórico. Faturas e pagamentos permanecem compartilhados porque são usados no atendimento e na cobrança.

## 2. O que cada papel enxerga no resumo

```mermaid
flowchart LR
    D[Dashboard] --> O{owner ou modo local?}
    O -- Sim --> FIN[Entradas, saldos, despesas, vencimentos e gráfico]
    O -- Não --> OP[Quantidade/funil de orçamentos e lista operacional]
    P[PDV] --> P2{owner ou modo local?}
    P2 -- Sim --> PFIN[Indicador recebido hoje e totais no histórico]
    P2 -- Não --> PQUIET[Sem indicador nem histórico; venda continua com carrinho e total]
    F[Faturas] --> F1[Valores, status e registro de pagamentos disponíveis]
    A[Assistente] --> A1{owner ou member?}
    A1 -- owner --> A2[Resumo financeiro e consultas do assistente]
    A1 -- member --> A3[Consultas operacionais e faturas; sem resumo consolidado ou histórico do PDV]
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
7. O Dashboard de colaborador mostra o acompanhamento operacional sem entradas, despesas ou saldos financeiros consolidados.

## 6. Limites do modo local e da publicação

- O modo local não sabe quem é proprietário ou colaborador; quem usa o mesmo perfil do navegador vê os mesmos dados.
- No modo Supabase, os papéis `owner` e `member` são carregados da associação ativa da gráfica.
- O bloqueio do acesso de `member` a `contas_pagar` e os favoritos compartilhados precisam da migração SQL descrita em [DEPLOY.md](DEPLOY.md) no banco online.
- Este fluxograma descreve a versão em código. Não significa que o ambiente de produção já recebeu a migração ou o frontend.
