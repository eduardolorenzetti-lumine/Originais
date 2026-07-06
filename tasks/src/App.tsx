import type { User } from "@supabase/supabase-js";
import {
  AlertCircle,
  Bell,
  Bookmark,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  Copy,
  CircleDot,
  Columns3,
  Edit3,
  Filter,
  Flag,
  FolderOpen,
  GripVertical,
  Inbox,
  LayoutList,
  Layers2,
  Link2,
  ListTree,
  LoaderCircle,
  Maximize2,
  MessageSquare,
  MoreHorizontal,
  Palette,
  PanelRightOpen,
  Plus,
  Rocket,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Star,
  Table2,
  Target,
  UserRound,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { isSupabaseConfigured } from "./lib/supabase";
import {
  getAuthState,
  onAuthStateChange,
  signInWithEmailPassword,
  signOut,
  signUpWithEmailPassword,
} from "./features/auth/authService";
import { getTaskMetrics } from "./features/tasks/taskMetrics";
import { persistEntityMeta, persistEntityRename, persistFolderCreate, persistListCreate } from "./features/tasks/entityMutations";
import { loadScopeConfigurations, persistScopeConfiguration } from "./features/tasks/scopeConfigRepository";
import { persistTaskCreate, persistTaskUpdate } from "./features/tasks/taskMutations";
import { loadWorkspaceSnapshot, loadingWorkspaceSnapshot, localWorkspaceSnapshot } from "./features/tasks/taskRepository";
import {
  coerceLayoutPreferences,
  coerceScopeConfigPreferences,
  coerceTaskOrderPreferences,
  loadUserPreferences,
  persistUserPreference,
  type LayoutPreferences,
  type UserPreferenceRow,
} from "./features/tasks/userPreferences";
import type { EntityUiMeta, ListSummary, SpaceSummary, TaskItem, TaskPriority, TaskStatus } from "./features/tasks/types";
import type { AuthState } from "./features/auth/authService";

type ViewMode = "list" | "table" | "gantt" | "calendar" | "board" | "mind_map" | "team";
type GroupingMode =
  | "none"
  | "status"
  | "assignee"
  | "priority"
  | "tag"
  | "due_date"
  | "task_type"
  | "space"
  | "folder"
  | "list";
type SubtaskVisibilityMode = "collapsed" | "expanded";
type DetailMode = "side" | "modal";
type BaseListColumnKey =
  | "status"
  | "assignees"
  | "dueDate"
  | "priority"
  | "tags"
  | "comments"
  | "subtasks"
  | "taskType"
  | "space"
  | "folder"
  | "list";
type CustomListColumnKey = `custom:${string}`;
type ListColumnKey = BaseListColumnKey | CustomListColumnKey;
type ScopeKind = "space" | "folder" | "list";
type ScopeConfig = { statuses: string[]; fields: string[] };
type TreeNode = {
  id: string;
  title: string;
  task?: TaskItem;
  parentId?: string;
  synthetic?: boolean;
  children: TreeNode[];
};
type RootGroup = {
  id: string;
  label: string;
  nodes: TreeNode[];
};
type EntityKind = "space" | "folder" | "list";
type EntityIconKey =
  | "space"
  | "folder"
  | "list"
  | "calendar"
  | "board"
  | "table"
  | "sparkles"
  | "people"
  | "flag"
  | "target"
  | "briefcase"
  | "clipboard"
  | "bookmark"
  | "rocket"
  | "video";
type EntityColorKey = "blue" | "green" | "pink" | "purple" | "yellow" | "red" | "orange" | "gray";
type EntityMeta = {
  label?: string;
  color?: EntityColorKey;
  icon?: EntityIconKey;
  favorite?: boolean;
};
type EntityMenuTarget = {
  kind: EntityKind;
  key: string;
  menuType: "actions" | "create";
  spaceName: string;
  folderName?: string;
  listName?: string;
};
type AppearanceTarget = EntityMenuTarget & {
  currentName: string;
};
type DragState = {
  nodeId: string;
  parentKey: string;
};

type EntityDragState = {
  itemId: string;
  scopeKey: string;
};

type SidebarResizeState = {
  startWidth: number;
  startX: number;
};

type LayoutStateSnapshot = {
  view: ViewMode;
  enabledViews: ViewMode[];
  groupingMode: GroupingMode;
  subtaskVisibilityMode: SubtaskVisibilityMode;
  detailMode: DetailMode;
  selectedColumns: ListColumnKey[];
  sidebarWidth: number;
  sidebarEntityOrder: Record<string, string[]>;
};

type PersistenceFeedback = {
  status: "idle" | "saving" | "saved" | "error";
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  review: "Revisao",
  done: "Concluido",
};

const priorityLabels: Record<TaskPriority, string> = {
  urgent: "Urgente",
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
};

const viewLabels: Record<ViewMode, string> = {
  list: "Lista",
  table: "Tabela",
  gantt: "Gantt",
  calendar: "Calendario",
  board: "Quadro",
  mind_map: "Mapa mental",
  team: "Equipe",
};

const groupingLabels: Record<GroupingMode, string> = {
  none: "Sem agrupamento",
  status: "Status",
  assignee: "Responsavel",
  priority: "Prioridade",
  tag: "Etiquetas",
  due_date: "Data de vencimento",
  task_type: "Tipo de tarefa",
  space: "Espaco",
  folder: "Pasta",
  list: "Lista",
};

const baseColumnLabels: Record<BaseListColumnKey, string> = {
  status: "Status",
  assignees: "Responsavel",
  dueDate: "Prazo",
  priority: "Prioridade",
  tags: "Etiquetas",
  comments: "Comentarios",
  subtasks: "Subtarefas",
  taskType: "Tipo de tarefa",
  space: "Espaco",
  folder: "Pasta",
  list: "Lista",
};

const baseColumnWidths: Record<BaseListColumnKey, string> = {
  status: "minmax(132px, 0.85fr)",
  assignees: "minmax(160px, 1fr)",
  dueDate: "minmax(108px, 0.65fr)",
  priority: "minmax(118px, 0.75fr)",
  tags: "minmax(180px, 1fr)",
  comments: "minmax(104px, 0.5fr)",
  subtasks: "minmax(124px, 0.65fr)",
  taskType: "minmax(136px, 0.7fr)",
  space: "minmax(150px, 0.9fr)",
  folder: "minmax(150px, 0.9fr)",
  list: "minmax(160px, 0.9fr)",
};

const defaultListColumns: ListColumnKey[] = ["status", "assignees", "dueDate", "priority"];
const baseListColumns: BaseListColumnKey[] = [
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
];
const customColumnPrefix = "custom:";
const groupingOptions: GroupingMode[] = ["none", "status", "assignee", "priority", "tag", "due_date", "task_type", "space", "folder", "list"];
const viewOptions = Object.keys(viewLabels) as ViewMode[];
const subtaskVisibilityOptions: SubtaskVisibilityMode[] = ["collapsed", "expanded"];
const detailModeOptions: DetailMode[] = ["side", "modal"];
const initialWorkspaceSnapshot = isSupabaseConfigured ? loadingWorkspaceSnapshot : localWorkspaceSnapshot;
const UNASSIGNED_FILTER = "__unassigned__";
const defaultEnabledViews: ViewMode[] = ["list", "table", "board"];
const entityColorOptions: EntityColorKey[] = ["blue", "green", "pink", "purple", "yellow", "red", "orange", "gray"];
const entityIconOptions: EntityIconKey[] = [
  "space",
  "folder",
  "list",
  "calendar",
  "board",
  "table",
  "sparkles",
  "people",
  "flag",
  "target",
  "briefcase",
  "clipboard",
  "bookmark",
  "rocket",
  "video",
];

function classNames(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function isKnownOption<T extends string>(options: readonly T[], value: string | undefined): value is T {
  return Boolean(value && (options as readonly string[]).includes(value));
}

function makeEntityKey(kind: EntityKind, spaceName: string, folderName = "", listName = "") {
  return `${kind}:${spaceName}:${folderName}:${listName}`;
}

function getEntityIcon(icon: EntityIconKey | undefined) {
  if (icon === "folder") return <FolderOpen size={14} />;
  if (icon === "list") return <LayoutList size={14} />;
  if (icon === "calendar") return <CalendarDays size={14} />;
  if (icon === "board") return <Columns3 size={14} />;
  if (icon === "table") return <Table2 size={14} />;
  if (icon === "sparkles") return <Sparkles size={14} />;
  if (icon === "people") return <Users size={14} />;
  if (icon === "flag") return <Flag size={14} />;
  if (icon === "target") return <Target size={14} />;
  if (icon === "briefcase") return <Briefcase size={14} />;
  if (icon === "clipboard") return <ClipboardList size={14} />;
  if (icon === "bookmark") return <Bookmark size={14} />;
  if (icon === "rocket") return <Rocket size={14} />;
  if (icon === "video") return <Video size={14} />;
  return <CircleDot size={14} />;
}

function displayEntityName(name: string, entityMeta: Record<string, EntityMeta>, key: string) {
  return entityMeta[key]?.label?.trim() || name;
}

function resolveEntityColor(defaultColor: string | undefined, entityMeta: Record<string, EntityMeta>, key: string) {
  return entityMeta[key]?.color ?? (defaultColor as EntityColorKey | undefined) ?? "blue";
}

function buildEntityMetaFromSpaces(spaces: SpaceSummary[]) {
  const meta: Record<string, EntityMeta> = {};

  spaces.forEach((space) => {
    addEntityMeta(meta, makeEntityKey("space", space.name), space.uiMeta);

    space.folders.forEach((folder) => {
      addEntityMeta(meta, makeEntityKey("folder", space.name, folder.name), folder.uiMeta);
      folder.lists.forEach((list) => {
        addEntityMeta(meta, makeEntityKey("list", space.name, folder.name, list.name), list.uiMeta);
      });
    });

    space.listsWithoutFolder.forEach((list) => {
      addEntityMeta(meta, makeEntityKey("list", space.name, "", list.name), list.uiMeta);
    });
  });

  return meta;
}

function addEntityMeta(meta: Record<string, EntityMeta>, key: string, uiMeta?: EntityUiMeta) {
  const next = coerceEntityMeta(uiMeta);
  if (Object.keys(next).length > 0) meta[key] = next;
}

function coerceEntityMeta(uiMeta?: EntityUiMeta): EntityMeta {
  if (!uiMeta) return {};

  return {
    label: uiMeta.label,
    color: entityColorOptions.includes(uiMeta.color as EntityColorKey) ? (uiMeta.color as EntityColorKey) : undefined,
    icon: entityIconOptions.includes(uiMeta.icon as EntityIconKey) ? (uiMeta.icon as EntityIconKey) : undefined,
    favorite: uiMeta.favorite,
  };
}

function formatDate(iso?: string) {
  if (!iso) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${iso}T12:00:00`));
}

function formatLongDate(iso?: string) {
  if (!iso) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

function displayTaskTitle(title: string) {
  return title.replace(/^#?\d+(?:-\d+)?\s*\|\s*/u, "").trim() || title;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function filterTasksByAssignees(taskItems: TaskItem[], assignees: string[]) {
  if (assignees.length === 0) return taskItems;
  return taskItems.filter((task) => {
    const isUnassignedMatch = assignees.includes(UNASSIGNED_FILTER) && task.assignees.length === 0;
    const isPersonMatch = task.assignees.some((assignee) => assignees.includes(assignee));
    return isUnassignedMatch || isPersonMatch;
  });
}

function getDefaultPathForSpace(spaceName: string, spaces: SpaceSummary[], taskItems: TaskItem[]) {
  const space = spaces.find((item) => item.name === spaceName);
  if (!space) return { folderName: "", listName: "" };

  const allLists = [
    ...space.folders.flatMap((folder) => folder.lists.map((list) => ({ folderName: folder.name, listName: list.name }))),
    ...space.listsWithoutFolder.map((list) => ({ folderName: "", listName: list.name })),
  ];
  const firstListWithTasks = allLists.find(({ folderName, listName }) =>
    taskItems.some(
      (task) =>
        task.space === spaceName &&
        task.list === listName &&
        normalizeText(task.folder) === normalizeText(folderName),
    ),
  );

  return firstListWithTasks ?? { folderName: "", listName: "" };
}

function isSelectionValidForSpace(space: SpaceSummary, folderName: string, listName: string) {
  if (!folderName && !listName) return true;

  if (listName) {
    if (!folderName) return space.listsWithoutFolder.some((list) => list.name === listName);

    const folder = space.folders.find((item) => item.name === folderName);
    return folder?.lists.some((list) => list.name === listName) ?? false;
  }

  return space.folders.some((folder) => folder.name === folderName);
}

function buildTaskTree(taskItems: TaskItem[]) {
  const nodeMap = new Map<string, TreeNode>();
  const syntheticMap = new Map<string, TreeNode>();

  taskItems.forEach((task) => {
    nodeMap.set(task.id, {
      id: task.id,
      title: task.title,
      task,
      children: [],
    });
  });

  const roots: TreeNode[] = [];

  taskItems.forEach((task) => {
    const node = nodeMap.get(task.id);
    if (!node) return;

    const actualParent = task.parentExternalId ? nodeMap.get(task.parentExternalId) : undefined;
    if (actualParent) {
      node.parentId = actualParent.id;
      actualParent.children.push(node);
      return;
    }

    if (task.parentTask) {
      const syntheticId = `synthetic:${task.space}:${task.folder ?? ""}:${task.list}:${task.parentExternalId ?? task.parentTask}`;
      const syntheticNode =
        syntheticMap.get(syntheticId) ??
        {
          id: syntheticId,
          title: task.parentTask,
          children: [],
          synthetic: true,
        };

      syntheticMap.set(syntheticId, syntheticNode);
      node.parentId = syntheticId;
      syntheticNode.children.push(node);
      if (!roots.some((root) => root.id === syntheticId)) roots.push(syntheticNode);
      return;
    }

    roots.push(node);
  });

  return roots;
}

function getNodeTask(node: TreeNode) {
  return node.task ?? findFirstTask(node);
}

function findFirstTask(node: TreeNode): TaskItem | undefined {
  if (node.task) return node.task;
  return node.children.map(findFirstTask).find(Boolean);
}

function findTreeNode(nodes: TreeNode[], nodeId: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const childMatch = findTreeNode(node.children, nodeId);
    if (childMatch) return childMatch;
  }

  return undefined;
}

function getDirectChildTasks(nodes: TreeNode[], nodeId: string) {
  const node = findTreeNode(nodes, nodeId);
  if (!node) return [];
  return node.children.map(getNodeTask).filter((task): task is TaskItem => Boolean(task));
}

function buildRootGroups(nodes: TreeNode[], groupingMode: GroupingMode) {
  if (groupingMode === "none") {
    return [{ id: "all", label: "Todas as tarefas", nodes }] satisfies RootGroup[];
  }

  const groups = new Map<string, RootGroup>();

  nodes.forEach((node) => {
    const label = getGroupingLabel(node, groupingMode);
    const id = `${groupingMode}:${label}`;
    const current = groups.get(id) ?? { id, label, nodes: [] };
    current.nodes.push(node);
    groups.set(id, current);
  });

  return [...groups.values()];
}

function buildVirtualTasksFromTree(nodes: TreeNode[]) {
  const virtualTasks: Record<string, TaskItem> = {};

  const visit = (node: TreeNode) => {
    const firstTask = findFirstTask(node);
    if (node.synthetic && firstTask) {
      virtualTasks[node.id] = {
        id: node.id,
        code: "",
        title: node.title,
        description: firstTask.description ?? "",
        space: firstTask.space,
        folder: firstTask.folder,
        list: firstTask.list,
        status: firstTask.status,
        priority: firstTask.priority,
        assignees: firstTask.assignees,
        dueDate: firstTask.dueDate,
        startDate: firstTask.startDate,
        tags: firstTask.tags,
        customFields: firstTask.customFields,
        comments: firstTask.comments,
        subtasksDone: firstTask.subtasksDone,
        subtasksTotal: node.children.length,
        taskType: "task",
      };
    }

    node.children.forEach(visit);
  };

  nodes.forEach(visit);
  return virtualTasks;
}

function mergeVirtualTaskOverrides(virtualTasks: Record<string, TaskItem>, overrides: Record<string, Partial<TaskItem>>) {
  return Object.fromEntries(
    Object.entries(virtualTasks).map(([id, task]) => [id, { ...task, ...(overrides[id] ?? {}) }]),
  ) as Record<string, TaskItem>;
}

function getGroupingLabel(node: TreeNode, groupingMode: GroupingMode) {
  const task = getNodeTask(node);
  if (!task) return "Sem dados";
  if (groupingMode === "status") return statusLabels[task.status];
  if (groupingMode === "assignee") return task.assignees[0] ?? "Nao atribuido";
  if (groupingMode === "priority") return priorityLabels[task.priority];
  if (groupingMode === "tag") return task.tags[0] ?? "Sem etiquetas";
  if (groupingMode === "due_date") return task.dueDate ? formatLongDate(task.dueDate) : "Sem prazo";
  if (groupingMode === "task_type") return task.taskType === "subtask" ? "Subtarefa" : "Tarefa";
  if (groupingMode === "space") return task.space;
  if (groupingMode === "folder") return task.folder ?? "Sem pasta";
  return task.list;
}

function buildScopeConfigs(spaces: SpaceSummary[]) {
  const nextConfig: Record<string, ScopeConfig> = {};

  spaces.forEach((space) => {
    const spaceKey = makeScopeKey("space", space.name);
    nextConfig[spaceKey] = nextConfig[spaceKey] ?? {
      statuses: ["A fazer", "Em andamento", "Revisao", "Concluido"],
      fields: ["Status", "Responsavel", "Prioridade", "Etiquetas", "Data de vencimento", "Tipo de tarefa"],
    };

    space.folders.forEach((folder) => {
      const folderKey = makeScopeKey("folder", space.name, folder.name);
      nextConfig[folderKey] = nextConfig[folderKey] ?? {
        statuses: ["A fazer", "Em andamento", "Aguardando", "Concluido"],
        fields: ["Campanha ADS", "Prazo CRIACAO", "Formato", "Tipo", "Editoria"],
      };

      folder.lists.forEach((list) => {
        const listKey = makeScopeKey("list", space.name, folder.name, list.name);
        nextConfig[listKey] = nextConfig[listKey] ?? {
          statuses: ["Backlog", "Em pauta", "Revisao", "Concluido"],
          fields: ["Status", "Responsavel", "Prioridade", "Etiquetas", "Data de vencimento", "Tipo de tarefa"],
        };
      });
    });

    space.listsWithoutFolder.forEach((list) => {
      const listKey = makeScopeKey("list", space.name, "", list.name);
      nextConfig[listKey] = nextConfig[listKey] ?? {
        statuses: ["Backlog", "Em pauta", "Revisao", "Concluido"],
        fields: ["Status", "Responsavel", "Prioridade", "Etiquetas", "Data de vencimento", "Tipo de tarefa"],
      };
    });
  });

  return nextConfig;
}

function makeScopeKey(scope: ScopeKind, spaceName: string, folderName = "", listName = "") {
  return `${scope}:${spaceName}:${folderName}:${listName}`;
}

function makeSidebarOrderKey(kind: "spaces" | "folders" | "folder_lists" | "root_lists", spaceName = "", folderName = "") {
  if (kind === "spaces") return "sidebar:spaces";
  if (kind === "folders") return `sidebar:${spaceName}:folders`;
  if (kind === "root_lists") return `sidebar:${spaceName}:root_lists`;
  return `sidebar:${spaceName}:${folderName}:lists`;
}

function humanizeUserEmail(email?: string) {
  if (!email) return "Usuario";
  return email
    .split("@")[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((chunk) => chunk[0]?.toUpperCase() + chunk.slice(1))
    .join(" ");
}

function makeUniqueEntityName(baseName: string, existingNames: string[]) {
  const normalizedExisting = new Set(existingNames.map(normalizeText));
  let index = 1;
  let candidate = `${baseName} ${index}`;

  while (normalizedExisting.has(normalizeText(candidate))) {
    index += 1;
    candidate = `${baseName} ${index}`;
  }

  return candidate;
}

function buildGridTemplate(columns: ListColumnKey[]) {
  return ["minmax(320px, 2.4fr)", ...columns.map(getColumnWidth), "92px"].join(" ");
}

function isBaseListColumn(column: string): column is BaseListColumnKey {
  return (baseListColumns as readonly string[]).includes(column);
}

function isCustomListColumn(column: string): column is CustomListColumnKey {
  return column.startsWith(customColumnPrefix) && getCustomFieldName(column).length > 0;
}

function isListColumn(column: string | undefined): column is ListColumnKey {
  return Boolean(column && (isBaseListColumn(column) || isCustomListColumn(column)));
}

function makeCustomColumnKey(fieldName: string): CustomListColumnKey {
  return `${customColumnPrefix}${fieldName.trim()}` as CustomListColumnKey;
}

function getCustomFieldName(column: string) {
  return column.startsWith(customColumnPrefix) ? column.slice(customColumnPrefix.length).trim() : "";
}

function getColumnLabel(column: ListColumnKey) {
  return isCustomListColumn(column) ? getCustomFieldName(column) : baseColumnLabels[column];
}

function getColumnWidth(column: ListColumnKey) {
  return isCustomListColumn(column) ? "minmax(150px, 0.85fr)" : baseColumnWidths[column];
}

function mapFieldNameToBaseColumn(fieldName: string): BaseListColumnKey | null {
  const normalized = normalizeText(fieldName);
  if (normalized === "status") return "status";
  if (normalized === "responsavel" || normalized === "responsaveis") return "assignees";
  if (normalized === "prioridade") return "priority";
  if (normalized === "etiquetas" || normalized === "tags") return "tags";
  if (normalized === "data de vencimento" || normalized === "prazo") return "dueDate";
  if (normalized === "comentarios") return "comments";
  if (normalized === "subtarefas") return "subtasks";
  if (normalized === "tipo de tarefa") return "taskType";
  if (normalized === "espaco") return "space";
  if (normalized === "pasta") return "folder";
  if (normalized === "lista") return "list";
  return null;
}

function getCustomFieldNames(scopeConfigs: ScopeConfig[]) {
  const seen = new Set<string>();
  const fieldNames: string[] = [];

  scopeConfigs.forEach((config) => {
    config.fields.forEach((fieldName) => {
      const cleanFieldName = fieldName.trim();
      const normalized = normalizeText(cleanFieldName);
      if (!cleanFieldName || mapFieldNameToBaseColumn(cleanFieldName) || seen.has(normalized)) return;
      seen.add(normalized);
      fieldNames.push(cleanFieldName);
    });
  });

  return fieldNames;
}

function getAvailableListColumns(customFieldNames: string[]) {
  return [...baseListColumns, ...customFieldNames.map(makeCustomColumnKey)] satisfies ListColumnKey[];
}

function orderItems<T>(items: T[], order: string[] | undefined, getId: (item: T) => string) {
  if (!order || order.length === 0) return items;
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...items].sort((left, right) => {
    const leftRank = rank.get(getId(left));
    const rightRank = rank.get(getId(right));
    if (leftRank === undefined && rightRank === undefined) return 0;
    if (leftRank === undefined) return 1;
    if (rightRank === undefined) return -1;
    return leftRank - rightRank;
  });
}

function reorderWithin(order: string[], draggedId: string, targetId: string) {
  if (draggedId === targetId) return order;
  const draggedIndex = order.indexOf(draggedId);
  const targetIndex = order.indexOf(targetId);
  if (draggedIndex < 0 || targetIndex < 0) return order;
  const next = [...order];
  next.splice(draggedIndex, 1);
  const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
  next.splice(insertIndex, 0, draggedId);
  return next;
}

function getMonthGridAnchor(taskItems: TaskItem[]) {
  const firstTaskWithDate = taskItems.find((task) => task.dueDate);
  return firstTaskWithDate?.dueDate ? new Date(`${firstTaskWithDate.dueDate}T12:00:00`) : new Date("2026-07-01T12:00:00");
}

function getDaysInMonth(anchor: Date) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstDay = new Date(year, month, 1);
  const days: Date[] = [];
  const firstWeekday = (firstDay.getDay() + 6) % 7;

  for (let padding = 0; padding < firstWeekday; padding += 1) {
    days.push(new Date(year, month, padding - firstWeekday + 1));
  }

  const totalDays = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= totalDays; day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(new Date(year, month, totalDays + (days.length % 7) + 1));
  }

  return days;
}

function mergeSpacesWithLocalStructure(
  spaces: SpaceSummary[],
  localFolders: Array<{ spaceName: string; name: string }>,
  localLists: Array<{ spaceName: string; folderName?: string; name: string }>,
) {
  return spaces.map((space) => {
    const addedFolders = localFolders
      .filter((folder) => folder.spaceName === space.name && !space.folders.some((existing) => existing.name === folder.name))
      .map((folder) => ({ name: folder.name, active: 0, lists: [] as ListSummary[] }));

    const folders = [...space.folders, ...addedFolders].map((folder) => {
      const addedLists = localLists
        .filter(
          (list) =>
            list.spaceName === space.name &&
            (list.folderName ?? "") === folder.name &&
            !folder.lists.some((existing) => existing.name === list.name),
        )
        .map((list) => ({ name: list.name, active: 0, folderName: folder.name }));

      return { ...folder, lists: [...folder.lists, ...addedLists] };
    });

    const rootLists = [
      ...space.listsWithoutFolder,
      ...localLists
        .filter(
          (list) =>
            list.spaceName === space.name &&
            !list.folderName &&
            !space.listsWithoutFolder.some((existing) => existing.name === list.name),
        )
        .map((list) => ({ name: list.name, active: 0 })),
    ];

    return { ...space, folders, listsWithoutFolder: rootLists };
  });
}

function DismissibleLayer({
  ariaLabel,
  children,
  className,
  onClose,
}: {
  ariaLabel: string;
  children: ReactNode;
  className: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointer = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      onClose();
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className={className} role="dialog" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

function reportPersistenceError(error: unknown) {
  console.warn("Nao foi possivel persistir a alteracao no Supabase.", error);
}

export function App() {
  const initialSelection = getDefaultPathForSpace(initialWorkspaceSnapshot.spaces[0]?.name ?? "", initialWorkspaceSnapshot.spaces, initialWorkspaceSnapshot.tasks);
  const hasHydratedInitialPath = useRef(false);
  const persistenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPersistences = useRef(0);
  const [view, setView] = useState<ViewMode>("list");
  const [enabledViews, setEnabledViews] = useState<ViewMode[]>(defaultEnabledViews);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>("none");
  const [subtaskVisibilityMode, setSubtaskVisibilityMode] = useState<SubtaskVisibilityMode>("collapsed");
  const [detailMode, setDetailMode] = useState<DetailMode>("side");
  const [selectedColumns, setSelectedColumns] = useState<ListColumnKey[]>(defaultListColumns);
  const [searchQuery, setSearchQuery] = useState("");
  const [authState, setAuthState] = useState<AuthState>(
    isSupabaseConfigured ? { status: "signed_out", user: null } : { status: "local", user: null },
  );
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState(initialWorkspaceSnapshot);
  const [taskItemsState, setTaskItemsState] = useState(initialWorkspaceSnapshot.tasks);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(isSupabaseConfigured);
  const [selectedSpaceName, setSelectedSpaceName] = useState(initialWorkspaceSnapshot.spaces[0]?.name ?? "");
  const [selectedFolderName, setSelectedFolderName] = useState(initialSelection.folderName);
  const [selectedListName, setSelectedListName] = useState(initialSelection.listName);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [editingTaskId, setEditingTaskId] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(266);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [collapsedSpaces, setCollapsedSpaces] = useState<Record<string, boolean>>({});
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [taskOrder, setTaskOrder] = useState<Record<string, string[]>>({});
  const [sidebarEntityOrder, setSidebarEntityOrder] = useState<Record<string, string[]>>({});
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [entityDragState, setEntityDragState] = useState<EntityDragState | null>(null);
  const [sidebarResizeState, setSidebarResizeState] = useState<SidebarResizeState | null>(null);
  const [entityMeta, setEntityMeta] = useState<Record<string, EntityMeta>>({});
  const [virtualTaskOverrides, setVirtualTaskOverrides] = useState<Record<string, Partial<TaskItem>>>({});
  const [entityMenuTarget, setEntityMenuTarget] = useState<EntityMenuTarget | null>(null);
  const [appearanceTarget, setAppearanceTarget] = useState<AppearanceTarget | null>(null);
  const [localFolders, setLocalFolders] = useState<Array<{ spaceName: string; name: string }>>([]);
  const [localLists, setLocalLists] = useState<Array<{ spaceName: string; folderName?: string; name: string }>>([]);
  const [persistenceFeedback, setPersistenceFeedback] = useState<PersistenceFeedback>({ status: "idle" });
  const [scopeConfigs, setScopeConfigs] = useState<Record<string, ScopeConfig>>(() =>
    buildScopeConfigs(initialWorkspaceSnapshot.spaces),
  );
  const layoutStateRef = useRef<LayoutStateSnapshot>({
    view,
    enabledViews,
    groupingMode,
    subtaskVisibilityMode,
    detailMode,
    selectedColumns,
    sidebarWidth,
    sidebarEntityOrder,
  });
  const persistLayoutPreferenceRef = useRef<(updates: LayoutPreferences) => void>(() => {});
  const scopeConfigsRef = useRef(scopeConfigs);
  const sidebarEntityOrderRef = useRef(sidebarEntityOrder);
  const taskItems = taskItemsState;
  const baseSpaceItems = workspaceSnapshot.spaces;

  useEffect(() => {
    return () => {
      if (persistenceTimer.current) clearTimeout(persistenceTimer.current);
    };
  }, []);

  useEffect(() => {
    layoutStateRef.current = {
      view,
      enabledViews,
      groupingMode,
      subtaskVisibilityMode,
      detailMode,
      selectedColumns,
      sidebarWidth,
      sidebarEntityOrder,
    };
  }, [detailMode, enabledViews, groupingMode, selectedColumns, sidebarEntityOrder, sidebarWidth, subtaskVisibilityMode, view]);

  useEffect(() => {
    scopeConfigsRef.current = scopeConfigs;
  }, [scopeConfigs]);

  useEffect(() => {
    sidebarEntityOrderRef.current = sidebarEntityOrder;
  }, [sidebarEntityOrder]);

  useEffect(() => {
    let isMounted = true;

    const applyUserPreferences = (rows: UserPreferenceRow[]) => {
      const layoutRow = rows.find((row) => row.scopeKind === "layout" && row.scopeKey === "main");
      if (layoutRow) {
        const layout = coerceLayoutPreferences(layoutRow.preferences);
        const nextView = isKnownOption(viewOptions, layout.view) ? layout.view : undefined;

        if (layout.enabledViews) {
          const nextEnabledViews = layout.enabledViews.filter((item): item is ViewMode => isKnownOption(viewOptions, item));
          const safeEnabledViews = nextEnabledViews.length > 0 ? nextEnabledViews : defaultEnabledViews;
          setEnabledViews(nextView && !safeEnabledViews.includes(nextView) ? [nextView, ...safeEnabledViews] : safeEnabledViews);
        }

        if (nextView) setView(nextView);
        if (isKnownOption(groupingOptions, layout.groupingMode)) setGroupingMode(layout.groupingMode);
        if (isKnownOption(subtaskVisibilityOptions, layout.subtaskVisibilityMode)) setSubtaskVisibilityMode(layout.subtaskVisibilityMode);
        if (isKnownOption(detailModeOptions, layout.detailMode)) setDetailMode(layout.detailMode);
        if (layout.selectedColumns) {
          setSelectedColumns(layout.selectedColumns.filter(isListColumn));
        }
        if (layout.sidebarWidth) setSidebarWidth(layout.sidebarWidth);
        if (layout.sidebarEntityOrder) {
          sidebarEntityOrderRef.current = layout.sidebarEntityOrder;
          setSidebarEntityOrder(layout.sidebarEntityOrder);
        }
      }

      const nextScopeConfigs = rows.reduce<Record<string, ScopeConfig>>((configs, row) => {
        if (row.scopeKind !== "scope_config") return configs;
        const config = coerceScopeConfigPreferences(row.preferences);
        configs[row.scopeKey] = config;
        return configs;
      }, {});

      if (Object.keys(nextScopeConfigs).length > 0) {
        setScopeConfigs((current) => {
          const next = { ...current, ...nextScopeConfigs };
          scopeConfigsRef.current = next;
          return next;
        });
      }

      const nextTaskOrder = rows.reduce<Record<string, string[]>>((order, row) => {
        if (row.scopeKind !== "task_order") return order;
        const taskOrderPreference = coerceTaskOrderPreferences(row.preferences);
        if (taskOrderPreference.order.length > 0) order[row.scopeKey] = taskOrderPreference.order;
        return order;
      }, {});

      if (Object.keys(nextTaskOrder).length > 0) {
        setTaskOrder((current) => ({ ...current, ...nextTaskOrder }));
      }
    };

    const applyScopeConfigurations = (configs: Record<string, ScopeConfig>) => {
      if (Object.keys(configs).length === 0) return;

      setScopeConfigs((current) => {
        const next = { ...current, ...configs };
        scopeConfigsRef.current = next;
        return next;
      });
    };

    const refreshWorkspace = () => {
      setIsWorkspaceLoading(true);
      loadWorkspaceSnapshot()
        .then((snapshot) => {
          if (!isMounted) return;
          setWorkspaceSnapshot(snapshot);
          setTaskItemsState(snapshot.tasks);
          setSelectedSpaceName((currentSpaceName) => {
            if (snapshot.spaces.some((space) => space.name === currentSpaceName)) return currentSpaceName;
            return snapshot.spaces[0]?.name ?? "";
          });

          setSelectedTaskId((currentTaskId) => (snapshot.tasks.some((task) => task.id === currentTaskId) ? currentTaskId : ""));

          if (snapshot.source === "supabase") {
            void Promise.all([loadUserPreferences(), loadScopeConfigurations()])
              .then(([rows, configs]) => {
                if (!isMounted) return;
                applyUserPreferences(rows);
                applyScopeConfigurations(configs);
              })
              .catch(reportPersistenceError);
          }
        })
        .catch(() => {
          if (!isMounted) return;
          setWorkspaceSnapshot(localWorkspaceSnapshot);
        })
        .finally(() => {
          if (isMounted) setIsWorkspaceLoading(false);
        });
    };

    getAuthState().then((state) => {
      if (isMounted) setAuthState(state);
    });

    refreshWorkspace();
    const unsubscribe = onAuthStateChange((state) => {
      if (!isMounted) return;
      setAuthState(state);
      refreshWorkspace();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setScopeConfigs((current) => ({ ...buildScopeConfigs(baseSpaceItems), ...current }));
  }, [baseSpaceItems]);

  useEffect(() => {
    const remoteEntityMeta = buildEntityMetaFromSpaces(baseSpaceItems);
    if (Object.keys(remoteEntityMeta).length === 0) return;
    setEntityMeta((current) => ({ ...remoteEntityMeta, ...current }));
  }, [baseSpaceItems]);

  useEffect(() => {
    if (!sidebarResizeState) return undefined;

    const handleMove = (event: MouseEvent) => {
      const delta = event.clientX - sidebarResizeState.startX;
      setSidebarWidth(Math.min(420, Math.max(220, sidebarResizeState.startWidth + delta)));
    };

    const handleUp = (event: MouseEvent) => {
      const delta = event.clientX - sidebarResizeState.startX;
      const nextWidth = Math.min(420, Math.max(220, sidebarResizeState.startWidth + delta));
      setSidebarWidth(nextWidth);
      persistLayoutPreferenceRef.current({ sidebarWidth: nextWidth });
      setSidebarResizeState(null);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [sidebarResizeState]);

  const spaceItems = useMemo(
    () => mergeSpacesWithLocalStructure(baseSpaceItems, localFolders, localLists),
    [baseSpaceItems, localFolders, localLists],
  );

  useEffect(() => {
    if (spaceItems.length === 0) {
      if (selectedSpaceName) setSelectedSpaceName("");
      if (selectedFolderName) setSelectedFolderName("");
      if (selectedListName) setSelectedListName("");
      return;
    }

    if (!spaceItems.some((space) => space.name === selectedSpaceName)) {
      setSelectedSpaceName(spaceItems[0]?.name ?? "");
      return;
    }

    const currentSpace = spaceItems.find((space) => space.name === selectedSpaceName);
    if (!currentSpace) return;

    if (!hasHydratedInitialPath.current && !selectedFolderName && !selectedListName) {
      const defaultPath = getDefaultPathForSpace(selectedSpaceName, spaceItems, taskItems);
      hasHydratedInitialPath.current = true;

      if (defaultPath.folderName !== selectedFolderName) setSelectedFolderName(defaultPath.folderName);
      if (defaultPath.listName !== selectedListName) setSelectedListName(defaultPath.listName);
      return;
    }

    if (isSelectionValidForSpace(currentSpace, selectedFolderName, selectedListName)) return;

    const defaultPath = getDefaultPathForSpace(selectedSpaceName, spaceItems, taskItems);
    if (defaultPath.folderName !== selectedFolderName) setSelectedFolderName(defaultPath.folderName);
    if (defaultPath.listName !== selectedListName) setSelectedListName(defaultPath.listName);
  }, [selectedFolderName, selectedListName, selectedSpaceName, spaceItems, taskItems]);

  const orderedSpaces = useMemo(
    () => orderItems(spaceItems, sidebarEntityOrder[makeSidebarOrderKey("spaces")], (space) => space.name),
    [sidebarEntityOrder, spaceItems],
  );
  const selectedSpace = orderedSpaces.find((space) => space.name === selectedSpaceName) ?? orderedSpaces[0];

  const orderedFolders = useMemo(() => {
    if (!selectedSpace) return [];
    return orderItems(selectedSpace.folders, sidebarEntityOrder[makeSidebarOrderKey("folders", selectedSpace.name)], (folder) => folder.name);
  }, [selectedSpace, sidebarEntityOrder]);

  const visibleFolderLists = useMemo(() => {
    if (!selectedSpace) return {} as Record<string, ListSummary[]>;
    return Object.fromEntries(
      orderedFolders.map((folder) => [
        folder.name,
        orderItems(folder.lists, sidebarEntityOrder[makeSidebarOrderKey("folder_lists", selectedSpace.name, folder.name)], (list) => list.name),
      ]),
    ) as Record<string, ListSummary[]>;
  }, [orderedFolders, selectedSpace, sidebarEntityOrder]);

  const scopedTasks = useMemo(() => {
    if (!selectedSpace) return taskItems;
    return taskItems.filter((task) => {
      if (task.space !== selectedSpace.name) return false;
      if (selectedListName) {
        return task.list === selectedListName && normalizeText(task.folder) === normalizeText(selectedFolderName);
      }
      if (selectedFolderName) return normalizeText(task.folder) === normalizeText(selectedFolderName);
      return true;
    });
  }, [selectedFolderName, selectedListName, selectedSpace, taskItems]);

  const assigneeOptions = useMemo(() => {
    const names = new Set<string>();
    scopedTasks.forEach((task) => task.assignees.forEach((assignee) => names.add(assignee)));
    return [...names]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((name) => ({ name, count: scopedTasks.filter((task) => task.assignees.includes(name)).length }));
  }, [scopedTasks]);

  const unassignedCount = useMemo(() => scopedTasks.filter((task) => task.assignees.length === 0).length, [scopedTasks]);

  const filteredTasks = useMemo(() => {
    const assigneeFiltered = filterTasksByAssignees(scopedTasks, selectedAssignees);
    if (!searchQuery.trim()) return assigneeFiltered;
    const normalizedQuery = normalizeText(searchQuery);
    return assigneeFiltered.filter((task) => {
      return [
        task.title,
        task.code,
        task.description,
        task.parentTask,
        task.folder,
        task.list,
        task.space,
        ...task.tags,
        ...task.assignees,
      ].some((value) => normalizeText(value).includes(normalizedQuery));
    });
  }, [scopedTasks, searchQuery, selectedAssignees]);

  useEffect(() => {
    if (!selectedTaskId) return;
    if (selectedTaskId.startsWith("synthetic:")) return;
    if (filteredTasks.some((task) => task.id === selectedTaskId)) return;
    setSelectedTaskId("");
  }, [filteredTasks, selectedTaskId]);

  const metrics = useMemo(() => getTaskMetrics(filteredTasks, "2026-06-28"), [filteredTasks]);
  const treeRoots = useMemo(() => buildTaskTree(filteredTasks), [filteredTasks]);
  const virtualTasks = useMemo(
    () => mergeVirtualTaskOverrides(buildVirtualTasksFromTree(treeRoots), virtualTaskOverrides),
    [treeRoots, virtualTaskOverrides],
  );
  const selectedTask = selectedTaskId ? filteredTasks.find((task) => task.id === selectedTaskId) ?? virtualTasks[selectedTaskId] : undefined;
  const selectedTaskSubtasks = useMemo(
    () => (selectedTaskId ? getDirectChildTasks(treeRoots, selectedTaskId) : []),
    [selectedTaskId, treeRoots],
  );
  const canAddSubtaskToSelectedTask = Boolean(selectedTask && !selectedTask.id.startsWith("synthetic:"));
  const groupedRoots = useMemo(() => buildRootGroups(treeRoots, groupingMode), [groupingMode, treeRoots]);

  const selectedSpaceKey = selectedSpace ? makeEntityKey("space", selectedSpace.name) : "";
  const selectedFolderKey = selectedSpace && selectedFolderName ? makeEntityKey("folder", selectedSpace.name, selectedFolderName) : "";
  const selectedListKey =
    selectedSpace && selectedListName ? makeEntityKey("list", selectedSpace.name, selectedFolderName, selectedListName) : "";

  const selectedEntityTitle = selectedListName
    ? displayEntityName(selectedListName, entityMeta, selectedListKey)
    : selectedFolderName
      ? displayEntityName(selectedFolderName, entityMeta, selectedFolderKey)
      : selectedSpace
        ? displayEntityName(selectedSpace.name, entityMeta, selectedSpaceKey)
        : "Tasks";
  const breadcrumbParts = ["Lumine", selectedSpace ? displayEntityName(selectedSpace.name, entityMeta, selectedSpaceKey) : "Tasks"];
  if (selectedFolderName) breadcrumbParts.push(displayEntityName(selectedFolderName, entityMeta, selectedFolderKey));
  if (selectedListName) breadcrumbParts.push(displayEntityName(selectedListName, entityMeta, selectedListKey));

  const currentScopeOptions = [
    selectedSpace ? { label: `Espaco: ${selectedSpace.name}`, value: makeScopeKey("space", selectedSpace.name) } : null,
    selectedFolderName && selectedSpace
      ? { label: `Pasta: ${selectedFolderName}`, value: makeScopeKey("folder", selectedSpace.name, selectedFolderName) }
      : null,
    selectedListName && selectedSpace
      ? { label: `Lista: ${selectedListName}`, value: makeScopeKey("list", selectedSpace.name, selectedFolderName, selectedListName) }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  const customFieldNames = useMemo(
    () => getCustomFieldNames(currentScopeOptions.map((option) => scopeConfigs[option.value]).filter((config): config is ScopeConfig => Boolean(config))),
    [currentScopeOptions, scopeConfigs],
  );
  const availableColumns = useMemo(() => getAvailableListColumns(customFieldNames), [customFieldNames]);

  const updateScopeConfig = (scopeKey: string, field: keyof ScopeConfig, updater: (current: string[]) => string[]) => {
    const currentConfig = scopeConfigsRef.current[scopeKey] ?? { statuses: [], fields: [] };
    const nextConfig: ScopeConfig = {
      ...currentConfig,
      [field]: updater(currentConfig[field] ?? []),
    };
    const nextScopeConfigs = { ...scopeConfigsRef.current, [scopeKey]: nextConfig };

    scopeConfigsRef.current = nextScopeConfigs;
    setScopeConfigs(nextScopeConfigs);
    persistWithFeedback(() => persistScopeConfiguration(scopeKey, nextConfig));
  };

  const clearPersistenceTimer = () => {
    if (!persistenceTimer.current) return;
    clearTimeout(persistenceTimer.current);
    persistenceTimer.current = null;
  };

  const finishPersistenceFeedback = (status: PersistenceFeedback["status"]) => {
    if (pendingPersistences.current > 0) return;
    setPersistenceFeedback({ status });
    clearPersistenceTimer();
    persistenceTimer.current = setTimeout(() => {
      setPersistenceFeedback({ status: "idle" });
      persistenceTimer.current = null;
    }, status === "error" ? 6000 : 2200);
  };

  const persistWithFeedback = (operation: () => Promise<void>) => {
    if (!isSupabaseConfigured || authState.status !== "signed_in") {
      void operation().catch(reportPersistenceError);
      return;
    }

    clearPersistenceTimer();
    pendingPersistences.current += 1;
    setPersistenceFeedback({ status: "saving" });

    void operation()
      .then(() => {
        pendingPersistences.current = Math.max(0, pendingPersistences.current - 1);
        finishPersistenceFeedback("saved");
      })
      .catch((error) => {
        pendingPersistences.current = Math.max(0, pendingPersistences.current - 1);
        reportPersistenceError(error);
        finishPersistenceFeedback("error");
      });
  };

  const persistLayoutPreference = (updates: LayoutPreferences) => {
    const preferences = {
      ...layoutStateRef.current,
      ...updates,
    };

    persistWithFeedback(() => persistUserPreference("layout", "main", preferences));
  };

  persistLayoutPreferenceRef.current = persistLayoutPreference;

  const changeView = (nextView: ViewMode) => {
    setView(nextView);
    persistLayoutPreference({ view: nextView });
  };

  const addEnabledView = (nextView: ViewMode) => {
    const currentEnabledViews = layoutStateRef.current.enabledViews;
    if (currentEnabledViews.includes(nextView)) return;
    const nextEnabledViews = [...currentEnabledViews, nextView];
    setEnabledViews(nextEnabledViews);
    persistLayoutPreference({ enabledViews: nextEnabledViews });
  };

  const changeGroupingMode = (nextMode: GroupingMode) => {
    setGroupingMode(nextMode);
    persistLayoutPreference({ groupingMode: nextMode });
  };

  const changeSubtaskVisibilityMode = (nextMode: SubtaskVisibilityMode) => {
    setSubtaskVisibilityMode(nextMode);
    persistLayoutPreference({ subtaskVisibilityMode: nextMode });
  };

  const changeDetailMode = (nextMode: DetailMode) => {
    setDetailMode(nextMode);
    persistLayoutPreference({ detailMode: nextMode });
  };

  const updateSelectedColumns = (updater: (current: ListColumnKey[]) => ListColumnKey[]) => {
    const nextColumns = updater(layoutStateRef.current.selectedColumns);
    setSelectedColumns(nextColumns);
    persistLayoutPreference({ selectedColumns: nextColumns });
  };

  const updateTask = (taskId: string, updates: Partial<TaskItem>) => {
    if (taskId.startsWith("synthetic:")) {
      setVirtualTaskOverrides((current) => ({
        ...current,
        [taskId]: { ...(current[taskId] ?? {}), ...updates },
      }));
      return;
    }

    const taskBeforeUpdate = taskItems.find((task) => task.id === taskId);
    setTaskItemsState((current) => current.map((task) => (task.id === taskId ? { ...task, ...updates } : task)));
    if (taskBeforeUpdate) {
      persistWithFeedback(() => persistTaskUpdate({ ...taskBeforeUpdate, ...updates }, updates));
    }
  };

  const renameTask = (taskId: string, title: string) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    updateTask(taskId, { title: cleanTitle });
    setEditingTaskId("");
  };

  const addSubtask = (parentTaskId: string) => {
    const parentTask = taskItems.find((task) => task.id === parentTaskId);
    if (!parentTask) return;
    const nextId = `local-${Date.now()}`;
    const nextTitle = "Nova subtarefa";
    const nextTask: TaskItem = {
      id: nextId,
      externalId: nextId,
      code: "",
      title: nextTitle,
      description: "",
      space: parentTask.space,
      folder: parentTask.folder,
      list: parentTask.list,
      parentTask: parentTask.title,
      parentExternalId: parentTask.externalId ?? parentTask.id,
      isSubtask: true,
      status: "todo",
      priority: "normal",
      assignees: [],
      dueDate: parentTask.dueDate,
      startDate: parentTask.startDate,
      tags: [],
      customFields: {},
      comments: 0,
      subtasksDone: 0,
      subtasksTotal: 0,
      taskType: "subtask",
    };

    setTaskItemsState((current) => {
      const nextTasks = current.map((task) =>
        task.id === parentTaskId ? { ...task, subtasksTotal: task.subtasksTotal + 1 } : task,
      );

      return [...nextTasks, nextTask];
    });

    persistWithFeedback(() =>
      Promise.all([
        persistTaskUpdate({ ...parentTask, subtasksTotal: parentTask.subtasksTotal + 1 }, { subtasksTotal: parentTask.subtasksTotal + 1 }),
        persistTaskCreate(nextTask),
      ]).then(() => undefined),
    );
    setExpandedNodes((current) => ({ ...current, [parentTaskId]: true }));
    setSelectedTaskId(nextId);
    setEditingTaskId(nextId);
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((current) => (current.includes(taskId) ? current.filter((item) => item !== taskId) : [...current, taskId]));
  };

  const handleDropNode = (parentKey: string, siblingIds: string[], targetId: string) => {
    if (!dragState || dragState.parentKey !== parentKey) return;
    const base = taskOrder[parentKey]?.length ? taskOrder[parentKey] : siblingIds;
    const nextOrder = reorderWithin(base, dragState.nodeId, targetId);
    setTaskOrder((current) => ({ ...current, [parentKey]: nextOrder }));
    persistWithFeedback(() => persistUserPreference("task_order", parentKey, { order: nextOrder }));
    setDragState(null);
  };

  const handleEntityDragStart = (scopeKey: string, itemId: string) => {
    setEntityDragState(scopeKey && itemId ? { scopeKey, itemId } : null);
  };

  const handleEntityDrop = (scopeKey: string, siblingIds: string[], targetId: string) => {
    if (!entityDragState || entityDragState.scopeKey !== scopeKey) return;
    const base = sidebarEntityOrderRef.current[scopeKey]?.length ? sidebarEntityOrderRef.current[scopeKey] : siblingIds;
    const nextOrder = reorderWithin(base, entityDragState.itemId, targetId);
    const nextSidebarEntityOrder = { ...sidebarEntityOrderRef.current, [scopeKey]: nextOrder };

    sidebarEntityOrderRef.current = nextSidebarEntityOrder;
    setSidebarEntityOrder(nextSidebarEntityOrder);
    persistLayoutPreference({ sidebarEntityOrder: nextSidebarEntityOrder });
    setEntityDragState(null);
  };

  const applyEntityMeta = (key: string, updates: Partial<EntityMeta>, target?: EntityMenuTarget) => {
    setEntityMeta((current) => ({
      ...current,
      [key]: { ...(current[key] ?? {}), ...updates },
    }));

    if (target) persistWithFeedback(() => persistEntityMeta(target, updates));
  };

  const renameEntity = (target: EntityMenuTarget, currentName: string) => {
    const nextName = window.prompt("Novo nome", currentName)?.trim();
    if (!nextName || nextName === currentName) return;

    setEntityMeta((current) => ({
      ...current,
      [target.key]: { ...(current[target.key] ?? {}), label: nextName },
    }));

    persistWithFeedback(() =>
      Promise.all([persistEntityRename(target, nextName), persistEntityMeta(target, { label: nextName })]).then(() => undefined),
    );
  };

  const createFolder = (spaceName: string) => {
    const space = baseSpaceItems.find((item) => item.name === spaceName);
    const existingNames = [
      ...(space?.folders.map((folder) => folder.name) ?? []),
      ...localFolders.filter((folder) => folder.spaceName === spaceName).map((folder) => folder.name),
    ];
    const name = makeUniqueEntityName("Nova pasta", existingNames);
    setLocalFolders((current) => [...current, { spaceName, name }]);
    persistWithFeedback(() => persistFolderCreate({ spaceName, folderName: name }));
    setSelectedSpaceName(spaceName);
    setSelectedFolderName(name);
    setSelectedListName("");
  };

  const createList = (spaceName: string, folderName = "") => {
    const space = baseSpaceItems.find((item) => item.name === spaceName);
    const folder = space?.folders.find((item) => normalizeText(item.name) === normalizeText(folderName));
    const existingNames = [
      ...(folderName ? (folder?.lists.map((list) => list.name) ?? []) : (space?.listsWithoutFolder.map((list) => list.name) ?? [])),
      ...localLists
        .filter((list) => list.spaceName === spaceName && normalizeText(list.folderName) === normalizeText(folderName))
        .map((list) => list.name),
    ];
    const name = makeUniqueEntityName("Nova lista", existingNames);
    setLocalLists((current) => [...current, { spaceName, folderName: folderName || undefined, name }]);
    persistWithFeedback(() => persistListCreate({ spaceName, folderName: folderName || undefined, listName: name }));
    setSelectedSpaceName(spaceName);
    setSelectedFolderName(folderName);
    setSelectedListName(name);
  };

  const createTaskInContext = (spaceName: string, folderName = "", listName = "") => {
    const nextId = `local-task-${Date.now()}`;
    const nextTitle = "Nova tarefa";
    const nextTask: TaskItem = {
      id: nextId,
      externalId: nextId,
      code: "",
      title: nextTitle,
      description: "",
      space: spaceName,
      folder: folderName || undefined,
      list: listName || selectedListName || "Sem lista",
      status: "todo",
      priority: "normal",
      assignees: [],
      dueDate: undefined,
      startDate: undefined,
      tags: [],
      customFields: {},
      comments: 0,
      subtasksDone: 0,
      subtasksTotal: 0,
      taskType: "task",
    };

    setTaskItemsState((current) => [...current, nextTask]);
    persistWithFeedback(() => persistTaskCreate(nextTask));
    setSelectedSpaceName(spaceName);
    setSelectedFolderName(folderName);
    setSelectedListName(listName || selectedListName);
    setSelectedTaskId(nextId);
    setEditingTaskId(nextId);
  };

  return (
    <main className="app-shell" style={{ gridTemplateColumns: `${sidebarWidth}px 10px minmax(0, 1fr)` }}>
      <aside className="sidebar" aria-label="Navegacao principal">
        <a className="brand" href="/tasks/" aria-label="Tasks Lumine">
          <span className="brand-mark">L</span>
          <span>
            <strong>Tasks</strong>
            <small>Lumine</small>
          </span>
        </a>

        <nav className="nav-block" aria-label="Atalhos">
          <button className="nav-item active" type="button">
            <Inbox size={16} /> Inbox
            <span>6</span>
          </button>
          <button className="nav-item" type="button">
            <CheckCircle2 size={16} /> Minhas tarefas
          </button>
          <button className="nav-item" type="button">
            <CalendarDays size={16} /> Hoje
          </button>
          <button className="nav-item" type="button">
            <Sparkles size={16} /> Everything
          </button>
        </nav>

        <section className="sidebar-section" aria-labelledby="spaces-title">
          <div className="sidebar-title" id="spaces-title">
            Espacos
            <button type="button" aria-label="Adicionar espaco">
              <Plus size={14} />
            </button>
          </div>

          <div className="space-list">
            {isWorkspaceLoading && orderedSpaces.length === 0 ? (
              <div className="sidebar-loading">Carregando espacos</div>
            ) : (
              orderedSpaces.map((space) => {
                const spaceKey = makeEntityKey("space", space.name);
                const spaceOrderKey = makeSidebarOrderKey("spaces");
                const spaceSiblingIds = orderedSpaces.map((item) => item.name);
                const folderOrderKey = makeSidebarOrderKey("folders", space.name);
                const rootListOrderKey = makeSidebarOrderKey("root_lists", space.name);
                const currentFolders = orderItems(space.folders, sidebarEntityOrder[folderOrderKey], (folder) => folder.name);
                const currentRootLists = orderItems(space.listsWithoutFolder, sidebarEntityOrder[rootListOrderKey], (list) => list.name);
                const isSpaceCollapsed = collapsedSpaces[space.name] ?? false;
                const isSpaceSelected = space.name === selectedSpace?.name && !selectedFolderName && !selectedListName;

                return (
                  <div className="space-group" key={space.name}>
                    <SidebarEntityRow
                      active={isSpaceSelected}
                      color={resolveEntityColor(space.color, entityMeta, spaceKey)}
                      count={space.active}
                      icon={getEntityIcon(entityMeta[spaceKey]?.icon ?? "space")}
                      label={displayEntityName(space.name, entityMeta, spaceKey)}
                      dragScopeKey={spaceOrderKey}
                      dragItemId={space.name}
                      dragSiblingIds={spaceSiblingIds}
                      isDragging={entityDragState?.scopeKey === spaceOrderKey && entityDragState.itemId === space.name}
                      onDragStart={handleEntityDragStart}
                      onDropItem={handleEntityDrop}
                      onClick={() => {
                        setSelectedSpaceName(space.name);
                        setSelectedFolderName("");
                        setSelectedListName("");
                        setSelectedAssignees([]);
                      }}
                      onToggleExpand={() => setCollapsedSpaces((current) => ({ ...current, [space.name]: !isSpaceCollapsed }))}
                      expanded={!isSpaceCollapsed}
                      showAdd
                      onAddClick={() =>
                        setEntityMenuTarget({ kind: "space", key: spaceKey, menuType: "create", spaceName: space.name })
                      }
                    >
                      {entityMenuTarget?.key === spaceKey && entityMenuTarget.menuType === "create" && (
                        <EntityActionMenu
                          entityMeta={entityMeta}
                          target={entityMenuTarget}
                          onClose={() => setEntityMenuTarget(null)}
                          onCreateFolder={() => {
                            createFolder(entityMenuTarget.spaceName);
                            setEntityMenuTarget(null);
                          }}
                          onCreateList={() => {
                            createList(entityMenuTarget.spaceName, entityMenuTarget.folderName ?? "");
                            setEntityMenuTarget(null);
                          }}
                          onCreateTask={() => {
                            createTaskInContext(
                              entityMenuTarget.spaceName,
                              entityMenuTarget.folderName ?? "",
                              entityMenuTarget.listName ?? selectedListName,
                            );
                            setEntityMenuTarget(null);
                          }}
                          onCustomize={() => {
                            setAppearanceTarget({
                              ...entityMenuTarget,
                              currentName: displayEntityName(entityMenuTarget.spaceName, entityMeta, entityMenuTarget.key),
                            });
                            setEntityMenuTarget(null);
                          }}
                          onRename={() => {
                            renameEntity(entityMenuTarget, displayEntityName(space.name, entityMeta, entityMenuTarget.key));
                            setEntityMenuTarget(null);
                          }}
                          onToggleFavorite={() => {
                            applyEntityMeta(entityMenuTarget.key, { favorite: !entityMeta[entityMenuTarget.key]?.favorite }, entityMenuTarget);
                            setEntityMenuTarget(null);
                          }}
                        />
                      )}
                      {appearanceTarget?.key === spaceKey && (
                        <EntityAppearancePicker
                          entityMeta={entityMeta}
                          target={appearanceTarget}
                          onClose={() => setAppearanceTarget(null)}
                          onSave={(updates) => {
                            applyEntityMeta(appearanceTarget.key, updates, appearanceTarget);
                            setAppearanceTarget(null);
                          }}
                        />
                      )}
                    </SidebarEntityRow>

                    {!isSpaceCollapsed && (
                      <div className="space-links">
                        {currentFolders.map((folder) => {
                          const folderKey = makeEntityKey("folder", space.name, folder.name);
                          const folderListOrderKey = makeSidebarOrderKey("folder_lists", space.name, folder.name);
                          const isFolderCollapsed = collapsedFolders[folderKey] ?? false;
                          const folderLists = orderItems(
                            visibleFolderLists[folder.name] ?? folder.lists,
                            sidebarEntityOrder[folderListOrderKey],
                            (list) => list.name,
                          );
                          const folderSiblingIds = currentFolders.map((item) => item.name);
                          return (
                            <div className="folder-group" key={folder.name}>
                              <SidebarEntityRow
                                active={selectedFolderName === folder.name && !selectedListName}
                                color={resolveEntityColor("yellow", entityMeta, folderKey)}
                                count={folder.active}
                                icon={getEntityIcon(entityMeta[folderKey]?.icon ?? "folder")}
                                label={displayEntityName(folder.name, entityMeta, folderKey)}
                                dragScopeKey={folderOrderKey}
                                dragItemId={folder.name}
                                dragSiblingIds={folderSiblingIds}
                                isDragging={entityDragState?.scopeKey === folderOrderKey && entityDragState.itemId === folder.name}
                                onDragStart={handleEntityDragStart}
                                onDropItem={handleEntityDrop}
                                onClick={() => {
                                  setSelectedSpaceName(space.name);
                                  setSelectedFolderName(folder.name);
                                  setSelectedListName("");
                                  setSelectedAssignees([]);
                                }}
                                onToggleExpand={() => setCollapsedFolders((current) => ({ ...current, [folderKey]: !isFolderCollapsed }))}
                                expanded={!isFolderCollapsed}
                                showMenu
                                showAdd
                                compact
                                onAddClick={() =>
                                  setEntityMenuTarget({
                                    kind: "folder",
                                    key: folderKey,
                                    menuType: "create",
                                    spaceName: space.name,
                                    folderName: folder.name,
                                  })
                                }
                                onMenuClick={() =>
                                  setEntityMenuTarget({
                                    kind: "folder",
                                    key: folderKey,
                                    menuType: "actions",
                                    spaceName: space.name,
                                    folderName: folder.name,
                                  })
                                }
                              >
                                {entityMenuTarget?.key === folderKey && (
                                  <EntityActionMenu
                                    entityMeta={entityMeta}
                                    target={entityMenuTarget}
                                    onClose={() => setEntityMenuTarget(null)}
                                    onCreateFolder={() => {
                                      createFolder(entityMenuTarget.spaceName);
                                      setEntityMenuTarget(null);
                                    }}
                                    onCreateList={() => {
                                      createList(entityMenuTarget.spaceName, entityMenuTarget.folderName ?? "");
                                      setEntityMenuTarget(null);
                                    }}
                                    onCreateTask={() => {
                                      createTaskInContext(
                                        entityMenuTarget.spaceName,
                                        entityMenuTarget.folderName ?? "",
                                        entityMenuTarget.listName ?? selectedListName,
                                      );
                                      setEntityMenuTarget(null);
                                    }}
                                    onCustomize={() => {
                                      setAppearanceTarget({
                                        ...entityMenuTarget,
                                        currentName: displayEntityName(folder.name, entityMeta, entityMenuTarget.key),
                                      });
                                      setEntityMenuTarget(null);
                                    }}
                                    onRename={() => {
                                      renameEntity(entityMenuTarget, displayEntityName(folder.name, entityMeta, entityMenuTarget.key));
                                      setEntityMenuTarget(null);
                                    }}
                                    onToggleFavorite={() => {
                                      applyEntityMeta(entityMenuTarget.key, { favorite: !entityMeta[entityMenuTarget.key]?.favorite }, entityMenuTarget);
                                      setEntityMenuTarget(null);
                                    }}
                                  />
                                )}
                                {appearanceTarget?.key === folderKey && (
                                  <EntityAppearancePicker
                                    entityMeta={entityMeta}
                                    target={appearanceTarget}
                                    onClose={() => setAppearanceTarget(null)}
                                    onSave={(updates) => {
                                      applyEntityMeta(appearanceTarget.key, updates, appearanceTarget);
                                      setAppearanceTarget(null);
                                    }}
                                  />
                                )}
                              </SidebarEntityRow>

                              {!isFolderCollapsed && (
                                <div className="folder-lists">
                                  {folderLists.map((list) => {
                                    const listKey = makeEntityKey("list", space.name, folder.name, list.name);
                                    const folderListSiblingIds = folderLists.map((item) => item.name);
                                    return (
                                      <SidebarEntityRow
                                        active={space.name === selectedSpace?.name && list.name === selectedListName}
                                        color={resolveEntityColor("yellow", entityMeta, listKey)}
                                        count={list.active}
                                        icon={getEntityIcon(entityMeta[listKey]?.icon ?? "list")}
                                        key={list.name}
                                        label={displayEntityName(list.name, entityMeta, listKey)}
                                        dragScopeKey={folderListOrderKey}
                                        dragItemId={list.name}
                                        dragSiblingIds={folderListSiblingIds}
                                        isDragging={entityDragState?.scopeKey === folderListOrderKey && entityDragState.itemId === list.name}
                                        onDragStart={handleEntityDragStart}
                                        onDropItem={handleEntityDrop}
                                        onClick={() => {
                                          setSelectedSpaceName(space.name);
                                          setSelectedFolderName(folder.name);
                                          setSelectedListName(list.name);
                                          setSelectedAssignees([]);
                                        }}
                                        showMenu
                                        showAdd
                                        compact
                                        onAddClick={() =>
                                          setEntityMenuTarget({
                                            kind: "list",
                                            key: listKey,
                                            menuType: "create",
                                            spaceName: space.name,
                                            folderName: folder.name,
                                            listName: list.name,
                                          })
                                        }
                                        onMenuClick={() =>
                                          setEntityMenuTarget({
                                            kind: "list",
                                            key: listKey,
                                            menuType: "actions",
                                            spaceName: space.name,
                                            folderName: folder.name,
                                            listName: list.name,
                                          })
                                        }
                                      >
                                        {entityMenuTarget?.key === listKey && (
                                          <EntityActionMenu
                                            entityMeta={entityMeta}
                                            target={entityMenuTarget}
                                            onClose={() => setEntityMenuTarget(null)}
                                            onCreateFolder={() => {
                                              createFolder(entityMenuTarget.spaceName);
                                              setEntityMenuTarget(null);
                                            }}
                                            onCreateList={() => {
                                              createList(entityMenuTarget.spaceName, entityMenuTarget.folderName ?? "");
                                              setEntityMenuTarget(null);
                                            }}
                                            onCreateTask={() => {
                                              createTaskInContext(
                                                entityMenuTarget.spaceName,
                                                entityMenuTarget.folderName ?? "",
                                                entityMenuTarget.listName ?? selectedListName,
                                              );
                                              setEntityMenuTarget(null);
                                            }}
                                            onCustomize={() => {
                                              setAppearanceTarget({
                                                ...entityMenuTarget,
                                                currentName: displayEntityName(list.name, entityMeta, entityMenuTarget.key),
                                              });
                                              setEntityMenuTarget(null);
                                            }}
                                            onRename={() => {
                                              renameEntity(entityMenuTarget, displayEntityName(list.name, entityMeta, entityMenuTarget.key));
                                              setEntityMenuTarget(null);
                                            }}
                                            onToggleFavorite={() => {
                                              applyEntityMeta(entityMenuTarget.key, { favorite: !entityMeta[entityMenuTarget.key]?.favorite }, entityMenuTarget);
                                              setEntityMenuTarget(null);
                                            }}
                                          />
                                        )}
                                        {appearanceTarget?.key === listKey && (
                                          <EntityAppearancePicker
                                            entityMeta={entityMeta}
                                            target={appearanceTarget}
                                            onClose={() => setAppearanceTarget(null)}
                                            onSave={(updates) => {
                                              applyEntityMeta(appearanceTarget.key, updates, appearanceTarget);
                                              setAppearanceTarget(null);
                                            }}
                                          />
                                        )}
                                      </SidebarEntityRow>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {currentRootLists.length > 0 && (
                          <div className="folder-group root-lists">
                            {currentRootLists.map((list) => {
                              const listKey = makeEntityKey("list", space.name, "", list.name);
                              const rootListSiblingIds = currentRootLists.map((item) => item.name);
                              return (
                                <SidebarEntityRow
                                  active={space.name === selectedSpace?.name && list.name === selectedListName}
                                  color={resolveEntityColor("yellow", entityMeta, listKey)}
                                  count={list.active}
                                  icon={getEntityIcon(entityMeta[listKey]?.icon ?? "list")}
                                  key={list.name}
                                  label={displayEntityName(list.name, entityMeta, listKey)}
                                  dragScopeKey={rootListOrderKey}
                                  dragItemId={list.name}
                                  dragSiblingIds={rootListSiblingIds}
                                  isDragging={entityDragState?.scopeKey === rootListOrderKey && entityDragState.itemId === list.name}
                                  onDragStart={handleEntityDragStart}
                                  onDropItem={handleEntityDrop}
                                  onClick={() => {
                                    setSelectedSpaceName(space.name);
                                    setSelectedFolderName("");
                                    setSelectedListName(list.name);
                                    setSelectedAssignees([]);
                                  }}
                                  showMenu
                                  showAdd
                                  compact
                                  onAddClick={() =>
                                    setEntityMenuTarget({
                                      kind: "list",
                                      key: listKey,
                                      menuType: "create",
                                      spaceName: space.name,
                                      listName: list.name,
                                    })
                                  }
                                  onMenuClick={() =>
                                    setEntityMenuTarget({
                                      kind: "list",
                                      key: listKey,
                                      menuType: "actions",
                                      spaceName: space.name,
                                      listName: list.name,
                                    })
                                  }
                                >
                                  {entityMenuTarget?.key === listKey && (
                                    <EntityActionMenu
                                      entityMeta={entityMeta}
                                      target={entityMenuTarget}
                                      onClose={() => setEntityMenuTarget(null)}
                                      onCreateFolder={() => {
                                        createFolder(entityMenuTarget.spaceName);
                                        setEntityMenuTarget(null);
                                      }}
                                      onCreateList={() => {
                                        createList(entityMenuTarget.spaceName, entityMenuTarget.folderName ?? "");
                                        setEntityMenuTarget(null);
                                      }}
                                      onCreateTask={() => {
                                        createTaskInContext(
                                          entityMenuTarget.spaceName,
                                          entityMenuTarget.folderName ?? "",
                                          entityMenuTarget.listName ?? selectedListName,
                                        );
                                        setEntityMenuTarget(null);
                                      }}
                                      onCustomize={() => {
                                        setAppearanceTarget({
                                          ...entityMenuTarget,
                                          currentName: displayEntityName(list.name, entityMeta, entityMenuTarget.key),
                                        });
                                        setEntityMenuTarget(null);
                                      }}
                                      onRename={() => {
                                        renameEntity(entityMenuTarget, displayEntityName(list.name, entityMeta, entityMenuTarget.key));
                                        setEntityMenuTarget(null);
                                      }}
                                      onToggleFavorite={() => {
                                        applyEntityMeta(entityMenuTarget.key, { favorite: !entityMeta[entityMenuTarget.key]?.favorite }, entityMenuTarget);
                                        setEntityMenuTarget(null);
                                      }}
                                    />
                                  )}
                                  {appearanceTarget?.key === listKey && (
                                    <EntityAppearancePicker
                                      entityMeta={entityMeta}
                                      target={appearanceTarget}
                                      onClose={() => setAppearanceTarget(null)}
                                      onSave={(updates) => {
                                        applyEntityMeta(appearanceTarget.key, updates, appearanceTarget);
                                        setAppearanceTarget(null);
                                      }}
                                    />
                                  )}
                                </SidebarEntityRow>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <div className="sidebar-footer">
          <span className={classNames("sync-dot", workspaceSnapshot.source === "supabase" && "online")} />
          {isWorkspaceLoading || workspaceSnapshot.source === "loading"
            ? "Carregando dados"
            : workspaceSnapshot.source === "supabase"
              ? "Supabase conectado"
              : isSupabaseConfigured
                ? "Aguardando login"
                : "Modo local"}
        </div>
      </aside>
      <button
        className={classNames("sidebar-resizer", sidebarResizeState && "active")}
        type="button"
        aria-label="Redimensionar lateral"
        title="Redimensionar lateral"
        onMouseDown={(event) => {
          event.preventDefault();
          setSidebarResizeState({ startWidth: sidebarWidth, startX: event.clientX });
        }}
      >
        <span />
      </button>

      <section className="workspace">
        <header className="topbar">
          <div>
            <div className="crumbs">{breadcrumbParts.join(" / ")}</div>
            <h1>{selectedEntityTitle}</h1>
          </div>

          <div className="topbar-actions">
            <label className="search">
              <Search size={16} />
              <input
                aria-label="Buscar tarefas"
                placeholder="Buscar tarefas"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <PersistenceStatusBadge feedback={persistenceFeedback} />
            <AuthControl authState={authState} />
            <button className="icon-button" type="button" aria-label="Notificacoes">
              <Bell size={17} />
            </button>
          </div>
        </header>

        <section className="metrics-strip" aria-label="Resumo">
          <Metric label="Total" value={metrics.total} tone="neutral" />
          <Metric label="Em andamento" value={metrics.byStatus.in_progress} tone="blue" />
          <Metric label="Vencem hoje" value={metrics.dueToday} tone="yellow" />
          <Metric label="Atrasadas" value={metrics.overdue} tone="red" />
          <Metric label="Concluidas" value={metrics.done} tone="green" />
        </section>

        <div className="toolbar">
          <div className="toolbar-stack compact">
            <div className="toolbar-view-cluster">
              <div className="view-tabs" role="tablist" aria-label="Visualizacao">
                {enabledViews.map((viewMode) => (
                  <button
                    className={view === viewMode ? "active" : ""}
                    key={viewMode}
                    type="button"
                    onClick={() => changeView(viewMode)}
                  >
                  {viewMode === "list" && <LayoutList size={15} />}
                  {viewMode === "table" && <Table2 size={15} />}
                  {viewMode === "gantt" && <SlidersHorizontal size={15} />}
                    {viewMode === "calendar" && <CalendarDays size={15} />}
                    {viewMode === "board" && <Columns3 size={15} />}
                    {viewMode === "mind_map" && <Link2 size={15} />}
                    {viewMode === "team" && <Users size={15} />}
                    {viewLabels[viewMode]}
                  </button>
                ))}
                <ViewPicker enabledViews={enabledViews} onAddView={addEnabledView} />
              </div>
              <div className="view-option-group" aria-label="Controles da lista">
                <GroupingControl groupingMode={groupingMode} onChange={changeGroupingMode} />
                <SubtaskVisibilityControl mode={subtaskVisibilityMode} onChange={changeSubtaskVisibilityMode} />
                <DetailModeControl detailMode={detailMode} onChange={changeDetailMode} />
              </div>
            </div>
          </div>

          <div className="toolbar-actions">
            <button className="tool-button" type="button">
              <Filter size={15} /> Filtros
            </button>
            <AssigneeFilter
              assignees={assigneeOptions}
              selectedAssignees={selectedAssignees}
              unassignedCount={unassignedCount}
              onClear={() => setSelectedAssignees([])}
              onToggle={(assignee) =>
                setSelectedAssignees((current) =>
                  current.includes(assignee) ? current.filter((item) => item !== assignee) : [...current, assignee],
                )
              }
            />
            <ScopedConfigButton
              field="statuses"
              icon={<CircleDot size={15} />}
              label="Status"
              scopeConfigs={scopeConfigs}
              scopeOptions={currentScopeOptions}
              onAdd={(scopeKey, value) => updateScopeConfig(scopeKey, "statuses", (current) => [...current, value])}
              onRemove={(scopeKey, value) =>
                updateScopeConfig(scopeKey, "statuses", (current) => current.filter((item) => item !== value))
              }
            />
            <ScopedConfigButton
              field="fields"
              icon={<SlidersHorizontal size={15} />}
              label="Campos"
              scopeConfigs={scopeConfigs}
              scopeOptions={currentScopeOptions}
              onAdd={(scopeKey, value) => updateScopeConfig(scopeKey, "fields", (current) => [...current, value])}
              onRemove={(scopeKey, value) =>
                updateScopeConfig(scopeKey, "fields", (current) => current.filter((item) => item !== value))
              }
            />
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                if (!selectedSpace) return;
                createTaskInContext(selectedSpace.name, selectedFolderName, selectedListName);
              }}
            >
              <Plus size={16} /> Nova tarefa
            </button>
          </div>
        </div>

        <div className={classNames("work-area", detailMode === "modal" && "modal-mode", !selectedTask && "detail-closed")}>
          {isWorkspaceLoading && workspaceSnapshot.source === "loading" ? (
            <LoadingTaskState />
          ) : filteredTasks.length === 0 ? (
            <EmptyTaskState selectedSpaceName={selectedSpace?.name ?? "este Espaco"} selectedListName={selectedEntityTitle} />
          ) : (
            <TaskSurface
              detailMode={detailMode}
              editingTaskId={editingTaskId}
              groupingMode={groupingMode}
              groupedRoots={groupedRoots}
              availableColumns={availableColumns}
              customFieldNames={customFieldNames}
              selectedColumns={selectedColumns}
              selectedTaskId={selectedTask?.id ?? ""}
              selectedView={view}
              subtaskVisibilityMode={subtaskVisibilityMode}
              taskItems={filteredTasks}
              taskOrder={taskOrder}
              treeRoots={treeRoots}
              onAddColumn={(column) => {
                if (selectedColumns.includes(column)) return;
                updateSelectedColumns((current) => [...current, column]);
              }}
              onSwapColumn={(currentColumn, nextColumn) =>
                updateSelectedColumns((current) => current.map((column) => (column === currentColumn ? nextColumn : column)))
              }
              onRemoveColumn={(column) => updateSelectedColumns((current) => current.filter((item) => item !== column))}
              onDragNodeStart={(parentKey, nodeId) => setDragState(parentKey && nodeId ? { parentKey, nodeId } : null)}
              onDropNode={handleDropNode}
              onRenameTask={renameTask}
              onSelectTask={setSelectedTaskId}
              onSetEditingTaskId={setEditingTaskId}
              onToggleTaskSelection={toggleTaskSelection}
              onToggleExpanded={(nodeId) =>
                setExpandedNodes((current) => ({
                  ...current,
                  [nodeId]: !(current[nodeId] ?? (subtaskVisibilityMode === "expanded")),
                }))
              }
              onAddSubtask={addSubtask}
              onUpdateTask={updateTask}
              resolveExpanded={(nodeId) => expandedNodes[nodeId] ?? (subtaskVisibilityMode === "expanded")}
              selectedTaskIds={selectedTaskIds}
            />
          )}

          {detailMode === "side" && selectedTask && (
            <TaskPanel
              canAddSubtask={canAddSubtaskToSelectedTask}
              subtasks={selectedTaskSubtasks}
              task={selectedTask}
              customFieldNames={customFieldNames}
              onAddSubtask={addSubtask}
              onSelectTask={setSelectedTaskId}
              onUpdateTask={updateTask}
            />
          )}
        </div>

        {detailMode === "modal" && selectedTask && (
          <TaskModal
            canAddSubtask={canAddSubtaskToSelectedTask}
            subtasks={selectedTaskSubtasks}
            task={selectedTask}
            customFieldNames={customFieldNames}
            onAddSubtask={addSubtask}
            onClose={() => setSelectedTaskId("")}
            onSelectTask={setSelectedTaskId}
            onUpdateTask={updateTask}
          />
        )}
      </section>
    </main>
  );
}

function LoadingTaskState() {
  return (
    <section className="empty-state loading-state" aria-label="Carregando tarefas">
      <RowsSkeleton />
      <h2>Carregando dados do Supabase</h2>
      <p>Aguardando sessao e tarefas reais antes de pintar a hierarquia.</p>
    </section>
  );
}

function PersistenceStatusBadge({ feedback }: { feedback: PersistenceFeedback }) {
  if (feedback.status === "idle") return null;

  const labelByStatus: Record<Exclude<PersistenceFeedback["status"], "idle">, string> = {
    saving: "Salvando",
    saved: "Salvo",
    error: "Erro ao salvar",
  };

  const label = labelByStatus[feedback.status];

  return (
    <div className={classNames("persistence-status", `persistence-${feedback.status}`)} role="status" aria-live="polite" title={label}>
      {feedback.status === "saving" && <LoaderCircle size={14} />}
      {feedback.status === "saved" && <CheckCircle2 size={14} />}
      {feedback.status === "error" && <AlertCircle size={14} />}
      <span>{label}</span>
    </div>
  );
}

function RowsSkeleton() {
  return (
    <span className="rows-skeleton" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function EmptyTaskState({
  selectedSpaceName,
  selectedListName,
}: {
  selectedSpaceName: string;
  selectedListName: string;
}) {
  return (
    <section className="empty-state" aria-label="Sem tarefas nesta selecao">
      <FolderOpen size={28} />
      <h2>Nenhuma tarefa nesta selecao</h2>
      <p>
        {selectedSpaceName} / {selectedListName} ainda nao tem tarefas importadas ou visiveis pelos filtros atuais.
      </p>
    </section>
  );
}

function AuthControl({ authState }: { authState: AuthState }) {
  if (authState.status === "local") {
    return (
      <button className="auth-trigger muted" type="button" disabled>
        <UserRound size={15} /> Local
      </button>
    );
  }

  if (authState.status === "signed_in") {
    return <SignedInUserControl user={authState.user} />;
  }

  return <SignedOutUserControl />;
}

function SignedOutUserControl() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      if (mode === "signin") {
        await signInWithEmailPassword(email, password);
        setIsOpen(false);
      } else {
        await signUpWithEmailPassword(email, password);
        setMessage("Conta criada. Confira o e-mail se a confirmacao estiver ativa.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel autenticar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-control">
      <button
        className="auth-trigger"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
      >
        <UserRound size={15} /> Entrar
      </button>
      {isOpen && (
        <DismissibleLayer ariaLabel="Acesso" className="auth-popover" onClose={() => setIsOpen(false)}>
          <form onSubmit={submit}>
          <div className="auth-mode" role="tablist" aria-label="Modo de acesso">
            <button className={mode === "signin" ? "active" : ""} type="button" onClick={() => setMode("signin")}>
              Entrar
            </button>
            <button className={mode === "signup" ? "active" : ""} type="button" onClick={() => setMode("signup")}>
              Criar
            </button>
          </div>
          <label>
            E-mail
            <input autoComplete="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Senha
            <input
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={6}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {message && <p className="auth-message">{message}</p>}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Aguarde" : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
          </form>
        </DismissibleLayer>
      )}
    </div>
  );
}

function SignedInUserControl({ user }: { user: User }) {
  const [isOpen, setIsOpen] = useState(false);
  const displayName =
    String(user.user_metadata?.name ?? user.user_metadata?.full_name ?? "").trim() || humanizeUserEmail(user.email);

  return (
    <div className="auth-control">
      <div className="auth-inline">
        <span title={displayName}>{displayName}</span>
        <button
          className="inline-settings"
          type="button"
          aria-label="Configuracoes da conta"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          onClick={() => setIsOpen((current) => !current)}
        >
          <Settings size={15} />
        </button>
      </div>
      {isOpen && (
        <DismissibleLayer ariaLabel="Configuracoes da conta" className="settings-popover" onClose={() => setIsOpen(false)}>
          <strong>{displayName}</strong>
          <small>{user.email}</small>
          <button className="tool-button" type="button">
            <Settings size={15} /> Preferencias
          </button>
          <button className="tool-button danger" type="button" onClick={() => void signOut()}>
            <X size={15} /> Sair
          </button>
        </DismissibleLayer>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={classNames("metric", `metric-${tone}`)}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SidebarEntityRow({
  active,
  color,
  children,
  compact = false,
  count,
  dragItemId,
  dragScopeKey,
  dragSiblingIds = [],
  expanded,
  icon,
  isDragging = false,
  label,
  onAddClick,
  onClick,
  onDragStart,
  onMenuClick,
  onDropItem,
  onToggleExpand,
  showAdd = false,
  showMenu = false,
}: {
  active?: boolean;
  color: string;
  children?: ReactNode;
  compact?: boolean;
  count: number;
  dragItemId?: string;
  dragScopeKey?: string;
  dragSiblingIds?: string[];
  expanded?: boolean;
  icon: ReactNode;
  isDragging?: boolean;
  label: string;
  onAddClick?: () => void;
  onClick: () => void;
  onDragStart?: (scopeKey: string, itemId: string) => void;
  onMenuClick?: () => void;
  onDropItem?: (scopeKey: string, siblingIds: string[], itemId: string) => void;
  onToggleExpand?: () => void;
  showAdd?: boolean;
  showMenu?: boolean;
}) {
  const canDrag = Boolean(dragScopeKey && dragItemId && onDragStart && onDropItem);

  return (
    <div
      className={classNames("sidebar-entity-row", active && "active", compact && "compact", isDragging && "dragging")}
      draggable={canDrag}
      onDragEnd={() => onDragStart?.("", "")}
      onDragOver={(event) => {
        if (!canDrag) return;
        event.preventDefault();
      }}
      onDragStart={(event) => {
        if (!canDrag || !dragScopeKey || !dragItemId) return;
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", dragItemId);
        }
        onDragStart?.(dragScopeKey, dragItemId);
      }}
      onDrop={(event) => {
        if (!canDrag || !dragScopeKey || !dragItemId) return;
        event.preventDefault();
        onDropItem?.(dragScopeKey, dragSiblingIds, dragItemId);
      }}
    >
      <button className="sidebar-entity-main" type="button" onClick={onClick}>
        <span className="sidebar-row-drag-handle" aria-hidden="true">
          <GripVertical size={12} />
        </span>
        {onToggleExpand ? (
          <span className="sidebar-chevron" onClick={(event) => {
            event.stopPropagation();
            onToggleExpand();
          }}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : (
          <span className="sidebar-chevron placeholder" />
        )}
        <span className={classNames("sidebar-entity-icon", `dot-${color}`)}>{icon}</span>
        <span className="sidebar-entity-label">{label}</span>
        <small>{count}</small>
      </button>
      <span className="sidebar-entity-actions">
        {showMenu && (
          <button type="button" aria-label="Mais opcoes" onClick={onMenuClick}>
            <MoreHorizontal size={13} />
          </button>
        )}
        {showAdd && (
          <button type="button" aria-label="Criar novo" onClick={onAddClick}>
            <Plus size={13} />
          </button>
        )}
      </span>
      {children}
    </div>
  );
}

function ViewPicker({
  enabledViews,
  onAddView,
}: {
  enabledViews: ViewMode[];
  onAddView: (viewMode: ViewMode) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hiddenViews = (Object.keys(viewLabels) as ViewMode[]).filter((viewMode) => !enabledViews.includes(viewMode));

  return (
    <div className="column-picker">
      <button className="view-add-button" type="button" aria-label="Adicionar visualizacao" title="Adicionar visualizacao" onClick={() => setIsOpen((current) => !current)}>
        <Plus size={15} />
      </button>
      {isOpen && (
        <DismissibleLayer ariaLabel="Adicionar visualizacao" className="view-popover compact column-popover" onClose={() => setIsOpen(false)}>
          <strong>Adicionar visualizacao</strong>
          <div className="option-list">
            {hiddenViews.map((viewMode) => (
              <button
                className="option-row"
                key={viewMode}
                type="button"
                onClick={() => {
                  onAddView(viewMode);
                  setIsOpen(false);
                }}
              >
                <Plus size={14} />
                <span>{viewLabels[viewMode]}</span>
              </button>
            ))}
          </div>
        </DismissibleLayer>
      )}
    </div>
  );
}

function EntityActionMenu({
  entityMeta,
  target,
  onClose,
  onCreateFolder,
  onCreateList,
  onCreateTask,
  onCustomize,
  onRename,
  onToggleFavorite,
}: {
  entityMeta: Record<string, EntityMeta>;
  target: EntityMenuTarget;
  onClose: () => void;
  onCreateFolder: () => void;
  onCreateList: () => void;
  onCreateTask: () => void;
  onCustomize: () => void;
  onRename: () => void;
  onToggleFavorite: () => void;
}) {
  const favorite = entityMeta[target.key]?.favorite;
  const isCreateMenu = target.menuType === "create";

  return (
    <DismissibleLayer ariaLabel="Menu da hierarquia" className="floating-context-menu anchored" onClose={onClose}>
      {isCreateMenu ? (
        <>
          <button className="option-row" type="button" onClick={onCreateTask}>
            <Plus size={14} />
            <span>Criar tarefa</span>
          </button>
          <button className="option-row" type="button" onClick={onCreateList}>
            <Plus size={14} />
            <span>Criar lista</span>
          </button>
        </>
      ) : (
        <>
          <button className="option-row" type="button" onClick={onToggleFavorite}>
            <Star size={14} />
            <span>{favorite ? "Remover de Favoritos" : "Favorito"}</span>
          </button>
          <button className="option-row" type="button" onClick={onRename}>
            <Edit3 size={14} />
            <span>Renomear</span>
          </button>
          <button
            className="option-row"
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(`#${target.key}`);
              onClose();
            }}
          >
            <Copy size={14} />
            <span>Copiar link</span>
          </button>
          <button className="option-row" type="button" onClick={onCustomize}>
            <Palette size={14} />
            <span>Icone e cor</span>
          </button>
          <div className="menu-divider" />
          {target.kind === "space" && (
            <button className="option-row" type="button" onClick={onCreateFolder}>
              <Plus size={14} />
              <span>Criar pasta</span>
            </button>
          )}
          <button className="option-row" type="button" onClick={onCreateTask}>
            <Plus size={14} />
            <span>Criar tarefa</span>
          </button>
          <button className="option-row" type="button" onClick={onCreateList}>
            <Plus size={14} />
            <span>Criar lista</span>
          </button>
        </>
      )}
    </DismissibleLayer>
  );
}

function EntityAppearancePicker({
  entityMeta,
  target,
  onClose,
  onSave,
}: {
  entityMeta: Record<string, EntityMeta>;
  target: AppearanceTarget;
  onClose: () => void;
  onSave: (updates: Partial<EntityMeta>) => void;
}) {
  const [label, setLabel] = useState(target.currentName);
  const [icon, setIcon] = useState<EntityIconKey>(entityMeta[target.key]?.icon ?? "list");
  const [color, setColor] = useState<EntityColorKey>(entityMeta[target.key]?.color ?? "yellow");

  return (
    <DismissibleLayer ariaLabel="Personalizar item" className="appearance-popover anchored" onClose={onClose}>
      <header className="popover-header">
        <strong>Icone e cor</strong>
        <button type="button" aria-label="Fechar personalizacao" onClick={onClose}>
          <X size={15} />
        </button>
      </header>
      <label className="appearance-input">
        Nome
        <input type="text" value={label} onChange={(event) => setLabel(event.target.value)} />
      </label>
      <div className="appearance-section">
        <span>Icone</span>
        <div className="icon-grid">
          {entityIconOptions.map((option) => (
            <button className={classNames("icon-grid-button", icon === option && "selected")} key={option} type="button" onClick={() => setIcon(option)}>
              {getEntityIcon(option)}
            </button>
          ))}
        </div>
      </div>
      <div className="appearance-section">
        <span>Cor</span>
        <div className="swatch-row">
          {entityColorOptions.map((option) => (
            <button
              aria-label={`Cor ${option}`}
              className={classNames("swatch-button", `dot-${option}`, color === option && "selected")}
              key={option}
              title={`Cor ${option}`}
              type="button"
              onClick={() => setColor(option)}
            />
          ))}
        </div>
      </div>
      <button className="primary-button" type="button" onClick={() => onSave({ label: label.trim() || target.currentName, color, icon })}>
        Salvar
      </button>
    </DismissibleLayer>
  );
}

function AssigneeFilter({
  assignees,
  selectedAssignees,
  unassignedCount,
  onClear,
  onToggle,
}: {
  assignees: Array<{ name: string; count: number }>;
  selectedAssignees: string[];
  unassignedCount: number;
  onClear: () => void;
  onToggle: (assignee: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleAssignees = assignees.filter((assignee) =>
    assignee.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")),
  );

  return (
    <div className="assignee-filter">
      <button
        className={classNames("assignee-trigger", selectedAssignees.length > 0 && "active")}
        type="button"
        aria-label="Filtrar tarefas por responsavel"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
        title="Filtrar tarefas por responsavel"
      >
        <Users size={16} />
        {selectedAssignees.length > 0 && <span className="filter-count">{selectedAssignees.length}</span>}
      </button>
      {isOpen && (
        <DismissibleLayer ariaLabel="Responsaveis" className="assignee-popover" onClose={() => setIsOpen(false)}>
          <header className="popover-header">
            <strong>Responsaveis</strong>
            <button type="button" aria-label="Fechar filtro de responsaveis" onClick={() => setIsOpen(false)}>
              <X size={15} />
            </button>
          </header>

          <label className="popover-search">
            <Search size={15} />
            <input
              aria-label="Pesquisar responsavel"
              placeholder="Pesquisar por usuario ou equipe"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <section className="assignee-section" aria-label={`Pessoas ${visibleAssignees.length + 1}`}>
            <span>Pessoas {visibleAssignees.length + 1}</span>
            <AssigneeOption
              checked={selectedAssignees.includes(UNASSIGNED_FILTER)}
              count={unassignedCount}
              label="Nao atribuido"
              tone="unassigned"
              onToggle={() => onToggle(UNASSIGNED_FILTER)}
            />
            {visibleAssignees.map((assignee) => (
              <AssigneeOption
                checked={selectedAssignees.includes(assignee.name)}
                count={assignee.count}
                key={assignee.name}
                label={assignee.name}
                onToggle={() => onToggle(assignee.name)}
              />
            ))}
          </section>

          <section className="assignee-section" aria-label="Equipes 1">
            <span>Equipes 1</span>
            <AssigneeOption checked={false} count={2} disabled label="Marketing LMN" tone="team" onToggle={() => {}} />
          </section>

          {selectedAssignees.length > 0 && (
            <button className="clear-filter" type="button" onClick={onClear}>
              Limpar responsaveis
            </button>
          )}
        </DismissibleLayer>
      )}
    </div>
  );
}

function AssigneeOption({
  checked,
  count,
  disabled = false,
  label,
  tone,
  onToggle,
}: {
  checked: boolean;
  count: number;
  disabled?: boolean;
  label: string;
  tone?: "team" | "unassigned";
  onToggle: () => void;
}) {
  return (
    <label className={classNames("assignee-option", disabled && "disabled")}>
      <span className={classNames("person-avatar", tone)}>
        {tone === "unassigned" ? <Users size={13} /> : getInitials(label)}
      </span>
      <span className="assignee-name">{label}</span>
      <small>{count}</small>
      <input aria-label={label} checked={checked} disabled={disabled} type="checkbox" onChange={onToggle} />
    </label>
  );
}

function ScopedConfigButton({
  field,
  icon,
  label,
  scopeConfigs,
  scopeOptions,
  onAdd,
  onRemove,
}: {
  field: keyof ScopeConfig;
  icon: ReactNode;
  label: string;
  scopeConfigs: Record<string, ScopeConfig>;
  scopeOptions: Array<{ label: string; value: string }>;
  onAdd: (scopeKey: string, value: string) => void;
  onRemove: (scopeKey: string, value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeScope, setActiveScope] = useState(scopeOptions[scopeOptions.length - 1]?.value ?? scopeOptions[0]?.value ?? "");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!scopeOptions.some((option) => option.value === activeScope)) {
      setActiveScope(scopeOptions[scopeOptions.length - 1]?.value ?? scopeOptions[0]?.value ?? "");
    }
  }, [activeScope, scopeOptions]);

  const currentItems = scopeConfigs[activeScope]?.[field] ?? [];

  return (
    <div className="scope-config">
      <button
        className="tool-button icon-only"
        type="button"
        aria-label={`Editar ${label.toLowerCase()}`}
        title={`Editar ${label.toLowerCase()}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
      >
        {icon}
        <span>{label}</span>
      </button>
      {isOpen && (
        <DismissibleLayer ariaLabel={`${label} por escopo`} className="config-popover" onClose={() => setIsOpen(false)}>
          <header className="popover-header">
            <strong>{label}</strong>
            <button type="button" aria-label={`Fechar editor de ${label.toLowerCase()}`} onClick={() => setIsOpen(false)}>
              <X size={15} />
            </button>
          </header>

          <div className="scope-switch">
            {scopeOptions.map((option) => (
              <button
                className={activeScope === option.value ? "active" : ""}
                key={option.value}
                type="button"
                onClick={() => setActiveScope(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="editable-chip-list">
            {currentItems.map((item) => (
              <span className="editable-chip" key={item}>
                {item}
                <button type="button" aria-label={`Remover ${item}`} onClick={() => onRemove(activeScope, item)}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <form
            className="chip-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.trim()) return;
              onAdd(activeScope, draft.trim());
              setDraft("");
            }}
          >
            <input
              aria-label={`Adicionar ${label.toLowerCase()}`}
              placeholder={`Novo ${label.toLowerCase()}`}
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button className="primary-button compact" type="submit">
              <Plus size={14} /> Adicionar
            </button>
          </form>
        </DismissibleLayer>
      )}
    </div>
  );
}

function GroupingControl({ groupingMode, onChange }: { groupingMode: GroupingMode; onChange: (mode: GroupingMode) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const visibleOptions = groupingOptions.filter((option) => normalizeText(groupingLabels[option]).includes(normalizeText(query)));

  return (
    <div className="view-control">
      <button
        className={classNames("icon-button", groupingMode !== "none" && "active")}
        type="button"
        aria-label="Agrupamento"
        title="Agrupamento"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Layers2 size={16} />
      </button>
      {isOpen && (
        <DismissibleLayer ariaLabel="Agrupamento" className="view-popover" onClose={() => setIsOpen(false)}>
          <label className="popover-search">
            <Search size={15} />
            <input aria-label="Pesquisar agrupamento" placeholder="Pesquisar..." type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="option-list">
            {visibleOptions.map((option) => (
              <button
                className={classNames("option-row", groupingMode === option && "selected")}
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                <Layers2 size={14} />
                <span>{groupingLabels[option]}</span>
                {groupingMode === option && <CheckCircle2 size={14} />}
              </button>
            ))}
          </div>
        </DismissibleLayer>
      )}
    </div>
  );
}

function SubtaskVisibilityControl({
  mode,
  onChange,
}: {
  mode: SubtaskVisibilityMode;
  onChange: (mode: SubtaskVisibilityMode) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="view-control">
      <button
        className="icon-button"
        type="button"
        aria-label="Subtarefas"
        title="Subtarefas"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
      >
        <ListTree size={16} />
      </button>
      {isOpen && (
        <DismissibleLayer ariaLabel="Subtarefas" className="view-popover compact" onClose={() => setIsOpen(false)}>
          <strong>Mostrar subtarefas</strong>
          <div className="option-list">
            <button
              className={classNames("option-row", mode === "collapsed" && "selected")}
              type="button"
              onClick={() => {
                onChange("collapsed");
                setIsOpen(false);
              }}
            >
              <span>Recolhidas</span>
              <small>(padrao)</small>
              {mode === "collapsed" && <CheckCircle2 size={14} />}
            </button>
            <button
              className={classNames("option-row", mode === "expanded" && "selected")}
              type="button"
              onClick={() => {
                onChange("expanded");
                setIsOpen(false);
              }}
            >
              <span>Expandidas</span>
              {mode === "expanded" && <CheckCircle2 size={14} />}
            </button>
          </div>
        </DismissibleLayer>
      )}
    </div>
  );
}

function DetailModeControl({ detailMode, onChange }: { detailMode: DetailMode; onChange: (mode: DetailMode) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="view-control">
      <button
        className="icon-button"
        type="button"
        aria-label="Modo de detalhe"
        title="Modo de detalhe"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
      >
        {detailMode === "side" ? <PanelRightOpen size={16} /> : <Maximize2 size={16} />}
      </button>
      {isOpen && (
        <DismissibleLayer ariaLabel="Modo de detalhe" className="view-popover compact" onClose={() => setIsOpen(false)}>
          <strong>Abrir tarefa</strong>
          <div className="option-list">
            <button
              className={classNames("option-row", detailMode === "side" && "selected")}
              type="button"
              onClick={() => {
                onChange("side");
                setIsOpen(false);
              }}
            >
              <PanelRightOpen size={14} />
              <span>Painel lateral</span>
              {detailMode === "side" && <CheckCircle2 size={14} />}
            </button>
            <button
              className={classNames("option-row", detailMode === "modal" && "selected")}
              type="button"
              onClick={() => {
                onChange("modal");
                setIsOpen(false);
              }}
            >
              <Maximize2 size={14} />
              <span>Janela modal</span>
              {detailMode === "modal" && <CheckCircle2 size={14} />}
            </button>
          </div>
        </DismissibleLayer>
      )}
    </div>
  );
}

function TaskSurface({
  availableColumns,
  customFieldNames,
  detailMode,
  editingTaskId,
  groupingMode,
  groupedRoots,
  selectedColumns,
  selectedTaskId,
  selectedTaskIds,
  selectedView,
  subtaskVisibilityMode,
  taskItems,
  taskOrder,
  treeRoots,
  onAddColumn,
  onSwapColumn,
  onRemoveColumn,
  onDragNodeStart,
  onDropNode,
  onRenameTask,
  onSelectTask,
  onSetEditingTaskId,
  onToggleTaskSelection,
  onToggleExpanded,
  onAddSubtask,
  onUpdateTask,
  resolveExpanded,
}: {
  availableColumns: ListColumnKey[];
  customFieldNames: string[];
  detailMode: DetailMode;
  editingTaskId: string;
  groupingMode: GroupingMode;
  groupedRoots: RootGroup[];
  selectedColumns: ListColumnKey[];
  selectedTaskId: string;
  selectedTaskIds: string[];
  selectedView: ViewMode;
  subtaskVisibilityMode: SubtaskVisibilityMode;
  taskItems: TaskItem[];
  taskOrder: Record<string, string[]>;
  treeRoots: TreeNode[];
  onAddColumn: (column: ListColumnKey) => void;
  onSwapColumn: (currentColumn: ListColumnKey, nextColumn: ListColumnKey) => void;
  onUpdateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  onRemoveColumn: (column: ListColumnKey) => void;
  onDragNodeStart: (parentKey: string, nodeId: string) => void;
  onDropNode: (parentKey: string, siblingIds: string[], targetId: string) => void;
  onRenameTask: (taskId: string, title: string) => void;
  onSelectTask: (taskId: string) => void;
  onSetEditingTaskId: (taskId: string) => void;
  onToggleTaskSelection: (taskId: string) => void;
  onToggleExpanded: (nodeId: string) => void;
  onAddSubtask: (taskId: string) => void;
  resolveExpanded: (nodeId: string) => boolean;
}) {
  if (selectedView === "gantt") return <GanttView taskItems={taskItems} onSelectTask={onSelectTask} selectedTaskId={selectedTaskId} />;
  if (selectedView === "calendar") return <CalendarView taskItems={taskItems} onSelectTask={onSelectTask} selectedTaskId={selectedTaskId} />;
  if (selectedView === "board") return <TaskBoard taskItems={taskItems} selectedTaskId={selectedTaskId} onSelectTask={onSelectTask} />;
  if (selectedView === "mind_map") return <MindMapView roots={treeRoots} selectedTaskId={selectedTaskId} onSelectTask={onSelectTask} />;
  if (selectedView === "team") return <TeamView taskItems={taskItems} selectedTaskId={selectedTaskId} onSelectTask={onSelectTask} />;
  if (selectedView === "table") {
    return (
      <TaskFlatTable
        selectedColumns={selectedColumns}
        selectedTaskId={selectedTaskId}
        selectedTaskIds={selectedTaskIds}
        availableColumns={availableColumns}
        customFieldNames={customFieldNames}
        taskItems={taskItems}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
        onSelectTask={onSelectTask}
        onSwapColumn={onSwapColumn}
        onToggleTaskSelection={onToggleTaskSelection}
        onUpdateTask={onUpdateTask}
      />
    );
  }

  return (
    <TaskTable
      detailMode={detailMode}
      editingTaskId={editingTaskId}
      availableColumns={availableColumns}
      customFieldNames={customFieldNames}
      groupingMode={groupingMode}
      groupedRoots={groupedRoots}
      selectedColumns={selectedColumns}
      selectedTaskId={selectedTaskId}
      selectedTaskIds={selectedTaskIds}
      subtaskVisibilityMode={subtaskVisibilityMode}
      taskOrder={taskOrder}
      onAddColumn={onAddColumn}
      onSwapColumn={onSwapColumn}
      onRemoveColumn={onRemoveColumn}
      onDragNodeStart={onDragNodeStart}
      onDropNode={onDropNode}
      onRenameTask={onRenameTask}
      onSelectTask={onSelectTask}
      onSetEditingTaskId={onSetEditingTaskId}
      onToggleTaskSelection={onToggleTaskSelection}
      onToggleExpanded={onToggleExpanded}
      onAddSubtask={onAddSubtask}
      onUpdateTask={onUpdateTask}
      resolveExpanded={resolveExpanded}
    />
  );
}

function TaskFlatTable({
  availableColumns,
  customFieldNames,
  selectedColumns,
  selectedTaskId,
  selectedTaskIds,
  taskItems,
  onAddColumn,
  onRemoveColumn,
  onSelectTask,
  onSwapColumn,
  onToggleTaskSelection,
  onUpdateTask,
}: {
  availableColumns: ListColumnKey[];
  customFieldNames: string[];
  selectedColumns: ListColumnKey[];
  selectedTaskId: string;
  selectedTaskIds: string[];
  taskItems: TaskItem[];
  onAddColumn: (column: ListColumnKey) => void;
  onRemoveColumn: (column: ListColumnKey) => void;
  onSelectTask: (taskId: string) => void;
  onSwapColumn: (currentColumn: ListColumnKey, nextColumn: ListColumnKey) => void;
  onToggleTaskSelection: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<TaskItem>) => void;
}) {
  const gridTemplateColumns = buildGridTemplate(selectedColumns);

  return (
    <section className="task-surface" aria-label="Tabela de tarefas">
      <div className="table-header" style={{ gridTemplateColumns }}>
        <span>Tarefa</span>
        {selectedColumns.map((column) => (
          <ColumnHeaderPicker
            currentColumn={column}
            key={column}
            availableColumns={availableColumns}
            selectedColumns={selectedColumns}
            onRemoveColumn={onRemoveColumn}
            onSwapColumn={(nextColumn) => onSwapColumn(column, nextColumn)}
          />
        ))}
        <ListColumnPicker availableColumns={availableColumns} selectedColumns={selectedColumns} onAddColumn={onAddColumn} />
      </div>

      <div className="table-body flat-table-body">
        {taskItems.map((task) => (
          <div
            className={classNames("task-row", task.isSubtask && "subtask-row", task.id === selectedTaskId && "active")}
            key={task.id}
            style={{ gridTemplateColumns }}
            onClick={() => onSelectTask(task.id)}
          >
            <div className="tree-title-cell">
              <div className="tree-title-line">
                <button
                  className={classNames("row-select-button", selectedTaskIds.includes(task.id) && "checked")}
                  type="button"
                  aria-label="Selecionar tarefa"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleTaskSelection(task.id);
                  }}
                />
                <span className="row-drag-handle" aria-hidden="true">
                  <GripVertical size={12} />
                </span>
                <span className="expand-placeholder" />
                <button
                  className="task-title-button"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectTask(task.id);
                  }}
                >
                  <strong>{displayTaskTitle(task.title)}</strong>
                </button>
                {task.subtasksTotal > 0 && (
                  <span className="task-inline-meta">
                    <ListTree size={12} />
                    {task.subtasksTotal}
                  </span>
                )}
              </div>
            </div>

            {selectedColumns.map((column) => (
              <div className="task-cell" key={column}>
                <EditableTaskCell column={column} customFieldNames={customFieldNames} task={task} onOpenTask={onSelectTask} onUpdateTask={onUpdateTask} />
              </div>
            ))}
            <div className="task-row-tail" />
          </div>
        ))}
      </div>
    </section>
  );
}

function TaskTable({
  availableColumns,
  customFieldNames,
  detailMode,
  editingTaskId,
  groupingMode,
  groupedRoots,
  selectedColumns,
  selectedTaskId,
  selectedTaskIds,
  subtaskVisibilityMode,
  taskOrder,
  onAddColumn,
  onSwapColumn,
  onRemoveColumn,
  onDragNodeStart,
  onDropNode,
  onRenameTask,
  onSelectTask,
  onSetEditingTaskId,
  onToggleTaskSelection,
  onToggleExpanded,
  onAddSubtask,
  onUpdateTask,
  resolveExpanded,
}: {
  availableColumns: ListColumnKey[];
  customFieldNames: string[];
  detailMode: DetailMode;
  editingTaskId: string;
  groupingMode: GroupingMode;
  groupedRoots: RootGroup[];
  selectedColumns: ListColumnKey[];
  selectedTaskId: string;
  selectedTaskIds: string[];
  subtaskVisibilityMode: SubtaskVisibilityMode;
  taskOrder: Record<string, string[]>;
  onAddColumn: (column: ListColumnKey) => void;
  onSwapColumn: (currentColumn: ListColumnKey, nextColumn: ListColumnKey) => void;
  onUpdateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  onRemoveColumn: (column: ListColumnKey) => void;
  onDragNodeStart: (parentKey: string, nodeId: string) => void;
  onDropNode: (parentKey: string, siblingIds: string[], targetId: string) => void;
  onRenameTask: (taskId: string, title: string) => void;
  onSelectTask: (taskId: string) => void;
  onSetEditingTaskId: (taskId: string) => void;
  onToggleTaskSelection: (taskId: string) => void;
  onToggleExpanded: (nodeId: string) => void;
  onAddSubtask: (taskId: string) => void;
  resolveExpanded: (nodeId: string) => boolean;
}) {
  const gridTemplateColumns = buildGridTemplate(selectedColumns);

  return (
    <section className="task-surface" aria-label="Lista de tarefas">
      <div className="table-header" style={{ gridTemplateColumns }}>
        <span>Tarefa</span>
        {selectedColumns.map((column) => (
          <ColumnHeaderPicker
            currentColumn={column}
            key={column}
            availableColumns={availableColumns}
            selectedColumns={selectedColumns}
            onRemoveColumn={onRemoveColumn}
            onSwapColumn={(nextColumn) => onSwapColumn(column, nextColumn)}
          />
        ))}
        <ListColumnPicker availableColumns={availableColumns} selectedColumns={selectedColumns} onAddColumn={onAddColumn} />
      </div>

      <div className="table-body">
        {groupedRoots.map((group) => {
          const orderedNodes = orderItems(group.nodes, taskOrder[`group:${group.id}`], (node) => node.id);
          const siblingIds = orderedNodes.map((node) => node.id);

          return (
            <div className="task-group" key={group.id}>
              {groupingMode !== "none" && (
                <div className="task-group-header">
                  <Layers2 size={14} />
                  <strong>{group.label}</strong>
                  <span>
                    {group.nodes.length} {group.nodes.length === 1 ? "tarefa raiz" : "tarefas raiz"}
                  </span>
                  <small>{subtaskVisibilityMode === "expanded" ? "Subtarefas expandidas" : "Subtarefas recolhidas"}</small>
                </div>
              )}

              {orderedNodes.map((node) => (
                <TaskTreeRow
                  columns={selectedColumns}
                  customFieldNames={customFieldNames}
                  depth={0}
                  detailMode={detailMode}
                  editingTaskId={editingTaskId}
                  gridTemplateColumns={gridTemplateColumns}
                  key={node.id}
                  node={node}
                  parentKey={`group:${group.id}`}
                  resolveExpanded={resolveExpanded}
                  selectedTaskId={selectedTaskId}
                  selectedTaskIds={selectedTaskIds}
                  siblingIds={siblingIds}
                  taskOrder={taskOrder}
                  onDragNodeStart={onDragNodeStart}
                  onDropNode={onDropNode}
                  onRenameTask={onRenameTask}
                  onSelectTask={onSelectTask}
                  onSetEditingTaskId={onSetEditingTaskId}
                  onToggleTaskSelection={onToggleTaskSelection}
                  onToggleExpanded={onToggleExpanded}
                  onAddSubtask={onAddSubtask}
                  onUpdateTask={onUpdateTask}
                />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ColumnHeaderPicker({
  availableColumns,
  currentColumn,
  selectedColumns,
  onRemoveColumn,
  onSwapColumn,
}: {
  availableColumns: ListColumnKey[];
  currentColumn: ListColumnKey;
  selectedColumns: ListColumnKey[];
  onRemoveColumn: (column: ListColumnKey) => void;
  onSwapColumn: (column: ListColumnKey) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const swapOptions = [
    currentColumn,
    ...availableColumns.filter((column) => column !== currentColumn && !selectedColumns.includes(column)),
  ];
  const currentLabel = getColumnLabel(currentColumn);

  return (
    <div className="column-picker header-picker">
      <button
        className="header-pill header-pill-button"
        type="button"
        aria-label={`Trocar campo ${currentLabel}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{currentLabel}</span>
        <ChevronDown size={12} />
      </button>
      <button type="button" aria-label={`Remover coluna ${currentLabel}`} onClick={() => onRemoveColumn(currentColumn)}>
        <X size={12} />
      </button>
      {isOpen && (
        <DismissibleLayer ariaLabel="Trocar campo da coluna" className="view-popover compact column-popover" onClose={() => setIsOpen(false)}>
          <strong>Trocar campo</strong>
          <div className="option-list">
            {swapOptions.map((column) => (
              <button
                className={classNames("option-row", column === currentColumn && "selected")}
                key={column}
                type="button"
                onClick={() => {
                  onSwapColumn(column);
                  setIsOpen(false);
                }}
              >
                <SlidersHorizontal size={14} />
                <span>{getColumnLabel(column)}</span>
              </button>
            ))}
          </div>
        </DismissibleLayer>
      )}
    </div>
  );
}

function ListColumnPicker({
  availableColumns,
  selectedColumns,
  onAddColumn,
}: {
  availableColumns: ListColumnKey[];
  selectedColumns: ListColumnKey[];
  onAddColumn: (column: ListColumnKey) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const visibleColumns = availableColumns.filter((column) => !selectedColumns.includes(column));

  return (
    <div className="column-picker">
      <button
        className="column-add-button"
        type="button"
        aria-label="Adicionar coluna"
        title="Adicionar coluna"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Plus size={14} />
      </button>
      {isOpen && (
        <DismissibleLayer ariaLabel="Adicionar coluna" className="view-popover compact column-popover" onClose={() => setIsOpen(false)}>
          <strong>Nova coluna</strong>
          <div className="option-list">
            {visibleColumns.map((column) => (
              <button
                className="option-row"
                key={column}
                type="button"
                onClick={() => {
                  onAddColumn(column);
                  setIsOpen(false);
                }}
              >
                <Plus size={14} />
                <span>{getColumnLabel(column)}</span>
              </button>
            ))}
          </div>
        </DismissibleLayer>
      )}
    </div>
  );
}

function TaskTreeRow({
  columns,
  customFieldNames,
  depth,
  detailMode,
  editingTaskId,
  gridTemplateColumns,
  node,
  parentKey,
  resolveExpanded,
  selectedTaskId,
  selectedTaskIds,
  siblingIds,
  taskOrder,
  onDragNodeStart,
  onDropNode,
  onRenameTask,
  onSelectTask,
  onSetEditingTaskId,
  onToggleTaskSelection,
  onToggleExpanded,
  onAddSubtask,
  onUpdateTask,
}: {
  columns: ListColumnKey[];
  customFieldNames: string[];
  depth: number;
  detailMode: DetailMode;
  editingTaskId: string;
  gridTemplateColumns: string;
  node: TreeNode;
  parentKey: string;
  resolveExpanded: (nodeId: string) => boolean;
  selectedTaskId: string;
  selectedTaskIds: string[];
  siblingIds: string[];
  taskOrder: Record<string, string[]>;
  onDragNodeStart: (parentKey: string, nodeId: string) => void;
  onDropNode: (parentKey: string, siblingIds: string[], targetId: string) => void;
  onRenameTask: (taskId: string, title: string) => void;
  onSelectTask: (taskId: string) => void;
  onSetEditingTaskId: (taskId: string) => void;
  onToggleTaskSelection: (taskId: string) => void;
  onToggleExpanded: (nodeId: string) => void;
  onAddSubtask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<TaskItem>) => void;
}) {
  const hasChildren = node.children.length > 0;
  const expanded = resolveExpanded(node.id);
  const orderedChildren = orderItems(node.children, taskOrder[`children:${node.id}`], (child) => child.id);
  const childIds = orderedChildren.map((child) => child.id);
  const task = getNodeTask(node);
  const ownTask = node.task;
  const rowTaskId = ownTask?.id ?? (node.synthetic && task ? node.id : task?.id);
  const subtaskCount = node.children.filter((child) => Boolean(getNodeTask(child)?.taskType === "subtask" || child.task)).length;
  const [draftTitle, setDraftTitle] = useState(node.title);

  useEffect(() => {
    setDraftTitle(node.title);
  }, [node.title]);

  return (
    <>
      <div
        className={classNames(
          "task-row",
          node.synthetic && "synthetic-row",
          ownTask?.isSubtask && "subtask-row",
          rowTaskId === selectedTaskId && "active",
          detailMode === "modal" && "modal-friendly",
        )}
        style={{ gridTemplateColumns }}
        draggable={Boolean(ownTask)}
        onClick={() => {
          if (rowTaskId) onSelectTask(rowTaskId);
        }}
        onDragEnd={() => onDragNodeStart("", "")}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDragStart={() => {
          if (ownTask) onDragNodeStart(parentKey, node.id);
        }}
        onDrop={() => onDropNode(parentKey, siblingIds, node.id)}
      >
        <div className="tree-title-cell">
          <div className="tree-title-line" style={{ paddingLeft: `${depth * 16}px` } as CSSProperties}>
            <button
              className={classNames("row-select-button", selectedTaskIds.includes(node.id) && "checked")}
              type="button"
              aria-label="Selecionar tarefa"
              onClick={(event) => {
                event.stopPropagation();
                onToggleTaskSelection(node.id);
              }}
            />
            <span className="row-drag-handle" aria-hidden="true">
              <GripVertical size={12} />
            </span>
            {hasChildren ? (
              <button
                className="expand-toggle"
                type="button"
                aria-label={expanded ? "Recolher item" : "Expandir item"}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleExpanded(node.id);
                }}
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="expand-placeholder" />
            )}
            {editingTaskId === node.id && ownTask ? (
              <input
                aria-label="Renomear tarefa"
                className="task-inline-input"
                type="text"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={() => onRenameTask(node.id, draftTitle)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onRenameTask(node.id, draftTitle);
                  if (event.key === "Escape") {
                    setDraftTitle(node.title);
                    onSetEditingTaskId("");
                  }
                }}
                autoFocus
              />
            ) : (
              <button
                className="task-title-button"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (rowTaskId) onSelectTask(rowTaskId);
                }}
              >
                <strong>{displayTaskTitle(node.title)}</strong>
              </button>
            )}
            {subtaskCount > 0 && (
              <span className="task-inline-meta">
                <ListTree size={12} />
                {subtaskCount}
              </span>
            )}
            {ownTask && (
              <span className="task-hover-actions">
                <button
                  type="button"
                  aria-label="Adicionar subtarefa"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddSubtask(node.id);
                  }}
                >
                  <Plus size={12} />
                </button>
                <button
                  type="button"
                  aria-label="Renomear tarefa"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSetEditingTaskId(node.id);
                    onSelectTask(node.id);
                  }}
                >
                  <Edit3 size={12} />
                </button>
              </span>
            )}
          </div>
        </div>

        {columns.map((column) => (
          <div className="task-cell" key={column}>
            <EditableTaskCell column={column} customFieldNames={customFieldNames} task={task} onOpenTask={onSelectTask} onUpdateTask={onUpdateTask} />
          </div>
        ))}
        <div className="task-row-tail" />
      </div>

      {hasChildren &&
        expanded &&
        orderedChildren.map((child) => (
          <TaskTreeRow
            columns={columns}
            customFieldNames={customFieldNames}
            depth={depth + 1}
            detailMode={detailMode}
            editingTaskId={editingTaskId}
            gridTemplateColumns={gridTemplateColumns}
            key={child.id}
            node={child}
            parentKey={`children:${node.id}`}
            resolveExpanded={resolveExpanded}
            selectedTaskId={selectedTaskId}
            selectedTaskIds={selectedTaskIds}
            siblingIds={childIds}
            taskOrder={taskOrder}
            onDragNodeStart={onDragNodeStart}
            onDropNode={onDropNode}
            onRenameTask={onRenameTask}
            onSelectTask={onSelectTask}
            onSetEditingTaskId={onSetEditingTaskId}
            onToggleTaskSelection={onToggleTaskSelection}
            onToggleExpanded={onToggleExpanded}
            onAddSubtask={onAddSubtask}
            onUpdateTask={onUpdateTask}
          />
        ))}
    </>
  );
}

function renderColumnValue(task: TaskItem | undefined, column: ListColumnKey) {
  if (!task) return <span className="cell-muted">Sem dados</span>;
  if (isCustomListColumn(column)) {
    const fieldName = getCustomFieldName(column);
    return <span>{task.customFields?.[fieldName] || <span className="cell-muted">Vazio</span>}</span>;
  }
  if (column === "status") return <StatusPill status={task.status} />;
  if (column === "assignees") return <AvatarGroup initials={task.assignees} />;
  if (column === "dueDate") return <span>{formatDate(task.dueDate)}</span>;
  if (column === "priority") return <PriorityPill priority={task.priority} />;
  if (column === "tags") return <span className="tag-inline">{task.tags.join(" / ") || "Sem etiquetas"}</span>;
  if (column === "comments") return <span>{task.comments}</span>;
  if (column === "subtasks")
    return (
      <span className="subtasks-inline">
        {task.subtasksDone}/{task.subtasksTotal}
      </span>
    );
  if (column === "taskType") return <span>{task.taskType === "subtask" ? "Subtarefa" : "Tarefa"}</span>;
  if (column === "space") return <span>{task.space}</span>;
  if (column === "folder") return <span>{task.folder ?? "Sem pasta"}</span>;
  return <span>{task.list}</span>;
}

function EditableTaskCell({
  column,
  customFieldNames,
  task,
  onOpenTask,
  onUpdateTask,
}: {
  column: ListColumnKey;
  customFieldNames: string[];
  task: TaskItem | undefined;
  onOpenTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<TaskItem>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!task) return <span className="cell-muted">Sem dados</span>;

  const rawCustomFieldName = isCustomListColumn(column) ? getCustomFieldName(column) : "";
  const customFieldName = rawCustomFieldName
    ? customFieldNames.find((fieldName) => normalizeText(fieldName) === normalizeText(rawCustomFieldName)) ?? rawCustomFieldName
    : "";
  const isEditable = isCustomListColumn(column) || ["status", "assignees", "dueDate", "priority", "tags"].includes(column);
  const columnLabel = getColumnLabel(column);
  if (!isEditable) {
    return (
      <button
        className="task-cell-button readonly"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenTask(task.id);
        }}
      >
        {renderColumnValue(task, column)}
      </button>
    );
  }

  return (
    <div className="task-cell-editor">
      <button
        className="task-cell-button"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
      >
        {renderColumnValue(task, column)}
      </button>
      {isOpen && (
        <DismissibleLayer ariaLabel={`Editar ${columnLabel}`} className="view-popover compact cell-popover" onClose={() => setIsOpen(false)}>
          <strong>{columnLabel}</strong>
          {isCustomListColumn(column) && (
            <label className="cell-edit-form">
              <input
                aria-label={`Editar ${customFieldName}`}
                type="text"
                value={task.customFields?.[customFieldName] ?? ""}
                onChange={(event) =>
                  onUpdateTask(task.id, {
                    customFields: {
                      ...(task.customFields ?? {}),
                      [customFieldName]: event.target.value,
                    },
                  })
                }
              />
            </label>
          )}
          {column === "status" && (
            <div className="option-list">
              {(Object.keys(statusLabels) as TaskStatus[]).map((status) => (
                <button
                  className={classNames("option-row", task.status === status && "selected")}
                  key={status}
                  type="button"
                  onClick={() => {
                    onUpdateTask(task.id, { status });
                    setIsOpen(false);
                  }}
                >
                  <CircleDot size={14} />
                  <span>{statusLabels[status]}</span>
                </button>
              ))}
            </div>
          )}
          {column === "priority" && (
            <div className="option-list">
              {(Object.keys(priorityLabels) as TaskPriority[]).map((priority) => (
                <button
                  className={classNames("option-row", task.priority === priority && "selected")}
                  key={priority}
                  type="button"
                  onClick={() => {
                    onUpdateTask(task.id, { priority });
                    setIsOpen(false);
                  }}
                >
                  <CircleDot size={14} />
                  <span>{priorityLabels[priority]}</span>
                </button>
              ))}
            </div>
          )}
          {column === "dueDate" && (
            <label className="cell-edit-form">
              <input
                type="date"
                value={task.dueDate ?? ""}
                onChange={(event) => onUpdateTask(task.id, { dueDate: event.target.value || undefined })}
              />
            </label>
          )}
          {column === "assignees" && (
            <label className="cell-edit-form">
              <input
                type="text"
                value={task.assignees.join(", ")}
                onChange={(event) =>
                  onUpdateTask(task.id, {
                    assignees: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          )}
          {column === "tags" && (
            <label className="cell-edit-form">
              <input
                type="text"
                value={task.tags.join(", ")}
                onChange={(event) =>
                  onUpdateTask(task.id, {
                    tags: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          )}
        </DismissibleLayer>
      )}
    </div>
  );
}

function GanttView({
  taskItems,
  selectedTaskId,
  onSelectTask,
}: {
  taskItems: TaskItem[];
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
}) {
  const datedTasks = taskItems.filter((task) => task.dueDate);
  const anchorDate = datedTasks[0]?.startDate ?? datedTasks[0]?.dueDate ?? "2026-07-01";
  const start = new Date(`${anchorDate}T12:00:00`);
  const timeline = Array.from({ length: 14 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));

  return (
    <section className="gantt-surface" aria-label="Gantt de tarefas">
      <div className="gantt-header">
        <span>Tarefa</span>
        <div className="gantt-days">
          {timeline.map((day) => (
            <span key={day.toISOString()}>{day.getDate()}</span>
          ))}
        </div>
      </div>
      {datedTasks.map((task) => {
        const dueDate = new Date(`${task.dueDate}T12:00:00`);
        const offset = Math.max(0, Math.round((dueDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        return (
          <button
            className={classNames("gantt-row", selectedTaskId === task.id && "active")}
            key={task.id}
            type="button"
            onClick={() => onSelectTask(task.id)}
          >
            <span>{displayTaskTitle(task.title)}</span>
            <div className="gantt-track">
              <span className="gantt-bar" style={{ gridColumn: `${offset + 1} / span 2` }} />
            </div>
          </button>
        );
      })}
    </section>
  );
}

function CalendarView({
  taskItems,
  selectedTaskId,
  onSelectTask,
}: {
  taskItems: TaskItem[];
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
}) {
  const anchor = getMonthGridAnchor(taskItems);
  const days = getDaysInMonth(anchor);

  return (
    <section className="calendar-surface" aria-label="Calendario de tarefas">
      <div className="calendar-weekdays">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((day) => {
          const iso = day.toISOString().slice(0, 10);
          const dayTasks = taskItems.filter((task) => task.dueDate === iso);

          return (
            <div className={classNames("calendar-cell", day.getMonth() !== anchor.getMonth() && "muted")} key={iso}>
              <strong>{day.getDate()}</strong>
              <div className="calendar-task-list">
                {dayTasks.map((task) => (
                  <button
                    className={classNames("calendar-task", selectedTaskId === task.id && "active")}
                    key={task.id}
                    type="button"
                    onClick={() => onSelectTask(task.id)}
                  >
                    {displayTaskTitle(task.title)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TaskBoard({
  taskItems,
  selectedTaskId,
  onSelectTask,
}: {
  taskItems: TaskItem[];
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
}) {
  const statuses: TaskStatus[] = ["todo", "in_progress", "review", "done"];

  return (
    <section className="board" aria-label="Quadro de tarefas">
      {statuses.map((status) => {
        const statusTasks = taskItems.filter((task) => task.status === status);
        return (
          <div className="board-column" key={status}>
            <header>
              <span>{statusLabels[status]}</span>
              <small>{statusTasks.length}</small>
            </header>
            <div className="board-items">
              {statusTasks.map((task) => (
                <button
                  className={classNames("task-card", selectedTaskId === task.id && "active")}
                  key={task.id}
                  type="button"
                  onClick={() => onSelectTask(task.id)}
                >
                  <strong>{displayTaskTitle(task.title)}</strong>
                  <div className="task-card-meta">
                    <PriorityPill priority={task.priority} />
                    <span>{formatDate(task.dueDate)}</span>
                  </div>
                  <AvatarGroup initials={task.assignees} />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function TeamView({
  taskItems,
  selectedTaskId,
  onSelectTask,
}: {
  taskItems: TaskItem[];
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
}) {
  const lanes = new Map<string, TaskItem[]>();

  taskItems.forEach((task) => {
    const key = task.assignees[0] ?? "Nao atribuido";
    lanes.set(key, [...(lanes.get(key) ?? []), task]);
  });

  return (
    <section className="team-board" aria-label="Equipe">
      {[...lanes.entries()].map(([assignee, tasks]) => (
        <div className="board-column" key={assignee}>
          <header>
            <span>{assignee}</span>
            <small>{tasks.length}</small>
          </header>
          <div className="board-items">
            {tasks.map((task) => (
              <button
                className={classNames("task-card", selectedTaskId === task.id && "active")}
                key={task.id}
                type="button"
                onClick={() => onSelectTask(task.id)}
              >
                <strong>{displayTaskTitle(task.title)}</strong>
                <StatusPill status={task.status} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function MindMapView({
  roots,
  selectedTaskId,
  onSelectTask,
}: {
  roots: TreeNode[];
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
}) {
  return (
    <section className="mindmap-surface" aria-label="Mapa mental">
      {roots.map((node) => (
        <MindMapNode key={node.id} node={node} selectedTaskId={selectedTaskId} onSelectTask={onSelectTask} />
      ))}
    </section>
  );
}

function MindMapNode({
  node,
  selectedTaskId,
  onSelectTask,
}: {
  node: TreeNode;
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
}) {
  const task = getNodeTask(node);

  return (
    <div className="mindmap-node">
      <button
        className={classNames("mindmap-card", task?.id === selectedTaskId && "active")}
        type="button"
        onClick={() => {
          if (task) onSelectTask(task.id);
        }}
      >
        <strong>{displayTaskTitle(node.title)}</strong>
        <small>{task?.list ?? "Tarefa pai"}</small>
      </button>
      {node.children.length > 0 && (
        <div className="mindmap-children">
          {node.children.map((child) => (
            <MindMapNode key={child.id} node={child} selectedTaskId={selectedTaskId} onSelectTask={onSelectTask} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskPanel({
  canAddSubtask,
  customFieldNames,
  subtasks,
  task,
  onAddSubtask,
  onSelectTask,
  onUpdateTask,
}: {
  canAddSubtask: boolean;
  customFieldNames: string[];
  subtasks: TaskItem[];
  task: TaskItem;
  onAddSubtask: (taskId: string) => void;
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<TaskItem>) => void;
}) {
  const subtaskTotal = Math.max(task.subtasksTotal, subtasks.length);
  const subtaskDone = subtasks.filter((subtask) => subtask.status === "done").length || task.subtasksDone;

  return (
    <aside className="task-panel" aria-label="Detalhe da tarefa">
      <header>
        <div>
          <h2>{task.taskType === "subtask" ? "Subtarefa" : "Tarefa"}</h2>
          <small>{task.space} / {task.folder ?? "Sem pasta"} / {task.list}</small>
        </div>
        <button className="icon-button" type="button" aria-label="Mais opcoes">
          <MoreHorizontal size={17} />
        </button>
      </header>

      <label className="editor-block">
        <span>Titulo</span>
        <input type="text" value={displayTaskTitle(task.title)} onChange={(event) => onUpdateTask(task.id, { title: event.target.value })} />
      </label>

      <div className="field-grid">
        <label className="field editor-field">
          <span>Status</span>
          <select value={task.status} onChange={(event) => onUpdateTask(task.id, { status: event.target.value as TaskStatus })}>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field editor-field">
          <span>Prioridade</span>
          <select value={task.priority} onChange={(event) => onUpdateTask(task.id, { priority: event.target.value as TaskPriority })}>
            {Object.entries(priorityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field editor-field">
          <span>Responsaveis</span>
          <input
            type="text"
            value={task.assignees.join(", ")}
            onChange={(event) =>
              onUpdateTask(task.id, {
                assignees: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <label className="field editor-field">
          <span>Prazo</span>
          <input type="date" value={task.dueDate ?? ""} onChange={(event) => onUpdateTask(task.id, { dueDate: event.target.value || undefined })} />
        </label>
        <label className="field editor-field">
          <span>Etiquetas</span>
          <input
            type="text"
            value={task.tags.join(", ")}
            onChange={(event) =>
              onUpdateTask(task.id, {
                tags: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <div className="field static-field">
          <span>Tipo</span>
          <strong>{task.taskType === "subtask" ? "Subtarefa" : "Tarefa"}</strong>
        </div>
        {customFieldNames.map((fieldName) => (
          <label className="field editor-field custom-field" key={fieldName}>
            <span>{fieldName}</span>
            <input
              aria-label={`Campo ${fieldName}`}
              type="text"
              value={task.customFields?.[fieldName] ?? ""}
              onChange={(event) =>
                onUpdateTask(task.id, {
                  customFields: {
                    ...(task.customFields ?? {}),
                    [fieldName]: event.target.value,
                  },
                })
              }
            />
          </label>
        ))}
      </div>

      <label className="editor-block">
        <span>Descricao</span>
        <textarea
          rows={6}
          value={task.description ?? ""}
          onChange={(event) => onUpdateTask(task.id, { description: event.target.value })}
        />
      </label>

      <section className="subtasks">
        <div>
          <h3>Subtarefas</h3>
          <span>{subtaskDone}/{subtaskTotal}</span>
        </div>
        <progress max={subtaskTotal || 1} value={subtaskDone} />
        <div className="subtask-detail-list">
          {subtasks.length > 0 ? (
            subtasks.map((subtask) => (
              <button
                className="subtask-detail-row"
                key={subtask.id}
                type="button"
                aria-label={`Abrir subtarefa ${displayTaskTitle(subtask.title)}`}
                onClick={() => onSelectTask(subtask.id)}
              >
                <ListTree size={13} />
                <strong>{displayTaskTitle(subtask.title)}</strong>
                <StatusPill status={subtask.status} />
              </button>
            ))
          ) : (
            <span className="subtask-empty-state">Nenhuma subtarefa ainda</span>
          )}
        </div>
        {canAddSubtask && (
          <button className="subtask-add-button" type="button" aria-label="Adicionar subtarefa no detalhe" onClick={() => onAddSubtask(task.id)}>
            <Plus size={14} />
            <span>Subtarefa</span>
          </button>
        )}
      </section>

      <section className="activity">
        <h3>Atividade</h3>
        <ActivityItem icon={<CircleDot size={14} />} text={`Status atual: ${statusLabels[task.status]}`} />
        <ActivityItem icon={<MessageSquare size={14} />} text={`${task.comments} comentarios vinculados`} />
        <ActivityItem
          icon={<Link2 size={14} />}
          text={task.sourceUrl ? "Link externo ClickUp preservado" : "Pronto para links externos futuros"}
        />
      </section>
    </aside>
  );
}

function TaskModal({
  canAddSubtask,
  customFieldNames,
  subtasks,
  task,
  onAddSubtask,
  onClose,
  onSelectTask,
  onUpdateTask,
}: {
  canAddSubtask: boolean;
  customFieldNames: string[];
  subtasks: TaskItem[];
  task: TaskItem;
  onAddSubtask: (taskId: string) => void;
  onClose: () => void;
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<TaskItem>) => void;
}) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="task-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="task-modal" role="dialog" aria-label="Janela da tarefa" onClick={(event) => event.stopPropagation()}>
        <div className="task-modal-header">
          <strong>Janela da tarefa</strong>
          <button className="icon-button" type="button" aria-label="Fechar tarefa" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <TaskPanel
          canAddSubtask={canAddSubtask}
          customFieldNames={customFieldNames}
          subtasks={subtasks}
          task={task}
          onAddSubtask={onAddSubtask}
          onSelectTask={onSelectTask}
          onUpdateTask={onUpdateTask}
        />
      </div>
    </div>
  );
}

function ActivityItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="activity-item">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function StatusPill({ status }: { status: TaskStatus }) {
  return <span className={classNames("pill", `status-${status}`)}>{statusLabels[status]}</span>;
}

function PriorityPill({ priority }: { priority: TaskPriority }) {
  return <span className={classNames("pill", `priority-${priority}`)}>{priorityLabels[priority]}</span>;
}

function AvatarGroup({ initials }: { initials: string[] }) {
  return (
    <span className="avatar-group" aria-label={`Responsaveis: ${initials.join(", ")}`}>
      {initials.length > 0 ? (
        initials.map((initial) => (
          <span className="avatar" key={initial} title={initial}>
            <Users size={12} />
            {getInitials(initial)}
          </span>
        ))
      ) : (
        <span className="avatar empty">Sem resp.</span>
      )}
    </span>
  );
}
