import { describe, it, expect } from "vitest";
import { CONFIG_FILES } from "../config.js";

describe("CONFIG_FILES", () => {
  it("is exported and contains expected filenames", () => {
    expect(CONFIG_FILES).toContain("ferrflow.json");
    expect(CONFIG_FILES).toContain(".ferrflow");
    expect(CONFIG_FILES.length).toBeGreaterThanOrEqual(3);
  });
});
