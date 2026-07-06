# Backlog - Tasks

## MVP aprovado inicialmente

- Auth e usuarios.
- Workspaces, Spaces, Folders e Lists.
- Status por List.
- Tarefas com campos principais.
- Responsaveis, prioridades, datas e tags.
- Subtasks e checklists.
- List view.
- Board view.
- My Work.
- Everything.
- Comentarios.
- Activity log.
- Inbox/notificacoes basicas.
- Permissoes e RLS.
- Testes antes de entrega.

## V1

- Calendar view.
- Timeline/Gantt view.
- Custom fields.
- Templates.
- Bulk actions.
- Anexos com Supabase Storage.
- Comentarios atribuiveis.
- Dependencias.
- Relacionamentos entre tarefas.
- Export CSV.
- Import CSV.
- Dashboard de produtividade.
- Notificacoes por e-mail.
- Recursos pagos de e-mail/transacional, se excederem alternativas gratuitas.

## Integracoes futuras

- Dashboard Originais:
  - vincular tasks a projetos;
  - criar tarefas a partir de etapas do cronograma;
  - refletir milestones e prazos;
  - abrir projeto do dashboard a partir da task.
- LuxStudio:
  - vincular tasks a producoes/gravações;
  - tarefas por diaria, cena, equipe, equipamento ou pos;
  - pendencias de set e pos-producao.
- ClickUp:
  - importacao inicial;
  - sync temporario durante migracao;
  - mapeamento de users, spaces, lists, tasks, comments e custom fields.
- Notion:
  - importacao de databases;
  - link bidirecional para docs/specs;
  - migracao de times que ainda usam Notion.

## Mobile futuro

- App iOS.
- App Android.
- Push notifications.
- Offline-first para minhas tarefas.
- Captura rapida de tarefa.
- Comentarios e mencoes.

## Automacoes

- Quando status mudar para `Done`, notificar criador.
- Quando due date vencer, mover para alerta.
- Quando tarefa for criada em lista X, atribuir default owner.
- Quando prioridade for Urgente, notificar manager.
- Recurring tasks.
- SLA por tipo de tarefa.

## AI futuro

- Gerar subtasks a partir de descricao.
- Resumir comentarios longos.
- Criar update semanal por Space.
- Detectar tarefas bloqueadas.
- Sugerir responsavel com base em historico.
- Converter notas de reuniao em tarefas.

## Decisoes pendentes

- Nome final do produto.
- Primeiro time piloto.
- Se anexos entram no MVP ou V1.
- Se e-mail notification entra no MVP ou V1.
- Se custom fields entram no MVP reduzido ou V1.
- Onde hospedar a primeira versao.
- Se sera projeto Supabase novo ou instancia existente com schema isolado.
- Se a hospedagem atual suporta rewrite `/tasks/* -> /tasks/index.html`.
- Se deep links serao URLs limpas ou hash routing.

## Decisoes fechadas

- Hospedagem: Cloudflare Pages em `originais.lumine.tv`.
- URL alvo: `https://originais.lumine.tv/tasks`.
- Banco/backend: nova conta/projeto Supabase Free.
- Stack MVP: Vite + React + TypeScript SPA.
