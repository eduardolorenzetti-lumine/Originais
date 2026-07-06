create table if not exists public.task_scope_settings (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  scope_kind text not null,
  scope_key text not null,
  space_id bigint not null references public.spaces(id) on delete cascade,
  folder_id bigint references public.folders(id) on delete cascade,
  list_id bigint references public.task_lists(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_scope_settings_scope_kind_check check (scope_kind in ('space', 'folder', 'list')),
  constraint task_scope_settings_scope_shape_check check (
    (scope_kind = 'space' and folder_id is null and list_id is null)
    or (scope_kind = 'folder' and folder_id is not null and list_id is null)
    or (scope_kind = 'list' and list_id is not null)
  ),
  constraint task_scope_settings_workspace_scope_key unique (workspace_id, scope_kind, scope_key)
);

create table if not exists public.task_status_options (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  scope_setting_id bigint not null references public.task_scope_settings(id) on delete cascade,
  name text not null,
  normalized_status text not null default 'todo',
  color text,
  position integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_status_options_normalized_status_check check (normalized_status in ('todo', 'in_progress', 'review', 'done', 'archived'))
);

create table if not exists public.custom_field_definitions (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  scope_setting_id bigint not null references public.task_scope_settings(id) on delete cascade,
  name text not null,
  field_type text not null default 'text',
  position integer not null default 0,
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  archived boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_field_definitions_field_type_check check (field_type in ('text', 'number', 'date', 'select', 'multi_select', 'checkbox', 'url', 'person'))
);

create table if not exists public.task_custom_field_values (
  task_id bigint not null references public.tasks(id) on delete cascade,
  custom_field_id bigint not null references public.custom_field_definitions(id) on delete cascade,
  value jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (task_id, custom_field_id)
);

create index if not exists task_scope_settings_workspace_idx on public.task_scope_settings (workspace_id, scope_kind);
create index if not exists task_scope_settings_space_idx on public.task_scope_settings (space_id);
create index if not exists task_scope_settings_folder_idx on public.task_scope_settings (folder_id);
create index if not exists task_scope_settings_list_idx on public.task_scope_settings (list_id);
create index if not exists task_status_options_scope_idx on public.task_status_options (scope_setting_id, position);
create index if not exists custom_field_definitions_scope_idx on public.custom_field_definitions (scope_setting_id, position);
create index if not exists task_custom_field_values_field_idx on public.task_custom_field_values (custom_field_id);

create unique index if not exists task_status_options_scope_lower_name_key
  on public.task_status_options (scope_setting_id, lower(name))
  where archived = false;

create unique index if not exists custom_field_definitions_scope_lower_name_key
  on public.custom_field_definitions (scope_setting_id, lower(name))
  where archived = false;

create trigger task_scope_settings_set_updated_at
  before update on public.task_scope_settings
  for each row execute function public.set_updated_at();

create trigger task_status_options_set_updated_at
  before update on public.task_status_options
  for each row execute function public.set_updated_at();

create trigger custom_field_definitions_set_updated_at
  before update on public.custom_field_definitions
  for each row execute function public.set_updated_at();

create trigger task_custom_field_values_set_updated_at
  before update on public.task_custom_field_values
  for each row execute function public.set_updated_at();

alter table public.task_scope_settings enable row level security;
alter table public.task_status_options enable row level security;
alter table public.custom_field_definitions enable row level security;
alter table public.task_custom_field_values enable row level security;

create policy task_scope_settings_member_select on public.task_scope_settings
  for select to authenticated
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = task_scope_settings.workspace_id
        and wm.auth_user_id = (select auth.uid())
    )
  );

create policy task_scope_settings_editor_write on public.task_scope_settings
  for all to authenticated
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = task_scope_settings.workspace_id
        and wm.auth_user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = task_scope_settings.workspace_id
        and wm.auth_user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'editor')
    )
  );

create policy task_status_options_member_select on public.task_status_options
  for select to authenticated
  using (
    exists (
      select 1 from public.task_scope_settings tss
      join public.workspace_members wm on wm.workspace_id = tss.workspace_id
      where tss.id = task_status_options.scope_setting_id
        and wm.auth_user_id = (select auth.uid())
    )
  );

create policy task_status_options_editor_write on public.task_status_options
  for all to authenticated
  using (
    exists (
      select 1 from public.task_scope_settings tss
      join public.workspace_members wm on wm.workspace_id = tss.workspace_id
      where tss.id = task_status_options.scope_setting_id
        and wm.auth_user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.task_scope_settings tss
      join public.workspace_members wm on wm.workspace_id = tss.workspace_id
      where tss.id = task_status_options.scope_setting_id
        and tss.workspace_id = task_status_options.workspace_id
        and wm.auth_user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'editor')
    )
  );

create policy custom_field_definitions_member_select on public.custom_field_definitions
  for select to authenticated
  using (
    exists (
      select 1 from public.task_scope_settings tss
      join public.workspace_members wm on wm.workspace_id = tss.workspace_id
      where tss.id = custom_field_definitions.scope_setting_id
        and wm.auth_user_id = (select auth.uid())
    )
  );

create policy custom_field_definitions_editor_write on public.custom_field_definitions
  for all to authenticated
  using (
    exists (
      select 1 from public.task_scope_settings tss
      join public.workspace_members wm on wm.workspace_id = tss.workspace_id
      where tss.id = custom_field_definitions.scope_setting_id
        and wm.auth_user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.task_scope_settings tss
      join public.workspace_members wm on wm.workspace_id = tss.workspace_id
      where tss.id = custom_field_definitions.scope_setting_id
        and tss.workspace_id = custom_field_definitions.workspace_id
        and wm.auth_user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'editor')
    )
  );

create policy task_custom_field_values_member_select on public.task_custom_field_values
  for select to authenticated
  using (
    exists (
      select 1 from public.tasks t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = task_custom_field_values.task_id
        and wm.auth_user_id = (select auth.uid())
    )
  );

create policy task_custom_field_values_editor_write on public.task_custom_field_values
  for all to authenticated
  using (
    exists (
      select 1 from public.tasks t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = task_custom_field_values.task_id
        and wm.auth_user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      join public.custom_field_definitions cfd on cfd.id = task_custom_field_values.custom_field_id
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = task_custom_field_values.task_id
        and cfd.workspace_id = t.workspace_id
        and wm.auth_user_id = (select auth.uid())
        and wm.role in ('owner', 'admin', 'editor')
    )
  );

grant select, insert, update, delete on
  public.task_scope_settings,
  public.task_status_options,
  public.custom_field_definitions,
  public.task_custom_field_values
to authenticated;

grant usage, select on sequence public.task_scope_settings_id_seq to authenticated;
grant usage, select on sequence public.task_status_options_id_seq to authenticated;
grant usage, select on sequence public.custom_field_definitions_id_seq to authenticated;
