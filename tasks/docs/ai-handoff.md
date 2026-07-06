# AI Handoff - Tasks

## Leitura obrigatoria antes de agir

1. `SYSTEM_LOG.md`
2. `task_plan.md`
3. `findings.md`
4. `progress.md`
5. `docs/product-spec.md`
6. `docs/architecture-spec.md`
7. `docs/execution-plan.md`
8. `docs/backlog.md`
9. `docs/supabase-setup.md`
10. `docs/database-schema.md`
11. `docs/design-reference.md`
12. `docs/deploy.md`
13. `docs/clickup-import.md`

## Contexto curto

O usuario quer iniciar um terceiro sistema da Lumine: `tasks`, um gestor de tarefas inspirado no ClickUp. O projeto complementara o Dashboard de Originais e o LuxStudio, mas integracoes reais ficam em backlog. Nesta fase, o pedido foi planejar antes de programar. Requisito confirmado: custo zero no MVP e deploy em `https://originais.lumine.tv/tasks`, via Cloudflare Pages. O Cloudflare e administrado pelo time de TI da Lumine, mas o deploy roda via GitHub e o usuario tem acesso a essa conta/repo.

## Nao fazer ainda

- Nao criar scaffold sem validacao do usuario.
- Nao alterar o dashboard.
- Nao integrar com LuxStudio.
- Nao criar banco em producao.
- Nao usar o Supabase de producao do dashboard como ambiente de testes.
- Nao servir `SYSTEM_LOG.md` ou docs internas aos usuarios finais.
- Nao introduzir dependencia que exija custo mensal para o MVP.
- Nao assumir que o app roda na raiz `/`; validar base `/tasks`.
- Nao fazer commit, push ou deploy sem pedido explicito do usuario para publicar na web.

## Prioridades quando a implementacao comecar

1. Fundacao segura: environments, auth, RLS, migrations.
2. UI operacional: sidebar, hierarchy, list view.
3. Task detail completo.
4. Board view.
5. Comentarios, activity e notificacoes.
6. Testes antes de entrega.

## Padroes de registro

- Toda mudanca tecnica relevante deve entrar no `SYSTEM_LOG.md`.
- Mudancas de plano entram em `task_plan.md`.
- Descobertas entram em `findings.md`.
- Acoes de sessao e testes entram em `progress.md`.

## Decisoes ja tomadas

- Usar `tasks` como nome temporario.
- Manter app separado dentro de `/Users/dudulorenzetti/Documents/CODE/Originais/tasks`.
- Planejar integracao futura por `external_links`.
- Inspirar-se no ClickUp, mas criar produto proprio da Lumine.
- Usar Vite + React + TypeScript SPA + Supabase/Postgres para custo zero.
- Rodar em `https://originais.lumine.tv/tasks`.
- Hospedagem confirmada: Cloudflare Pages.
- Deploy confirmado: via GitHub, com acesso do usuario.
- Backend confirmado: nova conta/projeto Supabase Free.
- Politica operacional: sempre testar localmente; publicacao web so quando o usuario avisar.
- Supabase setup: seguir `docs/supabase-setup.md`. Nunca registrar database password, service role key ou JWT secret no repo.
- Referencia visual confirmada: Dashboard Originais + LuxStudio. Ver `docs/design-reference.md`.
- Scaffold local criado com dados mockados; migrations iniciais e seeds principais ja foram aplicados no Supabase remoto, exceto migrations marcadas como bloqueadas por credito.
- ClickUp import: Spaces alvo documentados em `docs/clickup-import.md`. Primeiro modelo local usa `[LMN] Originais`.
- Schema inicial criado em `supabase/migrations/20260628104500_initial_tasks_schema.sql` e aplicado no Supabase remoto.
- Mapeador ClickUp criado em `src/features/tasks/clickupImport.ts`; testes cobrem filtragem de concluídas/arquivadas e normalizacao de campos.
- Camada de dados Supabase criada em `src/features/tasks/taskRepository.ts`; a UI usa fallback local enquanto nao houver `.env.local` completo e sessao Auth com membership.
- Camada de Auth frontend criada em `src/features/auth/authService.ts`; o topo do app ja permite entrar, criar conta e sair quando Supabase estiver configurado.
- `.env.example` ja contem `VITE_SUPABASE_URL`; `.env.local` local foi criado com a publishable key e esta ignorado pelo Git.
- Usuario Auth inicial criado: `eduardo.lorenzetti@lumine.tv`; membership `owner` criada no workspace `Lumine`.
- E-mail do usuario inicial confirmado pelo usuario. Login/leitura remota validados no navegador interno: `Supabase conectado`, 2 Spaces e 10 tasks piloto.
- Sidebar agora possui selecao real de Space/List e clique em task atualiza painel lateral.
- Seed de `[LMN] Produções` aplicado no Supabase remoto em 2026-06-29: 45 tasks ativas, 22 vinculos de responsaveis, 11 tags e 45 external links.
- Refresh com Supabase configurado nao deve renderizar mock local antes dos dados reais. O app usa `loadingWorkspaceSnapshot` como estado inicial para evitar o flash de 50 tasks fake em `[LMN] Originais`.
- Quando uma lista ainda nao esta selecionada no carregamento, a UI deve usar `getDefaultListForSpace()` para abrir a primeira lista com tasks visiveis, em vez da primeira lista do Space. Isso evita cair em `PROJETOS BACKLOG` vazio quando `[LMN] Originais` possui tasks em `ORIGINAIS`.
- `parent_external_id` ja e mapeado no repository para `TaskItem.parentExternalId` e `TaskItem.isSubtask`. A List view tem controles por icone para Agrupamento e Subtarefas expandidas/recolhidas.
- A sidebar agora foi refeita para `Espacos > Pastas > Listas`. O seed estrutural foi reaplicado em 2026-06-29 e `[LMN] Originais` voltou a expor `PLANEJAMENTO` tambem no banco; o fallback por `Space/List` continua apenas como rede de seguranca.
- A toolbar separa `Visualizacao`, `Agrupamento`, `Subtarefas` e `Modo de detalhe`. A List view virou arvore de tasks/subtasks com expansao global e individual; views adicionais `Gantt`, `Calendario`, `Quadro`, `Mapa mental` e `Equipe` ja existem como shell funcional.
- O topo mostra o nome do usuario e um menu de configuracoes da conta. `Status` e `Campos` possuem editores por escopo (`space`, `folder`, `list`).
- Edicoes basicas de tasks/subtasks ja disparam persistencia otimista no Supabase quando ha sessao autenticada. A UI mostra `Salvando`, `Salvo` ou `Erro ao salvar` no topo durante essas mutacoes.
- Preferencias visuais de espacos, pastas e listas (`label`, `color`, `icon`, `favorite`) sao salvas em `raw_payload.ui` e recarregadas pelo repository; em `spaces`, a cor tambem e espelhada em `spaces.color`.
- Grants remotos de `DELETE` para `task_assignees`, `task_tags` e `task_teams` foram confirmados para `authenticated` em 2026-06-29.
- Subtarefas agora devem iniciar `Recolhidas` por padrao; testes que dependem de linhas filhas precisam expandir pelo controle `Subtarefas`.
- Swatches de cor dependem das classes explicitas `.swatch-button.dot-*`; a classe `selected` deve apenas indicar selecao, sem sobrescrever `background`.
- A coleta ClickUp para a importacao completa de `[LMN] Originais` foi retomada em 2026-06-29, mas a aplicacao/verificacao no Supabase ficou bloqueada por falta de creditos do workspace. O ClickUp retornou itens `concluido` mesmo com filtro ativo, entao manter filtro local antes de gravar.
- O detalhe lateral/modal ja lista subtarefas diretas da tarefa selecionada, permite abrir subtarefas por ali e criar nova subtarefa pelo proprio detalhe. Esse acesso independe da arvore principal estar expandida.
- Importacao completa atual de `[LMN] Originais` aplicada em 2026-06-30: 92 tarefas em pauta do ClickUp + 13 pais sinteticos para hierarquia = 105 itens em `ORIGINAIS`; 89 subtarefas resolvidas por `parent_task_id`; 2 itens `concluido` retornados pelo ClickUp foram excluidos.
- Criacao de pasta/lista pela sidebar agora persiste registros `local` em `folders`/`task_lists` quando ha sessao Supabase. Renomear espaco/pasta/lista atualiza `name` no registro remoto e tambem `raw_payload.ui.label` para feedback imediato. A UI ainda usa estado local ate novo snapshot/refresh.
- `user_preferences` foi criado/aplicado em 2026-06-30 para preferencias por usuario/workspace. A UI carrega e salva `view`, views habilitadas, agrupamento, subtarefas recolhidas/expandidas, modo de detalhe, colunas selecionadas, largura da sidebar, configs locais de `Status/Campos` por escopo, ordem de tarefas por grupo e ordem da sidebar em `sidebarEntityOrder`.
- Modelo relacional dedicado de `Status/Campos` criado localmente em `supabase/migrations/20260630172000_scope_settings.sql`, com repository `src/features/tasks/scopeConfigRepository.ts`. A tentativa de aplicar no Supabase remoto foi bloqueada por falta de creditos; ate aplicar a migration, a UI continua usando fallback em `user_preferences.scope_config`.
- Valores de campos personalizados ja funcionam na UI: `TaskItem.customFields` alimenta colunas `custom:*`, o `+` de colunas mostra campos herdados do escopo atual e o painel lateral/modal permite editar esses valores. Isso ainda e estado local/UI; persistencia remota em `task_custom_field_values` depende da migration `20260630172000_scope_settings.sql`.
- Proximo bloco de produto: aplicar a migration remota de `Status/Campos` quando houver creditos, persistir valores customizados em `task_custom_field_values` e definir tipos reais de campo por escopo.

## Fluxo de entrega

1. Implementar localmente.
2. Rodar testes locais relevantes.
3. Reportar resultado ao usuario.
4. Aguardar pedido explicito para publicar.
5. Se o usuario pedir publicacao: fazer commit, push e registrar no `SYSTEM_LOG.md`.

## Perguntas para o usuario antes do scaffold

- Qual time sera o piloto?
- Anexos entram no MVP ou ficam para V1?
- Custom fields entram no MVP ou ficam para V1?
- Notificacoes por e-mail entram no MVP ou apenas inbox interna?
- Qual repositorio/branch esta conectado ao Cloudflare Pages?
- Conseguimos resolver rewrite `/tasks/*` por arquivo versionado no repo, ou devemos usar hash routing?
