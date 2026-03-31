import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchMatchingTags } from "./github.js";

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) {
      return (pa[i] ?? 0) - (pb[i] ?? 0);
    }
  }
  return 0;
}

export function registerTagsTools(server: McpServer) {
  server.tool(
    "list_release_tags",
    "List git release tags for a package (matching name@v*), sorted by version descending.",
    {
      owner: z.string().describe("GitHub repository owner"),
      repo: z.string().describe("GitHub repository name"),
      package_name: z.string().describe("Package name to match tags against (e.g. 'cli' matches 'cli@v*')"),
    },
    async ({ owner, repo, package_name }) => {
      const tags = await fetchMatchingTags(owner, repo, package_name);

      if (tags.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No release tags found for "${package_name}" in ${owner}/${repo}.`,
            },
          ],
        };
      }

      const entries = tags
        .map((tag) => {
          const version = tag.replace(`${package_name}@v`, "");
          return { tag, version };
        })
        .sort((a, b) => compareSemver(b.version, a.version));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(entries, null, 2),
          },
        ],
      };
    },
  );
}
