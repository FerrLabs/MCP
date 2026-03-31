import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchMatchingTags } from "../github.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Not Found",
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("fetchMatchingTags", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns matching tag refs sorted by the API", async () => {
    mockFetch.mockResolvedValue(
      makeResponse([
        { ref: "refs/tags/cli@v1.0.0" },
        { ref: "refs/tags/cli@v1.1.0" },
        { ref: "refs/tags/cli@v2.0.0" },
      ]),
    );
    const tags = await fetchMatchingTags("FerrFlow-Org", "ferrflow", "cli");
    expect(tags).toEqual(["cli@v1.0.0", "cli@v1.1.0", "cli@v2.0.0"]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/git/matching-refs/tags/cli%40v"),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("returns empty array when no tags match", async () => {
    mockFetch.mockResolvedValue(makeResponse([]));
    const tags = await fetchMatchingTags("FerrFlow-Org", "ferrflow", "nonexistent");
    expect(tags).toEqual([]);
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValue(makeResponse([], 403));
    await expect(
      fetchMatchingTags("FerrFlow-Org", "ferrflow", "cli"),
    ).rejects.toThrow("GitHub API error: 403");
  });

  it("rejects invalid owner", async () => {
    await expect(
      fetchMatchingTags("../evil", "ferrflow", "cli"),
    ).rejects.toThrow("Invalid GitHub owner");
  });
});
