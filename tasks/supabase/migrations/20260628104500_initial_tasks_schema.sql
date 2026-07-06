-- Initial Tasks schema for Supabase/Postgres.
-- Local-first migration: review before applying to project kqmkqzsktmcmrehktejs.

create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_members_role_check check (role in ('owner', 'admin', 'editor', 'member', 'viewer')),
  constraint workspace_members_workspace_user_key unique (workspace_id, auth_user_id)
);

create table if not exists public.spaces (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  external_provider text not null default 'local',
  external_id text,
  name text not null,
  color text,
  archived boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spaces_external_provider_check check (external_provider in ('local', 'clickup', 'notion', 'luxstudio', 'dashboard')),
  constraint spaces_workspace_provider_external_key unique (workspace_id, external_provider, external_id)
);

create table if not exists public.folders (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  space_id bigint not null references public.spaces(id) on delete cascade,
  external_provider text not null default 'local',
  external_id text,
  name text not null,
  position integer,
  archived boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint folders_external_provider_check check (external_provider in ('local', 'clickup', 'notion', 'luxstudio', 'dashboard')),
  constraint folders_space_provider_external_key unique (space_id, external_provider, external_id)
);

create table if not exists public.task_lists (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  space_id bigint not null references public.spaces(id) on delete cascade,
  folder_id bigint references public.folders(id) on delete set null,
  external_provider text not null default 'local',
  external_id text,
  name text not null,
  position integer,
  archived boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_lists_external_provider_check check (external_provider in ('local', 'clickup', 'notion', 'luxstudio', 'dashboard')),
  constraint task_lists_space_provider_external_key unique (space_id, external_provider, external_id)
);

create table if not exists public.people (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  external_provider text not null default 'local',
  external_id text,
  display_name text not null,
  email text,
  avatar_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_external_provider_check check (external_provider in ('local', 'clickup', 'notion', 'luxstudio', 'dashboard')),
  constraint people_workspace_provider_external_key unique (workspace_id, external_provider, external_id)
);

create table if not exists public.teams (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  external_provider text not null default 'local',
  external_id text,
  name text not null,
  color text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_external_provider_check check (external_provider in ('local', 'clickup', 'notion', 'luxstudio', 'dashboard')),
  constraint teams_workspace_provider_external_key unique (workspace_id, external_provider, external_id)
);

create table if not exists public.team_members (
  team_id bigint not null references public.teams(id) on delete cascade,
  person_id bigint not null references public.people(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, person_id)
);

create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  space_id bigint not null references public.spaces(id) on delete cascade,
  folder_id bigint references public.folders(id) on delete set null,
  list_id bigint references public.task_lists(id) on delete set null,
  parent_task_id bigint references public.tasks(id) on delete set null,
  external_provider text not null default 'local',
  external_id text,
  parent_external_id text,
  code text,
  title text not null,
  description text,
  status_name text not null default 'A fazer',
  status_type text,
  normalized_status text not null default 'todo',
  priority text not null default 'normal',
  due_at timestamptz,
  start_at timestamptz,
  completed_at timestamptz,
  archived boolean not null default false,
  source_url text,
  comments_count integer not null default 0,
  subtasks_done integer not null default 0,
  subtasks_total integer not null default 0,
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_external_provider_check check (external_provider in ('local', 'clickup', 'notion', 'luxstudio', 'dashboard')),
  constraint tasks_normalized_status_check check (normalized_status in ('todo', 'in_progress', 'review', 'done', 'archived')),
  constraint tasks_priority_check check (priority in ('urgent', 'high', 'normal', 'low')),
  constraint tasks_subtasks_check check (subtasks_done >= 0 and subtasks_total >= 0 and subtasks_done <= subtasks_total),
  constraint tasks_workspace_provider_external_key unique (workspace_id, external_provider, external_id)
);

create table if not exists public.task_assignees (
  task_id bigint not null references public.tasks(id) on delete cascade,
  person_id bigint not null references public.people(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, person_id)
);

create table if not exists public.task_teams (
  task_id bigint not null references public.tasks(id) on delete cascade,
  team_id bigint not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, team_id)
);

create table if not exists public.tags (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_tags (
  task_id bigint not null references public.tasks(id) on delete cascade,
  tag_id bigint not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, tag_id)
);

create table if not exists public.external_links (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  entity_type text not null,
  entity_id bigint not null,
  external_system text not null,
  external_id text not null,
  external_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_links_entity_type_check check (entity_type in ('space', 'folder', 'list', 'task', 'person', 'team', 'tag')),
  constraint external_links_external_system_check check (external_system in ('clickup', 'notion', 'originais_dashboard', 'luxstudio')),
  constraint external_links_workspace_entity_system_key unique (workspace_id, entity_type, entity_id, external_system),
  constraint external_links_workspace_system_external_key unique (workspace_id, external_system, external_id)
);

create unique index if not exists tags_workspace_lower_name_key on public.tags (workspace_id, lower(name));

create index if not exists workspace_members_auth_user_idx on public.workspace_members (auth_user_id, workspace_id);
create index if not exists spaces_workspace_idx on public.spaces (workspace_id);
create index if not exists folders_workspace_space_idx on public.folders (workspace_id, space_id);
create index if not exists task_lists_workspace_space_idx on public.task_lists (workspace_id, space_id);
create index if not exists task_lists_folder_idx on public.task_lists (folder_id);
create index if not exists people_workspace_name_idx on public.people (workspace_id, display_name);
create index if not exists teams_workspace_name_idx on public.teams (workspace_id, name);
create index if not exists team_members_person_idx on public.team_members (person_id);
create index if not exists tasks_workspace_status_due_idx on public.tasks (workspace_id, normalized_status, due_at);
create index if not exists tasks_workspace_list_idx on public.tasks (workspace_id, list_id);
create index if not exists tasks_parent_task_idx on public.tasks (parent_task_id);
create index if not exists task_assignees_person_idx on public.task_assignees (person_id);
create index if not exists task_teams_team_idx on public.task_teams (team_id);
create index if not exists task_tags_tag_idx on public.task_tags (tag_id);
create index if not exists external_links_workspace_entity_idx on public.external_links (workspace_id, entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create trigger workspace_members_set_updated_at
  before update on public.workspace_members
  for each row execute function public.set_updated_at();

create trigger spaces_set_updated_at
  before update on public.spaces
  for each row execute function public.set_updated_at();

create trigger folders_set_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();

create trigger task_lists_set_updated_at
  before update on public.task_lists
  for each row execute function public.set_updated_at();

create trigger people_set_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger tags_set_updated_at
  before update on public.tags
  for each row execute function public.set_updated_at();

create trigger external_links_set_updated_at
  before update on public.external_links
  for each row execute function public.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.spaces enable row level security;
alter table public.folders enable row level security;
alter table public.task_lists enable row level security;
alter table public.people enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_teams enable row level security;
alter table public.tags enable row level security;
alter table public.task_tags enable row level security;
alter table public.external_links enable row level security;

create policy workspaces_member_select on public.workspaces
  for select to authenticated
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspaces.id
        and wm.auth_user_id = (select auth.uid())
    )
  );

create policy workspace_members_self_select on public.workspace_members
  for select to authenticated
  using (auth_user_id = (select auth.uid()));

create policy spaces_member_select on public.spaces
  for select to authenticated
  using (exists (select 1 from public.workspace_members wm where wm.workspace_id = spaces.workspace_id and wm.auth_user_id = (select auth.uid())));

create policy folders_member_select on public.folders
  for select to authenticated
  using (exists (select 1 from public.workspace_members wm where wm.workspace_id = folders.workspace_id and wm.auth_user_id = (select auth.uid())));

create policy task_lists_member_select on public.task_lists
  for select to authenticated
  using (exists (select 1 from public.workspace_members wm where wm.workspace_id = task_lists.workspace_id and wm.auth_user_id = (select auth.uid())));

create policy people_member_select on public.people
  for select to authenticated
  using (exists (select 1 from public.workspace_members wm where wm.workspace_id = people.workspace_id and wm.auth_user_id = (select auth.uid())));

create policy teams_member_select on public.teams
  for select to authenticated
  using (exists (select 1 from public.workspace_members wm where wm.workspace_id = teams.workspace_id and wm.auth_user_id = (select auth.uid())));

create policy tasks_member_select on public.tasks
  for select to authenticated
  using (exists (select 1 from public.workspace_members wm where wm.workspace_id = tasks.workspace_id and wm.auth_user_id = (select auth.uid())));

create policy tags_member_select on public.tags
  for select to authenticated
  using (exists (select 1 from public.workspace_members wm where wm.workspace_id = tags.workspace_id and wm.auth_user_id = (select auth.uid())));

create policy external_links_member_select on public.external_links
  for select to authenticated
  using (exists (select 1 from public.workspace_members wm where wm.workspace_id = external_links.workspace_id and wm.auth_user_id = (select auth.uid())));

create policy spaces_editor_write on public.spaces
  for all to authenticated
  using (exists (select 1 from public.workspace_members wm where wm.workspace_id = spaces.workspace_id and wm.auth_user_id = (select auth.uid()) and wm.role in ('owner', 'admin', 'editor')))
  with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = spaces.workspace_id and wm.auth_user_id = (select auth.uid()) and wm.role in ('owner', 'admin', 'editor')));

create policy folders_editor_write on public.folders
  for all to authenticated
  using (exists (select 1 from public.workspace_members wm where wm.workspace_id = folders.workspace_id and wm.auth_user_id = (select auth.uid()) and wm.role in ('owner', 'admin', 'editor')))
  with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = folders.workspace_id and wm.auth_user_id = (select auth.uid()) and wm.role in ('owner', 'admin', 'editor')));

create policy task_lists_editor_write on public.task_lists
  for all to authenticated
  using (exists (select 1 from public.workspace_members wm where wm.workspace_id = task_lists.workspace_id and wm.auth_user_id = (select auth.uid()) and wm.role in ('owner', 'admin', 'editor')))
  with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = task_lists.workspace_id and wm.auth_user_id = (select auth.uid()) and wm.role in ('owner', 'admin', 'editor')));

create policy people_editor_write on public.people
  for all to authenticated
  using (exists (select 1 from public.workspace_members wm where wm.workspace_id = people.workspace_id and wm.auth_user_id = (select auth.uid()) and wm.role in ('owner', 'admin', 'editor')))
  with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = people.workspace_id and wm.auth_user_id = (select auth.uid()) and wm.role in ('owner', 'admin', 'editor')));

create policy teams_editor_write on public.teams
  for all to authenticated
  using (exists (select 1 from public.workspace_members wm where wm.workspace_id = teams.workspace_id and wm.auth_user_id = (select auth.uid()) and wm.role in ('owner', 'admin', 'editor')))
  with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = teams.workspace_id and wm.auth_user_id = (select auth.uid()) and wm.role in ('owner', 'admin', 'editor')));

create policy tasks_editor_write on public.tasks
  for all to authenticated
  using (exists (select 1 from public.workspace_members wm where wm.workspace_id = tasks.workspace_id and wm.auth_user_id = (select auth.uid()) and wm.role in ('owner', 'admin', 'editor')))
  with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = tasks.workspace_id and wm.auth_user_id = (select auth.uid()) and wm.role in ('owner', 'admin', 'editor')));

create policy tags_editor_write on public.tags
  for all to authenticated
  using (exists (select 1 from public.workspace_members wm where wm.workspace_id = tags.workspace_id and wm.auth_user_id = (select auth.uid()) and wm.role in ('owner', 'admin', 'editor')))
  with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = tags.workspace_id and wm.auth_user_id = (select auth.uid()) and wm.role in ('owner', 'admin', 'editor')));

create policy external_links_editor_write on public.external_links
  for all to authenticated
  using (exists (select 1 from public.workspace_members wm where wm.workspace_id = external_links.workspace_id and wm.auth_user_id = (select auth.uid()) and wm.role in ('owner', 'admin', 'editor')))
  with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = external_links.workspace_id and wm.auth_user_id = (select auth.uid()) and wm.role in ('owner', 'admin', 'editor')));

create policy team_members_member_select on public.team_members
  for select to authenticated
  using (
    exists (
      select 1 from public.teams t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = team_members.team_id
        and wm.auth_user_id = (select auth.uid())
    )
  );

create policy team_members_editor_write on public.team_members
  for all to authenticated
  using (
    exists (
      select 1 from public.teams t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = team_members.team_id
        and wm.auth_user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.teams t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = team_members.team_id
        and wm.auth_user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'editor')
    )
  );

create policy task_assignees_member_select on public.task_assignees
  for select to authenticated
  using (
    exists (
      select 1 from public.tasks t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = task_assignees.task_id
        and wm.auth_user_id = (select auth.uid())
    )
  );

create policy task_assignees_editor_write on public.task_assignees
  for all to authenticated
  using (
    exists (
      select 1 from public.tasks t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = task_assignees.task_id
        and wm.auth_user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = task_assignees.task_id
        and wm.auth_user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'editor')
    )
  );

create policy task_teams_member_select on public.task_teams
  for select to authenticated
  using (
    exists (
      select 1 from public.tasks t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = task_teams.task_id
        and wm.auth_user_id = (select auth.uid())
    )
  );

create policy task_teams_editor_write on public.task_teams
  for all to authenticated
  using (
    exists (
      select 1 from public.tasks t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = task_teams.task_id
        and wm.auth_user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = task_teams.task_id
        and wm.auth_user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'editor')
    )
  );

create policy task_tags_member_select on public.task_tags
  for select to authenticated
  using (
    exists (
      select 1 from public.tasks t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = task_tags.task_id
        and wm.auth_user_id = (select auth.uid())
    )
  );

create policy task_tags_editor_write on public.task_tags
  for all to authenticated
  using (
    exists (
      select 1 from public.tasks t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = task_tags.task_id
        and wm.auth_user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = task_tags.task_id
        and wm.auth_user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'editor')
    )
  );

grant usage on schema public to authenticated;
grant select on
  public.workspaces,
  public.workspace_members
to authenticated;

grant select, insert, update on
  public.spaces,
  public.folders,
  public.task_lists,
  public.people,
  public.teams,
  public.team_members,
  public.tasks,
  public.task_assignees,
  public.task_teams,
  public.tags,
  public.task_tags,
  public.external_links
to authenticated;

grant usage, select on all sequences in schema public to authenticated;
