import type { TaskItem, TaskStatus } from "./types";

export type TaskMetrics = {
  total: number;
  done: number;
  overdue: number;
  dueToday: number;
  byStatus: Record<TaskStatus, number>;
};

const emptyStatusCount: Record<TaskStatus, number> = {
  todo: 0,
  in_progress: 0,
  review: 0,
  done: 0,
};

export function getTaskMetrics(items: TaskItem[], todayIso: string): TaskMetrics {
  return items.reduce<TaskMetrics>(
    (metrics, task) => {
      metrics.total += 1;
      metrics.byStatus[task.status] += 1;
      if (task.status === "done") metrics.done += 1;
      if (task.status !== "done" && task.dueDate && task.dueDate < todayIso) metrics.overdue += 1;
      if (task.status !== "done" && task.dueDate === todayIso) metrics.dueToday += 1;
      return metrics;
    },
    {
      total: 0,
      done: 0,
      overdue: 0,
      dueToday: 0,
      byStatus: { ...emptyStatusCount },
    },
  );
}
