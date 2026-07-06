import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260628104500_initial_tasks_schema.sql"),
  "utf8",
);
const relationDeleteGrantMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260629141000_task_relation_delete_grants.sql"),
  "utf8",
);
const userPreferencesMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260630070000_user_preferences.sql"),
  "utf8",
);
const scopeSettingsMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260630172000_scope_settings.sql"),
  "utf8",
);

describe("initial Supabase migration", () => {
  it("enables RLS on every app table", () => {
    const tables = [
      "workspaces",
      "workspace_members",
      "spaces",
      "folders",
      "task_lists",
      "people",
      "teams",
      "team_members",
      "tasks",
      "task_assignees",
      "task_teams",
      "tags",
      "task_tags",
      "external_links",
    ];

    tables.forEach((table) => {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
    });
  });

  it("uses current Supabase RLS patterns and indexed access paths", () => {
    expect(migration).not.toContain("auth.role()");
    expect(migration).toContain("(select auth.uid())");
    expect(migration).toContain("create index if not exists tasks_workspace_status_due_idx");
    expect(migration).toContain("create index if not exists task_assignees_person_idx");
    expect(migration).toContain("create index if not exists external_links_workspace_entity_idx");
    expect(migration).toContain("grant usage on schema public to authenticated;");
  });

  it("grants relation deletes needed for replacing assignees and tags", () => {
    expect(relationDeleteGrantMigration).toContain("grant delete on");
    expect(relationDeleteGrantMigration).toContain("public.task_assignees");
    expect(relationDeleteGrantMigration).toContain("public.task_tags");
    expect(relationDeleteGrantMigration).toContain("to authenticated;");
  });

  it("protects user preferences with scoped RLS and authenticated grants", () => {
    expect(userPreferencesMigration).toContain("create table if not exists public.user_preferences");
    expect(userPreferencesMigration).toContain("alter table public.user_preferences enable row level security;");
    expect(userPreferencesMigration).toContain("auth_user_id = (select auth.uid())");
    expect(userPreferencesMigration).toContain("workspace_members");
    expect(userPreferencesMigration).toContain("grant select, insert, update, delete on public.user_preferences to authenticated;");
  });

  it("adds dedicated scope settings tables with RLS and grants", () => {
    [
      "task_scope_settings",
      "task_status_options",
      "custom_field_definitions",
      "task_custom_field_values",
    ].forEach((table) => {
      expect(scopeSettingsMigration).toContain(`create table if not exists public.${table}`);
      expect(scopeSettingsMigration).toContain(`alter table public.${table} enable row level security;`);
    });

    expect(scopeSettingsMigration).toContain("scope_kind in ('space', 'folder', 'list')");
    expect(scopeSettingsMigration).toContain("field_type in ('text', 'number', 'date', 'select', 'multi_select', 'checkbox', 'url', 'person')");
    expect(scopeSettingsMigration).toContain("wm.auth_user_id = (select auth.uid())");
    expect(scopeSettingsMigration).toContain("wm.role in ('owner', 'admin', 'editor')");
    expect(scopeSettingsMigration).toContain("grant select, insert, update, delete on");
    expect(scopeSettingsMigration).toContain("public.task_scope_settings");
    expect(scopeSettingsMigration).toContain("public.custom_field_definitions");
  });
});
