import { supabase } from "../../lib/supabase";
import type { EntityUiMeta } from "./types";

export type EntityMetaTarget = {
  kind: "space" | "folder" | "list";
  spaceName: string;
  folderName?: string;
  listName?: string;
};

type EntityRecord = {
  id: number;
  raw_payload: unknown;
};

type SpaceRecord = EntityRecord & {
  workspace_id: number;
};

export async function persistEntityMeta(target: EntityMetaTarget, updates: EntityUiMeta) {
  const client = supabase;
  if (!client) return;

  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) return;

  const record = await resolveEntityRecord(target);
  if (!record) return;

  const tableName = target.kind === "space" ? "spaces" : target.kind === "folder" ? "folders" : "task_lists";
  const payload: Record<string, unknown> = {
    raw_payload: mergeEntityUiPayload(record.raw_payload, updates),
  };

  if (target.kind === "space" && updates.color) payload.color = updates.color;

  const { error } = await client.from(tableName).update(payload).eq("id", record.id);
  if (error) throw error;
}

export async function persistEntityRename(target: EntityMetaTarget, nextName: string) {
  const client = supabase;
  if (!client) return;

  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) return;

  const cleanName = nextName.trim();
  if (!cleanName) return;

  const record = await resolveEntityRecord(target);
  if (!record) return;

  const tableName = target.kind === "space" ? "spaces" : target.kind === "folder" ? "folders" : "task_lists";
  const { error } = await client.from(tableName).update({ name: cleanName }).eq("id", record.id);
  if (error) throw error;
}

export async function persistFolderCreate({ spaceName, folderName }: { spaceName: string; folderName: string }) {
  const client = supabase;
  if (!client) return;

  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) return;

  const space = await resolveSpaceRecord(spaceName);
  if (!space) return;

  const { count, error: countError } = await client
    .from("folders")
    .select("id", { count: "exact", head: true })
    .eq("space_id", space.id);
  if (countError) throw countError;

  const { error } = await client.from("folders").insert({
    workspace_id: space.workspace_id,
    space_id: space.id,
    name: folderName,
    position: count ?? 0,
    external_provider: "local",
    external_id: makeLocalExternalId("folder", space.id, folderName),
    raw_payload: { source: "tasks_ui" },
  });

  if (error) throw error;
}

export async function persistListCreate({
  spaceName,
  folderName,
  listName,
}: {
  spaceName: string;
  folderName?: string;
  listName: string;
}) {
  const client = supabase;
  if (!client) return;

  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) return;

  const space = await resolveSpaceRecord(spaceName);
  if (!space) return;

  const folder = folderName ? await resolveFolderRecord(space.id, folderName) : null;

  let countQuery = client.from("task_lists").select("id", { count: "exact", head: true }).eq("space_id", space.id);
  countQuery = folder ? countQuery.eq("folder_id", folder.id) : countQuery.is("folder_id", null);
  const { count, error: countError } = await countQuery;
  if (countError) throw countError;

  const { error } = await client.from("task_lists").insert({
    workspace_id: space.workspace_id,
    space_id: space.id,
    folder_id: folder?.id ?? null,
    name: listName,
    position: count ?? 0,
    external_provider: "local",
    external_id: makeLocalExternalId("list", space.id, listName, folder?.id),
    raw_payload: { source: "tasks_ui" },
  });

  if (error) throw error;
}

export function mergeEntityUiPayload(rawPayload: unknown, updates: EntityUiMeta) {
  const payload = isRecord(rawPayload) ? { ...rawPayload } : {};
  const ui = isRecord(payload.ui) ? { ...payload.ui } : {};

  (["label", "color", "icon", "favorite"] as const).forEach((key) => {
    if (!(key in updates)) return;
    const value = updates[key];
    if (value === undefined || value === "") {
      delete ui[key];
      return;
    }
    ui[key] = value;
  });

  payload.ui = ui;
  return payload;
}

async function resolveEntityRecord(target: EntityMetaTarget) {
  if (target.kind === "space") return resolveSpaceRecord(target.spaceName);

  const space = await resolveSpaceRecord(target.spaceName);
  if (!space) return null;

  if (target.kind === "folder") {
    if (!target.folderName) return null;
    return resolveFolderRecord(space.id, target.folderName);
  }

  if (!target.listName) return null;
  const folder = target.folderName ? await resolveFolderRecord(space.id, target.folderName) : null;
  return resolveListRecord(space.id, target.listName, folder?.id ?? null, Boolean(target.folderName));
}

async function resolveSpaceRecord(spaceName: string) {
  const client = supabase;
  if (!client) return null;

  const { data, error } = await client
    .from("spaces")
    .select("id,workspace_id,raw_payload")
    .eq("name", spaceName)
    .maybeSingle();

  if (error) throw error;
  return data as SpaceRecord | null;
}

async function resolveFolderRecord(spaceId: number, folderName: string) {
  const client = supabase;
  if (!client) return null;

  const { data, error } = await client
    .from("folders")
    .select("id,raw_payload")
    .eq("space_id", spaceId)
    .eq("name", folderName)
    .maybeSingle();

  if (error) throw error;
  return data as EntityRecord | null;
}

async function resolveListRecord(spaceId: number, listName: string, folderId: number | null, hasFolderContext: boolean) {
  const client = supabase;
  if (!client) return null;

  let query = client.from("task_lists").select("id,raw_payload").eq("space_id", spaceId).eq("name", listName);

  if (folderId) query = query.eq("folder_id", folderId);
  if (!hasFolderContext) query = query.is("folder_id", null);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as EntityRecord | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function makeLocalExternalId(kind: "folder" | "list", spaceId: number, name: string, folderId?: number) {
  return `local:${kind}:${spaceId}:${folderId ?? "root"}:${slugify(name)}:${Date.now()}`;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
