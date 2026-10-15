# Auditoria do sistema

**Data da revisão inicial:** 14/10/2026. **Atualização do código:** 15/10/2026.
**Escopo inicial:** leitura estática do código, esquema e funções Supabase; execução de lint/build; verificação de dependências via `npm audit`. **Revisão desta atualização:** leitura das mudanças, `npm run lint`, `npm run build` e reconstrução do container Docker local.
**Limite:** não houve acesso ao Supabase/Vercel de produção nem dados de clientes. Não foi aplicada migração no banco online nem feito teste manual de interface em produção. O container local não comprova publicação online.

## Resumo para decisão

1. A restrição pedida para colaborador foi implementada no código e tem uma migração pronta; ainda precisa ser aplicada no Supabase online e publicada.
2. A restauração de backup substitui os dados atuais e não é validada nem transacional no Supabase; uma falha no meio pode deixar dados incompletos.
3. `npm audit` sinaliza cinco dependências com vulnerabilidades classificadas como altas.
4. Lint e build funcionaram. O lint apontou 10 avisos; o build apontou um aviso de arquivos JavaScript grandes. Não existe comando/suíte de teste automatizado configurado.

## Achados priorizados

### AUD-01 — Restrição financeira por papel precisa ser aplicada no ambiente online

**Prioridade:** P1 até a implantação; o código local já implementa o escopo confirmado.
**Impacto atual do código:** `member` não vê nem abre as rotas Contas a Receber, Contas a Pagar e Relatórios; Dashboard/PDV ocultam indicadores e histórico de vendas; resumo consolidado do assistente é restrito. RLS restringe `contas_pagar` e a leitura de `vendas_rapidas` a `owner`, mas permite que `member` insira uma venda. Faturas, valores e pagamentos permanecem acessíveis conforme a escolha do cliente.

**Evidência da correção:** papel carregado por `current_workspace_role()`; guardas de rota e menu em `src/App.tsx` e `src/components/Layout.tsx`; indicadores condicionados em Dashboard/PDV; consultas do assistente limitadas por papel; políticas no esquema e na migração `20261015120000_favoritos_e_acesso_financeiro.sql`.

**Próximo passo:** aplicar a migração no banco Supabase existente e publicar o frontend. `Contas a Receber` não tem tabela exclusiva: a rota é bloqueada, mas faturas e pagamentos seguem disponíveis para a tela operacional Faturas, como autorizado pelo cliente. O modo local não separa papéis. Critérios e sequência: [PRD.md](PRD.md) e [ROADMAP.md](ROADMAP.md).

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

## Validações executadas

| Verificação | Resultado |
|---|---|
| `npm run lint` | Concluiu com código 0. Emite 10 avisos `react(only-export-components)` em componentes/contexts que também exportam funções auxiliares. |
| `npm run build` (14/10 e 15/10) | Concluiu com código 0; TypeScript e Vite produziram o bundle. O Vite avisou sobre chunks maiores que 500 KB; bundle principal minificado de aproximadamente 910 KB e chunk PDF de aproximadamente 1,84 MB. |
| `npm audit --audit-level=moderate` | Código 1; cinco vulnerabilidades altas acima. |
| Testes automatizados | Não executados: o projeto não configura framework nem script `test`. |
| Ambiente de produção | Não validado: sem acesso às contas/projetos Supabase e Vercel. |
| Docker local | Imagem reconstruída e container `grafica-livre-web` iniciado em 15/10/2026. Isso valida o container local, não o deploy online. |

## Ordem recomendada de correção

1. Aplicar a migração desta atualização e publicar a versão revisada; depois conferir os papéis no ambiente real.
2. Planejar AUD-02 e atualizar dependências em mudança própria, com revisão do lockfile.
3. Corrigir AUD-03 antes de orientar restauração de dados de produção.
4. Corrigir AUD-04 na própria tela para não prometer recuperação que o app não controla.
5. Concluir a revisão de privacidade de AUD-05 e validar as correções de AUD-06/AUD-07 no Supabase.
6. Revisar AUD-08 e corrigir AUD-09 como ajuste pequeno de interface.

Os pedidos do cliente continuam organizados em [ROADMAP.md](ROADMAP.md). Os achados desta auditoria não foram adicionados ao roteiro de pedidos para não misturar necessidades do cliente com manutenção técnica.
