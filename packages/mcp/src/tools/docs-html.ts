export type Extraction =
  | { readonly kind: 'docs'; readonly html: string }
  | { readonly kind: 'main'; readonly html: string }
  | { readonly kind: 'none'; readonly html: string };

const DOCS_PROSE_OPEN = /<([a-z][\w-]*)\b[^>]*\bclass="[^"]*\bdocs__prose\b[^"]*"[^>]*>/i;
const MAIN_OPEN = /<(main)\b[^>]*>/i;

function balancedElement(html: string, opener: RegExp): string | undefined {
  const open = opener.exec(html);
  if (!open) return undefined;
  const tag = open[1];
  const tags = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  tags.lastIndex = open.index + open[0].length;
  let depth = 1;
  for (let m = tags.exec(html); m; m = tags.exec(html)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(open.index, m.index + m[0].length);
  }
  return html.slice(open.index);
}

export function extractContent(html: string): Extraction {
  const docs = balancedElement(html, DOCS_PROSE_OPEN);
  if (docs !== undefined) return { kind: 'docs', html: docs };
  const main = balancedElement(html, MAIN_OPEN);
  if (main !== undefined) return { kind: 'main', html: main };
  return { kind: 'none', html: html.match(/<body\b[\s\S]*/i)?.[0] ?? html };
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  nbsp: ' ',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  amp: '&',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : Number(body.slice(1));
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });
}

const DROPPED_ELEMENTS = [
  'script',
  'style',
  'svg',
  'noscript',
  'template',
  'nav',
  'footer',
  'button',
  'select',
];
const BLOCK_TAGS =
  /<\/?(p|div|section|article|main|header|aside|figure|blockquote|details|summary|table|thead|tbody|ul|ol|dl|dt|dd|hr)\b[^>]*>/gi;

export function htmlToText(html: string): string {
  const blocks: string[] = [];
  let out = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of DROPPED_ELEMENTS) {
    out = out.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, 'gi'), '');
  }
  out = out
    .replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, body: string) => {
      blocks.push(decodeEntities(body.replace(/<[^>]+>/g, '')).replace(/\n+$/, ''));
      return `\n\n\u0000${blocks.length - 1}\u0000\n\n`;
    })
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level: string, body: string) => {
      return `\n\n${'#'.repeat(Number(level))} ${body}\n\n`;
    })
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '\n')
    .replace(
      /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi,
      (_, row: string) => `\n${row.replace(/\s+/g, ' ')} |\n`,
    )
    .replace(/<(td|th)\b[^>]*>/gi, ' | ')
    .replace(/<br\b[^>]*>/gi, '\n')
    .replace(/<\/?code\b[^>]*>/gi, '`')
    .replace(BLOCK_TAGS, '\n\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(out)
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/^-\n+/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\n(?=- )/g, '\n')
    .replace(/\u0000(\d+)\u0000/g, (_, index: string) => `\`\`\`\n${blocks[Number(index)]}\n\`\`\``)
    .trim();
}
