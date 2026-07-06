# Database Schema - Tasks

## Status

- Migration local criada: `supabase/migrations/20260628104500_initial_tasks_schema.sql`.
- Migration aplicada no Supabase remoto em 2026-06-28 via conector Supabase.
- Seed estrutural criado e aplicado: `supabase/seeds/20260628110000_clickup_spaces_seed.sql`.
- Seed piloto criado e aplicado: `supabase/seeds/20260628111500_originais_pilot_tasks_seed.sql`.
- Migration de preferencias por usuario criada/aplicada: `supabase/migrations/20260630070000_user_preferences.sql`.
- Migration local de configuracoes por escopo criada: `supabase/migrations/20260630172000_scope_settings.sql`.
- A migration `20260630172000_scope_settings.sql` ainda nao foi aplicada no Supabase remoto; tentativa em 2026-06-30 foi bloqueada por falta de creditos do workspace.
- Supabase CLI nao esta instalado nesta maquina; a migration foi criada manualmente e deve ser revisada antes de aplicar via conector Supabase ou CLI em outro ambiente.

## Projeto Supabase alvo

- Project name: `lumine-tasks`
- Project ref: `kqmkqzsktmcmrehktejs`
- Region: `sa-east-1`
- Postgres: 17

## Principios

- RLS habilitada em todas as tabelas do schema publico.
- Nenhum acesso para `anon` no MVP.
- `authenticated` recebe grants minimos de leitura/escrita, sempre restringidos por policies.
- `service_role` deve ser usado apenas em ambiente seguro para importacao administrativa.
- IDs internos usam `bigint generated always as identity`.
- IDs externos sao preservados por `external_provider`/`external_id` e por `external_links`.
- Importacao deve usar UPSERT por chaves unicas de origem.

## Tabelas

- `workspaces`: organizacao logica do app.
- `workspace_members`: vinculo entre usuarios Supabase Auth e workspaces, com roles `owner`, `admin`, `editor`, `member`, `viewer`.
- `spaces`: equivalente aos Spaces do ClickUp e futuros agrupadores internos.
- `folders`: folders dentro de spaces.
- `task_lists`: listas dentro de spaces/folders.
- `people`: pessoas importadas ou cadastradas no workspace.
- `teams`: equipes como `Marketing LMN`.
- `team_members`: relacao equipe/pessoa.
- `tasks`: tarefas e subtarefas, usando `parent_task_id` para hierarquia.
- `task_assignees`: relacao tarefa/pessoa.
- `task_teams`: relacao tarefa/equipe.
- `tags`: tags normalizadas por workspace.
- `task_tags`: relacao tarefa/tag.
- `external_links`: links genericos para ClickUp, Notion, Dashboard Originais e LuxStudio.
- `user_preferences`: preferencias por usuario/workspace para layout, configuracoes locais por escopo, ordem de tarefas e ordem individual da sidebar.
- `task_scope_settings`: configuracao compartilhavel por escopo (`space`, `folder`, `list`) para status e campos.
- `task_status_options`: opcoes de status por configuracao de escopo.
- `custom_field_definitions`: definicoes de campos personalizados por configuracao de escopo.
- `task_custom_field_values`: valores de campos personalizados por tarefa.

## Campos de origem externa

As entidades principais possuem:

- `external_provider`: `local`, `clickup`, `notion`, `luxstudio`, `dashboard`.
- `external_id`: ID do sistema de origem.
- `raw_payload`: JSON bruto reduzido para auditoria/debug.

Para integracoes futuras, `external_links` permite vincular qualquer entidade local a:

- `clickup`
- `notion`
- `originais_dashboard`
- `luxstudio`

## RLS

Leitura:

- Usuario autenticado so le dados de workspaces onde existe `workspace_members.auth_user_id = auth.uid()`.
- Em `workspace_members`, usuario autenticado le apenas a propria membership para evitar recursao de RLS.

Escrita:

- `owner`, `admin` e `editor` podem escrever em dados operacionais do workspace.
- `workspace_members` nao tem escrita direta para `authenticated` nesta fase; criacao/alteracao de membros deve acontecer por seed administrativo ou fluxo futuro dedicado.
- `viewer` e `member` ficam inicialmente sem escrita direta ate o fluxo de produto definir permissoes finas.

## Indices principais

- Membership: `workspace_members_auth_user_idx`.
- Hierarquia: `spaces_workspace_idx`, `folders_workspace_space_idx`, `task_lists_workspace_space_idx`.
- Tarefas: `tasks_workspace_status_due_idx`, `tasks_workspace_list_idx`, `tasks_parent_task_idx`.
- Responsaveis/times/tags: indices nas tabelas relacionais.
- Links externos: `external_links_workspace_entity_idx`.

## Pendencias de schema/dados

- Confirmar se `member` deve criar/editar tarefas no MVP ou se apenas `editor` para o piloto.
- Criar rotina incremental/versionada para futuras atualizacoes do ClickUp, evitando depender de imports manuais.
- Aplicar a migration remota `20260630172000_scope_settings.sql` quando houver creditos no workspace.
- Persistir os valores editados na UI em `task_custom_field_values` quando o schema remoto estiver aplicado.

## Estado remoto verificado

- `workspaces`: 1
- `spaces`: 2
- `folders`: 1
- `task_lists`: 7
- `people`: 9
- `teams`: 1
- `tasks`: 150
- `task_assignees`: 65
- `tags`: 31
- `task_tags`: 355
- `external_links`: 161
- `user_preferences`: tabela criada, inicialmente preenchida conforme uso de cada usuario.
- `task_scope_settings`, `task_status_options`, `custom_field_definitions`, `task_custom_field_values`: migration criada localmente, ainda nao aplicada no remoto.
- `auth.users`: 1 usuario inicial confirmado (`eduardo.lorenzetti@lumine.tv`).
- `workspace_members`: 1 membership `owner` para o workspace `Lumine`.
- `[LMN] Originais` importado remotamente em 2026-06-30: 105 itens em `ORIGINAIS`, sendo 16 raizes e 89 subtarefas, com 0 concluidas.
- `[LMN] Produções` aplicado remotamente: 45 tasks, 22 vinculos de responsaveis, 11 tags e 45 external links.

## Camada de leitura no app

- Repository: `src/features/tasks/taskRepository.ts`.
- Auth service: `src/features/auth/authService.ts`.
- A UI chama `loadWorkspaceSnapshot()` ao iniciar.
- A UI tambem observa sessao Supabase com `getSession()` e `onAuthStateChange()`.
- O app permite entrar/criar conta/sair quando Supabase estiver configurado.
- Quando Supabase esta configurado, a UI inicia com snapshot de `loading` para nao exibir dados locais mockados antes da resposta remota autenticada.
- Se `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` nao existirem, usa dados locais.
- Se o Supabase estiver configurado mas nao houver sessao Auth/membership visivel por RLS, tambem usa dados locais.
- Quando houver usuario logado com membership no workspace `Lumine`, o repository ja esta preparado para mapear `spaces`, `task_lists`, `tasks`, `task_assignees`, `people`, `task_tags` e `tags` para os tipos da UI.
- A UI ja consome `tasks.parent_external_id` como `parentExternalId` para identificar subtarefas importadas; o vinculo interno `parent_task_id` segue como base do schema para hierarquia local/relacional.
- O repository frontend tambem passou a consultar `folders` e a reconstruir a hierarquia `space > folder > list` no cliente. Em 2026-06-29 o seed estrutural foi reaplicado e `[LMN] Originais` voltou a carregar `PLANEJAMENTO` diretamente do banco; o fallback por `Space/List` foi mantido apenas como protecao.
- A camada `src/features/tasks/userPreferences.ts` carrega/salva preferencias em `user_preferences` para `layout`, `scope_config` e `task_order`, sempre usando a sessao Supabase atual e o workspace `lumine`. A ordem individual de espacos/pastas/listas fica dentro de `layout/main.sidebarEntityOrder`, nao em colunas globais de `spaces`/`folders`/`task_lists`.
- A camada `src/features/tasks/scopeConfigRepository.ts` tenta carregar/salvar `Status/Campos` pelo modelo dedicado de `task_scope_settings` e tabelas filhas. Se o schema ainda nao existir no remoto, faz fallback para `user_preferences.scope_config`.
- A UI ja usa `TaskItem.customFields` para exibir/editar valores customizados em colunas `custom:*` e no painel de tarefa. No estado atual, esses valores sao locais; a persistencia remota deve ser conectada a `task_custom_field_values` apos aplicar a migration dedicada.
- O `.env.local` local ja possui a publishable key moderna e esta ignorado pelo Git. Nao registrar service role/secret key no repo.
