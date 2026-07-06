# ClickUp Import - Tasks

## Spaces alvo

### `[LMN] Originais`

- Space ID: `90070433129`
- Estrutura:
  - Folder `PLANEJAMENTO` (`901314999520`)
    - List `ORIGINAIS` (`901322414076`)
    - List `PROJETOS BACKLOG` (`901316478723`)
    - List `Calendário 2025 - Plataforma` (`901317310376`)

### `[LMN] Produções`

- Space ID: `90130989939`
- Estrutura:
  - List `Captação de recursos` (`901303409438`)
  - List `Festivais e Prêmios` (`901316499319`)
  - List `Cadastros ANCINE` (`901303347884`)
  - List `Ações Gerais` (`901304292009`)

## Escopo de importação

- Importar apenas tasks em pauta.
- Excluir histórico e tasks concluídas.
- Filtro inicial usado no conector ClickUp:
  - `asset_types`: `task`
  - `task_statuses`: `unstarted`, `active`
  - excluir: `done`, `closed`, `archived`

## Modelo inicial escolhido

Usar `[LMN] Originais` como primeiro modelo porque:

- Tem hierarquia Space > Folder > Lists.
- Contém tarefas/subtarefas ativas ligadas a projetos Originais.
- Ajuda a validar integração futura com o Dashboard Originais.

## Campos observados no conector

- `id`
- `name`
- `url`
- `status`
- `assignees`
- `taskType`
- `archived`
- `dateUpdated`
- `hierarchy.project`
- `hierarchy.category`
- `hierarchy.subcategory`
- `hierarchy.task` para parent task quando a task retornada é subtask

## Estratégia técnica proposta

1. Criar schema local do Tasks.
2. Criar campos de origem e tabela `external_links` para preservar IDs ClickUp, Notion, Dashboard e LuxStudio.
3. Importar `spaces`, `folders` e `task_lists` primeiro.
4. Importar pessoas em `people`, preferindo e-mail quando existir e preservando `external_id`.
5. Importar equipes em `teams`/`team_members` quando a origem trouxer esse dado.
6. Importar tasks ativas e subtasks, preservando `parent_external_id` no primeiro passe e resolvendo `parent_task_id` no segundo.
7. Rodar import idempotente com UPSERT por `(workspace_id, external_provider, external_id)`.
8. Não importar comentários/histórico nesta fase.

## Implementação local

- Migration: `supabase/migrations/20260628104500_initial_tasks_schema.sql`.
- Documento do schema: `docs/database-schema.md`.
- Mapeador/testes: `src/features/tasks/clickupImport.ts` e `src/features/tasks/clickupImport.test.ts`.
- Filtro de escopo: `isActiveClickUpTask` exclui tasks arquivadas, `done`, `closed`, `complete`, `completed`, `concluido` e `finalizado`.
- Batch: `buildClickUpImportBatch` retorna payload normalizado para upsert futuro.

## Ordem recomendada do import real

1. Aplicar migration revisada no Supabase. **Feito em 2026-06-28.**
2. Aplicar seed estrutural do workspace `Lumine`. **Feito em 2026-06-28.**
3. Criar owner inicial após existir usuário em Supabase Auth.
4. Importar `[LMN] Originais` como piloto. **Feito com 10 tasks iniciais.**
5. Conferir contagens por Space/List/Responsavel.
6. Importar `[LMN] Produções`. **Feito em 2026-06-29.**
7. Só depois conectar a UI ao banco.

## Estado importado no Supabase

- Estrutura: 1 workspace, 2 spaces, 1 folder, 7 lists.
- `[LMN] Originais`: importacao completa atual aplicada em 2026-06-30. O piloto inicial de 10 tasks foi substituido por 92 tarefas em pauta retornadas pelo ClickUp + 13 pais sinteticos necessarios para preservar a hierarquia, totalizando 105 itens em `ORIGINAIS`.
- `[LMN] Produções`: seed aplicado remotamente a partir de `supabase/seeds/20260628124500_producoes_pilot_tasks_seed.sql`, com 45 tasks ativas e 1 task `complete` excluida.
- Consulta remota mais recente confirmou: `[LMN] Originais / ORIGINAIS = 105`; `[LMN] Produções / Captação de recursos = 15`, `Festivais e Prêmios = 27`, `Cadastros ANCINE = 2`, `Ações Gerais = 1`.
- Em 2026-06-30, a coleta ClickUp completa de `[LMN] Originais` retornou 94 itens paginados; 2 vieram como `concluido` apesar do filtro `task_statuses: ["unstarted", "active"]` e nao foram importados.
- Originais remoto: 16 tarefas raiz, 89 subtarefas com `parent_task_id` resolvido, 43 vinculos de responsaveis, 213 vinculos task/tag e 105 links externos ClickUp.
- Decisao de escopo: `backlog` retornado pelo filtro ativo do ClickUp conta como "em pauta" e entra como `todo`. `done`, `closed`, `complete`, `completed`, `concluido`, `finalizado` e `archived` ficam fora.

## Amostras consultadas

- `[LMN] Originais`: busca atual retornou 94 itens; 92 importados como tarefas em pauta e 2 concluidos excluidos.
- `[LMN] Produções`: busca atual retornou 46 tasks; 45 entraram no seed e 1 `complete` foi excluida.
