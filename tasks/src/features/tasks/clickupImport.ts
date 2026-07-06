import type { TaskPriority, TaskStatus } from "./types";

export type ClickUpRawTask = {
  id: string;
  name: string;
  archived?: boolean;
  url?: string;
  description?: string;
  text_content?: string;
  status?: {
    status?: string;
    type?: string;
  };
  priority?: {
    id?: string;
    priority?: string;
  } | null;
  due_date?: string | number | null;
  start_date?: string | number | null;
  date_done?: string | number | null;
  parent?: string | null;
  assignees?: Array<{
    id?: string | number;
    username?: string;
    email?: string;
    profilePicture?: string;
  }>;
  tags?: Array<{
    name?: string;
    tag_fg?: string;
  }>;
  comment_count?: string | number;
  subtasks?: unknown[];
  raw?: unknown;
};

export type ClickUpImportContext = {
  workspaceName: string;
  workspaceSlug: string;
  spaceName: string;
  spaceExternalId: string;
  folderName?: string;
  folderExternalId?: string;
  listName: string;
  listExternalId: string;
};

export type ClickUpImportTask = {
  externalProvider: "clickup";
  externalId: string;
  parentExternalId?: string;
  code: string;
  title: string;
  description?: string;
  statusName: string;
  statusType?: string;
  normalizedStatus: TaskStatus;
  priority: TaskPriority;
  dueAt?: string;
  startAt?: string;
  completedAt?: string;
  archived: boolean;
  sourceUrl?: string;
  commentsCount: number;
  subtasksDone: number;
  subtasksTotal: number;
  assignees: Array<{
    externalId: string;
    displayName: string;
    email?: string;
    avatarUrl?: string;
  }>;
  tags: Array<{
    name: string;
    color?: string;
  }>;
  context: ClickUpImportContext;
};

const doneStatusNames = new Set(["done", "closed", "complete", "completed", "concluido", "concluido", "finalizado"]);

export function isActiveClickUpTask(task: ClickUpRawTask) {
  const statusName = normalizeText(task.status?.status);
  const statusType = normalizeText(task.status?.type);

  if (task.archived) return false;
  if (statusType === "done" || statusType === "closed") return false;
  if (doneStatusNames.has(statusName)) return false;

  return true;
}

export function mapClickUpTask(task: ClickUpRawTask, context: ClickUpImportContext, index: number): ClickUpImportTask {
  const statusName = task.status?.status?.trim() || "A fazer";
  const statusType = task.status?.type?.trim();

  return {
    externalProvider: "clickup",
    externalId: task.id,
    parentExternalId: task.parent ?? undefined,
    code: `CLK-${String(index + 1).padStart(2, "0")}`,
    title: task.name.trim(),
    description: task.description?.trim() || task.text_content?.trim() || undefined,
    statusName,
    statusType,
    normalizedStatus: normalizeStatus(statusName, statusType),
    priority: normalizePriority(task.priority),
    dueAt: normalizeClickUpDate(task.due_date),
    startAt: normalizeClickUpDate(task.start_date),
    completedAt: normalizeClickUpDate(task.date_done),
    archived: Boolean(task.archived),
    sourceUrl: task.url,
    commentsCount: Number(task.comment_count ?? 0),
    subtasksDone: 0,
    subtasksTotal: task.subtasks?.length ?? 0,
    assignees: (task.assignees ?? [])
      .map((assignee) => ({
        externalId: String(assignee.id ?? assignee.email ?? assignee.username ?? ""),
        displayName: assignee.username?.trim() || assignee.email?.trim() || "Sem nome",
        email: assignee.email?.trim() || undefined,
        avatarUrl: assignee.profilePicture,
      }))
      .filter((assignee) => assignee.externalId.length > 0),
    tags: (task.tags ?? [])
      .map((tag) => ({
        name: tag.name?.trim() ?? "",
        color: tag.tag_fg,
      }))
      .filter((tag) => tag.name.length > 0),
    context,
  };
}

export function buildClickUpImportBatch(tasks: ClickUpRawTask[], context: ClickUpImportContext) {
  return tasks.filter(isActiveClickUpTask).map((task, index) => mapClickUpTask(task, context, index));
}

function normalizeStatus(statusName: string, statusType?: string): TaskStatus {
  const status = normalizeText(statusName);
  const type = normalizeText(statusType);

  if (type === "done" || type === "closed" || doneStatusNames.has(status)) return "done";
  if (status.includes("review") || status.includes("revisao") || status.includes("aguard")) return "review";
  if (status.includes("backlog") || status.includes("to do") || status.includes("fazer") || type === "open") {
    return "todo";
  }

  return "in_progress";
}

function normalizePriority(priority: ClickUpRawTask["priority"]): TaskPriority {
  const value = normalizeText(priority?.priority ?? priority?.id);

  if (value === "1" || value.includes("urgent") || value.includes("urgente")) return "urgent";
  if (value === "2" || value.includes("high") || value.includes("alta")) return "high";
  if (value === "4" || value.includes("low") || value.includes("baixa")) return "low";

  return "normal";
}

function normalizeClickUpDate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return undefined;
  const numeric = Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);

  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
