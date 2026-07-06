import { describe, expect, it } from "vitest";
import {
  coerceLayoutPreferences,
  coerceScopeConfigPreferences,
  coerceStringArray,
  coerceStringRecord,
  coerceTaskOrderPreferences,
} from "./userPreferences";

describe("userPreferences", () => {
  it("coerces layout values and drops unsupported options", () => {
    expect(
      coerceLayoutPreferences({
        view: "board",
        enabledViews: ["list", "board", "unknown", "list"],
        groupingMode: "status",
        subtaskVisibilityMode: "expanded",
        detailMode: "modal",
        selectedColumns: ["status", "custom:Campanha ADS", "custom:", "tags", "invalid", "status"],
        sidebarWidth: 999,
        sidebarEntityOrder: {
          "sidebar:spaces": ["[LMN] Produções", "[LMN] Originais", "[LMN] Produções"],
          "": ["ignored"],
          invalid: ["", 2],
        },
      }),
    ).toEqual({
      view: "board",
      enabledViews: ["list", "board"],
      groupingMode: "status",
      subtaskVisibilityMode: "expanded",
      detailMode: "modal",
      selectedColumns: ["status", "custom:Campanha ADS", "tags"],
      sidebarWidth: 420,
      sidebarEntityOrder: {
        "sidebar:spaces": ["[LMN] Produções", "[LMN] Originais"],
      },
    });
  });

  it("keeps editable scope configs as clean string lists", () => {
    expect(
      coerceScopeConfigPreferences({
        statuses: ["Backlog", "Backlog", "", 1, "Revisao"],
        fields: ["Status", "  Responsavel  ", null],
      }),
    ).toEqual({
      statuses: ["Backlog", "Revisao"],
      fields: ["Status", "Responsavel"],
    });
  });

  it("coerces task order without duplicate ids", () => {
    expect(coerceTaskOrderPreferences({ order: ["a", "b", "a", "", 4] })).toEqual({ order: ["a", "b"] });
  });

  it("returns an empty string array for non-arrays", () => {
    expect(coerceStringArray("status")).toEqual([]);
  });

  it("coerces string records for hierarchy ordering", () => {
    expect(
      coerceStringRecord({
        "sidebar:spaces": ["b", "a", "b"],
        "sidebar:folder": ["ORIGINAIS", null, ""],
        empty: [],
      }),
    ).toEqual({
      "sidebar:spaces": ["b", "a"],
      "sidebar:folder": ["ORIGINAIS"],
    });
  });
});
