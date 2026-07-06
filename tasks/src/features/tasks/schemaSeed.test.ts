import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const seed = readFileSync(join(process.cwd(), "supabase/seeds/20260628110000_clickup_spaces_seed.sql"), "utf8");
const pilotSeed = readFileSync(
  join(process.cwd(), "supabase/seeds/20260628111500_originais_pilot_tasks_seed.sql"),
  "utf8",
);
const producoesSeed = readFileSync(
  join(process.cwd(), "supabase/seeds/20260628124500_producoes_pilot_tasks_seed.sql"),
  "utf8",
);

describe("ClickUp hierarchy seed", () => {
  it("contains the target ClickUp spaces and lists", () => {
    [
      "90070433129",
      "90130989939",
      "901314999520",
      "901322414076",
      "901316478723",
      "901317310376",
      "901303409438",
      "901316499319",
      "901303347884",
      "901304292009",
    ].forEach((externalId) => {
      expect(seed).toContain(externalId);
    });
  });

  it("uses upsert patterns so the seed can be rerun", () => {
    expect(seed).toContain("on conflict (slug) do update");
    expect(seed).toContain("on conflict (workspace_id, external_provider, external_id) do update");
    expect(seed).toContain("on conflict (workspace_id, external_system, external_id) do update");
  });

  it("contains the Originais pilot tasks and relationship inserts", () => {
    ["86aj75zzm", "86ad82u0x", "86ahvedek", "86aj6419u", "86agx40cn"].forEach((externalId) => {
      expect(pilotSeed).toContain(externalId);
    });

    expect(pilotSeed).toContain("insert into public.tasks");
    expect(pilotSeed).toContain("insert into public.people");
    expect(pilotSeed).toContain("insert into public.task_assignees");
    expect(pilotSeed).toContain("insert into public.task_tags");
    expect(pilotSeed).toContain("on conflict (workspace_id, external_provider, external_id) do update");
  });

  it("contains the Producoes pilot tasks and excludes completed tasks", () => {
    ["86aj7yz8h", "86aaa6gz1", "86a3yh14k", "86a524xb6", "86aaa6cft"].forEach((externalId) => {
      expect(producoesSeed).toContain(externalId);
    });

    expect(producoesSeed).not.toContain("86af8fbkv");
    expect(producoesSeed).toContain("PROD-45");
    expect(producoesSeed).toContain("insert into public.tasks");
    expect(producoesSeed).toContain("insert into public.people");
    expect(producoesSeed).toContain("insert into public.task_assignees");
    expect(producoesSeed).toContain("insert into public.task_tags");
    expect(producoesSeed).toContain("case when t.due_date is null then null");
  });
});
