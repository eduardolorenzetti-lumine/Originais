-- Pilot ClickUp task seed for [LMN] Originais.
-- Uses the same 10 active tasks currently represented in the local UI mock data.

with workspace_row as (
  select id from public.workspaces where slug = 'lumine' limit 1
),
space_row as (
  select s.id, s.workspace_id
  from public.spaces s
  join workspace_row w on w.id = s.workspace_id
  where s.external_provider = 'clickup'
    and s.external_id = '90070433129'
  limit 1
),
folder_row as (
  select f.id
  from public.folders f
  join space_row s on s.id = f.space_id
  where f.external_provider = 'clickup'
    and f.external_id = '901314999520'
  limit 1
),
list_row as (
  select l.id
  from public.task_lists l
  join space_row s on s.id = l.space_id
  where l.external_provider = 'clickup'
    and l.external_id = '901322414076'
  limit 1
),
people_seed as (
  select * from (values
    ('clickup', '112023412', 'Davi Pereira de Moura', 'davi.moura@lumine.tv'),
    ('clickup', '55056432', 'Jordana Bastos', 'jordana.bastos@lumine.tv'),
    ('clickup', '82012243', 'Dudu Lorenzetti', 'eduardo.lorenzetti@lumine.tv'),
    ('clickup', '55056430', 'Aline Marques', 'aline.santos@lumine.tv')
  ) as value(external_provider, external_id, display_name, email)
),
people_upsert as (
  insert into public.people (workspace_id, external_provider, external_id, display_name, email, raw_payload)
  select w.id, p.external_provider, p.external_id, p.display_name, p.email, '{"source":"originais_pilot_seed"}'::jsonb
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
    ('86aj75zzm', '86ad82jk6', 'CLK-01', 'Cazarre', '#2-73 | Brasil de todos os Santos II [SUL]', 'em andamento', 'custom', 'in_progress', 'high', '2026-07-01', 'https://app.clickup.com/t/86aj75zzm', 'Pagamento,ClickUp'),
    ('86ad82u0x', '86ad82twd', 'CLK-02', 'RP [agradecimentos] | Marcelinho', '#2-75 | O caminho de Marcelo Camara', 'em andamento', 'custom', 'in_progress', 'normal', '2026-07-02', 'https://app.clickup.com/t/86ad82u0x', 'ClickUp,Originais'),
    ('86ahvedek', '86ad82rd1', 'CLK-03', 'Creditos - Exorcistas', '#2-70 | Exorcistas', 'em andamento', 'custom', 'in_progress', 'high', '2026-07-03', 'https://app.clickup.com/t/86ahvedek', 'Creditos,ClickUp'),
    ('86aj6419u', '86agx406v', 'CLK-04', 'Rodoviario - dudu [IDA - 12/07]', '#2-94 | Natal Amarelo IV [Cidade Amarela]', 'em andamento', 'custom', 'in_progress', 'normal', '2026-07-04', 'https://app.clickup.com/t/86aj6419u', 'Logistica,ClickUp'),
    ('86agx409w', '86agx406v', 'CLK-05', 'Hospedagem', '#2-94 | Natal Amarelo IV [Cidade Amarela]', 'backlog', 'open', 'todo', 'normal', '2026-07-05', 'https://app.clickup.com/t/86agx409w', 'Backlog,Logistica'),
    ('86agtxuw1', '86agk0hhf', 'CLK-06', 'Guia - Amanda e Marcella', '#2-96 | Fe Asiatica', 'em andamento', 'custom', 'in_progress', 'normal', '2026-07-06', 'https://app.clickup.com/t/86agtxuw1', 'Guia,Originais'),
    ('86adq8qx3', '86ad82w1j', 'CLK-07', 'Fazer CRT conteudos PRIME', 'TASKS Producao', 'em andamento', 'custom', 'in_progress', 'high', '2026-07-07', 'https://app.clickup.com/t/86adq8qx3', 'CRT,Prime'),
    ('86agx2zx5', '86afz5m3k', 'CLK-08', '[Cena] 91 - 100', '#2-92 | A Vila das Virtudes - EP#3 Fortaleza', 'backlog', 'open', 'todo', 'low', '2026-07-08', 'https://app.clickup.com/t/86agx2zx5', 'Backlog,Cena'),
    ('86ad82jw6', '86ad82jk6', 'CLK-09', 'Log', '#2-73 | Brasil de todos os Santos II [SUL]', 'em andamento', 'custom', 'in_progress', 'normal', '2026-07-09', 'https://app.clickup.com/t/86ad82jw6', 'Log,Originais'),
    ('86agx40cn', '86agx406v', 'CLK-10', 'Registro Roteiro BN | Natal Amarelo', '#2-94 | Natal Amarelo IV [Cidade Amarela]', 'aguardando retorno', 'custom', 'review', 'normal', '2026-07-10', 'https://app.clickup.com/t/86agx40cn', 'Aguardando retorno,Roteiro')
  ) as value(external_id, parent_external_id, code, title, description, status_name, status_type, normalized_status, priority, due_date, source_url, tags_csv)
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
    f.id,
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
    (t.due_date::date + time '12:00')::timestamptz,
    t.source_url,
    now(),
    jsonb_build_object('source', 'originais_pilot_seed', 'tags', string_to_array(t.tags_csv, ','))
  from tasks_seed t
  cross join space_row s
  cross join folder_row f
  cross join list_row l
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
    ('86aj75zzm', '112023412'),
    ('86ad82u0x', '55056432'),
    ('86ahvedek', '55056432'),
    ('86ahvedek', '82012243'),
    ('86aj6419u', '55056430'),
    ('86agx409w', '55056430'),
    ('86agtxuw1', '55056432'),
    ('86adq8qx3', '55056432'),
    ('86ad82jw6', '82012243'),
    ('86agx40cn', '55056432')
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
  select t.workspace_id, 'task', t.id, 'clickup', t.external_id, task_row.source_url, '{"source":"originais_pilot_seed"}'::jsonb
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
