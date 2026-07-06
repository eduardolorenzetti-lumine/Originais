# Findings & Decisions - Tasks

## Requirements

- Criar um terceiro sistema chamado provisoriamente `tasks`.
- O sistema sera complementar ao `dashboard` de Originais e ao `LuxStudio`.
- Planejar antes de programar: features, possibilidades, framework, estrutura e plano de execucao.
- Manter documentacao persistente para Codex e Claude consultarem antes de cada tarefa.
- Criar `SYSTEM_LOG.md` interno, sem acesso de usuarios finais.
- Referencia principal: ClickUp, incluindo features, estrutura, layout, cores, notificacoes e organizacao de workflow.
- Primeira versao: web app.
- Requisito atual: custo zero. Escala futura pode justificar investimento, mas o MVP nao deve depender de servicos pagos.
- URL alvo: `https://originais.lumine.tv/tasks`.
- Hospedagem confirmada: `originais.lumine.tv` roda em Cloudflare Pages. O usuario nao tem acesso ao Cloudflare; configuracoes ficam com o time de TI da Lumine.
- Deploy confirmado: Cloudflare Pages publica via GitHub, e o usuario tem acesso a conta/repo usada nesse fluxo.
- Backend confirmado: o usuario criara nova conta/projeto Supabase Free, pois a conta atual ja atingiu o limite de dois projetos gratuitos.
- Stack aprovada: Vite + React + TypeScript, desde que confiavel, escalavel gradualmente e 100% free no MVP.
- Politica operacional confirmada: sempre testar localmente. Commit, push e publicacao web so devem acontecer quando o usuario avisar explicitamente.
- Backlog futuro: apps Apple/iOS e Android.
- Backlog futuro: integracao completa entre `dashboard`, `LuxStudio` e `tasks`.
- Sempre implementar com testes antes da entrega.

## Research Findings

- ClickUp organiza o trabalho em uma hierarquia escalavel: Workspace, Spaces, Folders, Subfolders, Lists, Tasks e Subtasks. A estrutura tambem permite itens como Docs, Dashboards, Forms e Whiteboards.
- ClickUp trata tarefas como itens acionaveis, com Task ID, titulo, tipos, status, responsaveis, datas, prioridade, descricao, custom fields, subtasks, checklists, relacionamentos, anexos, comentarios e atividade.
- A List view do ClickUp e obrigatoria nos niveis principais e permite agrupar por status, responsavel, prioridade, tags, due date, custom field ou nenhum agrupamento.
- Views relevantes para o produto: List, Board/Kanban, Calendar, Timeline/Gantt, Table, Workload e Everything view. MVP deve comecar com List e Board.
- Acoes esperadas de uma List view madura: filtros, busca, ordenacao, colunas configuraveis, criacao rapida de task, edicao inline, drag/drop e bulk actions.
- Status devem ser configuraveis por lista/projeto, com agrupamento de tipo (`todo`, `in_progress`, `done`, `closed`) para permitir relatorios consistentes.
- Comentarios e atividade devem morar no detalhe da tarefa, idealmente numa lateral direita, com unread markers e historico cronologico.
- O dashboard atual da Originais e um app HTML/CSS/JS que usa tokens visuais da Lumine, Satoshi, amarelo/preto/off-white e Supabase.
- O dashboard atual aponta ambiente local e producao para o mesmo `stateId` (`originais-main`), o que deve ser tratado como risco a nao repetir.
- Cloudflare Pages possui plano gratuito com builds, dominios customizados e requests/bandwidth estaticos sem cobranca dentro dos limites atuais publicados. Isso favorece um app estatico em `/tasks`.
- Supabase Free Plan existe, concede dois projetos gratuitos por limite de owner/admin e inclui quotas gratuitas para banco, MAU, storage, Edge Functions e Realtime. Isso e suficiente para piloto se o app for moderado e monitorado.

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Stack sugerida revisada: Vite + React + TypeScript SPA | Atende custo zero e deploy em `/tasks` com build estatico simples. |
| Next.js fora do MVP | Vite SPA foi aprovado como caminho principal; Next.js fica como opcao futura apenas se houver motivo real. |
| Banco sugerido: Supabase Postgres | Ja existe experiencia local com Supabase e permite Auth, RLS, Realtime e Edge Functions dentro de quotas gratuitas se bem usado. |
| Cloudflare Pages confirmado | Deploy deve assumir Pages e coordenar apenas ajustes de rewrite/build com TI quando necessario. |
| Supabase Free novo confirmado | Evita misturar dados e limites com o projeto atual do dashboard. |
| Deploy via GitHub confirmado | Configuracoes de build, branch e output devem ser documentadas para o fluxo GitHub/Pages. |
| Publicacao sob comando do usuario | Evita deploy acidental; tarefas comuns terminam com validacao local e relatorio. |
| UI sugerida: componentes proprios + Radix/shadcn como base opcional | A experiencia precisa ser densa e operacional, sem cara de landing page. |
| Tabelas/listas: TanStack Table | Necessario para colunas configuraveis, ordenacao, filtros e performance. |
| Drag/drop: dnd-kit | Base madura para Board e reordenacao de tarefas/subtarefas. |
| Estado remoto: TanStack Query | Cache, invalidacao e optimistic updates com controle. |
| Estado local de UI: Zustand ou stores pequenos | Evita complexidade global desnecessaria para filtros, panels e preferencias. |
| Migrations versionadas | Essencial para Claude/Codex trabalharem sem perder schema. |

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| O projeto ainda nao tem nome final | Usar `tasks` em codigo e docs ate decisao de naming. |
| Integracao futura ainda indefinida | Criar contratos (`external_links`, IDs externos e adapters) sem implementar sync agora. |
| Referencia ClickUp e ampla demais para MVP | Dividir em MVP, v1 e backlog. |
| Custo zero limita backend proprio | Usar SPA + Supabase client com RLS; evitar API server propria no MVP. |

## Resources

- ClickUp Help - Intro to the Hierarchy: https://help.clickup.com/hc/en-us/articles/13856392825367-Intro-to-the-Hierarchy
- ClickUp Help - Intro to tasks: https://help.clickup.com/hc/en-us/articles/10552031987735-Intro-to-tasks
- ClickUp Help - Intro to List view: https://help.clickup.com/hc/en-us/articles/6310260883351-Intro-to-List-view
- ClickUp Help - Task fields and task description: https://help.clickup.com/hc/en-us/articles/34958796358039-Task-fields-and-the-task-description
- ClickUp Help - Use statuses on tasks: https://help.clickup.com/hc/en-us/articles/34958607300887-Use-statuses-on-tasks
- ClickUp Help - Task activity and comments: https://help.clickup.com/hc/en-us/articles/29723182607127-Task-activity-and-comments
- Local dashboard: `/Users/dudulorenzetti/Documents/CODE/Originais/dashboard`
- Existing root system log: `/Users/dudulorenzetti/Documents/CODE/Originais/SYSTEM_LOG.md`
- Cloudflare Pages: https://pages.cloudflare.com/
- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Cloudflare Pages redirects: https://developers.cloudflare.com/pages/configuration/redirects/
- Supabase billing/free plan: https://supabase.com/docs/guides/platform/billing-on-supabase
- Supabase compute/disk: https://supabase.com/docs/guides/platform/compute-and-disk

## Visual/Browser Findings

- Nao foram analisadas imagens nesta sessao.
- As paginas de ajuda do ClickUp confirmam uma interface centrada em hierarquia lateral, views por contexto e task detail com campos + descricao + atividade.
