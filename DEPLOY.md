# Publicar o sistema online

Documentos relacionados: [arquitetura](ARQUITETURA.md) · [auditoria](AUDITORIA.md) · [PRD e regras de acesso](PRD.md) · [ROADMAP](ROADMAP.md) · [inventário seguro de acessos](ACESSOS.md) · [guia de uso](COMO-USAR.md).

Se você só fizer o deploy do site **sem banco**, cada navegador continua com dados diferentes.
Para a equipe usar de qualquer computador, são duas peças:

1. **Supabase** — login, banco e funções de servidor
2. **Vercel** — publicação do site

Tempo estimado: 20–30 minutos.

## Parte 1 — Banco e login (Supabase)

1. Acesse https://supabase.com e crie uma conta.
2. **New project**:
   - Name: `grafica-livre` (ou o nome da gráfica)
   - Database password: gere uma senha forte e **guarde**
   - Region: a mais próxima da América do Sul (ex.: São Paulo, se aparecer)
3. Espere o projeto ficar `Ready`.
4. Menu **SQL Editor** → **New query**.
5. Em uma instalação nova, abra `supabase/schema.sql`, cole o conteúdo inteiro e clique em **Run**. Em um sistema existente, faça backup e aplique as migrações da seção abaixo, uma por vez e em ordem.
6. Menu **Authentication → Users → Add user → Create new user**.
   - Crie o primeiro usuário, que será o proprietário da gráfica.
   - Marque *Auto Confirm User*.
7. **Authentication → Sign In / Providers → Email**
   - Desligue **Allow new users to sign up**.
   - Assim, somente o proprietário cadastra colaboradores pela seção **Equipe**.
8. Menu **Project Settings → API** (ou **Data API**).
   Anote:
   - **Project URL** → vira `VITE_SUPABASE_URL`
   - **anon public** key → vira `VITE_SUPABASE_ANON_KEY`

## Parte 2 — Site (Vercel)

1. Acesse https://vercel.com e entre com a **mesma conta GitHub** (`rockbca-dotcom`).
2. **Add New → Project** → importe `rockbca-dotcom/grafica-livre`.
3. Framework: **Vite** (deve detectar sozinho).
4. Em **Environment Variables**, cadastre:

   | Nome | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | a Project URL do Supabase |
   | `VITE_SUPABASE_ANON_KEY` | a chave `anon public` |

5. **Deploy**.
6. No fim aparece um endereço tipo `https://grafica-livre-xxxx.vercel.app`.

### Liberar o site no Supabase

No Supabase:

**Authentication → URL Configuration**

- Site URL: `https://SEU-PROJETO.vercel.app`
- Redirect URLs: o mesmo endereço, e também `http://localhost:5173` se ainda for testar no PC.

Salve.

## Parte 3 — Usar

1. Abra o endereço da Vercel.
2. Entre com o e-mail/senha criado no Supabase.
3. Preencha **Perfil da Empresa** da gráfica (no modo nuvem o banco começa vazio).
4. Cadastre itens, clientes e o primeiro orçamento.
5. Acesse **Equipe** e cadastre cada colaborador com nome completo, e-mail, data de nascimento, função e senha inicial.
   O acesso fica ativo imediatamente. Compartilhe a senha com o colaborador por um canal seguro.

Todos os colaboradores cadastrados usam o mesmo link e trabalham nos mesmos dados da gráfica. O proprietário pode revogar e reativar acessos na tela **Equipe**. O sistema cria as contas diretamente no Supabase e não depende do envio de convites por e-mail.

O código da atualização restringe as telas de gestão financeira a `owner`, protege `contas_pagar`, salva favoritos compartilhados e permite a `member` consultar vendas rápidas vinculadas a clientes na área **Clientes → Histórico**. A lista geral do PDV permanece restrita. Em ambiente existente, aplique as migrações pendentes no banco e publique a versão atual do frontend antes de considerar essas regras ativas online. Colaboradores continuam usando faturas, valores, pagamentos e registro de novas vendas no PDV.

### Migrações em uma instalação existente

Se o sistema já está em produção, faça um backup externo e aplique os arquivos ainda não executados em `supabase/migrations/` em ordem temporal no **SQL Editor** antes de publicar o frontend. O histórico deste repositório inclui `20261001212303_multiusuarios.sql`, `20261001213922_proximo_numero_search_path.sql`, `20261001222753_cadastro_manual_colaboradores.sql`, `20261015120000_favoritos_e_acesso_financeiro.sql` e `20261022120000_historico_pedidos_cliente.sql`. A migração de 15/10 adiciona `itens.favorito`, expõe o papel ativo da sessão e restringe `contas_pagar`; a migração de 22/10 permite que `member` leia somente vendas rápidas associadas a clientes, mantendo vendas sem cliente fora da consulta do colaborador e sem liberar alteração/exclusão. Execute apenas migrações ainda não aplicadas, uma por vez, confira o resultado e não repita um arquivo que terminou com erro sem antes conferir o estado do banco.

### Funções de servidor

Publique apenas as funções que a empresa utilizar. Mantenha validação de JWT no gateway Supabase e segredos apenas no ambiente da função.

| Função | Para que serve | Configuração |
|---|---|---|
| `gerenciar-colaboradores` | Criar, revogar ou reativar acesso pela tela Equipe. | `APP_URL` deve apontar para o site publicado. `APP_ALLOWED_ORIGINS` recebe domínios permitidos separados por vírgula. O Supabase injeta `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`; a chave de serviço nunca vai para Vercel ou navegador. |
| `enviar-email` | Mandar orçamento/fatura em PDF por e-mail. | Secret `RESEND_API_KEY`; opcional `EMAIL_REMETENTE`. O remetente precisa ser autorizado/verificado no Resend para entregar a destinatários externos. |
| `assistente-ia` | Responder perguntas sobre os dados e propor cadastros; resumos financeiros e histórico de vendas rápidas ficam restritos ao proprietário. | Secret `NVIDIA_API_KEY`. Mensagens e resultados das consultas são enviados à NVIDIA; só ative depois de aprovar isso na política da empresa. |

Os segredos das funções não devem receber prefixo `VITE_`. Sem o secret ou a função correspondente, o recurso opcional não estará disponível.

### Ordem recomendada para atualizar

1. Exporte o JSON do app para uma pasta segura e confirme a cópia de segurança configurada no Supabase.
2. Leia a versão e aplique as migrações necessárias, uma por vez.
3. Publique/atualize as Edge Functions usadas e confira os secrets.
4. Publique o frontend com as variáveis `VITE_*`.
5. Teste login, cliente e o histórico de um cliente, venda no PDV com e sem cliente, produto, orçamento, PDF, fatura, pagamento e produção. Teste também uma sessão de colaborador, incluindo a leitura de uma venda vinculada e a ausência de venda sem cliente.
6. Registre data e responsável pela publicação sem incluir valores de secrets.

O app faz exportação manual; ele não agenda nem confirma backup automático no Supabase. A importação JSON substitui os dados atuais e tem os riscos descritos em AUD-03 de [AUDITORIA.md](AUDITORIA.md).

## Domínio próprio (opcional)

Na Vercel: **Project → Settings → Domains** → aponte `sistema.suagrafica.com.br`.
Depois atualize a Site URL no Supabase para esse domínio.

## O que não fazer

- Não publique só o site sem as duas variáveis `VITE_*`: volta o modo local.
- Não deixe o cadastro público ligado no Supabase.
- Não use a chave `service_role` no frontend. Só a `anon`.
- Os dados de teste do seu PC **não sobem sozinhos**. Exporte o JSON no modo local e importe no sistema online, se o app tiver essa opção na tela de configurações/backup.
- Não considere as restrições financeiras, favoritos compartilhados e histórico por cliente ativos na nuvem antes de aplicar as migrações pendentes e publicar o frontend desta versão.
- Não ative o assistente sem aprovar o envio de mensagens e resultados do banco ao serviço externo.
