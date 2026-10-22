# Acessos e credenciais

Este arquivo é um **inventário**, não um cofre. Não escreva senhas, tokens, chaves de API, códigos de recuperação ou valores reais de `.env` aqui. Guarde esses valores em um gerenciador de senhas da empresa e registre somente o nome/local do cofre.

O sistema e os serviços que precisam de configuração estão descritos em [ARQUITETURA.md](ARQUITETURA.md); os passos de implantação estão em [DEPLOY.md](DEPLOY.md). Esta lista não confirma se a empresa já tem conta ou licença ativa em nenhum provedor.

## O que foi encontrado

A exportação da conversa e os arquivos de documentação descrevem os serviços usados, mas não fornecem senhas válidas para entrar nas contas. Dados pessoais que aparecem nas capturas de tela não são credenciais nem devem ser copiados para este inventário.

| Sistema/conta | Uso | URL ou identificador público | Responsável | Local do segredo | Situação |
|---|---|---|---|---|---|
| GitHub — repositório `rockbca-dotcom/grafica-livre` | Código-fonte | `https://github.com/rockbca-dotcom/grafica-livre` | A preencher | Gerenciador de senhas da empresa | Confirmar responsáveis e acesso. |
| Vercel — projeto que publica o app | Hospedagem do frontend | Confirmar no painel Vercel | A preencher | Gerenciador de senhas da empresa | Confirmar projeto, domínio e membros. |
| Supabase — projeto do sistema | Login, banco e funções de servidor | `VITE_SUPABASE_URL` no ambiente de publicação | A preencher | Gerenciador de senhas da empresa / secrets do Supabase | Confirmar projeto e proprietários. |
| Resend | Envio opcional de e-mails | Conta Resend da empresa | A preencher | Secret `RESEND_API_KEY` no Supabase | Confirmar se o envio de e-mail está ativo. |
| NVIDIA / serviço de IA | Função opcional do assistente | Conta do provedor configurada para a função | A preencher | Secret `NVIDIA_API_KEY` no Supabase | Confirmar se o recurso está ativo. |
| Domínio próprio (se houver) | Endereço público do sistema | A preencher | A preencher | Gerenciador de senhas da empresa | Confirmar registrador e renovação. |

Os endereços de painel e o projeto Supabase/Vercel atualmente implantado precisam ser confirmados por um responsável da empresa. Não foram deduzidos da URL do repositório.

## Nomes de configuração usados pelo projeto

Os nomes abaixo são referências de configuração. **Não preencha este documento com os valores.**

| Nome | Onde configurar | Tratamento |
|---|---|---|
| `VITE_SUPABASE_URL` | Variáveis da Vercel e `.env` local | Endereço do projeto Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Variáveis da Vercel e `.env` local | Chave pública do app; não concede papel administrativo. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secrets de Edge Functions no Supabase | Segredo privilegiado; nunca vai para o frontend, GitHub ou Vercel. |
| `RESEND_API_KEY` | Secrets de Edge Functions no Supabase | Segredo do envio de e-mail. |
| `NVIDIA_API_KEY` | Secrets de Edge Functions no Supabase | Segredo da integração de IA, se utilizada. |
| `APP_URL` / `APP_ALLOWED_ORIGINS` | Ambiente da função no Supabase | Endereços permitidos; não são senhas. |

Arquivos de exemplo sem segredos: `.env.example` e `supabase/functions/.env.example`. Arquivos reais `.env` não devem entrar no Git. Consulte [DEPLOY.md](DEPLOY.md) para os locais de configuração.

## Contas de pessoas

- Proprietário/ADM: conta Supabase com papel `owner`; responsável e login devem ser registrados no cofre, não aqui.
- Colaboradores: papel `member`; cadastrar e revogar pela tela Equipe, compartilhando a senha inicial por canal seguro.
- Senhas são individuais. Não reutilize a senha do proprietário para colaboradores.
- Nenhum e-mail/login visível nas capturas da conversa foi copiado para este arquivo.
- No código atual, `member` não abre Contas a Pagar, Contas a Receber ou Relatórios e não vê indicadores financeiros consolidados; continua usando Faturas e registrando vendas no PDV. Também pode consultar no PDV a lista das últimas vendas rápidas, inclusive vendas de balcão sem cliente, e ver os totais individuais. No Supabase, essa leitura alcança os registros completos da venda do próprio espaço; edição e exclusão continuam indisponíveis. Para essas regras valerem online, as migrações e a publicação descritas em [DEPLOY.md](DEPLOY.md) ainda precisam ser aplicadas.
- O modo local não cria usuários, não tem papel e não compartilha os dados com outro navegador.
- A ativação do assistente envia mensagens e resultados consultados para o serviço externo NVIDIA. O responsável deve registrar se essa integração foi aprovada.

## Rotina de acesso

1. O responsável definido pela empresa mantém as credenciais no cofre e habilita autenticação em dois fatores quando o provedor oferecer.
2. Ao trocar responsáveis, remover acesso de quem saiu e revisar membros do GitHub, Vercel e Supabase.
3. Para uma credencial vazada, revogá-la no provedor, criar outra, atualizar o secret do ambiente e registrar a data da troca sem registrar o valor.
4. Antes de publicar, confirmar que a chave `service_role` e as chaves dos provedores estão somente em secrets de servidor.

## Registro a preencher pela empresa

| Campo | Preenchimento |
|---|---|
| Nome do gerenciador de senhas usado pela empresa | A preencher |
| Responsável principal pelos acessos | A preencher |
| Responsável substituto | A preencher |
| Canal seguro para entregar senha inicial | A preencher |
| Data da última revisão de acesso | A preencher |
