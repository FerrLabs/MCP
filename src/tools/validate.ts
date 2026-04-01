import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execFile } from "node:child_process";

function runFerrflowValidate(
  cwd?: string,
  repo?: string,
  ref?: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ["validate", "--json"];
    if (repo) args.push("--repo", repo);
    if (ref) args.push("--ref", ref);

    execFile(
      "ferrflow",
      args,
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
          // ferrflow validate exits non-zero when there are errors but still
          // writes valid JSON to stdout — use stdout if available.
          if (stdout.trim()) {
            resolve(stdout);
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

export function registerValidateTools(server: McpServer) {
  server.tool(
    "validate_config",
    "Validate a FerrFlow configuration file: checks schema, referenced paths, versioned file parseability, and cross-package consistency. Supports local repos and remote GitHub/GitLab repos via the --repo flag.",
    {
      path: z
        .string()
        .optional()
        .describe(
          "Local path to the repository root (defaults to cwd). Ignored when repo is set.",
        ),
      repo: z
        .string()
        .optional()
        .describe(
          "Remote repository spec: owner/repo for GitHub, gitlab:group/project for GitLab.",
        ),
      ref: z
        .string()
        .optional()
        .describe(
          "Git ref (branch, tag, SHA) for remote validation. Requires repo.",
        ),
    },
    async ({ path, repo, ref }) => {
      const output = await runFerrflowValidate(path, repo, ref);
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
