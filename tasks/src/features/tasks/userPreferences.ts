import { supabase } from "../../lib/supabase";

export type UserPreferenceScopeKind = "layout" | "scope_config" | "task_order";

export type UserPreferenceRow = {
  scopeKind: UserPreferenceScopeKind;
  scopeKey: string;
  preferences: Record<string, unknown>;
};

export type LayoutPreferences = {
  view?: string;
  enabledViews?: string[];
  groupingMode?: string;
  subtaskVisibilityMode?: string;
  detailMode?: string;
  selectedColumns?: string[];
  sidebarWidth?: number;
  sidebarEntityOrder?: Record<string, string[]>;
};

export type ScopeConfigPreferences = {
  statuses: string[];
  fields: string[];
};

export type TaskOrderPreferences = {
  order: string[];
};

type WorkspaceRecord = {
  id: number | string;
};

type DbUserPreferenceRow = {
  scope_kind: string;
  scope_key: string;
  preferences: unknown;
};

const workspaceSlug = "lumine";
const scopeKinds: UserPreferenceScopeKind[] = ["layout", "scope_config", "task_order"];
const viewOptions = ["list", "table", "gantt", "calendar", "board", "mind_map", "team"] as const;
const groupingOptions = ["none", "status", "assignee", "priority", "tag", "due_date", "task_type", "space", "folder", "list"] as const;
const subtaskVisibilityOptions = ["collapsed", "expanded"] as const;
const detailModeOptions = ["side", "modal"] as const;
const listColumnOptions = [
  "status",
  "assignees",
  "dueDate",
  "priority",
  "tags",
  "comments",
  "subtasks",
  "taskType",
  "space",
  "folder",
  "list",
] as const;

export async function loadUserPreferences(): Promise<UserPreferenceRow[]> {
  const context = await resolvePreferenceContext();
  if (!context) return [];

  const { data, error } = await context.client
    .from("user_preferences")
    .select("scope_kind,scope_key,preferences")
    .eq("workspace_id", context.workspaceId)
    .eq("auth_user_id", context.userId);

  if (error) throw error;

  return ((data ?? []) as DbUserPreferenceRow[])
    .filter((row) => isUserPreferenceScopeKind(row.scope_kind))
    .map((row) => ({
      scopeKind: row.scope_kind as UserPreferenceScopeKind,
      scopeKey: row.scope_key,
      preferences: toRecord(row.preferences),
    }));
}

export async function persistUserPreference(
  scopeKind: UserPreferenceScopeKind,
  scopeKey: string,
  preferences: Record<string, unknown>,
) {
  const context = await resolvePreferenceContext();
  if (!context) return;

  const cleanScopeKey = scopeKey.trim();
  if (!cleanScopeKey) return;

  const { error } = await context.client.from("user_preferences").upsert(
    {
      workspace_id: context.workspaceId,
      auth_user_id: context.userId,
      scope_kind: scopeKind,
      scope_key: cleanScopeKey,
      preferences,
    },
    { onConflict: "workspace_id,auth_user_id,scope_kind,scope_key" },
  );

  if (error) throw error;
}

export function coerceLayoutPreferences(rawPreferences: unknown): LayoutPreferences {
  const raw = toRecord(rawPreferences);
  const next: LayoutPreferences = {};

  const view = coerceString(raw.view, viewOptions);
  if (view) next.view = view;

  if ("enabledViews" in raw) next.enabledViews = coerceStringArray(raw.enabledViews, viewOptions);

  const groupingMode = coerceString(raw.groupingMode, groupingOptions);
  if (groupingMode) next.groupingMode = groupingMode;

  const subtaskVisibilityMode = coerceString(raw.subtaskVisibilityMode, subtaskVisibilityOptions);
  if (subtaskVisibilityMode) next.subtaskVisibilityMode = subtaskVisibilityMode;

  const detailMode = coerceString(raw.detailMode, detailModeOptions);
  if (detailMode) next.detailMode = detailMode;

  if ("selectedColumns" in raw) next.selectedColumns = coerceListColumns(raw.selectedColumns);

  const sidebarWidth = coerceNumber(raw.sidebarWidth);
  if (sidebarWidth !== undefined) next.sidebarWidth = Math.min(420, Math.max(220, Math.round(sidebarWidth)));

  if ("sidebarEntityOrder" in raw) next.sidebarEntityOrder = coerceStringRecord(raw.sidebarEntityOrder);

  return next;
}

export function coerceScopeConfigPreferences(rawPreferences: unknown): ScopeConfigPreferences {
  const raw = toRecord(rawPreferences);

  return {
    statuses: coerceStringArray(raw.statuses),
    fields: coerceStringArray(raw.fields),
  };
}

export function coerceTaskOrderPreferences(rawPreferences: unknown): TaskOrderPreferences {
  const raw = toRecord(rawPreferences);

  return {
    order: coerceStringArray(raw.order),
  };
}

export function coerceStringArray(value: unknown, allowedValues?: readonly string[]) {
  if (!Array.isArray(value)) return [];

  const allowedSet = allowedValues ? new Set(allowedValues) : null;
  const seen = new Set<string>();
  const next: string[] = [];

  value.forEach((item) => {
    if (typeof item !== "string") return;
    const cleanItem = item.trim();
    if (!cleanItem || seen.has(cleanItem)) return;
    if (allowedSet && !allowedSet.has(cleanItem)) return;
    seen.add(cleanItem);
    next.push(cleanItem);
  });

  return next;
}

export function coerceListColumns(value: unknown) {
  return coerceStringArray(value).filter((column) => isBaseListColumn(column) || isCustomListColumn(column));
}

export function coerceStringRecord(value: unknown) {
  const raw = toRecord(value);
  const next: Record<string, string[]> = {};

  Object.entries(raw).forEach(([key, order]) => {
    const cleanKey = key.trim();
    if (!cleanKey) return;
    const cleanOrder = coerceStringArray(order);
    if (cleanOrder.length > 0) next[cleanKey] = cleanOrder;
  });

  return next;
}

async function resolvePreferenceContext() {
  const client = supabase;
  if (!client) return null;

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;

  const { data, error } = await client.from("workspaces").select("id").eq("slug", workspaceSlug).maybeSingle();
  if (error) throw error;

  const workspace = data as WorkspaceRecord | null;
  if (!workspace) return null;

  return {
    client,
    workspaceId: workspace.id,
    userId: sessionData.session.user.id,
  };
}

function coerceString(value: unknown, allowedValues: readonly string[]) {
  if (typeof value !== "string") return undefined;
  const cleanValue = value.trim();
  return allowedValues.includes(cleanValue) ? cleanValue : undefined;
}

function coerceNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function isUserPreferenceScopeKind(value: string): value is UserPreferenceScopeKind {
  return scopeKinds.includes(value as UserPreferenceScopeKind);
}

function isBaseListColumn(value: string) {
  return (listColumnOptions as readonly string[]).includes(value);
}

function isCustomListColumn(value: string) {
  const customFieldName = value.slice("custom:".length).trim();
  return value.startsWith("custom:") && customFieldName.length > 0;
}
