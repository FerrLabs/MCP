import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDryRunTools } from "../dry-run.js";

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

describe("dry_run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerDryRunTools(mockServer);
  });

  it("registers the tool with correct name", () => {
    expect(mockServer.tool).toHaveBeenCalledWith(
      "dry_run",
      expect.any(String),
      expect.any(Object),
      expect.any(Function),
    );
  });

  it("returns parsed JSON from ferrflow check", async () => {
    const output = JSON.stringify({
      packages: [
        {
          name: "api",
          current_version: "1.2.3",
          next_version: "1.3.0",
          bump_type: "minor",
          tag: "api@v1.3.0",
          commits: [{ hash: "abc1234", message: "feat(api): add endpoint" }],
        },
      ],
    });

    mockExecFile.mockImplementation((_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      (callback as Function)(null, output, "");
      return undefined as never;
    });

    const result = (await toolHandler({})) as { content: { text: string }[] };
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.packages).toHaveLength(1);
    expect(parsed.packages[0].name).toBe("api");
    expect(parsed.packages[0].next_version).toBe("1.3.0");
  });

  it("returns empty packages when nothing to bump", async () => {
    const output = JSON.stringify({ packages: [] });

    mockExecFile.mockImplementation((_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      (callback as Function)(null, output, "");
      return undefined as never;
    });

    const result = (await toolHandler({})) as { content: { text: string }[] };
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.packages).toHaveLength(0);
  });

  it("uses provided path as cwd", async () => {
    const output = JSON.stringify({ packages: [] });

    mockExecFile.mockImplementation((_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      (callback as Function)(null, output, "");
      return undefined as never;
    });

    await toolHandler({ path: "/tmp/my-repo" });

    expect(mockExecFile).toHaveBeenCalledWith(
      "ferrflow",
      ["check", "--json"],
      expect.objectContaining({ cwd: "/tmp/my-repo" }),
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

  it("throws on non-zero exit with stderr", async () => {
    const err = Object.assign(new Error("exit 1"), { code: 1 });
    mockExecFile.mockImplementation((_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
      (callback as Function)(err, "", "No ferrflow config found");
      return undefined as never;
    });

    await expect(toolHandler({})).rejects.toThrow("No ferrflow config found");
  });
});
