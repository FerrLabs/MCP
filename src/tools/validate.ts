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
      try {
        const raw = await readFile(join(root, filename), "utf-8");
        const config = parseConfig(raw, filename);
        return { config, filename };
      } catch {
        continue;
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

function parseConfig(raw: string, filename: string): Record<string, unknown> {
  if (filename.endsWith(".toml")) {
    throw new Error("TOML parsing not yet supported");
  }
  return JSON.parse(raw);
}
