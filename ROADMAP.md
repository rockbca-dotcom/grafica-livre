# ROADMAP — pedidos do cliente

**Estado:** FIN-01 e PDV-01 implementados no código. A solicitação HIST-01 foi confirmada em 22/10/2026 e ainda precisa ser implementada. Conferência manual, migrações do Supabase e publicação continuam pendentes.
**Fonte:** conversa exportada do WhatsApp em 14/10/2026 e nova mensagem do cliente em 22/10/2026.
**Detalhamento e decisões de negócio:** [PRD.md](PRD.md).

## Ordem de execução

### Etapa 0 — Confirmar as regras com o cliente — concluída

- [x] Restringir para `member` Contas a Pagar, Contas a Receber, Relatórios e indicadores financeiros consolidados.
- [x] Manter faturas, seus valores e pagamentos disponíveis para operação; manter a venda no PDV com total para fechamento.
- [x] Definir favoritos compartilhados por toda a gráfica.
- [x] Aplicar papéis no modo Supabase; reconhecer que o modo local não identifica usuários.

**Decisões registradas:** [PRD.md](PRD.md), seção 8.

### Etapa 1 — Restringir a área financeira

- [x] Carregar e disponibilizar o papel `owner`/`member` junto à sessão autenticada.
- [x] Ocultar no menu de `member` as páginas financeiras aprovadas.
- [x] Bloquear as mesmas rotas para `member`, inclusive ao digitar o endereço diretamente.
- [x] Aplicar RLS de `owner` à tabela `contas_pagar`.
- [x] Manter o carregamento operacional para faturas e pagamentos e bloquear Contas a Pagar sem travar os demais dados.
- [x] Ocultar indicadores financeiros do Dashboard/PDV e limitar resumos financeiros do assistente; manter inserção de vendas rápidas e bloquear a leitura do histórico por RLS.
- [x] Manter acesso do `owner` e faturas, valores, pagamentos e venda do PDV para `member`.

**Dependência:** Etapa 0.
**Aceite:** critérios de `FIN-01` em [PRD.md](PRD.md).

### Etapa 2 — Favoritos no catálogo e no PDV

- [x] Usar favoritos compartilhados por toda a gráfica.
- [x] Acrescentar o campo de favorito ao tipo `Item`, ao adaptador local/nuvem e ao esquema/migração do Supabase.
- [x] Fazer itens existentes iniciarem sem favorito, sem perder preço, descrição ou histórico.
- [x] Permitir marcar/desmarcar favorito na tela Produtos.
- [x] Mostrar somente favoritos na abertura do PDV; se não houver nenhum, mostrar todo o catálogo.
- [x] Fazer a busca do PDV encontrar todo o catálogo, inclusive produtos fora dos favoritos.
- [x] Mostrar uma indicação simples para a equipe aprender a favoritar produtos.

**Dependência:** confirmação sobre compartilhamento.
**Aceite:** critérios de `PDV-01` em [PRD.md](PRD.md).

### Etapa 3 — Conferir, documentar e publicar

- [x] Executar `npm run lint` e `npm run build`; ambos concluíram com código 0 (avisos registrados em [AUDITORIA.md](AUDITORIA.md)).
- [ ] Conferir manualmente os cenários de proprietário, colaborador e acesso direto às rotas.
- [ ] Conferir favoritos no modo local e Supabase, inclusive depois de atualizar a tela.
- [ ] Conferir a busca com produtos favoritos e não favoritos e a leitura de itens antigos.
- [x] Sincronizar PRD, README, fluxograma, arquitetura, guias de uso/publicação, inventário de acessos e auditoria com o código e as decisões confirmadas.
- [ ] Aplicar migração do banco e publicar o frontend na ordem registrada no DEPLOY.md.
- [ ] Registrar a data e o responsável pela publicação, sem incluir senhas ou chaves.

### Etapa 4 — Histórico de pedidos por cliente — escopo confirmado; implementação pendente

- [x] Incluir orçamentos e vendas diretas do PDV associados ao cliente.
- [x] Definir que proprietário e colaboradores podem consultar o histórico.
- [x] Manter relatórios, Contas a Pagar e indicadores consolidados restritos conforme FIN-01.
- [ ] Adicionar acesso ao histórico na tela de Clientes e listar registros do cliente do mais recente ao mais antigo.
- [ ] Exibir tipo, data, número, itens, total e status; orçamento convertido deve aparecer uma vez com status faturado.
- [ ] Ajustar RLS para permitir que `member` consulte vendas rápidas associadas a clientes; manter vendas sem cliente fora da leitura do colaborador.
- [ ] Conferir vendas novas e antigas com cliente, vendas sem cliente, orçamentos e orçamentos faturados nos modos local e Supabase.
- [ ] Atualizar fluxograma, arquitetura e guias após a implementação; aplicar migração e publicar a versão atualizada.

**Aceite:** critérios de `HIST-01` em [PRD.md](PRD.md).

## Dependências resumidas

```text
Confirmações do cliente
        ├──> Permissões financeiras no frontend, no assistente e no Supabase
        ├──> Favoritos compartilhados no catálogo e no PDV
        └──> Histórico de pedidos por cliente para owner/member
                 └──> Implementação, validação e publicação pendentes
```

## O que não entra neste roteiro

As imagens de orçamento, cliente e equipe não descrevem uma mudança específica. Não abrir tarefas para refazer essas telas sem uma solicitação objetiva. Novos pedidos devem ser registrados no PRD com fonte, regra e critério de aceite.
