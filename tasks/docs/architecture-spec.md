# Architecture Spec - Tasks

## 0. Restricoes atuais

- Custo operacional inicial deve ser zero.
- URL alvo de producao: `https://originais.lumine.tv/tasks`.
- Hospedagem confirmada: Cloudflare Pages no subdominio `originais.lumine.tv`.
- Acesso Cloudflare: o usuario nao tem acesso direto; configuracoes ficam com o time de TI da Lumine.
- Deploy confirmado: Cloudflare Pages publica via GitHub, conta/repo acessivel pelo usuario.
- Backend confirmado: nova conta/projeto Supabase Free.
- A aplicacao deve suportar subpath `/tasks` para assets, rotas e refresh.
- Evitar backend proprio pago no MVP.
- Evitar SSR/server actions obrigatorios no MVP.
- Evitar anexos pesados, e-mail transacional pago e automacoes externas pagas ate haver decisao de investimento.

## 1. Stack recomendada

### Frontend/app

- **Vite + React + TypeScript** como stack aprovada para custo zero e deploy estatico simples.
- **Next.js + React + TypeScript** fora do MVP; reconsiderar apenas se houver requisito futuro que justifique.
- **TanStack Query** para dados remotos
- **TanStack Table** para List view
- **dnd-kit** para Board view e reordenacao
- **Radix UI/shadcn opcional** para acessibilidade de primitives
- **CSS Modules ou Tailwind com tokens Lumine**
- **Zustand** somente para estado local de UI que nao pertence ao servidor
- **Router com base `/tasks`** ou hash routing se a hospedagem nao permitir rewrite estatico.

### Backend/dados

- **Supabase Auth** em nova conta/projeto Free
- **Supabase Postgres** em nova conta/projeto Free
- **RLS obrigatoria desde o primeiro schema**
- **Supabase Realtime** em backlog ou v1, nao obrigatorio para MVP
- **Supabase Storage** para anexos somente se couber nas quotas gratuitas
- **Migrations SQL versionadas**

### Testes

- **Vitest** para funcoes, componentes puros e regras de permissao client-side.
- **Testing Library** para componentes.
- **Playwright** para fluxos criticos.
- **SQL tests/migration smoke tests** para RLS e constraints.

## 2. Estrutura de pastas sugerida

```txt
tasks/
  SYSTEM_LOG.md
  README.md
  task_plan.md
  findings.md
  progress.md
  docs/
    product-spec.md
    architecture-spec.md
    execution-plan.md
    backlog.md
    ai-handoff.md
  app/
    (auth)/
    (workspace)/
    api/                 # somente se houver runtime gratuito confirmado
  components/
    layout/
    tasks/
    views/
    forms/
    ui/
  lib/
    supabase/
    auth/
    permissions/
    ids/
    dates/
    audit/
  features/
    workspace/
    hierarchy/
    tasks/
    comments/
    notifications/
    views/
  db/
    migrations/
    seeds/
    tests/
  tests/
    unit/
    integration/
    e2e/
```

Observacao: os arquivos de planejamento e `SYSTEM_LOG.md` ficam fora de `public/` e nao devem ser copiados para o bundle publico.

## 3. Modelo de dados inicial

Migration local: `supabase/migrations/20260628104500_initial_tasks_schema.sql`.

Tabelas principais:

- `workspaces`
- `workspace_members`
- `spaces`
- `folders`
- `task_lists`
- `people`
- `teams`
- `team_members`
- `tasks`
- `task_assignees`
- `task_teams`
- `tags`
- `task_tags`
- `external_links`
- `user_preferences`
- `task_scope_settings`
- `task_status_options`
- `custom_field_definitions`
- `task_custom_field_values`

Backlog de schema:

- `comments`
- `activity_events`
- `notifications`
- `views`
- `checklists`
- `checklist_items`
- `custom_fields`

### Campos chave de `tasks`

- `id bigint generated always as identity primary key`
- `workspace_id bigint`
- `space_id bigint`
- `folder_id bigint null`
- `list_id bigint null`
- `parent_task_id bigint null`
- `external_provider text`
- `external_id text`
- `parent_external_id text null`
- `code text`
- `title text`
- `description text`
- `status_name text`
- `status_type text`
- `normalized_status text`
- `priority text`
- `start_at timestamptz null`
- `due_at timestamptz null`
- `completed_at timestamptz null`
- `archived boolean`
- `source_url text null`
- `comments_count integer`
- `subtasks_done integer`
- `subtasks_total integer`
- `raw_payload jsonb`
- `imported_at timestamptz null`
- `created_at timestamptz`
- `updated_at timestamptz`

### `external_links`

Tabela generica para preparar integracoes sem acoplar as entidades principais:

- `id bigint`
- `workspace_id bigint`
- `entity_type text` (`space`, `folder`, `list`, `task`, `person`, `team`, `tag`)
- `entity_id bigint`
- `external_system text` (`clickup`, `notion`, `originais_dashboard`, `luxstudio`)
- `external_id text`
- `external_url text null`
- `metadata jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Uso futuro:

- Vincular uma task a um projeto do Dashboard.
- Vincular uma task a uma producao/gravacao do LuxStudio.
- Importar ou sincronizar com ClickUp/Notion sem mudar a tabela `tasks`.

### `user_preferences`

Tabela aplicada em 2026-06-30 para salvar preferencias por usuario/workspace sem servico adicional:

- `scope_kind`: `layout`, `scope_config` ou `task_order`.
- `scope_key`: chave logica do escopo (`main`, `space:*`, `folder:*`, `list:*`, `group:*`).
- `preferences`: JSONB com o payload validado no frontend.

Uso atual:

- Layout/view: view ativa, views habilitadas, agrupamento, subtarefas, modo de detalhe, colunas, largura da sidebar e ordem individual de `Espacos > Pastas > Listas`.
- Fallback de configuracao por escopo: listas locais de status/campos por space/folder/list enquanto o schema dedicado nao estiver aplicado no remoto.
- Ordem de tarefas por grupo na List view.

### `task_scope_settings` e campos personalizados

Migration local: `supabase/migrations/20260630172000_scope_settings.sql`.

Tabelas previstas para transformar `Status/Campos` em configuracao relacional por escopo:

- `task_scope_settings`: resolve o escopo configuravel (`space`, `folder`, `list`) dentro de um workspace.
- `task_status_options`: status disponiveis, ordem, cor e normalizacao por escopo.
- `custom_field_definitions`: definicoes de campos personalizados, tipo, obrigatoriedade, opcoes e payload bruto.
- `task_custom_field_values`: valores por tarefa para cada campo personalizado.

A migration ainda nao foi aplicada no Supabase remoto porque a tentativa de escrita foi bloqueada por falta de creditos do workspace. Ate isso acontecer, a UI usa `user_preferences.scope_config` como fallback e passa a priorizar o schema dedicado quando ele estiver disponivel.

Estado atual da UI:

- Campos definidos em `Campos` podem virar colunas `custom:*` na List/Tabela.
- Valores ficam em `TaskItem.customFields` e podem ser editados no painel lateral/modal ou por popover de celula.
- A persistencia desses valores em `task_custom_field_values` ainda esta pendente ate a migration remota ser aplicada.

## 4. Permissoes

Modelo inicial:

- Workspace role: `owner`, `admin`, `member`, `viewer`.
- Space role opcional: `manager`, `member`, `viewer`.
- RLS deve restringir leituras por membership.
- Escrita deve exigir papel minimo conforme entidade.
- Admin nao deve depender apenas de controle no frontend.

Regras base:

- Viewer le tudo que tem acesso, nao edita.
- Member cria/edita tarefas em spaces permitidos.
- Manager gerencia listas, status e membros do space.
- Admin gerencia workspace.
- Owner controla configuracoes sensiveis.

## 5. Estrategia de ambientes

Nao repetir o padrao atual do dashboard, onde local e producao apontam para o mesmo `stateId`.

Ambientes desejados no mundo ideal:

- `local`: banco local Supabase ou projeto dev.
- `staging`: projeto Supabase separado.
- `production`: projeto Supabase separado.

Estrategia confirmada para o MVP:

- `local`: Supabase local via CLI ou fixtures locais.
- `production`: novo projeto Supabase Free criado pelo usuario.
- `staging`: opcional enquanto custo zero for requisito; substituir por branch deploy + banco local/seed quando possivel.
- Nao usar o projeto Supabase do dashboard para o `tasks`, salvo emergencia aprovada explicitamente.

Regras:

- `.env.local` nunca commitado.
- `.env.example` obrigatorio.
- Migrations aplicadas primeiro em local/staging.
- Seeds de teste nao podem rodar em producao.
- Scripts destrutivos devem exigir confirmacao explicita.

## 5.1 Deploy em `/tasks`

Opcoes:

- Build estatico publicado dentro da pasta/slug `tasks` da hospedagem atual.
- Configurar base path do bundler:
  - Vite: `base: "/tasks/"`.
- Para rotas internas com URLs limpas, a hospedagem precisa reescrever `/tasks/*` para `/tasks/index.html`.
- Se rewrite nao estiver disponivel, usar hash routing (`/tasks/#/...`) para manter custo zero e evitar configuracao de edge.
- Como o usuario nao tem acesso ao Cloudflare, qualquer ajuste de rewrite/build/public path deve virar instrucao clara para o time de TI.
- Como o usuario tem acesso ao GitHub usado no deploy, configuracoes versionaveis no repo devem ser preferidas: build command, output directory, `_redirects`, `_headers` e variaveis documentadas. Acionar TI apenas para configuracoes que nao possam ser controladas pelo repositorio/projeto conectado.

## 6. Integracao futura

Nao implementar no MVP, mas preparar:

- IDs estaveis.
- `external_links`.
- Eventos de dominio em `activity_events`.
- API interna versionada, ex.: `/api/v1/tasks`.
- Adapter layer por sistema externo.
- Importadores idempotentes.

Possiveis contratos:

- Dashboard Originais envia/consulta projetos e milestones.
- LuxStudio envia/consulta gravacoes, diarias, cenas, equipes e pendencias.
- Tasks centraliza responsabilidades, comentarios e prazos.

## 7. Riscos

| Risco | Mitigacao |
|-------|-----------|
| MVP virar replica enorme do ClickUp | Escopo fechado: List, Board, Task detail, comentarios, notificacoes basicas. |
| Permissoes frouxas | RLS desde a primeira migration e testes de acesso. |
| Integracao prematura travar o projeto | Apenas modelar contratos, sem sync real no MVP. |
| UI ficar pesada/lenta | Virtualizacao em listas grandes e queries paginadas. |
| Agentes perderem contexto | Manter `SYSTEM_LOG.md`, `task_plan.md`, `findings.md`, `progress.md` e docs atualizados. |
