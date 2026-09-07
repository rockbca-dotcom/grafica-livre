# Publicar o sistema online

Se você só fizer o deploy do site **sem banco**, cada navegador continua com dados diferentes.
Para a equipe usar de qualquer computador, são duas peças:

1. **Supabase** — login + banco (gratuito)
2. **Vercel** — site público (gratuito)

Tempo estimado: 20–30 minutos.

## Parte 1 — Banco e login (Supabase)

1. Acesse https://supabase.com e crie uma conta.
2. **New project**:
   - Name: `grafica-livre` (ou o nome da gráfica)
   - Database password: gere uma senha forte e **guarde**
   - Region: a mais próxima da América do Sul (ex.: São Paulo, se aparecer)
3. Espere o projeto ficar `Ready`.
4. Menu **SQL Editor** → **New query**.
5. Abra o arquivo `supabase/schema.sql` deste repositório, cole o conteúdo inteiro e clique em **Run**.
6. Menu **Authentication → Users → Add user → Create new user**.
   - Crie o e-mail/senha de cada pessoa da equipe.
   - Marque *Auto Confirm User*.
7. **Authentication → Sign In / Providers → Email**
   - Desligue **Allow new users to sign up**.
   - Assim só entra quem você cadastrou.
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
3. Preencha **Configurações** da gráfica de novo (no modo nuvem o banco começa vazio).
4. Cadastre itens, clientes e o primeiro orçamento.

Cada pessoa da equipe usa o mesmo link e o mesmo banco.

## Domínio próprio (opcional)

Na Vercel: **Project → Settings → Domains** → aponte `sistema.suagrafica.com.br`.
Depois atualize a Site URL no Supabase para esse domínio.

## O que não fazer

- Não publique só o site sem as duas variáveis `VITE_*`: volta o modo local.
- Não deixe o cadastro público ligado no Supabase.
- Não use a chave `service_role` no frontend. Só a `anon`.
- Os dados de teste do seu PC **não sobem sozinhos**. Exporte o JSON no modo local e importe no sistema online, se o app tiver essa opção na tela de configurações/backup.
