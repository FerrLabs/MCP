import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import Ajv from "ajv";
import ferrflowSchema from "../schema/ferrflow.json" with { type: "json" };
import { CONFIG_FILES } from "./config.js";
import { fetchRepoFile } from "./github.js";

interface ResolveResult {
  config?: Record<string, unknown>;
  filename?: string;
  error?: string;
}

export async function resolveConfig(
  source: string,
  params: { path?: string; owner?: string; repo?: string; ref?: string },
): Promise<ResolveResult> {
  if (source === "local") {
    const root = params.path || process.cwd();
    for (const filename of CONFIG_FILES) {
      let raw: string;
      try {
        raw = await readFile(join(root, filename), "utf-8");
      } catch {
        continue;
      }
      try {
        const config = parseConfig(raw, filename);
        return { config, filename };
      } catch (e) {
        return { error: `Failed to parse ${filename}: ${(e as Error).message}` };
      }
    }
    return { error: "No FerrFlow configuration file found. Looked for: " + CONFIG_FILES.join(", ") };
  }

  // GitHub mode
  for (const filename of CONFIG_FILES) {
    const content = await fetchRepoFile(params.owner!, params.repo!, filename, params.ref);
    if (content !== null) {
      try {
        const config = parseConfig(content, filename);
        return { config, filename };
      } catch (e) {
        return { error: `Failed to parse ${filename}: ${(e as Error).message}` };
      }
    }
  }
  return { error: "No FerrFlow configuration file found. Looked for: " + CONFIG_FILES.join(", ") };
}

export interface ValidationEntry {
  path: string;
  message: string;
}

const ajv = new Ajv({ allErrors: true });
const schemaValidator = ajv.compile(ferrflowSchema);

export function validateSchema(config: Record<string, unknown>): ValidationEntry[] {
  const valid = schemaValidator(config);
  if (valid) return [];

  return (schemaValidator.errors || []).map((err) => ({
    path: err.instancePath ? err.instancePath.slice(1).replace(/\//g, ".") : "(root)",
    message: err.message || "unknown validation error",
  }));
}

interface CheckResult {
  errors: ValidationEntry[];
  warnings: ValidationEntry[];
  suggestions: ValidationEntry[];
}

interface PackageDef {
  name: string;
  path: string;
  changelog?: string | null;
  versionedFiles?: Array<{ path: string; format: string }>;
  sharedPaths?: string[];
}

async function pathExists(filepath: string): Promise<boolean> {
  try {
    await access(filepath);
    return true;
  } catch {
    return false;
  }
}

async function githubPathExists(
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<boolean> {
  const content = await fetchRepoFile(owner, repo, path, ref);
  return content !== null;
}

export async function checkPaths(
  config: Record<string, unknown>,
  source: string,
  params: { path?: string; owner?: string; repo?: string; ref?: string },
): Promise<CheckResult> {
  const errors: ValidationEntry[] = [];
  const warnings: ValidationEntry[] = [];
  const suggestions: ValidationEntry[] = [];

  const packages = (config.package || []) as PackageDef[];
  const workspace = (config.workspace || {}) as Record<string, unknown>;

  const exists = source === "local"
    ? (p: string) => pathExists(join(params.path || process.cwd(), p))
    : (p: string) => githubPathExists(params.owner!, params.repo!, p, params.ref);

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    const prefix = `package[${i}]`;

    if (!(await exists(pkg.path))) {
      errors.push({ path: `${prefix}.path`, message: `directory not found: ${pkg.path}` });
    }

    if (pkg.versionedFiles) {
      for (let j = 0; j < pkg.versionedFiles.length; j++) {
        const vf = pkg.versionedFiles[j];
        if (!(await exists(vf.path))) {
          errors.push({
            path: `${prefix}.versionedFiles[${j}].path`,
            message: `file not found: ${vf.path}`,
          });
        }
      }
    }

    if (pkg.changelog && !(await exists(pkg.changelog))) {
      warnings.push({
        path: `${prefix}.changelog`,
        message: `${pkg.changelog} does not exist yet, will be created on first release`,
      });
    }

    if (pkg.sharedPaths) {
      for (let j = 0; j < pkg.sharedPaths.length; j++) {
        const sp = pkg.sharedPaths[j];
        if (!(await exists(sp))) {
          warnings.push({
            path: `${prefix}.sharedPaths[${j}]`,
            message: `path not found: ${sp}`,
          });
        }
      }
    }

    if (!pkg.versionedFiles || pkg.versionedFiles.length === 0) {
      suggestions.push({
        path: `${prefix}.versionedFiles`,
        message: "no versionedFiles declared — version won't be written to any file",
      });
    }
  }

  if (!workspace.orphanedTagStrategy) {
    suggestions.push({
      path: "workspace.orphanedTagStrategy",
      message: "not set, defaults to 'warn'",
    });
  }
  if (!workspace.tagTemplate) {
    suggestions.push({
      path: "workspace.tagTemplate",
      message: "not set, defaults to 'v{version}' (single repo) or '{name}@v{version}' (monorepo)",
    });
  }

  return { errors, warnings, suggestions };
}

interface ValidationResponse {
  valid: boolean;
  errors?: ValidationEntry[];
  warnings?: ValidationEntry[];
  suggestions?: ValidationEntry[];
}

function formatResponse(result: ValidationResponse) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

export function registerValidateTools(server: McpServer) {
  server.tool(
    "validate_config",
    "Validate a FerrFlow configuration file against the JSON schema and check that referenced paths exist. Supports local repositories and GitHub repositories.",
    {
      source: z.enum(["local", "github"]).describe("Where to read the config from"),
      path: z.string().optional().describe("Local path to the repository root (local mode, defaults to cwd)"),
      owner: z.string().optional().describe("GitHub repository owner (required for github mode)"),
      repo: z.string().optional().describe("GitHub repository name (required for github mode)"),
      ref: z.string().optional().describe("Git ref — branch, tag, or commit SHA (github mode, defaults to default branch)"),
    },
    async ({ source, path, owner, repo, ref }) => {
      if (source === "github" && (!owner || !repo)) {
        return formatResponse({
          valid: false,
          errors: [{ path: "(params)", message: "owner and repo are required for github mode" }],
        });
      }

      const resolved = await resolveConfig(source, { path, owner, repo, ref });
      if (resolved.error) {
        return formatResponse({
          valid: false,
          errors: [{ path: "(config)", message: resolved.error }],
        });
      }

      const schemaErrors = validateSchema(resolved.config!);
      if (schemaErrors.length > 0) {
        return formatResponse({ valid: false, errors: schemaErrors });
      }

      const checks = await checkPaths(resolved.config!, source, { path, owner, repo, ref });
      const valid = checks.errors.length === 0;

      return formatResponse({
        valid,
        ...(checks.errors.length > 0 && { errors: checks.errors }),
        ...(checks.warnings.length > 0 && { warnings: checks.warnings }),
        ...(checks.suggestions.length > 0 && { suggestions: checks.suggestions }),
      });
    },
  );
}

function parseConfig(raw: string, filename: string): Record<string, unknown> {
  if (filename.endsWith(".toml")) {
    throw new Error("TOML parsing not yet supported");
  }
  return JSON.parse(raw);
}
