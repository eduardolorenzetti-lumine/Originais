export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export type TaskPriority = "urgent" | "high" | "normal" | "low";

export type TaskItem = {
  id: string;
  code: string;
  title: string;
  space: string;
  folder?: string;
  list: string;
  description?: string;
  parentTask?: string;
  parentExternalId?: string;
  isSubtask?: boolean;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: string[];
  dueDate?: string;
  startDate?: string;
  tags: string[];
  customFields?: Record<string, string>;
  comments: number;
  subtasksDone: number;
  subtasksTotal: number;
  sourceUrl?: string;
  externalId?: string;
  taskType?: "task" | "subtask";
};

export type EntityUiMeta = {
  label?: string;
  color?: string;
  icon?: string;
  favorite?: boolean;
};

export type ListSummary = {
  name: string;
  active: number;
  folderName?: string;
  uiMeta?: EntityUiMeta;
};

export type FolderSummary = {
  name: string;
  active: number;
  lists: ListSummary[];
  uiMeta?: EntityUiMeta;
};

export type SpaceSummary = {
  name: string;
  active: number;
  color: string;
  folders: FolderSummary[];
  listsWithoutFolder: ListSummary[];
  uiMeta?: EntityUiMeta;
};

export type WorkspaceSnapshot = {
  source: "loading" | "local" | "supabase";
  spaces: SpaceSummary[];
  tasks: TaskItem[];
};
