import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerValidateTools } from "../validate.js";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";
const mockExecFile = vi.mocked(execFile);

let toolHandler: (params: Record<string, unknown>) => Promise<unknown>;

const mockServer = {
  tool: vi.fn((_name: string, _desc: string, _schema: unknown, handler: (params: Record<string, unknown>) => Promise<unknown>) => {
    toolHandler = handler;
  }),
} as unknown as McpServer;

describe("validate_config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerValidateTools(mockServer);
  });

  it("registers the tool with correct name", () => {
    expect(mockServer.tool).toHaveBeenCalledWith(
      "validate_config",
      expect.any(String),
      expect.any(Object),
      expect.any(Function),
    );
  });

  it("returns parsed JSON from ferrflow validate", async () => {
    const output = JSON.stringify({
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [{ path: "workspace.tagTemplate", message: "not set" }],
    });

    mockExecFile.mockImplementation((_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      (callback as Function)(null, output, "");
      return undefined as never;
    });

    const result = (await toolHandler({})) as { content: { text: string }[] };
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.valid).toBe(true);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.suggestions).toHaveLength(1);
  });

  it("returns validation errors on non-zero exit with stdout", async () => {
    const output = JSON.stringify({
      valid: false,
      errors: [{ path: "package[0].path", message: "directory not found: packages/app" }],
      warnings: [],
      suggestions: [],
    });

    const err = Object.assign(new Error("exit 1"), { code: 1 });
    mockExecFile.mockImplementation((_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      (callback as Function)(err, output, "");
      return undefined as never;
    });

    const result = (await toolHandler({})) as { content: { text: string }[] };
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.valid).toBe(false);
    expect(parsed.errors).toHaveLength(1);
  });

  it("uses provided path as cwd", async () => {
    const output = JSON.stringify({ valid: true, errors: [], warnings: [], suggestions: [] });

    mockExecFile.mockImplementation((_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      (callback as Function)(null, output, "");
      return undefined as never;
    });

    await toolHandler({ path: "/tmp/my-repo" });

    expect(mockExecFile).toHaveBeenCalledWith(
      "ferrflow",
      ["validate", "--json"],
      expect.objectContaining({ cwd: "/tmp/my-repo" }),
      expect.any(Function),
    );
  });

  it("passes --repo and --ref flags", async () => {
    const output = JSON.stringify({ valid: true, errors: [], warnings: [], suggestions: [] });

    mockExecFile.mockImplementation((_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      (callback as Function)(null, output, "");
      return undefined as never;
    });

    await toolHandler({ repo: "org/repo", ref: "main" });

    expect(mockExecFile).toHaveBeenCalledWith(
      "ferrflow",
      ["validate", "--json", "--repo", "org/repo", "--ref", "main"],
      expect.any(Object),
      expect.any(Function),
    );
  });

  it("passes --repo without --ref", async () => {
    const output = JSON.stringify({ valid: true, errors: [], warnings: [], suggestions: [] });

    mockExecFile.mockImplementation((_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      (callback as Function)(null, output, "");
      return undefined as never;
    });

    await toolHandler({ repo: "gitlab:group/project" });

    expect(mockExecFile).toHaveBeenCalledWith(
      "ferrflow",
      ["validate", "--json", "--repo", "gitlab:group/project"],
      expect.any(Object),
      expect.any(Function),
    );
  });

  it("throws when ferrflow is not found", async () => {
    const err = Object.assign(new Error("not found"), { code: "ENOENT" });
    mockExecFile.mockImplementation((_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      (callback as Function)(err, "", "");
      return undefined as never;
    });

    await expect(toolHandler({})).rejects.toThrow("ferrflow CLI not found");
  });

  it("throws on non-zero exit with no stdout", async () => {
    const err = Object.assign(new Error("exit 1"), { code: 1 });
    mockExecFile.mockImplementation((_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      (callback as Function)(err, "", "No ferrflow config found");
      return undefined as never;
    });

    await expect(toolHandler({})).rejects.toThrow("No ferrflow config found");
  });
});
