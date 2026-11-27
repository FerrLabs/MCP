import { describe, it, expect } from 'vitest';
import { htmlToText } from '../docs-html.js';

describe('htmlToText tag stripping', () => {
  it('keeps a lone angle bracket that is not part of a tag', () => {
    expect(htmlToText('<p>1 < 2</p>')).toBe('1 < 2');
  });

  it('keeps an empty <> pair', () => {
    expect(htmlToText('a <> b')).toBe('a <> b');
  });

  it('keeps trailing text after an unterminated tag', () => {
    expect(htmlToText('before <a href="x')).toBe('before <a href="x');
  });

  it('removes a tag that contains a stray opening bracket', () => {
    expect(htmlToText('x <<b>y')).toBe('x y');
  });

  it('trims only trailing newlines of a code block', () => {
    const out = htmlToText('<pre><code><span>const a = 1;</span>\n  indented\n\n\n</code></pre>');
    expect(out).toBe('```\nconst a = 1;\n  indented\n```');
  });

  it('handles a long run of unclosed tag openers in linear time', () => {
    const start = performance.now();
    htmlToText(`<p>${'<a '.repeat(50_000)}</p>`);
    expect(performance.now() - start).toBeLessThan(1000);
  });
});
