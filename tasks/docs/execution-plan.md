# Execution Plan - Tasks

## Fase 0 - Validacao do planejamento

Objetivo: confirmar escopo, stack e prioridades antes de escrever codigo.

Entregaveis:

- Specs revisadas pelo usuario.
- MVP aprovado ou ajustado.
- Nome temporario `tasks` confirmado ou substituido.
- Decisao final sobre stack.
- Confirmacao de custo zero como restricao do MVP.
- Confirmacao do deploy em `https://originais.lumine.tv/tasks`.
- Confirmacao da hospedagem atual: Cloudflare Pages.
- Confirmacao de nova conta/projeto Supabase Free.
- Confirmacao de deploy via GitHub com acesso do usuario.
- Identificacao do repositorio/branch conectado ao Cloudflare Pages.
- Checagem sobre suporte a rewrite para `/tasks/*`; preferir resolver via arquivo versionado no repo se possivel.

Criterio de pronto:

- Usuario aprova iniciar scaffold.
- Qualquer implementacao futura deve ser testada localmente antes de entrega.
- Commit/push/deploy so devem ocorrer quando o usuario pedir publicacao web explicitamente.

## Fase 1 - Scaffold tecnico

Objetivo: criar o projeto web com padroes minimos.

Entregaveis:

- Vite + React + TypeScript configurado.
- Lint, format e testes basicos.
- `.env.example`.
- Estrutura de pastas.
- Tokens visuais iniciais da Lumine.
- Tela shell vazia com auth guard simulado ou real.
- Build configurado para base `/tasks/`.
- Documento curto com build command, output directory, rota `/tasks` e necessidade de rewrite, para GitHub/Cloudflare Pages.

Testes:

- `npm run lint`
- `npm run test`
- `npm run build`
- Playwright abre home/login em `/tasks` sem erro.
- Refresh em uma rota interna nao quebra, via rewrite ou hash routing.
- Build gerado no output esperado pelo Cloudflare Pages.

Politica de entrega:

- Entrega padrao: resultado local testado e documentado.
- Nao fazer commit, push ou deploy como parte automatica desta fase.
- Quando o usuario pedir publicacao, preparar commit intencional, push para o branch conectado e registrar no `SYSTEM_LOG.md`.

## Fase 2 - Banco, auth e permissoes

Objetivo: fundacao segura.

Entregaveis:

- Migrations iniciais.
- Supabase Auth.
- Tabelas de workspace/members.
- RLS para workspace e membership.
- Seed de dev.
- Login/logout.
- Projeto Supabase Free novo criado e documentado em `.env.example`.

Testes:

- SQL smoke test de RLS.
- Login com usuario seed.
- Usuario sem membership nao acessa dados.

## Fase 3 - Hierarquia

Objetivo: criar e navegar por Spaces, Folders e Lists.

Entregaveis:

- Sidebar com hierarquia.
- CRUD de Space/List.
- Folder opcional.
- Status configuraveis por List.
- Breadcrumb.

Testes:

- Criar Space/List.
- Editar nome.
- Arquivar/remover com confirmacao.
- Validar permissoes manager/member/viewer.

## Fase 4 - Tasks core

Objetivo: CRUD real de tarefas.

Entregaveis:

- Criar tarefa.
- Editar titulo, descricao, status, responsavel, prioridade, datas e tags.
- Subtasks/checklists.
- Activity log basico.

Testes:

- Unit tests para normalizacao e validacao de campos.
- Integration tests para CRUD.
- Playwright: criar task, abrir detalhe, editar campos, fechar e recarregar.

## Fase 5 - Views MVP

Objetivo: tornar o app usavel no fluxo diario.

Entregaveis:

- List view com agrupamento, filtros, busca e colunas basicas.
- Board view por status com drag/drop.
- My Work.
- Everything.

Testes:

- Filtros retornam resultados corretos.
- Drag/drop muda status.
- My Work mostra tarefas atribuidas ao usuario.

## Fase 6 - Comentarios, notificacoes e atividade

Objetivo: colaboração minima.

Entregaveis:

- Comentarios por tarefa.
- Mencoes simples.
- Inbox interna.
- Notificacoes para atribuicao, mencao, mudanca de status e prazo.
- Marcacao lido/nao lido.

Testes:

- Criar comentario.
- Gerar notificacao.
- Marcar como lida.
- Activity log cronologico.

## Fase 7 - Hardening MVP

Objetivo: preparar entrega piloto.

Entregaveis:

- Testes e2e principais.
- Revisao de acessibilidade.
- Estados vazios, loading e erro.
- Responsividade web.
- Documentacao de uso/admin.
- Atualizacao do `SYSTEM_LOG.md`.

Testes:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run e2e`

## Fase 8 - Piloto

Objetivo: validar com um time real.

Entregaveis:

- Workspace piloto.
- Import manual ou seed de tarefas reais selecionadas.
- Feedback documentado.
- Lista de ajustes para v1.

Metrica de sucesso:

- Time piloto consegue acompanhar trabalho diario por uma semana sem voltar para ClickUp naquela lista.
