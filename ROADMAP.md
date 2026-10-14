# ROADMAP — pedidos do cliente

**Estado:** planejamento; ainda não há implementação dos pedidos desta conversa.
**Fonte:** conversa exportada do WhatsApp em 14/10/2026.
**Detalhamento e decisões de negócio:** [PRD.md](PRD.md).

## Ordem de execução

### Etapa 0 — Confirmar as regras com o cliente

- [ ] Definir quais páginas, indicadores e valores são “parte financeira”. Ver perguntas FIN-01 no PRD.
- [ ] Definir se colaboradores podem visualizar preços de faturas e registrar pagamentos.
- [ ] Confirmar se os favoritos do PDV serão compartilhados pela equipe.
- [ ] Confirmar que a restrição de acesso será aplicada no modo nuvem; o modo local não identifica usuários.

**Pronto quando:** respostas registradas no PRD. Não iniciar o bloqueio financeiro até fechar esse limite, pois ele pode afetar atendimento, faturamento e caixa.

### Etapa 1 — Restringir a área financeira

- [ ] Carregar e disponibilizar o papel `owner`/`member` junto à sessão autenticada.
- [ ] Ocultar no menu de `member` as páginas financeiras aprovadas.
- [ ] Bloquear as mesmas rotas para `member`, inclusive ao digitar o endereço diretamente.
- [ ] Aplicar a regra no Supabase/RLS para que uma chamada direta não contorne a interface.
- [ ] Ajustar as consultas/carga de dados para que a falta de acesso a dados financeiros não impeça a operação normal do colaborador.
- [ ] Remover ou controlar os indicadores de valores financeiros conforme o limite aprovado.
- [ ] Manter o acesso completo do `owner` e o acesso operacional que o cliente aprovou para `member`.

**Dependência:** Etapa 0.
**Aceite:** critérios de `FIN-01` em [PRD.md](PRD.md).

### Etapa 2 — Favoritos no catálogo e no PDV

- [ ] Confirmar favoritos compartilhados ou individuais.
- [ ] Acrescentar o campo de favorito ao tipo `Item`, ao adaptador local/nuvem e ao esquema/migração do Supabase.
- [ ] Fazer itens existentes iniciarem sem favorito, sem perder preço, descrição ou histórico.
- [ ] Permitir marcar/desmarcar favorito na tela Produtos.
- [ ] Mostrar os favoritos primeiro/no recorte inicial do PDV; se não houver nenhum, mostrar todos.
- [ ] Fazer a busca do PDV encontrar todo o catálogo, inclusive produtos fora dos favoritos.
- [ ] Mostrar uma indicação simples para a equipe aprender a favoritar produtos.

**Dependência:** confirmação sobre compartilhamento.
**Aceite:** critérios de `PDV-01` em [PRD.md](PRD.md).

### Etapa 3 — Conferir, documentar e publicar

- [ ] Conferir manualmente os cenários de proprietário, colaborador e acesso direto às rotas.
- [ ] Conferir favoritos no modo local e Supabase, inclusive depois de atualizar a tela.
- [ ] Conferir que a busca encontra favoritos e não favoritos e que itens antigos continuam íntegros.
- [ ] Executar os comandos de qualidade documentados no `AGENTS.md` antes da publicação.
- [ ] Atualizar PRD e README com o que foi realmente entregue.
- [ ] Aplicar migração do banco e publicar o frontend na ordem registrada no DEPLOY.md.
- [ ] Registrar a data e o responsável pela publicação, sem incluir senhas ou chaves.

## Dependências resumidas

```text
Confirmações do cliente
        ├──> Permissões financeiras no frontend e no Supabase
        └──> Campo/edição de favorito + filtro de produtos no PDV
                         └──> Conferência manual e publicação
```

## O que não entra neste roteiro

As imagens de orçamento, cliente e equipe não descrevem uma mudança específica. Não abrir tarefas para refazer essas telas sem uma solicitação objetiva. Novos pedidos devem ser registrados no PRD com fonte, regra e critério de aceite.
