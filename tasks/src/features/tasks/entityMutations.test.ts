import { describe, expect, it } from "vitest";
import { mergeEntityUiPayload } from "./entityMutations";

describe("entityMutations", () => {
  it("merges UI metadata without dropping imported payload", () => {
    expect(
      mergeEntityUiPayload(
        {
          clickup: { id: "space-1" },
          ui: { label: "Antigo", color: "blue", favorite: false },
        },
        { label: "Planejamento", color: "yellow", icon: "folder", favorite: true },
      ),
    ).toEqual({
      clickup: { id: "space-1" },
      ui: {
        label: "Planejamento",
        color: "yellow",
        icon: "folder",
        favorite: true,
      },
    });
  });
});
