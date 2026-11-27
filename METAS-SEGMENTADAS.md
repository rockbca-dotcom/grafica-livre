# Metas de Gráfica e Comunicação Visual

- Em Produtos, **Tipo do item** continua Produto/Serviço. **Categoria do produto** é Gráfica ou Comunicação Visual. Produtos já cadastrados ficam sem classificação até serem revisados. O custo do produto é um valor cadastral separado, visível e editável apenas pelo gestor. Não altera preço, custo fixo, fatura, despesa ou estoque.
- Quando o item é escolhido no catálogo, a categoria é copiada para a linha do orçamento, da fatura ou do PDV. Essa cópia evita reclassificar o passado ao editar o catálogo. Orçamentos convertidos preservam as linhas. Itens avulsos podem ser classificados ao editar o documento ou ao adicioná-los no PDV. Faturas geradas por Projetos saem sem classificação até o gestor indicar a categoria na fatura.
- Em Metas são configurados dois objetivos monetários. A Meta Total soma os objetivos; o percentual total usa o faturamento classificado dividido pela soma desses objetivos, e não soma os percentuais individuais. Antes de configurar os dois objetivos, a meta mensal anterior continua visível como referência.
- Faturas em aberto e pagas contam por emissão, exceto canceladas. O PDV conta pela data da venda. Uma fatura mista é dividida proporcionalmente às linhas, considerando os impostos por linha e rateando o total final (inclusive frete e desconto). Os arredondamentos conservam o total em centavos. Itens históricos não classificados não são atribuídos automaticamente. Eles ficam no faturamento geral e no ponto de equilíbrio, não nas metas por categoria.
- Na nuvem, valores monetários das metas e custos de produto são restritos à gestão. A equipe consulta apenas os percentuais de progresso da própria gráfica.

## Publicação

A migração é aditiva, sem reclassificação retroativa e sem reescrever dados existentes. Verificar backup atual, testar em banco isolado, aplicar a migração antes de promover o frontend e **não usar a prévia ligada ao Supabase real para escrever dados de teste**. Em caso de rollback, reverter o frontend e manter os dados já salvos. A exportação JSON legada do painel não substitui um backup do Supabase, inclusive para os custos privados.
