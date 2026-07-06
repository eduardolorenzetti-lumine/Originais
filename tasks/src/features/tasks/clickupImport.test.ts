import { describe, expect, it } from "vitest";
import { buildClickUpImportBatch, isActiveClickUpTask, mapClickUpTask } from "./clickupImport";
import type { ClickUpImportContext, ClickUpRawTask } from "./clickupImport";

const context: ClickUpImportContext = {
  workspaceName: "Lumine",
  workspaceSlug: "lumine",
  spaceName: "[LMN] Originais",
  spaceExternalId: "90070433129",
  folderName: "PLANEJAMENTO",
  folderExternalId: "901314999520",
  listName: "ORIGINAIS",
  listExternalId: "901322414076",
};

describe("clickupImport", () => {
  it("filters out archived and completed ClickUp tasks", () => {
    expect(isActiveClickUpTask({ id: "1", name: "Active", status: { status: "in progress", type: "custom" } })).toBe(
      true,
    );
    expect(isActiveClickUpTask({ id: "2", name: "Archived", archived: true })).toBe(false);
    expect(isActiveClickUpTask({ id: "3", name: "Done", status: { status: "done", type: "done" } })).toBe(false);
    expect(isActiveClickUpTask({ id: "4", name: "Concluido", status: { status: "Concluido" } })).toBe(false);
  });

  it("maps ClickUp task fields into the database import payload", () => {
    const rawTask: ClickUpRawTask = {
      id: "86aj6419u",
      name: "Rodoviario - dudu [IDA - 12/07]",
      url: "https://app.clickup.com/t/86aj6419u",
      status: { status: "em andamento", type: "custom" },
      priority: { id: "2", priority: "high" },
      due_date: 1783123200000,
      assignees: [{ id: 123, username: "Aline Marques", email: "aline@lumine.tv" }],
      tags: [{ name: "Logistica", tag_fg: "#2050a0" }],
      comment_count: "4",
      subtasks: [{ id: "sub-1" }],
    };

    const task = mapClickUpTask(rawTask, context, 3);

    expect(task).toMatchObject({
      externalProvider: "clickup",
      externalId: "86aj6419u",
      code: "CLK-04",
      title: "Rodoviario - dudu [IDA - 12/07]",
      normalizedStatus: "in_progress",
      priority: "high",
      sourceUrl: "https://app.clickup.com/t/86aj6419u",
      commentsCount: 4,
      subtasksDone: 0,
      subtasksTotal: 1,
    });
    expect(task.dueAt).toBe("2026-07-04T00:00:00.000Z");
    expect(task.assignees).toEqual([
      { externalId: "123", displayName: "Aline Marques", email: "aline@lumine.tv", avatarUrl: undefined },
    ]);
    expect(task.tags).toEqual([{ name: "Logistica", color: "#2050a0" }]);
  });

  it("builds an active-only batch preserving source context", () => {
    const batch = buildClickUpImportBatch(
      [
        { id: "active-1", name: "Guia", status: { status: "backlog" } },
        { id: "done-1", name: "Finalizada", status: { status: "closed", type: "closed" } },
      ],
      context,
    );

    expect(batch).toHaveLength(1);
    expect(batch[0]).toMatchObject({
      externalId: "active-1",
      normalizedStatus: "todo",
      context: { spaceName: "[LMN] Originais", listName: "ORIGINAIS" },
    });
  });
});
