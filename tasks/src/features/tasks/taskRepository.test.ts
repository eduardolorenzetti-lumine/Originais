import { describe, expect, it } from "vitest";
import { mapDbTaskToTaskItem, readEntityUiMeta } from "./taskRepository";
import type { DbTaskRow } from "./taskRepository";

describe("taskRepository", () => {
  it("maps Supabase task rows into UI task items", () => {
    const row: DbTaskRow = {
      id: 10,
      external_id: "86aj6419u",
      parent_external_id: "86agx406v",
      code: "CLK-04",
      title: "Rodoviario - dudu [IDA - 12/07]",
      description: "#2-94 | Natal Amarelo IV [Cidade Amarela]",
      normalized_status: "in_progress",
      priority: "normal",
      due_at: "2026-07-04T12:00:00.000Z",
      source_url: "https://app.clickup.com/t/86aj6419u",
      comments_count: 2,
      subtasks_done: 1,
      subtasks_total: 3,
      spaces: { name: "[LMN] Originais" },
      task_lists: { name: "ORIGINAIS" },
      task_assignees: [{ people: { display_name: "Aline Marques" } }],
      task_tags: [{ tags: { name: "Logistica" } }, { tags: { name: "ClickUp" } }],
    };

    expect(mapDbTaskToTaskItem(row)).toEqual({
      id: "86aj6419u",
      externalId: "86aj6419u",
      code: "CLK-04",
      title: "Rodoviario - dudu [IDA - 12/07]",
      description: "#2-94 | Natal Amarelo IV [Cidade Amarela]",
      space: "[LMN] Originais",
      folder: "PLANEJAMENTO",
      list: "ORIGINAIS",
      parentTask: "#2-94 | Natal Amarelo IV [Cidade Amarela]",
      parentExternalId: "86agx406v",
      isSubtask: true,
      status: "in_progress",
      priority: "normal",
      assignees: ["Aline Marques"],
      dueDate: "2026-07-04",
      startDate: undefined,
      tags: ["Logistica", "ClickUp"],
      customFields: undefined,
      comments: 2,
      subtasksDone: 1,
      subtasksTotal: 3,
      sourceUrl: "https://app.clickup.com/t/86aj6419u",
      taskType: "subtask",
    });
  });

  it("keeps missing due dates undefined", () => {
    const row: DbTaskRow = {
      id: 11,
      external_id: "86afz9aq7",
      parent_external_id: null,
      code: "CLK-11",
      title: "Website",
      description: null,
      normalized_status: "todo",
      priority: "normal",
      due_at: null,
      source_url: null,
      comments_count: null,
      subtasks_done: null,
      subtasks_total: null,
      spaces: { name: "[LMN] Produções" },
      task_lists: { name: "Captação de recursos" },
      task_assignees: null,
      task_tags: null,
    };

    expect(mapDbTaskToTaskItem(row).dueDate).toBeUndefined();
  });

  it("reads persisted entity UI metadata from raw payload", () => {
    expect(
      readEntityUiMeta({
        clickup: { id: "list-1" },
        ui: { label: "Originais ativos", color: "green", icon: "board", favorite: true },
      }),
    ).toEqual({
      label: "Originais ativos",
      color: "green",
      icon: "board",
      favorite: true,
    });
  });
});
