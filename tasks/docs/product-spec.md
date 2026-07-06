# Product Spec - Tasks

## 1. Visao

`tasks` sera o sistema de gestao de tarefas da Lumine. A referencia operacional e o ClickUp, mas o produto deve nascer com identidade propria, mais enxuto no MVP e preparado para conectar producao audiovisual, projetos Originais e rotinas de equipe.

O objetivo nao e copiar todas as features do ClickUp de uma vez. O objetivo e criar uma base confiavel para que a empresa possa, aos poucos, centralizar tarefas, projetos, comentarios, prazos e responsabilidades em uma ferramenta interna.

## 2. Principios do produto

- **Operacional antes de bonito:** a tela principal deve ser densa, escaneavel e rapida.
- **Hierarquia clara:** usuario sempre deve saber onde a tarefa mora.
- **Tarefa como fonte de verdade:** descricao, campos, comentarios, anexos e atividade vivem no detalhe da tarefa.
- **Views configuraveis:** o mesmo conjunto de tarefas pode ser visto em lista, board e, depois, calendario/timeline.
- **Integracao futura sem pressa:** modelar links externos desde o inicio, mas nao acoplar ao Dashboard ou LuxStudio no MVP.
- **Auditoria primeiro:** toda mudanca relevante deve ter historico.
- **Permissoes desde o inicio:** evitar repetir fragilidades de RLS e ambientes do dashboard atual.
- **Custo zero agora:** o MVP deve rodar sem novos custos, usando hospedagem atual/gratuita e servicos dentro de quotas gratuitas.
- **Subpath primeiro:** a aplicacao deve funcionar em `https://originais.lumine.tv/tasks`, incluindo assets, rotas e recarregamento de pagina.

## 3. Publico inicial

- **Admin:** configura workspace, usuarios, permissoes, status, campos e listas.
- **Gestor / Coordenador:** cria spaces, folders, listas, tarefas, define responsaveis, prazos e prioridades.
- **Colaborador:** visualiza e atualiza suas tarefas, comenta, anexa arquivos e muda status conforme permissao.
- **Leitor / Stakeholder:** acompanha progresso sem editar tudo.

## 4. Hierarquia proposta

Inspirada no ClickUp, adaptada:

- **Workspace:** Lumine ou unidade organizacional.
- **Space:** area, time ou grande frente de trabalho. Ex.: Originais, Marketing, Producao, Pos, Rota, Administrativo.
- **Folder:** agrupador opcional. Ex.: Campanha, Obra, Cliente, Temporada, Trimestre.
- **List:** unidade operacional de trabalho. Ex.: Backlog Originais, Semana de Gravacao, Pos-producao, Demandas Marketing.
- **Task:** item acionavel.
- **Subtask:** item menor dentro de uma task.
- **Checklist item:** microacao sem necessidade de responsavel independente.

## 5. MVP proposto

### 5.1 Autenticacao e usuarios

- Login com e-mail e senha via Supabase Auth.
- Perfis: Admin, Manager, Member, Viewer.
- Cadastro/convite controlado por Admin.
- Perfil com nome, e-mail, avatar/iniciais, cargo/time opcional.

### 5.2 Estrutura de trabalho

- CRUD de Spaces.
- CRUD de Folders opcional dentro de Space.
- CRUD de Lists dentro de Space ou Folder.
- Status configuraveis por List.
- Permissoes simples por Space/List.

### 5.3 Tarefas

Campos MVP:

- ID interno legivel.
- Titulo.
- Descricao rich text simples.
- Status.
- Responsavel unico ou multiplo.
- Prioridade: Urgente, Alta, Normal, Baixa.
- Datas: start date, due date.
- Tags.
- Lista de origem.
- Subtasks.
- Checklists.
- Comentarios.
- Activity log.
- Anexos como backlog tecnico se o storage atrasar o MVP.

### 5.4 Views

- **List view:** principal do MVP.
  - agrupamento por status, responsavel, prioridade ou nenhum;
  - filtros por responsavel, status, prioridade, tags, prazo;
  - busca por titulo/descricao;
  - colunas configuraveis;
  - edicao inline para campos principais;
  - quick add.
- **Board view:** Kanban por status.
  - drag/drop entre status;
  - cards compactos com prioridade, responsavel, prazo e tags.
- **My Work:** minhas tarefas por prazo/status.
- **Everything:** visao global de tudo que o usuario pode acessar.

### 5.5 Detalhe da tarefa

Layout sugerido:

- Modal ou painel lateral grande.
- Topo com breadcrumb: Space / Folder / List.
- Titulo editavel.
- Campos principais logo abaixo do titulo.
- Descricao no corpo central.
- Subtasks/checklists abaixo da descricao.
- Lateral direita para comentarios e atividade.
- Secao de relacionamentos e links externos.

### 5.6 Notificacoes MVP

- Inbox interna.
- Notificar quando:
  - usuario for atribuido a tarefa;
  - usuario for mencionado em comentario;
  - tarefa atribuida ao usuario mudar de status;
  - prazo estiver vencido ou vencer hoje.
- Estado lido/nao lido.
- E-mail fica para backlog, salvo se for simples via Supabase/Resend.
- Notificacoes pagas ou e-mail transacional ficam fora do MVP se gerarem custo.

### 5.7 Auditoria

- Activity log por tarefa.
- Registro de criacao, mudanca de status, responsavel, prazo, prioridade, descricao e comentarios.
- `SYSTEM_LOG.md` continua sendo log tecnico interno, separado do activity log do produto.

## 6. V1 depois do MVP

- Calendar view.
- Timeline/Gantt view.
- Time tracking.
- Custom fields por Space/List.
- Templates de tarefas/listas.
- Bulk actions.
- Automations simples.
- Dashboards de produtividade.
- Importacao de ClickUp e Notion.
- Anexos com Supabase Storage.
- Comentarios atribuiveis.
- Relacionamentos entre tarefas.
- Dependencias bloqueantes.

## 7. Backlog maior

- Apps iOS e Android.
- Integracao com Dashboard Originais.
- Integracao com LuxStudio.
- Sync com ClickUp para transicao gradual.
- Sync/import de Notion.
- Slack/WhatsApp/e-mail notifications.
- AI assistant para resumir tarefas, gerar subtasks e preparar updates.
- Automacoes avancadas com regras condicionais.
- Permissoes avancadas por papel, time e campo.

## 8. Design e experiencia

Direcao visual:

- Base Lumine: preto, off-white, amarelo de marca, cinzas precisos.
- Acentos funcionais por status/prioridade, sem depender de uma paleta unica.
- Layout de ferramenta: sidebar fixa, topo compacto, comandos claros, tabelas densas.
- Evitar hero, cards decorativos e explicacoes grandes dentro do app.
- Usar icons em botoes e tooltips para comandos compactos.
- Cards apenas para tarefas no board, modais e paineis realmente emoldurados.

## 9. Criterios de sucesso do MVP

- Um time piloto consegue abandonar uma lista operacional do ClickUp para tarefas do dia a dia.
- Admin consegue configurar um Space/List sem ajuda tecnica.
- Usuario consegue encontrar rapidamente "o que eu preciso fazer hoje".
- Gestor consegue ver status, responsaveis e atrasos.
- Toda mudanca importante em tarefa fica auditavel.
- App passa testes basicos de unidade, integracao e fluxo via navegador.
- App roda corretamente em `/tasks` e nao assume deploy na raiz do dominio.
- MVP nao exige servico pago para operar em piloto.
