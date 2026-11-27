# Projetos AMEI

A aba Projetos aparece logo abaixo de Faturas para gestores. Permite salvar rascunhos, abrir e exportar fichas JSON no formato do gerador v2, anexar fotos de antes/depois e imprimir a ficha financeira ou de execução. O relatório de execução não inclui preços, despesas, margem nem lucro. As fotos ficam no registro do projeto, com compactação e limite de seis por grupo.

Ao concluir, o gestor vincula um cliente cadastrado e confirma o vencimento e a forma de pagamento. A fatura entra em aberto, a produção entra como entregue e o custo total vai para Contas a Pagar → Pagas em um único lançamento, sem lançar despesas de valor zero. A interface explicita que só se deve usar essa ação quando as despesas já estiverem pagas; ela não efetua pagamentos. Tudo ocorre na mesma transação e repetir a operação retorna a fatura original. O modo local oferece rascunhos, não faturamento.

## Validação antes de publicar

1. Confirmar o Supabase de homologação e o de produção. Não usar uma prévia ligada ao banco real para cadastrar fichas ou faturar testes.
2. Verificar backup atualizado e ensaiar restauração em Supabase compatível antes de migrar produção. Não usar a importação geral de backup do aplicativo como teste de restauração de produção. Para este módulo, o JSON da interface é uma ficha individual, não um backup integral.
3. Em homologação, aplicar apenas a nova migração após conferir o histórico. Ela cria a tabela, políticas e funções da aba, sem reescrever dados existentes.
4. Testar gestor e colaborador, ficha com cliente e fotos, custo fracionário, relatório de execução sem finanças, faturamento, despesa paga, custo zero e reenvio sem duplicação.
5. Após o aceite explícito, aplicar a migração e publicar o frontend. Se precisar reverter, voltar somente o frontend na Vercel e manter a tabela e os lançamentos já feitos. Não dropar a tabela nem excluir faturas ou despesas de clientes para reverter o deploy.
