import { describe, expect, it } from "vitest";
import { mapScopeConfigRows, normalizeStatusOption, parseScopeKey } from "./scopeConfigRepository";

describe("scopeConfigRepository", () => {
  it("parses supported scope keys", () => {
    expect(parseScopeKey("space:[LMN] Originais")).toEqual({
      kind: "space",
      spaceName: "[LMN] Originais",
      folderName: undefined,
      listName: undefined,
    });
    expect(parseScopeKey("folder:[LMN] Originais:PLANEJAMENTO")).toEqual({
      kind: "folder",
      spaceName: "[LMN] Originais",
      folderName: "PLANEJAMENTO",
      listName: undefined,
    });
    expect(parseScopeKey("list:[LMN] Originais:PLANEJAMENTO:ORIGINAIS")).toEqual({
      kind: "list",
      spaceName: "[LMN] Originais",
      folderName: "PLANEJAMENTO",
      listName: "ORIGINAIS",
    });
  });

  it("rejects incomplete or unknown scope keys", () => {
    expect(parseScopeKey("workspace:Lumine")).toBeNull();
    expect(parseScopeKey("folder:[LMN] Originais")).toBeNull();
    expect(parseScopeKey("list:[LMN] Originais:PLANEJAMENTO")).toBeNull();
  });

  it("maps relational rows into editable scope configs", () => {
    expect(
      mapScopeConfigRows([
        {
          scope_key: "list:[LMN] Originais:PLANEJAMENTO:ORIGINAIS",
          task_status_options: [
            { name: "Revisao", position: 2, archived: false },
            { name: "Backlog", position: 0, archived: false },
            { name: "Concluido", position: 3, archived: true },
          ],
          custom_field_definitions: [
            { name: "Formato", position: 1, archived: false },
            { name: "Editoria", position: 0, archived: false },
          ],
        },
      ]),
    ).toEqual({
      "list:[LMN] Originais:PLANEJAMENTO:ORIGINAIS": {
        statuses: ["Backlog", "Revisao"],
        fields: ["Editoria", "Formato"],
      },
    });
  });

  it("normalizes status labels to canonical task states", () => {
    expect(normalizeStatusOption("A fazer")).toBe("todo");
    expect(normalizeStatusOption("Revisão")).toBe("review");
    expect(normalizeStatusOption("Concluído")).toBe("done");
    expect(normalizeStatusOption("Em pauta")).toBe("in_progress");
  });
});
