import { describe, it, expect, vi, beforeEach } from "vitest";
import { CONFIG_FILES } from "../config.js";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  access: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { readFile, access } from "node:fs/promises";
const mockReadFile = vi.mocked(readFile);
const mockAccess = vi.mocked(access);

import { resolveConfig, validateSchema, checkPaths } from "../validate.js";

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Not Found",
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("CONFIG_FILES", () => {
  it("is exported and contains expected filenames", () => {
    expect(CONFIG_FILES).toContain("ferrflow.json");
    expect(CONFIG_FILES).toContain(".ferrflow");
    expect(CONFIG_FILES.length).toBeGreaterThanOrEqual(3);
  });
});

describe("resolveConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves local config from first matching file", async () => {
    mockReadFile.mockRejectedValueOnce(new Error("ENOENT")); // ferrflow.json
    mockReadFile.mockRejectedValueOnce(new Error("ENOENT")); // ferrflow.json5
    mockReadFile.mockRejectedValueOnce(new Error("ENOENT")); // ferrflow.toml
    mockReadFile.mockResolvedValueOnce(
      JSON.stringify({ package: [{ name: "app", path: "." }] }),
    ); // .ferrflow

    const result = await resolveConfig("local", { path: "/repo" });
    expect(result.config).toEqual({ package: [{ name: "app", path: "." }] });
    expect(result.filename).toBe(".ferrflow");
  });

  it("returns error when no local config found", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));

    const result = await resolveConfig("local", { path: "/repo" });
    expect(result.error).toMatch(/no FerrFlow configuration file found/i);
  });

  it("resolves github config via fetch", async () => {
    const configContent = JSON.stringify({ package: [{ name: "api", path: "packages/api" }] });
    mockFetch.mockResolvedValueOnce(makeResponse({ content: Buffer.from(configContent).toString("base64"), encoding: "base64" }));

    const result = await resolveConfig("github", { owner: "org", repo: "repo" });
    expect(result.config).toEqual({ package: [{ name: "api", path: "packages/api" }] });
  });

  it("returns error for invalid JSON", async () => {
    mockReadFile.mockResolvedValueOnce("not valid json {{{");

    const result = await resolveConfig("local", { path: "/repo" });
    expect(result.error).toBeDefined();
  });
});

describe("validateSchema", () => {
  it("returns no errors for a valid config", () => {
    const config = {
      package: [{ name: "app", path: ".", versionedFiles: [{ path: "package.json", format: "json" }] }],
    };
    const errors = validateSchema(config);
    expect(errors).toEqual([]);
  });

  it("returns errors for missing required fields", () => {
    const config = {
      package: [{ name: "app" }], // missing 'path'
    };
    const errors = validateSchema(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toMatch(/path/i);
  });

  it("returns errors for invalid enum values", () => {
    const config = {
      workspace: { versioning: "invalid-strategy" },
      package: [{ name: "app", path: "." }],
    };
    const errors = validateSchema(config);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns errors for additional properties", () => {
    const config = {
      package: [{ name: "app", path: ".", unknownField: true }],
    };
    const errors = validateSchema(config);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("checkPaths — local mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when package path does not exist", async () => {
    mockAccess.mockRejectedValue(new Error("ENOENT"));

    const config = {
      package: [{ name: "app", path: "packages/app", versionedFiles: [] }],
    };
    const result = await checkPaths(config, "local", { path: "/repo" });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("packages/app") }),
      ]),
    );
  });

  it("returns error when versioned file does not exist", async () => {
    mockAccess.mockResolvedValueOnce(undefined); // package path exists
    mockAccess.mockRejectedValueOnce(new Error("ENOENT")); // versioned file missing

    const config = {
      package: [
        {
          name: "app",
          path: "packages/app",
          versionedFiles: [{ path: "packages/app/Cargo.toml", format: "toml" }],
        },
      ],
    };
    const result = await checkPaths(config, "local", { path: "/repo" });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("Cargo.toml") }),
      ]),
    );
  });

  it("returns warning when changelog does not exist", async () => {
    mockAccess.mockResolvedValueOnce(undefined); // package path
    mockAccess.mockRejectedValueOnce(new Error("ENOENT")); // changelog

    const config = {
      package: [{ name: "app", path: ".", changelog: "CHANGELOG.md" }],
    };
    const result = await checkPaths(config, "local", { path: "/repo" });
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("CHANGELOG.md") }),
      ]),
    );
  });

  it("returns warning when sharedPaths dir does not exist", async () => {
    mockAccess.mockResolvedValueOnce(undefined); // package path
    mockAccess.mockRejectedValueOnce(new Error("ENOENT")); // sharedPaths

    const config = {
      package: [{ name: "app", path: ".", sharedPaths: ["packages/shared"] }],
    };
    const result = await checkPaths(config, "local", { path: "/repo" });
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("packages/shared") }),
      ]),
    );
  });

  it("returns suggestion when no versionedFiles declared", async () => {
    mockAccess.mockResolvedValue(undefined);

    const config = {
      package: [{ name: "app", path: "." }],
    };
    const result = await checkPaths(config, "local", { path: "/repo" });
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("versionedFiles") }),
      ]),
    );
  });

  it("returns suggestion when orphanedTagStrategy not set", async () => {
    mockAccess.mockResolvedValue(undefined);

    const config = {
      package: [{ name: "app", path: "." }],
    };
    const result = await checkPaths(config, "local", { path: "/repo" });
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "workspace.orphanedTagStrategy" }),
      ]),
    );
  });

  it("returns suggestion when tagTemplate not set", async () => {
    mockAccess.mockResolvedValue(undefined);

    const config = {
      package: [{ name: "app", path: "." }],
    };
    const result = await checkPaths(config, "local", { path: "/repo" });
    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "workspace.tagTemplate" }),
      ]),
    );
  });

  it("returns no issues for fully valid config with all paths existing", async () => {
    mockAccess.mockResolvedValue(undefined);

    const config = {
      workspace: { tagTemplate: "v{version}", orphanedTagStrategy: "warn" },
      package: [
        {
          name: "app",
          path: ".",
          versionedFiles: [{ path: "package.json", format: "json" }],
          changelog: "CHANGELOG.md",
        },
      ],
    };
    const result = await checkPaths(config, "local", { path: "/repo" });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });
});

describe("checkPaths — github mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when package path does not exist on GitHub", async () => {
    mockFetch.mockResolvedValue(makeResponse(null, 404));

    const config = {
      package: [{ name: "app", path: "packages/app", versionedFiles: [] }],
    };
    const result = await checkPaths(config, "github", { owner: "org", repo: "repo" });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("packages/app") }),
      ]),
    );
  });

  it("returns error when versioned file missing on GitHub", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ content: "", encoding: "base64" }),
    );
    mockFetch.mockResolvedValueOnce(makeResponse(null, 404));

    const config = {
      package: [
        {
          name: "app",
          path: "packages/app",
          versionedFiles: [{ path: "packages/app/package.json", format: "json" }],
        },
      ],
    };
    const result = await checkPaths(config, "github", { owner: "org", repo: "repo" });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("package.json") }),
      ]),
    );
  });

  it("returns no errors when all paths exist on GitHub", async () => {
    mockFetch.mockResolvedValue(
      makeResponse({ content: Buffer.from("content").toString("base64"), encoding: "base64" }),
    );

    const config = {
      workspace: { tagTemplate: "v{version}", orphanedTagStrategy: "warn" },
      package: [
        {
          name: "app",
          path: ".",
          versionedFiles: [{ path: "package.json", format: "json" }],
          changelog: "CHANGELOG.md",
        },
      ],
    };
    const result = await checkPaths(config, "github", { owner: "org", repo: "repo" });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
