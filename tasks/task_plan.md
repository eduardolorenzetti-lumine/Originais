# Task Plan: Tasks

## Goal

Planejar o sistema web `tasks`, inspirado no workflow do ClickUp mas adaptado a Lumine, deixando documentacao suficiente para Codex e Claude implementarem com seguranca em etapas futuras.

## Current Phase

Phase 13 - Dados remotos, hierarquia e persistencia incremental

## Phases

### Phase 1: Requirements & Discovery

- [x] Capturar intencao do usuario: novo sistema complementar ao Dashboard e LuxStudio.
- [x] Registrar que a programacao nao deve iniciar antes do planejamento.
- [x] Pesquisar referencias atuais do ClickUp para hierarquia, views, campos, status e atividade.
- [x] Mapear padroes locais relevantes do workspace `Originais`.
- **Status:** complete

### Phase 2: Product Definition

- [x] Definir objetivo do produto.
- [x] Separar MVP, v1 e backlog.
- [x] Documentar usuarios, fluxos, entidades e experiencia esperada.
- **Status:** complete

### Phase 3: Technical Planning

- [x] Propor stack inicial.
- [x] Definir estrutura de pastas.
- [x] Propor modelo de dados e estrategia de integracao futura.
- [x] Registrar riscos tecnicos.
- **Status:** complete

### Phase 4: Execution Plan

- [x] Criar plano de execucao por fases.
- [x] Definir criterios de pronto e estrategia de testes.
- [x] Registrar backlog de integracoes futuras.
- **Status:** complete

### Phase 5: Handoff inicial

- [x] Criar `SYSTEM_LOG.md` especifico do projeto.
- [x] Criar arquivos persistentes para agentes.
- [x] Validar que os arquivos existem.
- **Status:** complete

### Phase 6: Restricoes de custo e deploy

- [x] Registrar requisito de custo zero.
- [x] Registrar URL alvo `https://originais.lumine.tv/tasks`.
- [x] Ajustar arquitetura para privilegiar SPA estatica e backend dentro de limites gratuitos.
- [x] Registrar proximos passos de hospedagem.
- **Status:** complete

### Phase 7: Confirmacoes de infraestrutura

- [x] Confirmar que `originais.lumine.tv` roda em Cloudflare Pages.
- [x] Confirmar que configuracoes de Cloudflare ficam com o time de TI da Lumine.
- [x] Confirmar que sera criada nova conta/projeto Supabase Free para o `tasks`.
- [x] Confirmar stack Vite + React + TypeScript para o MVP.
- **Status:** complete

### Phase 8: Deploy via GitHub

- [x] Registrar que o deploy do Cloudflare Pages e feito via GitHub.
- [x] Registrar que o usuario tem acesso a conta/repo GitHub usada para deploy.
- [x] Separar responsabilidades: GitHub/build sob controle do usuario; Cloudflare/DNS com TI se necessario.
- **Status:** complete

### Phase 9: Politica de testes e publicacao

- [x] Registrar que todas as mudancas devem ser testadas localmente antes da entrega.
- [x] Registrar que commit e push so devem acontecer quando o usuario pedir publicacao web.
- [x] Registrar que deploy nao e etapa automatica de tarefas comuns.
- **Status:** complete

### Phase 10: Supabase project setup

- [x] Orientar criacao do projeto `lumine-tasks`.
- [x] Registrar configuracoes seguras de criacao do projeto.
- [x] Aguardar criacao manual no dashboard Supabase.
- [x] Confirmar acesso via conector Supabase.
- [x] Registrar Project URL publica em `.env.example`.
- [ ] Coletar publishable/anon key para `.env.local` quando o usuario puder acessar o dashboard.
- **Status:** complete

### Phase 11: Scaffold tecnico local

- [x] Criar scaffold Vite + React + TypeScript.
- [x] Configurar base `/tasks/`.
- [x] Criar UI inicial com referencia Dashboard + LuxStudio.
- [x] Preparar client Supabase por env sem chaves reais.
- [x] Configurar lint, testes, build e audit.
- [x] Criar documentacao de deploy e design.
- [x] Validar visualmente no navegador local/interno.
- **Status:** complete

### Phase 12: ClickUp model + assignee filter

- [x] Adicionar botao para adicionar visualizacao.
- [x] Adicionar filtro rapido por responsavel ao lado de filtros.
- [x] Refinar o botao de adicionar visualizacao para `+` ao lado das abas.
- [x] Refinar filtro de responsaveis para icone compacto com popover, busca e checkboxes no estilo ClickUp.
- [x] Conectar filtro a List view, Board view, metricas e painel de detalhe.
- [x] Consultar ClickUp e identificar Spaces `[LMN] Originais` e `[LMN] Produções`.
- [x] Usar `[LMN] Originais` como modelo local inicial.
- [x] Documentar estrategia de importacao sem historico/concluidas.
- **Status:** complete

### Phase 13: Schema e importador ClickUp

- [x] Definir schema inicial para workspace/space/folder/list/task/people/teams/external_links.
- [x] Criar migration versionada e revisavel antes de aplicar.
- [x] Criar mapeador/import batch idempotente ClickUp -> Supabase.
- [x] Adicionar testes de migration smoke e mapeamento ClickUp.
- [x] Aplicar migration no Supabase remoto.
- [x] Criar seed versionado da hierarquia ClickUp dos Spaces `[LMN] Originais` e `[LMN] Produções`.
- [x] Aplicar seed estrutural remoto.
- [x] Importar primeiro `[LMN] Originais` como piloto com 10 tasks.
- [x] Excluir tasks `done`, `closed` e `archived`.
- [x] Decidir se status `backlog` conta sempre como "em pauta".
- [x] Criar owner inicial apos existir usuario em Supabase Auth.
- [x] Aplicar importacao completa para todas as tasks em pauta de `[LMN] Originais` retornadas pelo ClickUp.
- [x] Criar repository frontend Supabase com fallback local.
- [x] Criar UI de Auth/login/logout com fallback para modo local.
- [x] Configurar `.env.local` com publishable key.
- [x] Conectar Auth/login no frontend.
- [x] Criar primeiro usuario Auth.
- [x] Criar membership do primeiro owner em `workspace_members`.
- [x] Confirmar e-mail do primeiro usuario.
- [x] Validar leitura remota com usuario logado.
- [x] Conectar clique em Spaces, listas e tarefas ao estado real da UI.
- [x] Preparar seed versionado para `[LMN] Produções` com 45 tasks ativas.
- [x] Corrigir refresh para nao exibir mock local quando Supabase configurado estiver carregando.
- [x] Corrigir refresh para abrir a primeira lista com tarefas visiveis em vez de uma lista vazia.
- [x] Mapear `parent_external_id`/subtasks do Supabase para a UI.
- [x] Adicionar controles de Agrupamento e Subtarefas expandidas/recolhidas ao lado das visualizacoes.
- [x] Reestruturar a sidebar para `Espacos > Pastas > Listas`.
- [x] Trocar a List view por arvore de tarefas/subtarefas com expansao individual.
- [x] Criar shell inicial das views `Gantt`, `Calendario`, `Quadro`, `Mapa mental` e `Equipe`.
- [x] Permitir alternar entre detalhe lateral e janela modal.
- [x] Exibir nome do usuario no topo e mover configuracoes da conta para o controle do usuario.
- [x] Criar editores locais de `Status` e `Campos` por `space/folder/list`.
- [x] Adicionar `+` no fim das colunas da List view.
- [x] Aplicar seed `[LMN] Produções` no Supabase remoto.
- [x] Persistir edicoes basicas de tarefas/subtarefas no Supabase.
- [x] Exibir feedback visual de salvamento/erro para mutacoes Supabase.
- [x] Persistir preferencias visuais de espacos/pastas/listas em `raw_payload.ui`.
- [x] Criar fluxo real de criacao/edicao de subtarefas.
- [x] Persistir criacao/renomeacao estrutural real de espacos, pastas e listas.
- [x] Persistir reordenacao de tarefas, layout/view e configuracoes de status/campos por escopo no Supabase.
- [x] Persistir reordenacao de espacos, pastas e listas na sidebar.
- [x] Criar modelo relacional dedicado para status/campos personalizados por escopo.
- [x] Usar valores de campos personalizados no detalhe e nas views em estado local/UI.
- [ ] Aplicar migration remota de status/campos personalizados quando o Supabase voltar a aceitar escrita.
- [ ] Persistir valores de campos personalizados em `task_custom_field_values`.
- **Status:** in_progress

## Key Questions

1. O MVP deve priorizar substituir o ClickUp de um time piloto ou apenas criar a fundacao tecnica?
   - Proposta atual: substituir o fluxo de um time piloto, com List/Board, tarefa detalhada, comentarios, filtros e notificacoes basicas.
2. A hierarquia deve seguir ClickUp literalmente?
   - Proposta atual: usar conceitos equivalentes (`workspace`, `space`, `folder`, `list`, `task`, `subtask`), mas com nomenclatura e UI ajustadas a Lumine.
3. A stack deve privilegiar velocidade ou integracao futura robusta?
   - Decisao confirmada: Vite + React + TypeScript como SPA estatica, com Supabase/Postgres via client seguro com RLS. Next.js fica fora do MVP, salvo revisao futura.
4. O dashboard atual deve ser integrado no MVP?
   - Proposta atual: nao. Modelar `external_links` e IDs externos desde o inicio, mas deixar integracao em backlog.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Criar documentacao antes de codigo | O usuario pediu planejamento, specs e plano de execucao antes da implementacao. |
| Manter `tasks` como projeto separado dentro de `/Originais/tasks` | O diretorio ja existe e facilita evoluir sem tocar no dashboard atual. |
| Usar referencia ClickUp como benchmark, nao como copia | Preserva a logica produtiva conhecida pelo time sem depender visual ou conceitualmente de uma replica. |
| Planejar integracao futura por contratos e IDs externos | Dashboard, LuxStudio e Tasks podem evoluir separados sem acoplamento prematuro. |
| Recomendar Supabase/Postgres com RLS desde o inicio | O dashboard ja usa Supabase; RLS e separacao de ambientes precisam nascer corretos. |
| Custo zero e requisito arquitetural | A primeira versao deve usar hospedagem existente/gratuita e evitar servicos pagos ate haver escala. |
| URL alvo: `https://originais.lumine.tv/tasks` | O app deve nascer preparado para rodar em subpath, nao apenas na raiz do dominio. |
| Preferir SPA estatica para o MVP | Facilita hospedagem em `/tasks` sem custo de servidor, mantendo dados no Supabase com RLS. |
| Cloudflare Pages confirmado | `originais.lumine.tv` ja roda em Cloudflare Pages; ajustes de DNS/projeto ficam com o time de TI da Lumine. |
| Supabase Free novo confirmado | O usuario criara nova conta/projeto Free para evitar limite de dois projetos da conta atual. |
| Vite + React + TypeScript aprovado | Stack aceita desde que mantenha confiabilidade, escalabilidade gradual e custo zero no MVP. |
| Deploy via GitHub confirmado | O usuario tem acesso a conta/repo usada no deploy, entao build config e publicacao podem ser conduzidos pelo fluxo GitHub. |
| Testar sempre localmente | Toda mudanca deve passar por validacao local antes de ser entregue ao usuario. |
| Commit/push apenas sob pedido explicito | Publicacao web acontece somente quando o usuario avisar; agentes fazem commit e push apenas nesse momento. |
| Supabase `lumine-tasks` com Data API ON | Necessario para o app web usar `supabase-js`. |
| Auto-expose de novas tabelas OFF | Evita expor tabelas novas por acidente via roles da API. |
| Automatic RLS ON | Garante defesa padrao em novas tabelas criadas no schema exposto. |
| Supabase project ref registrado | `kqmkqzsktmcmrehktejs` identifica o projeto `lumine-tasks` no conector Supabase. |
| Referencia visual Dashboard + LuxStudio | A UI do `tasks` deve herdar a densidade operacional, tokens Lumine e estrutura de ferramenta dos dois sistemas. |
| Scaffold com dados mockados primeiro | Permite testar localmente e revisar experiencia antes de aplicar schema no Supabase. |
| `[LMN] Originais` como modelo inicial ClickUp | Traz hierarquia Space > Folder > Lists e tarefas/subtarefas diretamente ligadas ao Dashboard Originais. |
| Importacao sem historico/concluidas | O escopo inicial deve trazer apenas tasks em pauta, preservando IDs externos para evitar duplicidade futura. |
| Auth por Supabase no MVP | Mantem custo zero, usa RLS real e evita criar um sistema proprio de senha/sessao. |
| Sem flash de mock quando Supabase esta configurado | O app deve iniciar em estado de carregamento e renderizar apenas dados reais do usuario logado, evitando contagens temporarias incorretas. |
| Lista inicial deve priorizar tarefas visiveis | Ao carregar um Space, selecionar a primeira lista com tasks evita que o usuario veja estado vazio quando o Space tem tarefas ativas. |
| `parent_external_id` alimenta a hierarquia visual inicial | A List view ja pode agrupar/recolher subtarefas importadas, enquanto criacao/edicao real de subtarefas fica para a proxima fase. |
| `spaces > folders > lists` e a hierarquia alvo da sidebar | O app deve nascer com essa navegacao, mesmo quando o seed remoto ainda vier com `folder_id` incompleto. |
| Views e controles sao eixos separados | Visualizacao, agrupamento, subtarefas e modo de detalhe nao devem dividir o mesmo grupo de acoes. |
| Troca de Space nao deve disparar novo fetch remoto | Selecionar recortes na sidebar e estado local de navegacao; recarregar snapshot so em mount/auth evita piscadas e regressao para fallback local. |
| `backlog` conta como em pauta quando vem no filtro ativo do ClickUp | O ClickUp retornou muitos itens `backlog` no filtro `unstarted/active`; eles foram importados como `todo`, enquanto `concluido/done/closed/archived` ficaram fora. |
| Preferencias de usuario ficam em `user_preferences` | Layout, views, colunas, agrupamento, detalhe, ordem de tarefas e configs locais por escopo sao preferencias por usuario/workspace, protegidas por RLS, sem criar servico pago. |
| Ordem da sidebar e preferencia individual no MVP | Reordenar espacos/pastas/listas salva em `layout/main.sidebarEntityOrder`, sem alterar posicoes globais no banco para outros usuarios. |
| Status/Campos possuem modelo dedicado com fallback | `task_scope_settings`, `task_status_options`, `custom_field_definitions` e `task_custom_field_values` sao o destino relacional; enquanto a migration remota estiver bloqueada, a UI preserva `user_preferences.scope_config` como fallback. |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| Supabase remoto recusou migration de status/campos por falta de creditos | 1 | Migration local criada e repository preparado com fallback para `user_preferences`; aplicar remotamente quando houver creditos. |

## Notes

- Programacao do app iniciou com scaffold local em 2026-06-28.
- O MVP deve ser revisado pelo usuario antes da criacao do scaffold do app.
- O dashboard atual tem local e producao apontando para `originais-main`; nao reutilizar esse padrao em `tasks`.
- Como a hospedagem e Cloudflare Pages, deep links em `/tasks/*` exigem rewrite para `/tasks/index.html` ou uso de hash routing.
- Ponto para TI: somente validar/configurar Cloudflare Pages/DNS/rewrite se isso nao puder ser resolvido pelo repo GitHub.
- Fluxo padrao: implementar -> testar local -> reportar resultado. Nao fazer commit/push/deploy sem pedido explicito de publicacao.
