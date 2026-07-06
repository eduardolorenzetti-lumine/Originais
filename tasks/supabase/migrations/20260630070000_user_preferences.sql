-- User-level preferences for views, layouts, ordering, and scoped configs.

create table if not exists public.user_preferences (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  scope_kind text not null,
  scope_key text not null,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_scope_kind_check check (scope_kind in ('layout', 'scope_config', 'task_order')),
  constraint user_preferences_workspace_user_scope_key unique (workspace_id, auth_user_id, scope_kind, scope_key)
);

create index if not exists user_preferences_workspace_user_idx
  on public.user_preferences (workspace_id, auth_user_id);

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

drop policy if exists user_preferences_self_select on public.user_preferences;
create policy user_preferences_self_select on public.user_preferences
  for select
  to authenticated
  using (
    auth_user_id = (select auth.uid())
    and exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = user_preferences.workspace_id
        and wm.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists user_preferences_self_insert on public.user_preferences;
create policy user_preferences_self_insert on public.user_preferences
  for insert
  to authenticated
  with check (
    auth_user_id = (select auth.uid())
    and exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = user_preferences.workspace_id
        and wm.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists user_preferences_self_update on public.user_preferences;
create policy user_preferences_self_update on public.user_preferences
  for update
  to authenticated
  using (
    auth_user_id = (select auth.uid())
    and exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = user_preferences.workspace_id
        and wm.auth_user_id = (select auth.uid())
    )
  )
  with check (
    auth_user_id = (select auth.uid())
    and exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = user_preferences.workspace_id
        and wm.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists user_preferences_self_delete on public.user_preferences;
create policy user_preferences_self_delete on public.user_preferences
  for delete
  to authenticated
  using (
    auth_user_id = (select auth.uid())
    and exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = user_preferences.workspace_id
        and wm.auth_user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.user_preferences to authenticated;
grant usage, select on sequence public.user_preferences_id_seq to authenticated;
