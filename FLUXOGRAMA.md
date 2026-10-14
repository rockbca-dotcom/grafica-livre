# Fluxograma do sistema

Este documento separa o comportamento que o código tem hoje do comportamento solicitado para a próxima atualização. A auditoria está em [AUDITORIA.md](AUDITORIA.md); os requisitos estão em [PRD.md](PRD.md).

## 1. Abertura e acesso — comportamento atual

```mermaid
flowchart TD
    A[Pessoa abre o site] --> B{Supabase configurado?}
    B -- Não --> C[Modo local: dados neste navegador]
    C --> C1[Sem login e sem papel individual]
    B -- Sim --> D[Login Supabase]
    D --> E{Sessão válida?}
    E -- Não --> D
    E -- Sim --> F[Aplicação carrega todas as coleções do espaço]
    F --> G[owner e member usam os dados compartilhados]
    G --> H[Financeiro visível hoje para ambos]
    G --> I[Equipe: somente no modo Supabase]
```

### Acesso atual em duas frases

- No modo local, quem usa esse navegador acessa os dados salvos nele; não existe separação entre funcionários.
- No modo Supabase, RLS separa uma gráfica da outra. Dentro da mesma gráfica, `owner` e `member` compartilham os registros, inclusive os financeiros. A função de equipe exige proprietário para cadastrar/revogar/reativar contas.

## 2. Fluxo comercial e de produção — comportamento atual

```mermaid
flowchart LR
    CLI[Cadastro do cliente] --> ORC[Orçamento]
    PROD[Catálogo] --> ORC
    ORC -->|Converter| FAT[Fatura pendente]
    FAT --> PAG[Registrar um ou mais pagamentos]
    FAT -->|Ao faturar| ARTE[Card na etapa Arte]
    ARTE --> IMP[Impressão]
    IMP --> ACA[Acabamento]
    ACA --> PRONTO[Pronto]
    PRONTO --> ENT[Entregue]
    CAT[Catálogo] --> PDV[PDV: montar carrinho]
    PDV --> VENDA[Venda rápida]
    VENDA -. não cria .-> SEM[Sem fatura nem card de produção]
    FAT --> PDF[PDF, PIX, e-mail ou cobrança por WhatsApp]
    ORC --> PDF2[PDF, e-mail ou WhatsApp]
```

O total do orçamento/fatura é calculado em centavos: soma dos itens + impostos por item + frete − desconto. No PDV, o preço unitário é usado quando está preenchido; senão, é usado o preço por m². A venda rápida permite item avulso.

## 3. Pedido financeiro — estado atual e destino

```mermaid
flowchart TD
    MEMBER[member / colaborador] --> ATUAL[Hoje: navegação e dados financeiros liberados]
    OWNER[owner / proprietário] --> HOJE[Hoje: financeiro liberado]
    ATUAL --> PEDIDO[Pedido do cliente: financeiro somente para ADM]
    PEDIDO --> CONF{Definir o que conta como financeiro}
    CONF --> FRONT[Proteger menu e URLs]
    CONF --> DB[Proteger consultas e gravações no Supabase]
    FRONT --> ACCEPT[Aceite com conta colaboradora e acesso direto a URL]
    DB --> ACCEPT
    ACCEPT --> FINAL[Resultado esperado: somente owner acessa o escopo aprovado]
```

**Ainda não é o comportamento publicado.** O cliente pediu restrição da área financeira. A lista mínima proposta está em FIN-01 no PRD; falta confirmar o alcance sobre valores de faturas, pagamentos, Dashboard e PDV. Um menu escondido sem bloqueio de rota e RLS não completa a regra.

## 4. Pedido de favoritos — comportamento atual e destino

```mermaid
flowchart TD
    CAT[Catálogo de produtos] -->|Hoje: ordenar alfabeticamente| TODOS[PDV mostra todos os itens]
    TODOS --> BUSCA[Busca por nome ou descrição]
    BUSCA --> CARRINHO[Selecionar itens para o carrinho]

    NOVO[Com favoritos, após implementação] --> HAS{Há favoritos?}
    HAS -- Sim --> FAV[Destacar os favoritos na abertura do PDV]
    HAS -- Não --> TODOS2[Mostrar todo o catálogo]
    FAV --> SEARCH{Busca digitada?}
    TODOS2 --> SEARCH
    SEARCH -- Sim --> ALL[Busca continua no catálogo inteiro]
    SEARCH -- Não --> SELECT[Escolher produto visível]
    ALL --> SELECT
    SELECT --> CARRINHO2[Adicionar ao carrinho]
```

**Ainda não implementado:** hoje não há campo de favorito. A forma de persistir e se os favoritos serão compartilhados ou individuais precisam ser confirmadas. A gravação da venda e a busca por nome/descrição já existem.

## 5. Como explicar para a equipe

1. Cadastre cliente e produtos.
2. Para um serviço que exige proposta, crie orçamento e envie o PDF.
3. Quando aprovado, converta em fatura; a produção começa automaticamente em Arte.
4. Registre pagamentos na fatura e mova o card conforme o trabalho avança.
5. Para venda simples de balcão, use o PDV; essa venda fica separada de faturas e produção.
6. Hoje, colaborador também consegue ver o financeiro. A equipe deve saber que a restrição pedida ainda não foi implantada.
