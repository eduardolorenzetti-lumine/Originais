import { supabase } from "../../lib/supabase";
import { spaces as localSpaces, tasks as localTasks } from "./mockData";
import type { EntityUiMeta, FolderSummary, ListSummary, SpaceSummary, TaskItem, TaskPriority, TaskStatus, WorkspaceSnapshot } from "./types";

type DbRelation<T> = T | T[] | null | undefined;

export type DbTaskRow = {
  id: number | string;
  external_id: string | null;
  parent_external_id: string | null;
  code: string | null;
  title: string;
  description: string | null;
  normalized_status: string;
  priority: string;
  due_at: string | null;
  start_at: string | null;
  source_url: string | null;
  comments_count: number | null;
  subtasks_done: number | null;
  subtasks_total: number | null;
  spaces: DbRelation<{ name: string }>;
  folders: DbRelation<{ name: string }>;
  task_lists: DbRelation<{ name: string }>;
  task_assignees: Array<{ people: DbRelation<{ display_name: string }> }> | null;
  task_tags: Array<{ tags: DbRelation<{ name: string }> }> | null;
};

type DbSpaceRow = {
  id: number | string;
  name: string;
  color: string | null;
  raw_payload?: unknown;
};

type DbFolderRow = {
  name: string;
  position: number | null;
  spaces: DbRelation<{ name: string }>;
  raw_payload?: unknown;
};

type DbListRow = {
  name: string;
  position: number | null;
  spaces: DbRelation<{ name: string }>;
  folders: DbRelation<{ name: string }>;
  raw_payload?: unknown;
};

const fallbackFolderBySpaceAndList: Record<string, string> = {
  "[LMN] Originais::ORIGINAIS": "PLANEJAMENTO",
  "[LMN] Originais::PROJETOS BACKLOG": "PLANEJAMENTO",
  "[LMN] Originais::Calendário 2025 - Plataforma": "PLANEJAMENTO",
  "[LMN] Originais::Calendario 2025 - Plataforma": "PLANEJAMENTO",
};

export const localWorkspaceSnapshot: WorkspaceSnapshot = {
  source: "local",
  spaces: localSpaces,
  tasks: localTasks,
};

export const loadingWorkspaceSnapshot: WorkspaceSnapshot = {
  source: "loading",
  spaces: [],
  tasks: [],
};

export async function loadWorkspaceSnapshot(): Promise<WorkspaceSnapshot> {
  if (!supabase) return localWorkspaceSnapshot;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) return localWorkspaceSnapshot;

  const [spacesResult, foldersResult, listsResult, tasksResult] = await Promise.all([
    supabase.from("spaces").select("id,name,color,raw_payload").order("name", { ascending: true }),
    supabase.from("folders").select("name,position,raw_payload,spaces(name)").order("position", { ascending: true }),
    supabase.from("task_lists").select("name,position,raw_payload,spaces(name),folders(name)").order("position", { ascending: true }),
    supabase
      .from("tasks")
      .select(
        `
          id,
          external_id,
          parent_external_id,
          code,
          title,
          description,
          normalized_status,
          priority,
          due_at,
          start_at,
          source_url,
          comments_count,
          subtasks_done,
          subtasks_total,
          spaces(name),
          folders(name),
          task_lists(name),
          task_assignees(people(display_name)),
          task_tags(tags(name))
        `,
      )
      .eq("archived", false)
      .order("due_at", { ascending: true }),
  ]);

  if (spacesResult.error || foldersResult.error || listsResult.error || tasksResult.error) return localWorkspaceSnapshot;

  const taskRows = (tasksResult.data ?? []) as unknown as DbTaskRow[];
  const tasks = taskRows.map(mapDbTaskToTaskItem);

  return {
    source: "supabase",
    spaces: buildHierarchy(
      ((spacesResult.data ?? []) as unknown as DbSpaceRow[]),
      ((foldersResult.data ?? []) as unknown as DbFolderRow[]),
      ((listsResult.data ?? []) as unknown as DbListRow[]),
      tasks,
    ),
    tasks,
  };
}

export function mapDbTaskToTaskItem(row: DbTaskRow): TaskItem {
  const assignees = (row.task_assignees ?? [])
    .map((item) => firstRelation(item.people)?.display_name)
    .filter((name): name is string => Boolean(name));
  const tags = (row.task_tags ?? [])
    .map((item) => firstRelation(item.tags)?.name)
    .filter((name): name is string => Boolean(name));
  const spaceName = firstRelation(row.spaces)?.name ?? "Tasks";
  const listName = firstRelation(row.task_lists)?.name ?? "Sem lista";
  const folderName = firstRelation(row.folders)?.name ?? fallbackFolderBySpaceAndList[`${spaceName}::${listName}`];

  return {
    id: String(row.external_id ?? row.id),
    externalId: row.external_id ?? undefined,
    code: row.code ?? String(row.id),
    title: row.title,
    description: row.description ?? undefined,
    space: spaceName,
    folder: folderName,
    list: listName,
    parentTask: row.parent_external_id ? row.description ?? undefined : undefined,
    parentExternalId: row.parent_external_id ?? undefined,
    isSubtask: Boolean(row.parent_external_id),
    status: normalizeStatus(row.normalized_status),
    priority: normalizePriority(row.priority),
    dueDate: toDateOnly(row.due_at),
    startDate: toDateOnly(row.start_at),
    tags,
    assignees,
    customFields: undefined,
    comments: row.comments_count ?? 0,
    subtasksDone: row.subtasks_done ?? 0,
    subtasksTotal: row.subtasks_total ?? 0,
    sourceUrl: row.source_url ?? undefined,
    taskType: row.parent_external_id ? "subtask" : "task",
  };
}

function buildHierarchy(spaceRows: DbSpaceRow[], folderRows: DbFolderRow[], listRows: DbListRow[], tasks: TaskItem[]) {
  return spaceRows.map((space) => mapDbSpaceToSummary(space, folderRows, listRows, tasks));
}

function mapDbSpaceToSummary(
  row: DbSpaceRow,
  folderRows: DbFolderRow[],
  listRows: DbListRow[],
  tasks: TaskItem[],
): SpaceSummary {
  const spaceName = row.name;
  const uiMeta = readEntityUiMeta(row.raw_payload);
  const folders = folderRows
    .filter((folder) => firstRelation(folder.spaces)?.name === spaceName)
    .map((folder) => {
      const folderUiMeta = readEntityUiMeta(folder.raw_payload);
      const lists = listRows
        .filter(
          (list) =>
            firstRelation(list.spaces)?.name === spaceName &&
            normalizeName(firstRelation(list.folders)?.name) === normalizeName(folder.name),
        )
        .map((list) => mapDbListToSummary(spaceName, list, folder.name, tasks));

      return {
        name: folder.name,
        active: lists.reduce((total, list) => total + list.active, 0),
        lists,
        uiMeta: folderUiMeta,
      } satisfies FolderSummary;
    });

  const listsWithoutFolder = listRows
    .filter((list) => {
      if (firstRelation(list.spaces)?.name !== spaceName) return false;
      const folderName = firstRelation(list.folders)?.name ?? fallbackFolderBySpaceAndList[`${spaceName}::${list.name}`];
      return !folderName;
    })
    .map((list) => mapDbListToSummary(spaceName, list, undefined, tasks));

  const inferredFolderLists = listRows
    .filter((list) => {
      if (firstRelation(list.spaces)?.name !== spaceName) return false;
      const fallbackFolder = fallbackFolderBySpaceAndList[`${spaceName}::${list.name}`];
      return Boolean(fallbackFolder) && !firstRelation(list.folders)?.name;
    })
    .reduce<Record<string, ListSummary[]>>((groups, list) => {
      const fallbackFolder = fallbackFolderBySpaceAndList[`${spaceName}::${list.name}`];
      if (!fallbackFolder) return groups;
      groups[fallbackFolder] = [...(groups[fallbackFolder] ?? []), mapDbListToSummary(spaceName, list, fallbackFolder, tasks)];
      return groups;
    }, {});

  Object.entries(inferredFolderLists).forEach(([folderName, inferredLists]) => {
    const existingFolder = folders.find((folder) => normalizeName(folder.name) === normalizeName(folderName));
    if (existingFolder) {
      inferredLists.forEach((list) => {
        if (!existingFolder.lists.some((current) => current.name === list.name)) existingFolder.lists.push(list);
      });
      existingFolder.active = existingFolder.lists.reduce((total, list) => total + list.active, 0);
      return;
    }

    folders.push({
      name: folderName,
      active: inferredLists.reduce((total, list) => total + list.active, 0),
      lists: inferredLists,
      uiMeta: undefined,
    });
  });

  return {
    name: spaceName,
    active: tasks.filter((task) => task.space === spaceName && task.status !== "done").length,
    color: uiMeta?.color ?? row.color ?? "blue",
    folders,
    listsWithoutFolder,
    uiMeta,
  };
}

function mapDbListToSummary(spaceName: string, row: DbListRow, folderName: string | undefined, tasks: TaskItem[]): ListSummary {
  const listName = row.name;
  return {
    name: listName,
    folderName,
    active: tasks.filter(
      (task) =>
        task.space === spaceName &&
        task.list === listName &&
        normalizeName(task.folder) === normalizeName(folderName) &&
        task.status !== "done",
    ).length,
    uiMeta: readEntityUiMeta(row.raw_payload),
  };
}

export function readEntityUiMeta(rawPayload: unknown): EntityUiMeta | undefined {
  if (!isRecord(rawPayload) || !isRecord(rawPayload.ui)) return undefined;

  const ui = rawPayload.ui;
  const meta: EntityUiMeta = {};
  if (typeof ui.label === "string" && ui.label.trim()) meta.label = ui.label;
  if (typeof ui.color === "string" && ui.color.trim()) meta.color = ui.color;
  if (typeof ui.icon === "string" && ui.icon.trim()) meta.icon = ui.icon;
  if (typeof ui.favorite === "boolean") meta.favorite = ui.favorite;

  return Object.keys(meta).length > 0 ? meta : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstRelation<T>(value: DbRelation<T>): T | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function normalizeStatus(value: string): TaskStatus {
  if (value === "done") return "done";
  if (value === "review") return "review";
  if (value === "todo") return "todo";
  return "in_progress";
}

function normalizePriority(value: string): TaskPriority {
  if (value === "urgent" || value === "high" || value === "low") return value;
  return "normal";
}

function toDateOnly(value: string | null) {
  if (!value) return undefined;
  return new Date(value).toISOString().slice(0, 10);
}

function normalizeName(value?: string | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
