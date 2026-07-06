import { supabase } from "../../lib/supabase";
import { persistUserPreference } from "./userPreferences";

export type EditableScopeConfig = {
  statuses: string[];
  fields: string[];
};

type ScopeKind = "space" | "folder" | "list";

type ParsedScopeKey = {
  kind: ScopeKind;
  spaceName: string;
  folderName?: string;
  listName?: string;
};

type IdRecord = {
  id: number;
};

type WorkspaceRecord = IdRecord;

type ScopeSettingRecord = IdRecord & {
  workspace_id: number;
};

type DbScopeConfigRow = {
  scope_key: string;
  task_status_options?: Array<{ name: string; position: number | null; archived: boolean | null }> | null;
  custom_field_definitions?: Array<{ name: string; position: number | null; archived: boolean | null }> | null;
};

const workspaceSlug = "lumine";

export async function loadScopeConfigurations(): Promise<Record<string, EditableScopeConfig>> {
  const client = supabase;
  if (!client) return {};

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return {};

  const { data, error } = await client
    .from("task_scope_settings")
    .select(
      `
        scope_key,
        task_status_options(name,position,archived),
        custom_field_definitions(name,position,archived)
      `,
    );

  if (error) {
    if (isMissingScopeSchemaError(error)) return {};
    throw error;
  }

  return mapScopeConfigRows((data ?? []) as unknown as DbScopeConfigRow[]);
}

export async function persistScopeConfiguration(scopeKey: string, config: EditableScopeConfig) {
  try {
    const scopeSetting = await ensureScopeSetting(scopeKey);
    if (!scopeSetting) {
      await persistUserPreference("scope_config", scopeKey, config);
      return;
    }

    await replaceScopeStatusOptions(scopeSetting, config.statuses);
    await replaceScopeFieldDefinitions(scopeSetting, config.fields);
  } catch (error) {
    if (!isMissingScopeSchemaError(error)) throw error;
    await persistUserPreference("scope_config", scopeKey, config);
  }
}

export function mapScopeConfigRows(rows: DbScopeConfigRow[]) {
  return rows.reduce<Record<string, EditableScopeConfig>>((configs, row) => {
    const statuses = (row.task_status_options ?? [])
      .filter((status) => !status.archived)
      .sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
      .map((status) => status.name);
    const fields = (row.custom_field_definitions ?? [])
      .filter((field) => !field.archived)
      .sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
      .map((field) => field.name);

    configs[row.scope_key] = { statuses, fields };
    return configs;
  }, {});
}

export function parseScopeKey(scopeKey: string): ParsedScopeKey | null {
  const [kind, spaceName = "", folderName = "", listName = ""] = scopeKey.split(":");

  if (kind !== "space" && kind !== "folder" && kind !== "list") return null;
  if (!spaceName.trim()) return null;
  if (kind === "folder" && !folderName.trim()) return null;
  if (kind === "list" && !listName.trim()) return null;

  return {
    kind,
    spaceName,
    folderName: folderName || undefined,
    listName: listName || undefined,
  };
}

export function normalizeStatusOption(name: string) {
  const normalized = normalizeText(name);
  if (normalized.includes("conclu") || normalized === "done") return "done";
  if (normalized.includes("revis")) return "review";
  if (normalized.includes("fazer") || normalized.includes("backlog") || normalized === "todo") return "todo";
  return "in_progress";
}

async function ensureScopeSetting(scopeKey: string) {
  const client = supabase;
  if (!client) return null;

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;

  const parsedScope = parseScopeKey(scopeKey);
  if (!parsedScope) return null;

  const workspace = await resolveWorkspaceRecord();
  if (!workspace) return null;

  const space = await resolveSpaceRecord(workspace.id, parsedScope.spaceName);
  if (!space) return null;

  const folder = parsedScope.folderName ? await resolveFolderRecord(space.id, parsedScope.folderName) : null;
  if (parsedScope.kind === "folder" && !folder) return null;

  const list = parsedScope.kind === "list" && parsedScope.listName ? await resolveListRecord(space.id, parsedScope.listName, folder?.id ?? null) : null;
  if (parsedScope.kind === "list" && !list) return null;

  const payload = {
    workspace_id: workspace.id,
    scope_kind: parsedScope.kind,
    scope_key: scopeKey,
    space_id: space.id,
    folder_id: parsedScope.kind === "folder" || parsedScope.kind === "list" ? folder?.id ?? null : null,
    list_id: parsedScope.kind === "list" ? list?.id ?? null : null,
  };

  const { data, error } = await client
    .from("task_scope_settings")
    .upsert(payload, { onConflict: "workspace_id,scope_kind,scope_key" })
    .select("id,workspace_id")
    .maybeSingle();
  if (error) throw error;

  return data as ScopeSettingRecord | null;
}

async function replaceScopeStatusOptions(scopeSetting: ScopeSettingRecord, statuses: string[]) {
  const client = supabase;
  if (!client) return;

  const { error: deleteError } = await client.from("task_status_options").delete().eq("scope_setting_id", scopeSetting.id);
  if (deleteError) throw deleteError;

  const cleanStatuses = uniqueCleanValues(statuses);
  if (cleanStatuses.length === 0) return;

  const { error: insertError } = await client.from("task_status_options").insert(
    cleanStatuses.map((name, index) => ({
      workspace_id: scopeSetting.workspace_id,
      scope_setting_id: scopeSetting.id,
      name,
      normalized_status: normalizeStatusOption(name),
      position: index,
    })),
  );
  if (insertError) throw insertError;
}

async function replaceScopeFieldDefinitions(scopeSetting: ScopeSettingRecord, fields: string[]) {
  const client = supabase;
  if (!client) return;

  const { error: deleteError } = await client.from("custom_field_definitions").delete().eq("scope_setting_id", scopeSetting.id);
  if (deleteError) throw deleteError;

  const cleanFields = uniqueCleanValues(fields);
  if (cleanFields.length === 0) return;

  const { error: insertError } = await client.from("custom_field_definitions").insert(
    cleanFields.map((name, index) => ({
      workspace_id: scopeSetting.workspace_id,
      scope_setting_id: scopeSetting.id,
      name,
      field_type: "text",
      position: index,
    })),
  );
  if (insertError) throw insertError;
}

async function resolveWorkspaceRecord() {
  const client = supabase;
  if (!client) return null;

  const { data, error } = await client.from("workspaces").select("id").eq("slug", workspaceSlug).maybeSingle();
  if (error) throw error;
  return data as WorkspaceRecord | null;
}

async function resolveSpaceRecord(workspaceId: number, spaceName: string) {
  const client = supabase;
  if (!client) return null;

  const { data, error } = await client
    .from("spaces")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", spaceName)
    .maybeSingle();
  if (error) throw error;
  return data as IdRecord | null;
}

async function resolveFolderRecord(spaceId: number, folderName: string) {
  const client = supabase;
  if (!client) return null;

  const { data, error } = await client.from("folders").select("id").eq("space_id", spaceId).eq("name", folderName).maybeSingle();
  if (error) throw error;
  return data as IdRecord | null;
}

async function resolveListRecord(spaceId: number, listName: string, folderId: number | null) {
  const client = supabase;
  if (!client) return null;

  let query = client.from("task_lists").select("id").eq("space_id", spaceId).eq("name", listName);
  query = folderId ? query.eq("folder_id", folderId) : query.is("folder_id", null);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as IdRecord | null;
}

function uniqueCleanValues(values: string[]) {
  const seen = new Set<string>();
  const nextValues: string[] = [];

  values.forEach((value) => {
    const cleanValue = value.trim();
    if (!cleanValue || seen.has(cleanValue)) return;
    seen.add(cleanValue);
    nextValues.push(cleanValue);
  });

  return nextValues;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isMissingScopeSchemaError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const possibleError = error as { code?: string; message?: string };
  return possibleError.code === "42P01" || /schema cache|does not exist|task_scope_settings/i.test(possibleError.message ?? "");
}
