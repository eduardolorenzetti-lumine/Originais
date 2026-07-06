# Tasks

Sistema web de gestao de tarefas da Lumine, nome provisoriamente definido como `tasks`.

Este projeto ainda esta em fase de planejamento. Nenhuma implementacao de produto deve comecar antes da validacao das specs iniciais.

## Antes de qualquer tarefa

Agentes de IA devem ler, nesta ordem:

1. `SYSTEM_LOG.md`
2. `task_plan.md`
3. `findings.md`
4. `progress.md`
5. `docs/product-spec.md`
6. `docs/architecture-spec.md`
7. `docs/execution-plan.md`
8. `docs/backlog.md`
9. `docs/ai-handoff.md`

## Objetivo

Criar uma ferramenta propria de gestao de tarefas, inspirada no ClickUp, para uso interno da Lumine. A primeira versao sera web. Futuramente, o sistema deve poder se integrar ao Dashboard de Originais e ao LuxStudio.

## Hospedagem e custo

- Requisito atual: custo zero.
- URL alvo: `https://originais.lumine.tv/tasks`.
- Hospedagem confirmada: Cloudflare Pages no subdominio `originais.lumine.tv`, administrado pelo time de TI da Lumine.
- A primeira versao deve ser planejada como app estatico/SPA, para rodar na slug `/tasks` da hospedagem atual.
- Backend confirmado: nova conta/projeto Supabase Free, com RLS rigorosa.
- Recursos pagos ficam para escala futura ou backlog.

## Estado atual

- Planejamento inicial criado em 2026-06-28.
- Scaffold local Vite + React + TypeScript criado em 2026-06-28.
- UI operacional usa referencia visual do Dashboard Originais + LuxStudio.
- Supabase `lumine-tasks` criado, com schema, RLS, Auth inicial, dados ClickUp de `[LMN] Originais` e `[LMN] Produções`, persistencia de tarefas/estrutura e preferencias por usuario.

## Desenvolvimento local

```bash
npm install
npm run dev
```

URL local:

```txt
http://127.0.0.1:5174/tasks/
```

Checks:

```bash
npm run lint
npm run test
npm run build
npm audit
```

## Principio de desenvolvimento

Planejar, implementar em fases pequenas, testar antes de entregar e registrar tudo no `SYSTEM_LOG.md`.

Nao fazer commit, push ou deploy sem pedido explicito do usuario.
