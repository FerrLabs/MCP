import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchRepoFile } from "./github.js";

function parseChangelog(content: string, maxVersions: number): string {
  const lines = content.split("\n");
  const sectionIndices: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (/^## (?:\[|v)/m.test(lines[i])) {
      sectionIndices.push(i);
    }
  }

  if (sectionIndices.length === 0) {
    return content;
  }

  const endIndex = sectionIndices.length > maxVersions
    ? sectionIndices[maxVersions]
    : lines.length;

  return lines.slice(0, endIndex).join("\n").trimEnd();
}

export function registerChangelogTools(server: McpServer): void {
  server.tool(
    "read_changelog",
    "Read the changelog of a FerrFlow-managed package from a GitHub repository. Returns the most recent entries.",
    {
      owner: z.string().describe("GitHub repository owner"),
      repo: z.string().describe("GitHub repository name"),
      package_name: z
        .string()
        .optional()
        .describe("Package name for monorepo (reads packages/<name>/CHANGELOG.md). Omit for root changelog."),
      ref: z
        .string()
        .optional()
        .describe("Git ref (branch, tag, or commit SHA). Defaults to the repo's default branch."),
      max_versions: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe("Maximum number of versions to return (default: 3)"),
    },
    async ({ owner, repo, package_name, ref, max_versions }) => {
      const limit = max_versions ?? 3;
      const filePath = package_name
        ? `packages/${package_name}/CHANGELOG.md`
        : "CHANGELOG.md";

      const content = await fetchRepoFile(owner, repo, filePath, ref);

      if (content === null) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No CHANGELOG.md found at ${filePath} in ${owner}/${repo}${ref ? ` (ref: ${ref})` : ""}.`,
            },
          ],
        };
      }

      const parsed = parseChangelog(content, limit);

      return {
        content: [
          {
            type: "text" as const,
            text: parsed,
          },
        ],
      };
    },
  );
}
