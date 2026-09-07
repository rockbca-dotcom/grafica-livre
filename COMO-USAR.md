# Como usar este sistema (início rápido)

Este repositório é o **fork interno** do [Gráfica Livre](https://github.com/0brunox/grafica-livre),
na conta [rockbca-dotcom](https://github.com/rockbca-dotcom).
Serve para gestão de gráfica rápida: orçamento, produção, fatura/PIX e financeiro.

## O que você precisa

- Computador com Windows, macOS ou Linux
- [Node.js 20 ou superior](https://nodejs.org/) (baixe o LTS)
- Google Chrome ou Edge

Não precisa de banco de dados no começo. O modo local grava tudo no navegador.

## 1. Baixar o código

No terminal, numa pasta de trabalho:

```bash
git clone https://github.com/rockbca-dotcom/grafica-livre.git
cd grafica-livre
npm install
```

## 2. Ligar o sistema

```bash
npm run dev
```

Abra no navegador: **http://localhost:5173**

Na primeira vez o app entra em **modo local** (sem login). Os dados ficam neste computador / neste navegador.

Para desligar, volte ao terminal e pressione `Ctrl+C`.

Atalho: depois da instalação, você também pode usar:

```bash
./start.sh
```

No Windows (PowerShell ou CMD, dentro da pasta do projeto):

```bat
start.bat
```

## 3. Primeiro dia na gráfica

Siga nesta ordem:

1. **Configurações** — nome da gráfica, CNPJ, endereço, telefone, chave PIX e logo.
   Isso entra no PDF do orçamento e da fatura.
2. **Itens** — cadastre o que você vende (banner, lona, adesivo, cartão, flyer).
   Para comunicação visual use preço por m².
3. **Clientes** — cadastre 1 ou 2 clientes reais para testar.
4. **Orçamentos** — crie um orçamento, gere o PDF e envie por WhatsApp.
5. Converta o orçamento em **Fatura**, gere o QR Code PIX e registre o pagamento.
6. Abra **Produção** e mova o job no kanban: arte → impressão → acabamento → pronto → entregue.
7. Veja **Relatórios** e **Financeiro** no fim do dia.

## 4. Backup (obrigatório no modo local)

No modo local os dados moram no `localStorage` do navegador.
Se você limpar o histórico, trocar de Chrome para outro perfil, ou formatar o PC, **perde tudo**.

- Exporte o JSON de backup com frequência (função de backup do próprio sistema).
- Guarde o arquivo numa pasta da empresa / Google Drive / pendrive.
- Para restaurar, use a importação do JSON.

## 5. Quando sair do modo local (vários computadores)

Use o **modo nuvem** com Supabase (plano gratuito):

1. Crie um projeto em https://supabase.com
2. Rode o SQL de `supabase/schema.sql` no SQL Editor
3. Crie os usuários da equipe em Authentication → Users
4. Desligue o cadastro público (*Allow new users to sign up*)
5. Copie `.env.example` para `.env` e preencha:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA-CHAVE-ANON
```

6. Rode de novo `npm run dev` — passa a existir tela de login.

Detalhes completos no [README.md](README.md).

## Limitações deste início

- Modo local = um computador, um navegador.
- Não substitui um ERP fiscal (NF-e, SAT, etc.).
- Projeto original ainda é jovem. Use backup.
- Licença MIT do autor original (Bruno Santos). Mantenha o crédito.

## Repositórios desta conta

| Repo | Função |
|---|---|
| https://github.com/rockbca-dotcom/grafica-livre | Código do sistema (este) |
| https://github.com/rockbca-dotcom/grafica-rapida | Repo privado de onboarding / notas internas |
