import { describe, expect, it } from "vitest";
import { mapTaskUpdatesToDbPayload } from "./taskMutations";

describe("taskMutations", () => {
  it("maps editable task fields to Supabase columns", () => {
    expect(
      mapTaskUpdatesToDbPayload({
        title: "Novo titulo",
        description: "",
        status: "review",
        priority: "high",
        dueDate: "2026-07-12",
        startDate: undefined,
        subtasksTotal: 3,
      }),
    ).toEqual({
      title: "Novo titulo",
      description: "",
      normalized_status: "review",
      status_name: "Revisao",
      status_type: "custom",
      priority: "high",
      due_at: "2026-07-12T12:00:00.000Z",
      start_at: null,
      subtasks_total: 3,
    });
  });
});
