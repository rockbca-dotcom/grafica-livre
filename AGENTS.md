# Regras do repositório

## Idioma e escrita

- Escreva em português do Brasil em documentação, textos de interface, comentários e mensagens.
- Preserve nomes oficiais de bibliotecas, APIs, comandos, tabelas e identificadores.
- Use linguagem direta e exemplos que possam ser conferidos no código.
- Não descreva como pronto um recurso que esteja apenas no PRD ou no ROADMAP.

## Antes de alterar

1. Leia este arquivo e a parte relevante do [PRD.md](PRD.md).
2. Confirme no código como o fluxo funciona hoje; documentação de requisitos não substitui o comportamento existente.
3. Consulte [ROADMAP.md](ROADMAP.md) para identificar dependências e decisões ainda abertas.
4. Faça a menor alteração que entregue o pedido. Preserve convenções e fluxos já existentes.
5. Não acrescente dependências, camadas ou funcionalidades especulativas.

O [ROADMAP.md](ROADMAP.md) deve conter somente as solicitações do cliente e as etapas para entregá-las. Achados técnicos, riscos e verificações pertencem a [AUDITORIA.md](AUDITORIA.md). Para descrever comportamento existente, confirme primeiro em [ARQUITETURA.md](ARQUITETURA.md) e no código.

## Estrutura do código

- `src/pages/`: telas e rotas funcionais.
- `src/components/`: componentes compartilhados.
- `src/context/`: estado e comandos compartilhados pela aplicação.
- `src/data/`: persistência local/Supabase e conversão entre formatos.
- `src/lib/`: cálculos e funções pequenas sem interface.
- `src/pdf/`: montagem dos documentos PDF.
- `supabase/schema.sql` e `supabase/migrations/`: estrutura e mudanças do banco.
- `supabase/functions/`: operações de servidor que usam segredos ou precisam de confiança no backend.

Ao adicionar uma página, confira as rotas em `src/App.tsx` e a navegação em `src/components/Layout.tsx`. Ao adicionar um campo persistido, confira `src/types.ts`, `src/context/DataContext.tsx`, `src/data/adapter.ts`, o esquema/migrações e a migração de backups quando aplicável.

## Regras de negócio e dados

- Guarde valores monetários como centavos inteiros.
- O banco usa nomes `snake_case`; o modelo TypeScript usa nomes `camelCase`. Faça a conversão no adaptador de dados.
- Preserve os dois modos de persistência: local (`localStorage`) e nuvem (Supabase), salvo se o escopo autorizar remover um deles.
- Os registros na nuvem são compartilhados dentro do espaço da gráfica e protegidos por Row Level Security (RLS).
- Hoje os papéis existentes são `owner` e `member`. No vocabulário do cliente, `owner` equivale ao proprietário/ADM. Não crie um terceiro papel chamado `admin` sem decisão registrada.
- O modo local não identifica pessoas nem oferece separação de permissões. Não alegue que uma regra `owner`/`member` protege uma instalação local.
- Restrição de acesso deve valer na interface e no servidor. Esconder um link sem bloquear rota e dados no banco não é controle de acesso completo.

## Segurança e arquivos do cliente

- Nunca coloque senhas, tokens, chaves privadas ou valores reais de `.env` em código, documentação, commit ou mensagem de erro.
- Use `.env.example` somente com valores fictícios. Segredos de produção ficam nas configurações do provedor ou no cofre de senhas da empresa.
- A chave `service_role` do Supabase e chaves de APIs pertencem somente ao ambiente de servidor; nunca as exponha no frontend.
- Não copie para a documentação dados pessoais visíveis nos anexos da conversa do WhatsApp. Esses anexos são evidência interna e não devem ser incluídos em commits ou publicações.
- Para registrar acessos, mantenha em [ACESSOS.md](ACESSOS.md) apenas responsáveis, identificadores não secretos e a localização do cofre; nunca a senha em si.

## Comandos existentes

```bash
npm ci            # instalar exatamente as dependências do package-lock.json
npm run dev       # iniciar o ambiente local
npm run lint      # análise estática via Oxlint
npm run build     # verificação TypeScript e build de produção
```

O projeto atualmente não define uma suíte automatizada de testes nem o comando `npm test`. Não invente que uma validação foi feita: informe exatamente os comandos executados e os resultados observados.

## Documentação

- [README.md](README.md) explica o produto para clientes e equipe.
- [PRD.md](PRD.md) é a referência para requisitos e regras de negócio acordadas.
- [ROADMAP.md](ROADMAP.md) registra ordem, dependências e estado do trabalho.
- [FLUXOGRAMA.md](FLUXOGRAMA.md) explica os fluxos sem substituir as regras detalhadas do PRD.
- [COMO-USAR.md](COMO-USAR.md) e [DEPLOY.md](DEPLOY.md) orientam operação e publicação.
- [ARQUITETURA.md](ARQUITETURA.md) registra o mapa técnico/funcional atual.
- [AUDITORIA.md](AUDITORIA.md) registra achados verificados, severidade e validações executadas; não declare corrigido algo que apenas esteja recomendado.

Atualize os documentos diretamente relacionados a uma mudança. Os arquivos em `.planning/codebase/` são mapas técnicos gerados e podem ficar desatualizados; confira o código antes de usá-los como evidência.
