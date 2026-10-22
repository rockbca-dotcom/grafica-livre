# Auditoria do sistema

**Data da revisão inicial:** 14/10/2026. **Atualizações do código:** 15/10/2026 e 22/10/2026.
**Escopo desta revisão:** leitura das mudanças, `npm run lint`, `npm run build`, renderização do comprovante e teste manual local do perfil da empresa e da lista de vendas com dados fictícios.
**Limite:** não houve acesso ao Supabase/Vercel de produção nem dados de clientes. As migrações não foram executadas contra Supabase local ou online; os testes de interface usaram armazenamento local e não simulam `member`. Não foi validada impressão em impressora física.

## Resumo para decisão

1. FIN-01, PDV-01, HIST-01, PDV-02, PDV-03, PDV-04, PDV-05 e EMP-01 estão no código. Histórico, busca/paginação, perfil com Inscrição Estadual e fluxo do comprovante foram conferidos localmente com dados fictícios. Para o modo nuvem, a migração pendente precisa ser aplicada e a RLS/autoria ainda deve ser validada em um banco Supabase.
2. A restauração de backup substitui os dados atuais e não é validada nem transacional no Supabase; uma falha no meio pode deixar dados incompletos.
3. `npm audit` sinaliza cinco dependências com vulnerabilidades classificadas como altas.
4. Lint e build funcionaram. O lint apontou 10 avisos; o build apontou um aviso de arquivos JavaScript grandes. Não existe comando/suíte de teste automatizado configurado.

## Achados priorizados

### AUD-01 — Restrições por papel e histórico do cliente precisam ser aplicados no ambiente online

**Prioridade:** P1 até a implantação; o código local já implementa o escopo confirmado.
**Impacto atual do código:** `member` não vê nem abre as rotas Contas a Receber, Contas a Pagar e Relatórios; Dashboard/PDV ocultam indicadores, mas a lista completa paginada de vendas rápidas é visível. A RLS restringe `contas_pagar` a `owner`, permite que `member` insira vendas se `vendedor_id` corresponder à sessão e permite leitura das vendas do próprio espaço. Faturas, valores e pagamentos permanecem acessíveis conforme a escolha do cliente.

**Evidência no repositório:** papel carregado por `current_workspace_role()`; guardas de rota e menu em `src/App.tsx` e `src/components/Layout.tsx`; indicadores condicionados em Dashboard/PDV; consultas do assistente limitadas por papel; políticas no esquema e nas migrações `20261015120000_favoritos_e_acesso_financeiro.sql`, `20261022120000_historico_pedidos_cliente.sql`, `20261022130000_vendas_rapidas_member_history.sql` e `20261022140000_comprovante_venda_rapida.sql`. O histórico por cliente fica em `src/pages/Clientes.tsx`; lista, busca, autoria e impressão ficam em `src/pages/Pdv.tsx` e `src/lib/reciboVendaRapida.ts`.

**Validação e próximo passo:** os testes locais não simulam RLS nem autoria autenticada. Aplicar as migrações pendentes no Supabase, testar login, inserção com o ID correto e tentativa de ID diferente como `owner` e `member`, e publicar frontend e função `assistente-ia`. A policy de leitura dá acesso às linhas completas de venda, embora a interface exiba a lista resumida e permita imprimir o comprovante. `Contas a Receber` não tem tabela exclusiva: a rota é bloqueada, mas faturas e pagamentos seguem disponíveis para a tela Faturas. Critérios e sequência: [PRD.md](PRD.md) e [ROADMAP.md](ROADMAP.md).

### AUD-02 — `npm audit` encontrou cinco vulnerabilidades altas

**Prioridade:** P1 — revisar a atualização de dependências antes de uma nova publicação pública.
**Comando:** `npm audit --audit-level=moderate` em 14/10/2026. Resultado: cinco vulnerabilidades classificadas como altas; o npm indica correção disponível via `npm audit fix`.

| Pacote resolvido | Versão encontrada | O que o relatório do npm sinaliza |
|---|---:|---|
| `nanoid` | 3.3.15 | Laços prolongados em certas chamadas com tamanhos inválidos. |
| `postcss` | 8.5.16 | Leitura/travessia indevida de arquivos de source map em condições específicas. |
| `react-router` / `react-router-dom` | 7.18.1 | Aviso sobre bypass CSRF no modo RSC. O app verificado é um SPA Vite com `HashRouter`, sem modo RSC identificado; a aplicabilidade desse aviso específico ao fluxo atual precisa ser confirmada ao atualizar. |
| `source-map-js` | 1.2.1 | Possível negação de serviço por processamento de source maps indexados. |

As dependências aparecem como diretas ou transitivas no grafo do projeto; `postcss` e ferramentas de source map são usadas na cadeia de build. Este relatório não prova exploração em produção. Atualizar de forma controlada, revisar o diff do lockfile e repetir `npm audit`, lint e build. Não foi aplicado `npm audit fix` nesta tarefa.

Avisos consultados pelo próprio relatório:
[nanoid 1](https://github.com/advisories/GHSA-28wg-ghj8-5hjv), [nanoid 2](https://github.com/advisories/GHSA-2v37-7h3g-55p8), [PostCSS 1](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp), [PostCSS 2](https://github.com/advisories/GHSA-r28c-9q8g-f849), [React Router](https://github.com/advisories/GHSA-qwww-vcr4-c8h2) e [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

### AUD-03 — Importação de backup pode substituir tudo e terminar pela metade

**Prioridade:** P1 para proteção de dados.
**Evidência:** `src/context/DataContext.tsx` aceita o JSON atual com uma mesclagem simples de valores padrão, sem validar o formato das coleções. `src/data/adapter.ts` apaga as tabelas do espaço e depois reinsere as coleções em chamadas separadas, sem transação única. Se uma exclusão/inserção falhar no meio, os dados podem ficar parciais. A tela avisa que a importação substitui os dados, mas não oferece prévia nem cria uma cópia automática antes da substituição.

**Próximo passo recomendado:** validar versão e estrutura do arquivo, mostrar uma prévia e contagens corretas, criar backup de segurança antes da troca e executar a substituição de modo atômico no servidor. Até lá, exportar e conferir um backup externo antes de importar.

### AUD-04 — Backup automático é afirmado na tela, mas não é implementado pelo app

**Prioridade:** P2 — corrigir a comunicação para evitar falsa expectativa de recuperação.
**Evidência:** `src/pages/Configuracoes.tsx` diz que no Supabase há “backup automático”. No código do app, a exportação é manual; não há rotina que agenda ou verifica backups. O provedor pode oferecer mecanismos próprios conforme projeto/plano, mas o app não consulta nem comprova isso.

**Próximo passo recomendado:** a interface e o guia devem dizer claramente que existe exportação manual e que o responsável precisa configurar/verificar a política de backup do provedor. Manter exportações externas periódicas.

### AUD-05 — Dados e perguntas do assistente são enviados à NVIDIA

**Prioridade:** P2 — decisão de privacidade e controle de acesso.
**Evidência inicial (14/10/2026):** `supabase/functions/assistente-ia/index.ts` monta mensagens e resultados de consulta e os envia a `https://integrate.api.nvidia.com/v1/chat/completions`. A função consulta clientes, orçamentos, faturas e vendas com o JWT da pessoa. O código define limite de mensagens e tamanho; na revisão inicial, os guias ainda não explicavam que dados saem do Supabase.

**Estado em 15/10/2026:** [COMO-USAR.md](COMO-USAR.md) agora informa que mensagens e resultados de consulta são enviados à NVIDIA; as ferramentas de resumo e histórico de venda também são limitadas pelo papel. Continua pendente a revisão de termos e retenção com o provedor e uma decisão de política interna. Não inserir dados pessoais/sigilosos no assistente sem autorização da empresa.

### AUD-06 — Ações do assistente podem falhar para colaboradores

**Prioridade:** P2 — problema funcional.
**Evidência anterior:** `executeAction` inseria cliente, orçamento e venda rápida sem preencher `user_id`, embora a RLS espere o proprietário do espaço para usuários `member`.

**Estado em 15/10/2026:** corrigido no código. As ações agora chamam `current_workspace_owner_id()` e informam `user_id` ao gravar cliente, orçamento ou venda rápida. **Validação pendente:** executar uma ação por papel contra o banco Supabase depois de aplicar a migração.

### AUD-07 — Estado `invited` é tratado como autorizado pela política de dados

**Prioridade:** P2 — revisar semântica de convite antes de usar convites pendentes.
**Evidência anterior:** `current_workspace_owner_id()` aceitava status `active` e `invited`, permitindo que contas pendentes recebessem o ID do espaço para consultar as políticas RLS.

**Estado em 15/10/2026:** corrigido no novo esquema e na migração. `current_workspace_owner_id()` e `current_workspace_role()` aceitam somente associação ativa. A alteração ainda não foi aplicada ao banco online.

### AUD-08 — Envio de e-mail autenticado, mas sem limites suficientes no backend

**Prioridade:** P2 — endurecimento da integração.
**Evidência:** `supabase/functions/enviar-email/index.ts` exige sessão válida, mas aceita CORS `*`, destinatários separados por vírgula/ponto e vírgula sem validação de formato ou quantidade, corpo HTML livre, `replyTo` e PDF em base64 sem limite de tamanho. Um usuário autenticado pode chamar a função fora da tela. CORS aberto não remove a exigência de JWT, mas não impede abuso por uma conta autenticada comprometida.

**Próximo passo recomendado:** validar e limitar destinatários e tamanho, restringir remetente/resposta, normalizar conteúdo, limitar frequência e registrar resultado sem guardar conteúdo sensível nos logs.

### AUD-09 — Contagem na tela de backup não inclui todas as coleções

**Prioridade:** P3 — correção de clareza.
**Evidência:** `totalRegistros` em `src/pages/Configuracoes.tsx` soma clientes, itens, orçamentos, faturas e contas a pagar, mas não soma pagamentos, vendas rápidas e cards de produção. O JSON exportado inclui essas coleções, então o número exibido é menor do que o conteúdo exportado.

**Próximo passo recomendado:** contar todas as coleções exportadas ou retirar o número.

### AUD-10 — Impressão depende do diálogo e do driver da impressora

**Prioridade:** P2 — confirmar o resultado no equipamento de produção.

**Evidência:** o comprovante gera uma página HTML com conteúdo de 88 mm e chama `window.print()`. A escolha do papel contínuo de 88 mm, margens e impressora depende do navegador e do driver instalado no computador.

**Validação e próximo passo:** o HTML do recibo foi conferido e a tela local acionou o fluxo de impressão, mas não havia impressora térmica disponível para validar corte, avanço do papel, alinhamento ou densidade. Na primeira implantação, selecionar 88 mm nas preferências de impressão e conferir um cupom físico. O diálogo continua oferecendo cancelar sem desfazer a venda.

## Validações executadas

| Verificação | Resultado |
|---|---|
| `npm run lint` | Concluiu com código 0. Emite 10 avisos `react(only-export-components)` em componentes/contexts que também exportam funções auxiliares. |
| `npm run build` (14/10 e 15/10) | Concluiu com código 0; TypeScript e Vite produziram o bundle. O Vite avisou sobre chunks maiores que 500 KB; bundle principal minificado de aproximadamente 910 KB e chunk PDF de aproximadamente 1,84 MB. |
| `npm run lint` (22/10) | Concluiu com código 0 após a implementação do histórico; permanecem 10 avisos `react(only-export-components)`. |
| `npm run build` (22/10) | Concluiu com código 0 após a implementação do histórico; permanece aviso de chunk acima de 500 KB. |
| `npm run lint` (22/10, impressão e paginação) | Concluiu com código 0; permanecem os mesmos 10 avisos `react(only-export-components)`. |
| `npm run build` (22/10, impressão e paginação) | Concluiu com código 0; permanecem os avisos de bundle acima de 500 KB. |
| Revalidação conjunta final (22/10): lint, build e `git diff --check` | Os três comandos concluíram com código 0. O lint manteve 10 avisos conhecidos; o build gerou bundle principal de 920 KB e chunk PDF de 1,84 MB, com aviso de tamanho; `git diff --check` não apontou erros de whitespace. |
| Teste manual local de impressão/lista (22/10) | Registrei 11 vendas fictícias, conferi 10 linhas na página 1, 1 na página 2, busca por número e busca sem acento por vendedor; a nova busca voltou à primeira página. A tela mostrou botão de impressão por venda e a confirmação após registro. Não foi testada uma impressora física nem a sessão `member`. |
| Teste manual local de Inscrição Estadual (22/10) | Salvei um valor de teste no Perfil da Empresa, naveguei para outra tela e confirmei que o valor continuou preenchido. |
| Verificação do modelo do comprovante (22/10) | Renderização TypeScript com dados fictícios confirmou largura de conteúdo, CNPJ, IE, cliente, vendedor, número, item, pagamento e total; IE vazia não gera linha no recibo. |
| Teste manual local (22/10) | A tela Clientes mostrou no histórico o orçamento ORC-1 e a venda PDV-20261022-F14AB9 do cliente fictício, com itens, totais, status e datas. Testado no modo local; não valida RLS/Supabase. |
| Teste manual local de PDV-02 (22/10) | O cartão **Últimas vendas rápidas** foi exibido no PDV local com número, data, cliente, pagamento e total. O modo local não simula `member` nem RLS; a visibilidade do colaborador e o acesso ao banco precisam ser confirmados após aplicar a migração no Supabase. |
| `npm audit --audit-level=moderate` | Código 1; cinco vulnerabilidades altas acima. |
| Testes automatizados | Não executados: o projeto não configura framework nem script `test`. |
| Ambiente de produção | Não validado: sem acesso às contas/projetos Supabase e Vercel. |
| Supabase/Edge Function | Migração e RLS não executadas em um projeto Supabase; `deno` e `psql` não estão disponíveis neste ambiente para checagem isolada da função ou do SQL. |
| Docker local | A tentativa desta revisão não encontrou o daemon Docker ativo; nenhum teste com container foi executado. O container registrado na revisão de 15/10 não valida o deploy online. |

## Ordem recomendada de correção

1. Aplicar as migrações desta atualização e publicar a versão revisada; depois conferir os papéis no ambiente real.
2. Planejar AUD-02 e atualizar dependências em mudança própria, com revisão do lockfile.
3. Corrigir AUD-03 antes de orientar restauração de dados de produção.
4. Corrigir AUD-04 na própria tela para não prometer recuperação que o app não controla.
5. Concluir a revisão de privacidade de AUD-05 e validar as correções de AUD-06/AUD-07 no Supabase.
6. Revisar AUD-08 e corrigir AUD-09 como ajuste pequeno de interface.

Os pedidos do cliente continuam organizados em [ROADMAP.md](ROADMAP.md). Os achados desta auditoria não foram adicionados ao roteiro de pedidos para não misturar necessidades do cliente com manutenção técnica.
