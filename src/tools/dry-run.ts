import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execFile } from "node:child_process";

function runFerrflowCheck(cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "ferrflow",
      ["check", "--json"],
      { cwd: cwd || process.cwd(), timeout: 30_000 },
      (error, stdout, stderr) => {
        if (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            reject(
              new Error(
                "ferrflow CLI not found. Make sure it is installed and in your PATH.",
              ),
            );
            return;
          }
          reject(new Error(stderr.trim() || error.message));
          return;
        }
        resolve(stdout);
      },
    );
  });
}

export function registerDryRunTools(server: McpServer) {
  server.tool(
    "dry_run",
    "Run a ferrflow dry-run on a local repository and return what would be bumped and released.",
    {
      path: z
        .string()
        .optional()
        .describe(
          "Local path to the repository. Defaults to the current working directory.",
        ),
    },
    async ({ path }) => {
      const output = await runFerrflowCheck(path);
      const result = JSON.parse(output);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );
}
