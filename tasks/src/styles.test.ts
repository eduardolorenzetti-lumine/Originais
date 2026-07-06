import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");

describe("styles", () => {
  it("keeps color swatches visibly colored when selected", () => {
    ["blue", "green", "pink", "purple", "yellow", "red", "orange", "gray"].forEach((color) => {
      expect(styles).toContain(`.swatch-button.dot-${color}`);
    });

    expect(styles).not.toMatch(/\.swatch-button\.selected\s*\{[^}]*background:/u);
  });
});
