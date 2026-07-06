-- Pilot ClickUp task seed for [LMN] Produções.
-- Imports active/unstarted ClickUp search results and excludes completed/archived tasks.

with workspace_row as (
  select id from public.workspaces where slug = 'lumine' limit 1
),
space_row as (
  select s.id, s.workspace_id
  from public.spaces s
  join workspace_row w on w.id = s.workspace_id
  where s.external_provider = 'clickup'
    and s.external_id = '90130989939'
  limit 1
),
people_seed as (
  select * from (values
    ('clickup', '82012243', 'dudu lorenzetti', 'eduardo.lorenzetti@lumine.tv'),
    ('clickup', '82197042', 'Mariana Lopez', 'mariana.lopez@lumine.tv'),
    ('clickup', '94123658', 'Karen da Silva Ribeiro', 'karen.ribeiro@lumine.tv'),
    ('clickup', '61048716', 'Gustavo Leite', 'gustavo.leite@lumine.tv'),
    ('clickup', '42920255', 'Paulo Galindo', 'paulo.galindo@lumine.tv'),
    ('clickup', '43022048', 'Lautierre', 'lautierre.souza@lumine.tv')
  ) as value(external_provider, external_id, display_name, email)
),
people_upsert as (
  insert into public.people (workspace_id, external_provider, external_id, display_name, email, raw_payload)
  select w.id, p.external_provider, p.external_id, p.display_name, p.email, '{"source":"producoes_pilot_seed"}'::jsonb
  from workspace_row w
  cross join people_seed p
  on conflict (workspace_id, external_provider, external_id) do update
    set display_name = excluded.display_name,
        email = excluded.email,
        raw_payload = excluded.raw_payload,
        updated_at = now()
  returning id, workspace_id, external_id, display_name
),
tasks_seed as (
  select * from (values
    ('86aj7yz8h', '901303409438', '86ahrfyuf', 'PROD-01', 'Cronograma de execução do projeto (12 meses)', 'PNAB - São Leopoldo', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aj7yz8h', 'Produções,Captação de recursos,Em andamento'),
    ('86aj7yyyg', '901303409438', '86ahrfyuf', 'PROD-02', 'Planilha orçamentária assinada', 'PNAB - São Leopoldo', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aj7yyyg', 'Produções,Captação de recursos,Em andamento'),
    ('86af8f5ab', '901303409438', '86aday0wj', 'PROD-03', 'RIO2C', 'Lei do Audiovisual [After the third day]', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86af8f5ab', 'Produções,Captação de recursos,Em andamento'),
    ('86ahfjq13', '901303409438', '86ae26kk0', 'PROD-04', 'Estudo player para Pitch', 'Programa POA Criativa - Rio2C 2026', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86ahfjq13', 'Produções,Captação de recursos,Em andamento'),
    ('86ahwe28z', '901303409438', '86ahj6e1a', 'PROD-05', 'Orçamento temporada 2', 'Proposta Grupo Supernosso', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86ahwe28z', 'Produções,Captação de recursos,Em andamento'),
    ('86afz9a3y', '901303409438', '86aday0wj', 'PROD-06', 'PDF apresentação', 'Lei do Audiovisual [After the third day]', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86afz9a3y', 'Produções,Captação de recursos,Em andamento'),
    ('86afz96cv', '901303409438', '86aday0wj', 'PROD-07', 'Materiais de comunicação [Estratégia LdA - BR]', 'Lei do Audiovisual [After the third day]', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86afz96cv', 'Produções,Captação de recursos,Em andamento'),
    ('86aaa6gz1', '901316499319', '86aaa6cbu', 'PROD-08', 'Festival Internacional de Cinema de Mar del Plata (FICMDP)', 'A Memória da Água', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aaa6gz1', 'Produções,Festivais e Prêmios,Festival,Em andamento'),
    ('86afxwn3g', '901316499319', '86aae1vg5', 'PROD-09', 'Criação de louro', 'Santo Agostinho e o Roubo das Peras', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86afxwn3g', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86ah1x27x', '901303409438', '86agp2b1e', 'PROD-10', 'Vídeo', 'Encontro de Coprodução do Mercosul 2026', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86ah1x27x', 'Produções,Captação de recursos,Em andamento'),
    ('86agxku0b', '901316499319', null, 'PROD-11', 'LABs e MENTORIAs', null, 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86agxku0b', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86agxkj6r', '901303409438', '86aday0wj', 'PROD-12', 'Biblia diagramada', 'Lei do Audiovisual [After the third day]', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86agxkj6r', 'Produções,Captação de recursos,Em andamento'),
    ('86agf2jjw', '901303409438', '86aday0wj', 'PROD-13', 'Fechamento do orçamento', 'Lei do Audiovisual [After the third day]', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86agf2jjw', 'Produções,Captação de recursos,Em andamento'),
    ('86agf2ba8', '901303409438', '86aday0wj', 'PROD-14', 'Definição do elenco e equipe desejada/possível', 'Lei do Audiovisual [After the third day]', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86agf2ba8', 'Produções,Captação de recursos,Em andamento'),
    ('86afz9axv', '901303409438', '86aday0wj', 'PROD-15', 'Vídeo-pitch apresentação', 'Lei do Audiovisual [After the third day]', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86afz9axv', 'Produções,Captação de recursos,Em andamento'),
    ('86afz9aq7', '901303409438', '86aday0wj', 'PROD-16', 'Website', 'Lei do Audiovisual [After the third day]', 'backlog', 'open', 'todo', 'normal', null, 'https://app.clickup.com/t/86afz9aq7', 'Produções,Captação de recursos,Backlog'),
    ('86afz9bm7', '901303409438', '86aday0wj', 'PROD-17', 'Argumento', 'Lei do Audiovisual [After the third day]', 'backlog', 'open', 'todo', 'normal', null, 'https://app.clickup.com/t/86afz9bm7', 'Produções,Captação de recursos,Backlog'),
    ('86afz9b0y', '901303409438', '86aday0wj', 'PROD-18', 'Cena gravada', 'Lei do Audiovisual [After the third day]', 'backlog', 'open', 'todo', 'normal', null, 'https://app.clickup.com/t/86afz9b0y', 'Produções,Captação de recursos,Backlog'),
    ('86aaa6gzk', '901316499319', '86aaa6cbu', 'PROD-19', 'Dok Leipzig', 'A Memória da Água', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aaa6gzk', 'Produções,Festivais e Prêmios,Festival,Em andamento'),
    ('86aefqgq5', '901316499319', '86aefqget', 'PROD-20', 'Divulgação / Marketing', 'A extraordinária vida de Carlo Acutis', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aefqgq5', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86aefqgq4', '901316499319', '86aefqget', 'PROD-21', 'Aplicação do louro no cartaz', 'A extraordinária vida de Carlo Acutis', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aefqgq4', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86aefqgq0', '901316499319', '86aefqget', 'PROD-22', 'Atualização na plataforma', 'A extraordinária vida de Carlo Acutis', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aefqgq0', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86aefqgq3', '901316499319', '86aefqget', 'PROD-23', 'Criação de louro', 'A extraordinária vida de Carlo Acutis', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aefqgq3', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86aefqgn8', '901316499319', '86ad5qjgu', 'PROD-24', 'Atualização na plataforma', 'Filho de Deus, Menino Meu', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aefqgn8', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86aefqgna', '901316499319', '86ad5qjgu', 'PROD-25', 'Divulgação / Marketing', 'Filho de Deus, Menino Meu', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aefqgna', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86aefqgnb', '901316499319', '86ad5qjgu', 'PROD-26', 'Criação de louro', 'Filho de Deus, Menino Meu', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aefqgnb', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86aefqgnc', '901316499319', '86ad5qjgu', 'PROD-27', 'Aplicação do louro no cartaz', 'Filho de Deus, Menino Meu', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aefqgnc', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86aefqfuf', '901316499319', '86aaa6c97', 'PROD-28', 'Aplicação do louro no cartaz', 'Ecce Homo', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aefqfuf', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86aefqfub', '901316499319', '86aaa6c97', 'PROD-29', 'Atualização na plataforma', 'Ecce Homo', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aefqfub', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86aefqfuc', '901316499319', '86aaa6c97', 'PROD-30', 'Criação de louro', 'Ecce Homo', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aefqfuc', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86aefqfue', '901316499319', '86aaa6c97', 'PROD-31', 'Divulgação / Marketing', 'Ecce Homo', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aefqfue', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86aaa6gwt', '901316499319', '86aaa6cbu', 'PROD-32', 'Festival Internacional de Cine de Guadalajara (FICG)', 'A Memória da Água', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aaa6gwt', 'Produções,Festivais e Prêmios,Festival,Em andamento'),
    ('86ad5hgpp', '901316499319', '86ad5qjgu', 'PROD-33', 'Prêmios PLATINO de Cinema Ibero-Americano 2026', 'Filho de Deus, Menino Meu', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86ad5hgpp', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86abhf4eq', '901316499319', '86aaa6cbu', 'PROD-34', 'E-mail para jurados', 'A Memória da Água', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86abhf4eq', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86abhf4g4', '901316499319', '86aaa6cbu', 'PROD-35', 'Encontrar Jurados', 'A Memória da Água', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86abhf4g4', 'Produções,Festivais e Prêmios,Em andamento'),
    ('86abhf4j6', '901316499319', '86aaa6cbu', 'PROD-36', 'Envio e-mail', 'A Memória da Água', 'backlog', 'open', 'todo', 'normal', null, 'https://app.clickup.com/t/86abhf4j6', 'Produções,Festivais e Prêmios,Backlog'),
    ('86abhf4h0', '901316499319', '86aaa6cbu', 'PROD-37', 'Redação e-mail', 'A Memória da Água', 'backlog', 'open', 'todo', 'normal', null, 'https://app.clickup.com/t/86abhf4h0', 'Produções,Festivais e Prêmios,Backlog'),
    ('86aaa6gue', '901316499319', '86aaa6cbu', 'PROD-38', 'My Name Is Climate Film Festival', 'A Memória da Água', 'submetido', 'custom', 'review', 'normal', null, 'https://app.clickup.com/t/86aaa6gue', 'Produções,Festivais e Prêmios,Festival,Submetido'),
    ('86aaa6gxx', '901316499319', '86aaa6cbu', 'PROD-39', 'Doc Lisboa', 'A Memória da Água', 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aaa6gxx', 'Produções,Festivais e Prêmios,Festival,Em andamento'),
    ('86a3yh14k', '901304292009', null, 'PROD-40', 'Solicitar Nivelamento ANCINE', null, 'em andamento', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86a3yh14k', 'Produções,Ações Gerais,Em andamento'),
    ('86a524xb6', '901303347884', '86a3r6wnf', 'PROD-41', 'Confirmar com Lautierre valor pago à Panela  (Farol)', '02-24 | Trilogia Junina', 'backlog', 'open', 'todo', 'normal', null, 'https://app.clickup.com/t/86a524xb6', 'Produções,Cadastros ANCINE,Backlog'),
    ('86a524uhq', '901303347884', '86a3r6xvg', 'PROD-42', 'Obter valor pago MBC - Lautierre', '02-00 | Filhos de Cister', 'backlog', 'open', 'todo', 'normal', null, 'https://app.clickup.com/t/86a524uhq', 'Produções,Cadastros ANCINE,Backlog'),
    ('86aae1vg5', '901316499319', null, 'PROD-43', 'Santo Agostinho e o Roubo das Peras', null, 'filme', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aae1vg5', 'Produções,Festivais e Prêmios,Original,Filme'),
    ('86aaa73k5', '901316499319', null, 'PROD-44', 'A Via Sacra', null, 'filme', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aaa73k5', 'Produções,Festivais e Prêmios,Original,Filme'),
    ('86aaa6cft', '901316499319', null, 'PROD-45', 'Na Mesa Com os Santos', null, 'filme', 'custom', 'in_progress', 'normal', null, 'https://app.clickup.com/t/86aaa6cft', 'Produções,Festivais e Prêmios,Original,Filme')
  ) as value(external_id, list_external_id, parent_external_id, code, title, description, status_name, status_type, normalized_status, priority, due_date, source_url, tags_csv)
),
tasks_upsert as (
  insert into public.tasks (
    workspace_id,
    space_id,
    folder_id,
    list_id,
    external_provider,
    external_id,
    parent_external_id,
    code,
    title,
    description,
    status_name,
    status_type,
    normalized_status,
    priority,
    due_at,
    source_url,
    imported_at,
    raw_payload
  )
  select
    s.workspace_id,
    s.id,
    null,
    l.id,
    'clickup',
    t.external_id,
    t.parent_external_id,
    t.code,
    t.title,
    t.description,
    t.status_name,
    t.status_type,
    t.normalized_status,
    t.priority,
    case when t.due_date is null then null else (t.due_date::date + time '12:00')::timestamptz end,
    t.source_url,
    now(),
    jsonb_build_object('source', 'producoes_pilot_seed', 'tags', string_to_array(t.tags_csv, ','))
  from tasks_seed t
  cross join space_row s
  join public.task_lists l on l.space_id = s.id
    and l.external_provider = 'clickup'
    and l.external_id = t.list_external_id
  on conflict (workspace_id, external_provider, external_id) do update
    set parent_external_id = excluded.parent_external_id,
        code = excluded.code,
        title = excluded.title,
        description = excluded.description,
        status_name = excluded.status_name,
        status_type = excluded.status_type,
        normalized_status = excluded.normalized_status,
        priority = excluded.priority,
        due_at = excluded.due_at,
        source_url = excluded.source_url,
        imported_at = excluded.imported_at,
        raw_payload = excluded.raw_payload,
        updated_at = now()
  returning id, workspace_id, external_id
),
assignee_seed as (
  select * from (values
    ('86aj7yz8h', '82012243'),
    ('86aj7yyyg', '82012243'),
    ('86ahfjq13', '82197042'),
    ('86ahwe28z', '82012243'),
    ('86afz9a3y', '82197042'),
    ('86agxkj6r', '82197042'),
    ('86agf2jjw', '82012243'),
    ('86agf2ba8', '82012243'),
    ('86afz9axv', '61048716'),
    ('86afxwn3g', '94123658'),
    ('86aefqgq4', '94123658'),
    ('86aefqgq0', '42920255'),
    ('86aefqgq3', '94123658'),
    ('86aefqgn8', '42920255'),
    ('86aefqgnb', '94123658'),
    ('86aefqgnc', '94123658'),
    ('86aefqfuf', '94123658'),
    ('86aefqfub', '42920255'),
    ('86aefqfuc', '94123658'),
    ('86abhf4g4', '82197042'),
    ('86a524xb6', '43022048'),
    ('86a524uhq', '43022048')
  ) as value(task_external_id, person_external_id)
),
assignees_insert as (
  insert into public.task_assignees (task_id, person_id)
  select t.id, p.id
  from assignee_seed a
  join tasks_upsert t on t.external_id = a.task_external_id
  join people_upsert p on p.workspace_id = t.workspace_id
    and p.external_id = a.person_external_id
  on conflict (task_id, person_id) do nothing
  returning task_id, person_id
),
tag_names as (
  select distinct trim(tag_name) as name
  from tasks_seed t
  cross join lateral unnest(string_to_array(t.tags_csv, ',')) as tag_name
  where trim(tag_name) <> ''
),
tags_upsert as (
  insert into public.tags (workspace_id, name)
  select w.id, tag_names.name
  from workspace_row w
  cross join tag_names
  on conflict (workspace_id, lower(name)) do update
    set name = excluded.name,
        updated_at = now()
  returning id, workspace_id, name
),
task_tags_insert as (
  insert into public.task_tags (task_id, tag_id)
  select t.id, tag.id
  from tasks_seed seed
  join tasks_upsert t on t.external_id = seed.external_id
  cross join lateral unnest(string_to_array(seed.tags_csv, ',')) as tag_name
  join tags_upsert tag on tag.workspace_id = t.workspace_id and lower(tag.name) = lower(trim(tag_name))
  on conflict (task_id, tag_id) do nothing
  returning task_id, tag_id
),
links_insert as (
  insert into public.external_links (workspace_id, entity_type, entity_id, external_system, external_id, external_url, metadata)
  select t.workspace_id, 'task', t.id, 'clickup', t.external_id, task_row.source_url, '{"source":"producoes_pilot_seed"}'::jsonb
  from tasks_upsert t
  join tasks_seed task_row on task_row.external_id = t.external_id
  on conflict (workspace_id, external_system, external_id) do update
    set entity_type = excluded.entity_type,
        entity_id = excluded.entity_id,
        external_url = excluded.external_url,
        metadata = excluded.metadata,
        updated_at = now()
  returning id
)
select
  (select count(*) from tasks_upsert)::int as tasks_upserted,
  (select count(*) from assignees_insert)::int as assignees_inserted,
  (select count(*) from tags_upsert)::int as tags_upserted,
  (select count(*) from task_tags_insert)::int as task_tags_inserted,
  (select count(*) from links_insert)::int as links_upserted;
