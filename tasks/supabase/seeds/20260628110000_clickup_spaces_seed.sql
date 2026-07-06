-- Initial ClickUp hierarchy seed for Tasks.
-- Run after 20260628104500_initial_tasks_schema.sql.
-- This seed intentionally does not create workspace_members because Auth has no users yet.

with workspace_upsert as (
  insert into public.workspaces (name, slug)
  values ('Lumine', 'lumine')
  on conflict (slug) do update
    set name = excluded.name,
        updated_at = now()
  returning id
),
workspace_row as (
  select id from workspace_upsert
  union all
  select id from public.workspaces where slug = 'lumine'
  limit 1
),
spaces_seed as (
  select * from (values
    ('clickup', '90070433129', '[LMN] Originais', 'blue', false, '{"source":"clickup_seed"}'::jsonb),
    ('clickup', '90130989939', '[LMN] Produções', 'green', false, '{"source":"clickup_seed"}'::jsonb)
  ) as value(external_provider, external_id, name, color, archived, raw_payload)
),
spaces_upsert as (
  insert into public.spaces (workspace_id, external_provider, external_id, name, color, archived, raw_payload)
  select w.id, s.external_provider, s.external_id, s.name, s.color, s.archived, s.raw_payload
  from workspace_row w
  cross join spaces_seed s
  on conflict (workspace_id, external_provider, external_id) do update
    set name = excluded.name,
        color = excluded.color,
        archived = excluded.archived,
        raw_payload = excluded.raw_payload,
        updated_at = now()
  returning id, workspace_id, external_provider, external_id, name
),
folder_seed as (
  select * from (values
    ('90070433129', 'clickup', '901314999520', 'PLANEJAMENTO', 1, false, '{"source":"clickup_seed"}'::jsonb)
  ) as value(space_external_id, external_provider, external_id, name, position, archived, raw_payload)
),
folder_upsert as (
  insert into public.folders (workspace_id, space_id, external_provider, external_id, name, position, archived, raw_payload)
  select s.workspace_id, s.id, f.external_provider, f.external_id, f.name, f.position, f.archived, f.raw_payload
  from folder_seed f
  join spaces_upsert s on s.external_provider = 'clickup' and s.external_id = f.space_external_id
  join workspace_row w on w.id = s.workspace_id
  on conflict (space_id, external_provider, external_id) do update
    set name = excluded.name,
        position = excluded.position,
        archived = excluded.archived,
        raw_payload = excluded.raw_payload,
        updated_at = now()
  returning id, workspace_id, space_id, external_provider, external_id, name
),
lists_seed as (
  select * from (values
    ('90070433129', '901314999520', 'clickup', '901322414076', 'ORIGINAIS', 1, false, '{"source":"clickup_seed"}'::jsonb),
    ('90070433129', '901314999520', 'clickup', '901316478723', 'PROJETOS BACKLOG', 2, false, '{"source":"clickup_seed"}'::jsonb),
    ('90070433129', '901314999520', 'clickup', '901317310376', 'Calendário 2025 - Plataforma', 3, false, '{"source":"clickup_seed"}'::jsonb),
    ('90130989939', null, 'clickup', '901303409438', 'Captação de recursos', 1, false, '{"source":"clickup_seed"}'::jsonb),
    ('90130989939', null, 'clickup', '901316499319', 'Festivais e Prêmios', 2, false, '{"source":"clickup_seed"}'::jsonb),
    ('90130989939', null, 'clickup', '901303347884', 'Cadastros ANCINE', 3, false, '{"source":"clickup_seed"}'::jsonb),
    ('90130989939', null, 'clickup', '901304292009', 'Ações Gerais', 4, false, '{"source":"clickup_seed"}'::jsonb)
  ) as value(space_external_id, folder_external_id, external_provider, external_id, name, position, archived, raw_payload)
),
lists_upsert as (
  insert into public.task_lists (workspace_id, space_id, folder_id, external_provider, external_id, name, position, archived, raw_payload)
  select s.workspace_id, s.id, f.id, l.external_provider, l.external_id, l.name, l.position, l.archived, l.raw_payload
  from lists_seed l
  join spaces_upsert s on s.external_provider = 'clickup' and s.external_id = l.space_external_id
  join workspace_row w on w.id = s.workspace_id
  left join folder_upsert f on f.external_provider = 'clickup' and f.external_id = l.folder_external_id and f.space_id = s.id
  on conflict (space_id, external_provider, external_id) do update
    set folder_id = excluded.folder_id,
        name = excluded.name,
        position = excluded.position,
        archived = excluded.archived,
        raw_payload = excluded.raw_payload,
        updated_at = now()
  returning id, workspace_id, space_id, folder_id, external_provider, external_id, name
),
teams_upsert as (
  insert into public.teams (workspace_id, external_provider, external_id, name, color, raw_payload)
  select w.id, 'local', 'marketing-lmn', 'Marketing LMN', 'yellow', '{"source":"initial_seed"}'::jsonb
  from workspace_row w
  on conflict (workspace_id, external_provider, external_id) do update
    set name = excluded.name,
        color = excluded.color,
        raw_payload = excluded.raw_payload,
        updated_at = now()
  returning id, workspace_id, external_provider, external_id, name
),
link_seed as (
  select workspace_id, 'space'::text as entity_type, id as entity_id, external_provider as external_system, external_id, null::text as external_url
  from spaces_upsert
  union all
  select workspace_id, 'folder', id, external_provider, external_id, null::text
  from folder_upsert
  union all
  select workspace_id, 'list', id, external_provider, external_id, null::text
  from lists_upsert
  union all
  select workspace_id, 'team', id, 'originais_dashboard', external_id, null::text
  from teams_upsert
)
insert into public.external_links (workspace_id, entity_type, entity_id, external_system, external_id, external_url, metadata)
select workspace_id, entity_type, entity_id, external_system, external_id, external_url, '{"source":"initial_seed"}'::jsonb
from link_seed
on conflict (workspace_id, external_system, external_id) do update
  set entity_type = excluded.entity_type,
      entity_id = excluded.entity_id,
      external_url = excluded.external_url,
      metadata = excluded.metadata,
      updated_at = now();
