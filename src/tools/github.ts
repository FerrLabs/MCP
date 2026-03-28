const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

interface GitHubContentResponse {
  content: string;
  encoding: string;
  name: string;
  path: string;
}

function validateOwnerOrRepoSegment(name: string, type: "owner" | "repo"): string {
  if (!name) {
    throw new Error(`GitHub ${type} must be a non-empty string`);
  }

  // Disallow path separators and simple traversal patterns.
  if (name.includes("/") || name.includes("..")) {
    throw new Error(`Invalid GitHub ${type}: "${name}"`);
  }

  // Restrict to a conservative subset of allowed characters.
  if (!/^[A-Za-z0-9._-]+$/.test(name)) {
    throw new Error(`Invalid GitHub ${type}: "${name}"`);
  }

  return name;
}

function encodePath(path: string): string {
  // Encode each segment separately to avoid introducing or interpreting
  // path separators or query/fragment characters from user input.
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export async function fetchRepoFile(
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<string | null> {
  const safeOwner = validateOwnerOrRepoSegment(owner, "owner");
  const safeRepo = validateOwnerOrRepoSegment(repo, "repo");
  const safePath = encodePath(path);

  const url = new URL(
    `https://api.github.com/repos/${safeOwner}/${safeRepo}/contents/${safePath}`,
  );
  if (ref) {
    url.searchParams.set("ref", ref);
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ferrflow-mcp/0.2.0",
  };

  if (GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
  }

  const res = await fetch(url.toString(), { headers });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as GitHubContentResponse;

  if (data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }

  return data.content;
}
