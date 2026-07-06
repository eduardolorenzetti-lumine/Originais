import { supabase } from "../../lib/supabase";
import type { TaskItem, TaskPriority, TaskStatus } from "./types";

type TaskUpdatePayload = {
  title?: string;
  description?: string | null;
  status_name?: string;
  status_type?: string;
  normalized_status?: TaskStatus;
  priority?: TaskPriority;
  due_at?: string | null;
  start_at?: string | null;
  subtasks_done?: number;
  subtasks_total?: number;
};

type TaskRecord = {
  id: number;
  workspace_id: number;
  space_id: number;
  folder_id: number | null;
  list_id: number | null;
  external_id: string | null;
};

type SpaceRecord = {
  id: number;
  workspace_id: number;
};

type IdRecord = {
  id: number;
};

const statusNameByStatus: Record<TaskStatus, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  review: "Revisao",
  done: "Concluido",
};

export function mapTaskUpdatesToDbPayload(updates: Partial<TaskItem>): TaskUpdatePayload {
  const payload: TaskUpdatePayload = {};

  if ("title" in updates && updates.title !== undefined) payload.title = updates.title;
  if ("description" in updates) payload.description = updates.description ?? null;
  if ("status" in updates && updates.status !== undefined) {
    payload.normalized_status = updates.status;
    payload.status_name = statusNameByStatus[updates.status];
    payload.status_type = updates.status === "todo" ? "open" : "custom";
  }
  if ("priority" in updates && updates.priority !== undefined) payload.priority = updates.priority;
  if ("dueDate" in updates) payload.due_at = toNoonTimestamp(updates.dueDate);
  if ("startDate" in updates) payload.start_at = toNoonTimestamp(updates.startDate);
  if ("subtasksDone" in updates && updates.subtasksDone !== undefined) payload.subtasks_done = updates.subtasksDone;
  if ("subtasksTotal" in updates && updates.subtasksTotal !== undefined) payload.subtasks_total = updates.subtasksTotal;

  return payload;
}

export async function persistTaskUpdate(task: TaskItem, updates: Partial<TaskItem>) {
  const client = supabase;
  if (!client || task.id.startsWith("synthetic:")) return;

  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) return;

  const taskRecord = await resolveTaskRecord(task);
  if (!taskRecord) return;

  const taskPayload = mapTaskUpdatesToDbPayload(updates);
  if (Object.keys(taskPayload).length > 0) {
    const { error } = await client.from("tasks").update(taskPayload).eq("id", taskRecord.id);
    if (error) throw error;
  }

  if (updates.assignees !== undefined) await syncTaskAssignees(taskRecord.workspace_id, taskRecord.id, updates.assignees);
  if (updates.tags !== undefined) await syncTaskTags(taskRecord.workspace_id, taskRecord.id, updates.tags);
}

export async function persistTaskCreate(task: TaskItem) {
  const client = supabase;
  if (!client || task.id.startsWith("synthetic:")) return;

  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) return;

  const spaceRecord = await resolveSpaceRecord(task.space);
  if (!spaceRecord) return;

  const folderRecord = task.folder ? await resolveFolderRecord(spaceRecord.id, task.folder) : null;
  const listRecord = await resolveListRecord(spaceRecord.id, task.list, folderRecord?.id ?? null);
  const parentRecord = task.parentExternalId ? await resolveTaskRecordByExternalId(task.parentExternalId) : null;

  const taskPayload = {
    workspace_id: spaceRecord.workspace_id,
    space_id: spaceRecord.id,
    folder_id: folderRecord?.id ?? null,
    list_id: listRecord?.id ?? null,
    parent_task_id: parentRecord?.id ?? null,
    external_provider: "local",
    external_id: task.externalId ?? task.id,
    parent_external_id: task.parentExternalId ?? null,
    code: task.code || null,
    title: task.title,
    description: task.description ?? null,
    status_name: statusNameByStatus[task.status],
    status_type: task.status === "todo" ? "open" : "custom",
    normalized_status: task.status,
    priority: task.priority,
    due_at: toNoonTimestamp(task.dueDate),
    start_at: toNoonTimestamp(task.startDate),
    source_url: task.sourceUrl ?? null,
    comments_count: task.comments,
    subtasks_done: task.subtasksDone,
    subtasks_total: task.subtasksTotal,
    raw_payload: { source: "tasks_ui" },
  };

  const { data, error } = await client
    .from("tasks")
    .upsert(taskPayload, { onConflict: "workspace_id,external_provider,external_id" })
    .select("id,workspace_id")
    .maybeSingle();

  if (error) throw error;
  const taskRecord = data as { id: number; workspace_id: number } | null;
  if (!taskRecord) return;

  await syncTaskAssignees(taskRecord.workspace_id, taskRecord.id, task.assignees);
  await syncTaskTags(taskRecord.workspace_id, taskRecord.id, task.tags);
}

async function resolveTaskRecord(task: TaskItem) {
  return resolveTaskRecordByExternalId(task.externalId ?? task.id);
}

async function resolveTaskRecordByExternalId(externalId: string) {
  const client = supabase;
  if (!client) return null;

  const { data, error } = await client
    .from("tasks")
    .select("id,workspace_id,space_id,folder_id,list_id,external_id")
    .eq("external_id", externalId)
    .maybeSingle();

  if (error) throw error;
  return data as TaskRecord | null;
}

async function resolveSpaceRecord(spaceName: string) {
  const client = supabase;
  if (!client) return null;

  const { data, error } = await client
    .from("spaces")
    .select("id,workspace_id")
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
    .select("id")
    .eq("space_id", spaceId)
    .eq("name", folderName)
    .maybeSingle();

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

async function syncTaskAssignees(workspaceId: number, taskId: number, assignees: string[]) {
  const client = supabase;
  if (!client) return;

  const names = uniqueCleanValues(assignees);
  const people = await ensurePeople(workspaceId, names);

  const { error: deleteError } = await client.from("task_assignees").delete().eq("task_id", taskId);
  if (deleteError) throw deleteError;
  if (people.length === 0) return;

  const { error: insertError } = await client
    .from("task_assignees")
    .insert(people.map((person) => ({ task_id: taskId, person_id: person.id })));
  if (insertError) throw insertError;
}

async function syncTaskTags(workspaceId: number, taskId: number, tags: string[]) {
  const client = supabase;
  if (!client) return;

  const names = uniqueCleanValues(tags);
  const tagRows = await ensureTags(workspaceId, names);

  const { error: deleteError } = await client.from("task_tags").delete().eq("task_id", taskId);
  if (deleteError) throw deleteError;
  if (tagRows.length === 0) return;

  const { error: insertError } = await client
    .from("task_tags")
    .insert(tagRows.map((tag) => ({ task_id: taskId, tag_id: tag.id })));
  if (insertError) throw insertError;
}

async function ensurePeople(workspaceId: number, names: string[]) {
  const client = supabase;
  if (!client || names.length === 0) return [] as IdRecord[];

  const { data: existingData, error: existingError } = await client
    .from("people")
    .select("id,display_name")
    .eq("workspace_id", workspaceId)
    .in("display_name", names);
  if (existingError) throw existingError;

  const existing = (existingData ?? []) as Array<IdRecord & { display_name: string }>;
  const existingNames = new Set(existing.map((person) => person.display_name));
  const missingNames = names.filter((name) => !existingNames.has(name));

  if (missingNames.length === 0) return existing;

  const rows = missingNames.map((name) => ({
    workspace_id: workspaceId,
    external_provider: "local",
    external_id: localExternalId(name),
    display_name: name,
    raw_payload: { source: "tasks_ui" },
  }));

  const { data: insertedData, error: insertError } = await client
    .from("people")
    .upsert(rows, { onConflict: "workspace_id,external_provider,external_id" })
    .select("id,display_name");
  if (insertError) throw insertError;

  return [...existing, ...((insertedData ?? []) as Array<IdRecord & { display_name: string }>)] satisfies IdRecord[];
}

async function ensureTags(workspaceId: number, names: string[]) {
  const client = supabase;
  if (!client || names.length === 0) return [] as IdRecord[];

  const { data: allTagsData, error: allTagsError } = await client
    .from("tags")
    .select("id,name")
    .eq("workspace_id", workspaceId);
  if (allTagsError) throw allTagsError;

  const allTags = (allTagsData ?? []) as Array<IdRecord & { name: string }>;
  const tagByNormalizedName = new Map(allTags.map((tag) => [normalizeValue(tag.name), tag]));
  const missingNames = names.filter((name) => !tagByNormalizedName.has(normalizeValue(name)));

  if (missingNames.length > 0) {
    const { data: insertedData, error: insertError } = await client
      .from("tags")
      .insert(missingNames.map((name) => ({ workspace_id: workspaceId, name })))
      .select("id,name");
    if (insertError) throw insertError;

    ((insertedData ?? []) as Array<IdRecord & { name: string }>).forEach((tag) => {
      tagByNormalizedName.set(normalizeValue(tag.name), tag);
    });
  }

  return names
    .map((name) => tagByNormalizedName.get(normalizeValue(name)))
    .filter((tag): tag is IdRecord & { name: string } => Boolean(tag));
}

function uniqueCleanValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function toNoonTimestamp(value?: string) {
  return value ? `${value}T12:00:00.000Z` : null;
}

function localExternalId(value: string) {
  return `local:${normalizeValue(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item"}`;
}

function normalizeValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
