# Gráfica Livre — gestão de gráfica

Sistema de gestão comercial e operacional para gráficas rápidas e empresas de comunicação visual. Reúne em um só lugar o cadastro de produtos e clientes, a criação de orçamentos, as vendas de balcão, o acompanhamento da produção e o controle financeiro. O código deste repositório se chama Gráfica Livre; algumas telas e o assistente ainda exibem a marca GraficaUp Studio.

## Para quem é

Para equipes que precisam sair de anotações e planilhas dispersas e acompanhar o atendimento desde o pedido do cliente até a entrega do material.

## O que o sistema oferece hoje

- **Produtos e clientes:** catálogo, preços e dados de contato centralizados.
- **Orçamentos:** montagem de itens, cálculo de valores, geração de PDF e compartilhamento.
- **Faturas:** conversão de orçamento, registro de pagamentos, PIX e documentos para o cliente.
- **PDV — venda rápida:** registro de vendas de balcão sem abrir orçamento ou iniciar produção.
- **Produção:** quadro de etapas para acompanhar cada trabalho até a entrega.
- **Financeiro e relatórios:** contas a pagar, contas a receber e visão de resultados.
- **Equipe:** contas de proprietário e colaboradores que trabalham nos mesmos dados da gráfica.
- **Assistente opcional:** consultas e propostas de cadastro/lançamento no modo Supabase, com envio de mensagens e resultados consultados ao provedor de IA configurado.

Para entender o que cada tela faz, os dados que guarda e as limitações atuais, consulte [ARQUITETURA.md](ARQUITETURA.md). O resultado da revisão de riscos está em [AUDITORIA.md](AUDITORIA.md).

## Como funciona

O sistema pode ser usado localmente em um navegador ou conectado ao Supabase para login e dados compartilhados entre dispositivos. O modo local não identifica pessoas nem separa permissões. No modo conectado, a conta `owner` representa o proprietário/administrador; a conta `member` representa um colaborador. Hoje ambos os papéis conseguem acessar e editar os dados compartilhados, inclusive o financeiro. A restrição pedida pelo cliente ainda não foi entregue.

## Evolução solicitada pelo cliente

A conversa de 14/10/2026 trouxe dois pedidos para a próxima atualização:

1. Restringir a área financeira ao proprietário/administrador.
2. Destacar no PDV, como favoritos, os produtos mais vendidos e localizar os demais pela busca.

Essas mudanças ainda **não estão implementadas**. O escopo exato da restrição financeira e o comportamento inicial dos favoritos estão registrados como decisões a validar no [PRD](PRD.md). Consulte o [ROADMAP](ROADMAP.md) para a sequência de execução.

## Documentação do projeto

| Documento | Para que serve |
|---|---|
| [PRD.md](PRD.md) | Regras atuais do produto, solicitações, requisitos, decisões e aceite |
| [ROADMAP.md](ROADMAP.md) | Apenas as solicitações do cliente e a sequência para entregá-las |
| [FLUXOGRAMA.md](FLUXOGRAMA.md) | Fluxos atuais e fluxo futuro solicitado, com os estados bem separados |
| [ARQUITETURA.md](ARQUITETURA.md) | Mapa das telas, dados, integrações e componentes do sistema |
| [AUDITORIA.md](AUDITORIA.md) | Achados de segurança/qualidade e validações executadas |
| [AGENTS.md](AGENTS.md) | Regras para quem for alterar o código e o repositório |
| [ACESSOS.md](ACESSOS.md) | Inventário seguro de contas e locais onde credenciais devem ficar |
| [COMO-USAR.md](COMO-USAR.md) | Instalação e guia operacional das telas |
| [DEPLOY.md](DEPLOY.md) | Publicação e configuração do frontend, Supabase e funções |

## Começar e publicar

O guia para instalar e operar está em [COMO-USAR.md](COMO-USAR.md). Os passos para publicar e conectar Supabase e Vercel estão em [DEPLOY.md](DEPLOY.md). Para não especialistas, comece por “Como usar” e leia a seção “Resumo para decisão” da auditoria.

## Stack

React, TypeScript, Vite, Tailwind CSS e Supabase opcional. Os valores monetários são guardados em centavos inteiros. A lista de dependências vulneráveis e as validações atuais estão registradas em [AUDITORIA.md](AUDITORIA.md).

## Licença

[MIT](LICENSE). Este repositório é um fork interno do projeto Gráfica Livre.
