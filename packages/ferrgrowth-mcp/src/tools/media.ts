import { z } from 'zod';
import { getToken, type McpServer, toToolText } from '@ferrlabs/mcp-core';
import { growthRequest } from '../api-base.js';

interface MediaAsset {
  id: string;
  site_id: string;
  url: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  created_at: string;
}

interface MediaList {
  total: number;
  items: MediaAsset[];
}

const siteSlug = z.string().min(1).describe('Site slug');

function mediaPath(site: string): string {
  return `/sites/${encodeURIComponent(site)}/media`;
}

export function registerMediaTools(server: McpServer) {
  server.tool(
    'list_media',
    "List a FerrGrowth site's media library, newest first. Returns the total count and a page of assets with their public URL, type, size and dimensions.",
    {
      site_id: siteSlug,
      kind: z.enum(['image', 'font']).optional().describe('Only images or only fonts'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Max assets to return (default 50).'),
      offset: z.number().int().min(0).optional().describe('Assets to skip, for paging.'),
    },
    async ({ site_id, kind, limit, offset }) => {
      const token = await getToken();
      const params = new URLSearchParams();
      if (kind !== undefined) params.set('kind', kind);
      if (limit !== undefined) params.set('limit', String(limit));
      if (offset !== undefined) params.set('offset', String(offset));
      const qs = params.size > 0 ? `?${params.toString()}` : '';
      const media = await growthRequest<MediaList>(`${mediaPath(site_id)}${qs}`, { token });
      return {
        content: [
          {
            type: 'text' as const,
            text: toToolText(media, { narrowWith: 'Pass a smaller limit or a kind.' }),
          },
        ],
      };
    },
  );

  server.tool(
    'delete_media',
    'Delete an asset from a FerrGrowth media library. Irreversible: the file is removed from storage, and pages, posts or emails that still reference its URL will show a broken image.',
    {
      site_id: siteSlug,
      media_id: z.string().min(1).describe('Media asset id'),
    },
    async ({ site_id, media_id }) => {
      const token = await getToken();
      await growthRequest<void>(`${mediaPath(site_id)}/${encodeURIComponent(media_id)}`, {
        token,
        method: 'DELETE',
      });
      return {
        content: [{ type: 'text' as const, text: `Media asset ${media_id} deleted.` }],
      };
    },
  );
}
