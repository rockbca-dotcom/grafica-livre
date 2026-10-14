# Auditoria do sistema

**Data:** 14/10/2026
**Escopo:** leitura estática do código, esquema e funções Supabase; execução de lint/build; verificação de dependências via `npm audit`.
**Limite:** não houve acesso às contas de produção, ao projeto Supabase/Vercel ativo, nem dados de clientes. Não foi feito teste invasivo, teste manual de interface em produção ou alteração de código funcional.

## Resumo para decisão

1. O pedido mais urgente continua aberto: um colaborador autenticado consegue acessar o financeiro compartilhado dentro da gráfica.
2. A restauração de backup substitui os dados atuais e não é validada nem transacional no Supabase; uma falha no meio pode deixar dados incompletos.
3. `npm audit` sinaliza cinco dependências com vulnerabilidades classificadas como altas.
4. Lint e build funcionaram. O lint apontou 10 avisos; o build apontou um aviso de arquivos JavaScript grandes. Não existe comando/suíte de teste automatizado configurado.

## Achados priorizados

### AUD-01 — Colaborador tem acesso aos dados financeiros

**Prioridade:** P1 — corrigir antes de apresentar a restrição solicitada como entregue.
**Impacto:** a conta `member` pode abrir Contas a Receber, Contas a Pagar e Relatórios, além de ver indicadores no Dashboard, no PDV, em Faturas e no assistente. Pode ler e escrever os dados compartilhados conforme as operações disponíveis.

**Evidência:** `src/App.tsx` registra essas rotas sem verificação de papel; `src/components/Layout.tsx` filtra apenas a página Equipe, não as financeiras; `AuthContext` não carrega o papel; `DataContext` carrega todas as coleções; `supabase/schema.sql` usa a mesma política RLS de espaço para todos os membros ativos.

**Próximo passo recomendado:** fechar com o cliente o que é financeiro; fornecer o papel no estado da sessão; proteger navegação e rotas; e separar o acesso aos dados no Supabase. Ocultar botões não é suficiente. Os critérios estão em [PRD.md](PRD.md) e a sequência no [ROADMAP.md](ROADMAP.md).

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
**Evidência:** `supabase/functions/assistente-ia/index.ts` monta mensagens e resultados de consulta e os envia a `https://integrate.api.nvidia.com/v1/chat/completions`. A função consulta clientes, orçamentos, faturas e vendas com o JWT da pessoa. O código define limite de mensagens e tamanho, mas a documentação da interface não explica que dados saem do Supabase.

**Próximo passo recomendado:** informar isso antes do uso, permitir desligar/configurar o recurso, revisar termos e retenção com o provedor e limitar as ferramentas pelo papel. Não inserir dados pessoais/sigilosos no assistente enquanto a política da empresa não autorizar.

### AUD-06 — Ações do assistente podem falhar para colaboradores

**Prioridade:** P2 — problema funcional.
**Evidência:** `executeAction` em `supabase/functions/assistente-ia/index.ts` insere cliente, orçamento e venda rápida sem preencher `user_id`. O esquema do banco usa `auth.uid()` como padrão; a política RLS espera o ID do proprietário do espaço. Para um `member`, o usuário autenticado e o proprietário são IDs diferentes, então a gravação tende a ser rejeitada. O adaptador normal da aplicação define explicitamente o ID do espaço.

**Próximo passo recomendado:** gravar com o ID do espaço retornado pela função autorizada e validar ações no fluxo de um proprietário e de um colaborador.

### AUD-07 — Estado `invited` é tratado como autorizado pela política de dados

**Prioridade:** P2 — revisar semântica de convite antes de usar convites pendentes.
**Evidência:** `current_workspace_owner_id()` em `supabase/schema.sql` aceita status `active` **e** `invited`; as políticas RLS das tabelas usam essa função. Assim, uma conta autenticada cuja associação ainda está `invited` pode receber o espaço pela função e consultar os dados antes de a situação passar a ativa. O fluxo atual de criação pela tela Equipe cria o colaborador como ativo imediatamente, então o risco depende da existência de registros/fluxos `invited`.

**Próximo passo recomendado:** permitir acesso aos dados apenas com status `active`; aceitar convite deve primeiro ativar a associação e só depois liberar consultas.

### AUD-08 — Envio de e-mail autenticado, mas sem limites suficientes no backend

**Prioridade:** P2 — endurecimento da integração.
**Evidência:** `supabase/functions/enviar-email/index.ts` exige sessão válida, mas aceita CORS `*`, destinatários separados por vírgula/ponto e vírgula sem validação de formato ou quantidade, corpo HTML livre, `replyTo` e PDF em base64 sem limite de tamanho. Um usuário autenticado pode chamar a função fora da tela. CORS aberto não remove a exigência de JWT, mas não impede abuso por uma conta autenticada comprometida.

**Próximo passo recomendado:** validar e limitar destinatários e tamanho, restringir remetente/resposta, normalizar conteúdo, limitar frequência e registrar resultado sem guardar conteúdo sensível nos logs.

### AUD-09 — Contagem na tela de backup não inclui todas as coleções

**Prioridade:** P3 — correção de clareza.
**Evidência:** `totalRegistros` em `src/pages/Configuracoes.tsx` soma clientes, itens, orçamentos, faturas e contas a pagar, mas não soma pagamentos, vendas rápidas e cards de produção. O JSON exportado inclui essas coleções, então o número exibido é menor do que o conteúdo exportado.

**Próximo passo recomendado:** contar todas as coleções exportadas ou retirar o número.

## Validações executadas

| Verificação | Resultado |
|---|---|
| `npm run lint` | Concluiu com código 0. Emite 10 avisos `react(only-export-components)` em componentes/contexts que também exportam funções auxiliares. |
| `npm run build` | Concluiu com código 0; TypeScript e Vite produziram o bundle. O Vite avisou sobre chunks maiores que 500 KB; bundle principal minificado de aproximadamente 907 KB e chunk PDF de aproximadamente 1,84 MB. |
| `npm audit --audit-level=moderate` | Código 1; cinco vulnerabilidades altas acima. |
| Testes automatizados | Não executados: o projeto não configura framework nem script `test`. |
| Ambiente de produção | Não validado: sem acesso às contas/projetos Supabase e Vercel. |

## Ordem recomendada de correção

1. Tratar AUD-01 e fechar as decisões de FIN-01 com o cliente.
2. Planejar AUD-02 e atualizar dependências em mudança própria, com revisão do lockfile.
3. Corrigir AUD-03 antes de orientar restauração de dados de produção.
4. Corrigir AUD-04 para não prometer recuperação que o app não controla.
5. Revisar AUD-05 a AUD-08 antes de ampliar o uso de equipe/integrações.
6. Corrigir AUD-09 como ajuste pequeno de interface.

Os pedidos do cliente continuam organizados em [ROADMAP.md](ROADMAP.md). Os achados desta auditoria não foram adicionados ao roteiro de pedidos para não misturar necessidades do cliente com manutenção técnica.
