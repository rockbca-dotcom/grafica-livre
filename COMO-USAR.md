# Como instalar e usar o sistema

Este guia vale para o código do repositório [Gráfica Livre](https://github.com/rockbca-dotcom/grafica-livre). Ele cobre modo local e modo nuvem. O mapa de funcionalidades está em [ARQUITETURA.md](ARQUITETURA.md); o estado dos pedidos do cliente está em [PRD.md](PRD.md) e [ROADMAP.md](ROADMAP.md).

## Antes de começar

- Computador com Windows, macOS ou Linux.
- Node.js 20.19 ou superior (ou 22.12 ou superior) e npm, conforme os requisitos da versão do Vite usada no projeto.
- Chrome, Edge ou navegador moderno.
- Para várias pessoas e dispositivos: projeto Supabase configurado conforme [DEPLOY.md](DEPLOY.md).

## Instalar e abrir no computador

No terminal:

```bash
git clone https://github.com/rockbca-dotcom/grafica-livre.git
cd grafica-livre
npm ci
npm run dev
```

Abra `http://localhost:5173`. Para encerrar, volte ao terminal e pressione `Ctrl+C`.

Sem `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, o sistema usa modo local. Ele grava no armazenamento do navegador. Não é uma conta individual: outra pessoa usando o mesmo perfil do navegador verá os mesmos dados.

## Preparar a gráfica pela primeira vez

Faça nesta ordem:

1. **Perfil da Empresa:** cadastre nome, documento, endereço, telefone, e-mail, PIX e logo. Esses dados podem aparecer nos PDFs.
2. **Produtos:** cadastre serviços e produtos, preço por unidade e/ou por m², e descrição. Marque a estrela dos itens que a equipe vende com frequência. O PDV usa primeiro o preço unitário; sem favoritos, ele mostra o catálogo inteiro.
3. **Clientes:** cadastre nome, documento e meios de contato.
4. **Orçamentos:** selecione um cliente, adicione itens, confira imposto, frete, desconto, prazo e termos. Gere o PDF ou compartilhe.
5. **Faturas:** converta um orçamento aprovado ou crie uma fatura diretamente. Informe vencimento e forma de pagamento.
6. **Produção:** ao faturar, o sistema cria um card na coluna Arte. Mova-o por Impressão, Acabamento, Pronto e Entregue. Você também pode criar cards manuais.
7. **Recebimentos e despesas:** registre os pagamentos de faturas em Contas a Receber e cadastre os gastos em Contas a Pagar.
8. **Relatórios:** selecione período e aba; use Exportar CSV para baixar a visão apresentada.

## O que cada área faz

| Área do menu | Uso prático |
|---|---|
| Dashboard | O proprietário vê entradas, saldos, despesas e vencimentos. O colaborador vê o funil e a quantidade de orçamentos, sem indicadores financeiros consolidados. |
| Orçamentos | Criar/editar, pesquisar, filtrar, duplicar, gerar PDF, enviar e-mail/WhatsApp e converter em fatura. |
| Faturas | Acompanhar cobrança, gerar PDF/guia, PIX, enviar e-mail/WhatsApp, registrar recebimento e excluir. |
| PDV — Venda rápida | Registrar venda sem orçamento. Na abertura, aparecem os favoritos compartilhados; se não houver nenhum, aparecem todos os produtos. A busca procura o catálogo inteiro. Escolha produtos, quantidades e pagamento; o carrinho mostra o total para finalizar a venda. |
| Produção | Acompanhar e mover serviços por cinco etapas. Cards vinculados à fatura exibem o cliente e os dados do trabalho. |
| Contas a Receber | Proprietário: ver saldos, vencimentos e preparar cobrança. Colaborador: use Faturas para consultar valores e registrar/remover pagamentos. |
| Contas a Pagar | Proprietário cadastra despesa e vencimento, marca como paga, edita ou exclui. |
| Clientes / Produtos | Manter os cadastros usados por orçamento, fatura e PDV. |
| Relatórios | Proprietário consulta vendas, fluxo de caixa e resultado por cliente; exporta CSV. |
| Perfil da Empresa | Editar os dados usados nos documentos e na cobrança PIX. |
| Equipe | No modo nuvem, proprietário cria e administra os acessos dos colaboradores. |
| Configurações | Exportar/importar JSON e verificar se está no modo local ou nuvem. |

## Login, proprietário e equipe

O modo nuvem precisa do Supabase. Há dois papéis no código:

- `owner`: dono/administrador da gráfica.
- `member`: colaborador.

O proprietário cria contas pela tela Equipe. A senha inicial é definida no cadastro e deve ser entregue por canal seguro. A criação exige nome, e-mail, data de nascimento, função e senha. O acesso fica ativo imediatamente. O proprietário também pode revogar ou reativar uma conta.

No modo Supabase, apenas `owner` abre Contas a Receber, Contas a Pagar e Relatórios. A tabela de despesas também é restrita no banco. O colaborador mantém acesso a Faturas, valores e pagamentos para executar o atendimento. No modo local, não há login nem controle de papel; quem usa o mesmo navegador vê os mesmos dados.

## Backup, exportação e restauração

- Na tela Configurações, **Exportar backup** baixa um JSON manual com as coleções do espaço atual.
- No modo local, o backup fica no computador até você guardá-lo em outro lugar. Se limpar os dados do navegador ou perder o computador, a aplicação não consegue recuperá-los sozinha.
- No modo nuvem, o app também permite exportar JSON, mas o backup é manual. Verifique separadamente a política de cópias de segurança do projeto Supabase; o app não agenda nem confirma snapshots.
- **Importar substitui os dados atuais** do espaço e não é uma operação aditiva. Antes de importar, exporte um backup separado e confira o arquivo. A restauração atual não valida completamente o formato e, no Supabase, uma falha durante a substituição pode deixar os registros incompletos. Consulte AUD-03 em [AUDITORIA.md](AUDITORIA.md).
- O número de registros exibido na tela Configurações não conta pagamentos, vendas rápidas e cards de produção; não use esse número para conferir se um backup está completo.

Um backup contém dados de clientes e da empresa. Guarde-o em pasta protegida e restrinja quem pode baixá-lo.

## Recursos que enviam dados para fora

- **E-mail:** o documento PDF e os dados informados são enviados ao Resend pelo servidor.
- **Assistente:** as mensagens e os resultados dos dados consultados são enviados ao provedor NVIDIA configurado. Não informe senhas, dados bancários ou informações pessoais desnecessárias.
- **WhatsApp:** o navegador abre o WhatsApp com um texto preenchido; a pessoa revisa e confirma o envio.
- **CEP:** a consulta de endereço chama um serviço externo.

O assistente é opcional. A empresa deve autorizar o uso de serviços externos para dados de clientes conforme suas regras de privacidade.

## Limites do produto

- Não emite nota fiscal e não substitui ERP fiscal.
- Não controla estoque, compras, conciliação bancária ou caixa separado por operador.
- A migração `20261015120000_favoritos_e_acesso_financeiro.sql` precisa ser aplicada ao banco Supabase existente para salvar favoritos compartilhados e restringir Contas a Pagar no servidor.
- Código no repositório não confirma que o frontend ou o banco online já foram publicados; veja [ROADMAP.md](ROADMAP.md).
