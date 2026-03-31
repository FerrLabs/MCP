import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTagsTools } from "../tags.js";

vi.mock("../github.js", () => ({
  fetchMatchingTags: vi.fn(),
}));

import { fetchMatchingTags } from "../github.js";
const mockFetchMatchingTags = vi.mocked(fetchMatchingTags);

let toolHandler: (params: Record<string, unknown>) => Promise<unknown>;

const mockServer = {
  tool: vi.fn((_name, _desc, _schema, handler) => {
    toolHandler = handler;
  }),
} as unknown as McpServer;

describe("list_release_tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerTagsTools(mockServer);
  });

  it("registers the tool with correct name", () => {
    expect(mockServer.tool).toHaveBeenCalledWith(
      "list_release_tags",
      expect.any(String),
      expect.any(Object),
      expect.any(Function),
    );
  });

  it("returns tags sorted by semver descending", async () => {
    mockFetchMatchingTags.mockResolvedValue([
      "cli@v1.0.0",
      "cli@v1.1.0",
      "cli@v2.0.0",
      "cli@v1.2.3",
    ]);

    const result = await toolHandler({
      owner: "FerrFlow-Org",
      repo: "ferrflow",
      package_name: "cli",
    });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            [
              { tag: "cli@v2.0.0", version: "2.0.0" },
              { tag: "cli@v1.2.3", version: "1.2.3" },
              { tag: "cli@v1.1.0", version: "1.1.0" },
              { tag: "cli@v1.0.0", version: "1.0.0" },
            ],
            null,
            2,
          ),
        },
      ],
    });
  });

  it("returns a message when no tags found", async () => {
    mockFetchMatchingTags.mockResolvedValue([]);

    const result = (await toolHandler({
      owner: "FerrFlow-Org",
      repo: "ferrflow",
      package_name: "nonexistent",
    })) as { content: { text: string }[] };

    expect(result.content[0].text).toContain("No release tags found");
  });
});
