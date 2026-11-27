import { describe, it, expect } from 'vitest';
import { extractContent, htmlToText } from '../docs-html.js';

describe('extractContent', () => {
  it('prefers the docs prose container over main', () => {
    const html = '<main><div class="docs__prose x"><p>doc</p></div><p>other</p></main>';

    expect(extractContent(html)).toEqual({
      kind: 'docs',
      html: '<div class="docs__prose x"><p>doc</p></div>',
    });
  });

  it('balances nested elements of the same tag', () => {
    const html = '<div class="docs__prose"><div>inner</div>tail</div><div>after</div>';

    expect(extractContent(html).html).toBe('<div class="docs__prose"><div>inner</div>tail</div>');
  });

  it('takes the rest of the document when the container is never closed', () => {
    const html = '<section class="docs__prose"><p>cut off';

    expect(extractContent(html)).toEqual({ kind: 'docs', html });
  });

  it('falls back to main', () => {
    expect(extractContent('<body><main><p>hi</p></main><footer>f</footer></body>')).toEqual({
      kind: 'main',
      html: '<main><p>hi</p></main>',
    });
  });

  it('falls back to the body when there is no container', () => {
    expect(extractContent('<html><head>h</head><body><p>x</p></body></html>')).toEqual({
      kind: 'none',
      html: '<body><p>x</p></body></html>',
    });
  });

  it('returns the whole input when there is no body either', () => {
    expect(extractContent('<p>fragment</p>')).toEqual({ kind: 'none', html: '<p>fragment</p>' });
  });
});

describe('htmlToText', () => {
  it('drops scripts, styles, nav, buttons and comments', () => {
    const html =
      '<p>keep</p><script>evil()</script><style>a{}</style><nav>menu</nav><button>go</button><!-- hidden --><footer>f</footer>';

    expect(htmlToText(html)).toBe('keep');
  });

  it('renders headings with the right number of hashes', () => {
    expect(htmlToText('<h1>One</h1><h3>Three</h3>')).toBe('# One\n\n### Three');
  });

  it('renders list items as dashes', () => {
    expect(htmlToText('<ul><li>a</li><li>b</li></ul>')).toBe('- a\n- b');
  });

  it('keeps a list item whose text starts on its own line', () => {
    expect(htmlToText('<ul><li>\n<p>a</p></li></ul>')).toBe('- a');
  });

  it('renders table rows with pipes', () => {
    expect(
      htmlToText('<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>'),
    ).toBe('| A | B |\n\n| 1 | 2 |');
  });

  it('renders inline code with backticks and br as newline', () => {
    expect(htmlToText('<p>run <code>ls</code><br>now</p>')).toBe('run `ls`\nnow');
  });

  it('preserves pre blocks verbatim as fenced code, decoding entities and stripping tags', () => {
    const html = '<p>before</p><pre><code>a &lt; b\n  <span>c</span>\n</code></pre><p>after</p>';

    expect(htmlToText(html)).toBe('before\n\n```\na < b\n  c\n```\n\nafter');
  });

  it('decodes named, decimal and hex entities', () => {
    expect(htmlToText('<p>&amp; &lt;&gt; &quot;&apos; &#65; &#x42; &NBSP;x</p>')).toBe(
      '& <> "\' A B x',
    );
  });

  it('leaves unknown or out-of-range entities untouched', () => {
    expect(htmlToText('<p>&bogus; &#1114112; &#xZZ;</p>')).toBe('&bogus; &#1114112; &#xZZ;');
  });

  it('keeps a lone less-than sign that does not open a tag', () => {
    expect(htmlToText('<p>1 <> 2</p>')).toBe('1 <> 2');
  });

  it('keeps text after an unterminated tag opener', () => {
    expect(htmlToText('<p>a < b')).toBe('a < b');
  });

  it('collapses runs of whitespace and blank lines', () => {
    expect(htmlToText('<div>a   \t b</div><div></div><div></div><div>c</div>')).toBe('a b\n\nc');
  });
});
