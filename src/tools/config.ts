import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchRepoFile } from "./github.js";

export const CONFIG_FILES = [
  "ferrflow.json",
  "ferrflow.json5",
  "ferrflow.toml",
  ".ferrflow",
];

export function registerConfigTools(server: McpServer) {
  server.tool(
    "read_config",
    "Read and return the FerrFlow configuration from a GitHub repository. Tries ferrflow.json, ferrflow.json5, ferrflow.toml, and .ferrflow in order.",
    {
      owner: z.string().describe("GitHub repository owner"),
      repo: z.string().describe("GitHub repository name"),
      ref: z
        .string()
        .optional()
        .describe("Git ref (branch, tag, or commit SHA). Defaults to the repo's default branch."),
    },
    async ({ owner, repo, ref }) => {
      for (const filename of CONFIG_FILES) {
        const content = await fetchRepoFile(owner, repo, filename, ref);
        if (content !== null) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Found \`${filename}\`:\n\n\`\`\`\n${content}\`\`\``,
              },
            ],
          };
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: "No FerrFlow configuration file found in this repository. Looked for: " +
              CONFIG_FILES.join(", "),
          },
        ],
      };
    },
  );
}
