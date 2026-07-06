import { describe, expect, it } from "vitest";
import { getTaskMetrics } from "./taskMetrics";
import type { TaskItem } from "./types";

const baseTask: TaskItem = {
  id: "1",
  code: "TSK-1",
  title: "Task",
  space: "Originais",
  list: "Backlog",
  status: "todo",
  priority: "normal",
  assignees: ["DL"],
  dueDate: "2026-06-28",
  tags: [],
  comments: 0,
  subtasksDone: 0,
  subtasksTotal: 0,
};

describe("getTaskMetrics", () => {
  it("counts totals, status buckets, overdue tasks and due-today tasks", () => {
    const metrics = getTaskMetrics(
      [
        baseTask,
        { ...baseTask, id: "2", status: "in_progress", dueDate: "2026-06-27" },
        { ...baseTask, id: "3", status: "done", dueDate: "2026-06-20" },
      ],
      "2026-06-28",
    );

    expect(metrics.total).toBe(3);
    expect(metrics.done).toBe(1);
    expect(metrics.overdue).toBe(1);
    expect(metrics.dueToday).toBe(1);
    expect(metrics.byStatus).toEqual({
      todo: 1,
      in_progress: 1,
      review: 0,
      done: 1,
    });
  });

  it("does not count tasks without due date as due today or overdue", () => {
    const metrics = getTaskMetrics([{ ...baseTask, id: "4", dueDate: undefined }], "2026-06-28");

    expect(metrics.total).toBe(1);
    expect(metrics.overdue).toBe(0);
    expect(metrics.dueToday).toBe(0);
  });
});
