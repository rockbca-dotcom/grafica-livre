# Gráfica Livre (fork interno)

Sistema de gestão **gratuito e open source** para gráficas rápidas e comunicação visual:
orçamentos, faturas, produção, financeiro e relatórios — tudo em português, num app só.

> Fork operacional da conta **rockbca-dotcom**, a partir de [0brunox/grafica-livre](https://github.com/0brunox/grafica-livre) (MIT).
> Guia da equipe: **[COMO-USAR.md](COMO-USAR.md)**

![Dashboard](src/assets/screens/dashboard.webp)

## Recursos

- **Orçamentos** com cálculo automático de R$/m², PDF com a sua marca e envio por WhatsApp
- **Faturas** convertidas do orçamento em um clique, com PIX (QR code), pagamentos parciais e guia de remessa para o entregador
- **Produção em kanban**: arte → impressão → acabamento → pronto → entregue, com alerta de prazo
- **Financeiro**: contas a pagar e a receber, fluxo de vencimentos
- **Relatórios**: indicadores do mês e gráficos de recebimentos × despesas
- **Backup**: exporte e importe todos os dados em JSON

> Todos os valores monetários são armazenados em **centavos** (inteiros).

## Começando (modo local — zero configuração)

Requer [Node.js](https://nodejs.org) 20+.

```bash
git clone https://github.com/rockbca-dotcom/grafica-livre.git
cd grafica-livre
npm install
npm run dev
```

No Windows você pode dar dois cliques em `start.bat`.
No Linux/macOS: `chmod +x start.sh && ./start.sh`.

Abra http://localhost:5173 — o app roda em **modo local**, guardando os dados no
localStorage do navegador. Ideal para testar ou para uso individual num único computador.

### Não tem prática com terminal? Use um assistente de IA

Se você tem o [Claude Code](https://claude.com/claude-code) ou o
[Codex](https://openai.com/codex) instalado, não precisa digitar nenhum
comando. Abra o assistente numa pasta vazia e cole isto:

> Instale e rode o sistema do repositório https://github.com/rockbca-dotcom/grafica-livre.
> Clone o projeto, instale as dependências e suba o servidor de desenvolvimento.
> Se eu ainda não tiver o Node.js 20 ou superior, instale antes. Quando estiver
> no ar, me diga o endereço para abrir no navegador.

## Modo nuvem (Supabase — gratuito)

Para acessar de vários dispositivos, com login e dados no banco:

1. Crie um projeto gratuito no [Supabase](https://supabase.com).
2. No **SQL Editor** do projeto, cole e execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Em **Authentication → Users**, crie seu usuário (e-mail/senha).
4. **Desligue o cadastro aberto** em **Authentication → Sign In / Providers → Email**,
   na opção *"Allow new users to sign up"*.
5. Copie `.env.example` para `.env` e preencha com os valores de **Settings → API**:

   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=SUA-CHAVE-ANON
   ```

6. `npm run dev` — agora o app abre com landing page + login.

Os dados de cada usuário são isolados por Row Level Security.

## E-mail de faturas (opcional)

O botão "E-mail" das faturas envia o PDF por e-mail usando uma Edge Function do Supabase
com a API do [Resend](https://resend.com) (tem plano gratuito). Se você não configurar,
tudo funciona normalmente — use WhatsApp ou baixe o PDF.

```bash
supabase functions deploy enviar-email
supabase secrets set RESEND_API_KEY=re_xxx EMAIL_REMETENTE="Sua Gráfica <contato@seudominio.com>"
```

## Deploy

O build é 100% estático (`npm run build` → pasta `dist/`), com roteamento por hash —
funciona em qualquer host estático:

- **Vercel**: importe o repositório, framework "Vite", e configure as duas variáveis `VITE_*`.
- **GitHub Pages**: adicione `base: '/grafica-livre/'` no `vite.config.ts` e publique a `dist/`.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · Supabase (opcional) · pdfmake · Recharts

## Licença

[MIT](LICENSE) © 2026 Bruno Santos (projeto original).
Este fork mantém a mesma licença.
