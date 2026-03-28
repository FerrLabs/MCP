const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

interface GitHubContentResponse {
  content: string;
  encoding: string;
  name: string;
  path: string;
}

export async function fetchRepoFile(
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<string | null> {
  const url = new URL(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
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
