import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createToolHarness, lastRequest, makeResponse, mockFetch } from './harness.js';
import { registerTokenTools } from '../tokens.js';

const harness = createToolHarness();
const TOKEN_ID = 'tok_1';

describe('token tools', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    registerTokenTools(harness.server);
  });

  afterEach(() => {
    delete process.env.FERRLABS_MCP_ALLOW_TOKEN_REVEAL;
  });

  it('get_me reads /auth/me with the token', async () => {
    mockFetch.mockResolvedValue(makeResponse({ id: 'u1', email: 'a@b.c' }));

    const result = await harness.call('get_me');

    const req = lastRequest();
    expect(req.url).toMatch(/\/auth\/me$/);
    expect(req.headers['x-api-token']).toBe('test-token');
    expect(result.content[0].text).toContain('a@b.c');
  });

  it('list_tokens reads /auth/tokens and never exposes a plaintext field', async () => {
    mockFetch.mockResolvedValue(makeResponse([{ id: 't1', token_prefix: 'fl_live' }]));

    const result = await harness.call('list_tokens');

    expect(lastRequest().url).toMatch(/\/auth\/tokens$/);
    expect(result.content[0].text).toContain('fl_live');
  });

  it('revoke_token deletes the token by id and confirms', async () => {
    mockFetch.mockResolvedValue(makeResponse(undefined, 204));

    const result = await harness.call('revoke_token', { token_id: TOKEN_ID });

    const req = lastRequest();
    expect(req.url).toMatch(new RegExp(`/auth/tokens/${TOKEN_ID}$`));
    expect(req.method).toBe('DELETE');
    expect(result.content[0].text).toBe(`Token ${TOKEN_ID} revoked successfully.`);
  });

  it('revoke_token does not confirm when the API rejects', async () => {
    mockFetch.mockResolvedValue(makeResponse({ message: 'not found' }, 404));

    await expect(harness.call('revoke_token', { token_id: TOKEN_ID })).rejects.toThrow();
  });

  it('create_token omits the secret from the metadata block but reveals it once', async () => {
    process.env.FERRLABS_MCP_ALLOW_TOKEN_REVEAL = '1';
    mockFetch.mockResolvedValue(
      makeResponse({ id: 't1', name: 'ci', token_prefix: 'fl_live', plaintext: 'fl_live_secret' }),
    );

    const result = await harness.call('create_token', { name: 'ci', scopes: ['*'] });

    const text = result.content[0].text ?? '';
    expect(lastRequest().method).toBe('POST');
    expect(lastRequest().url).toMatch(/\/auth\/tokens$/);
    expect(text.split('fl_live_secret')).toHaveLength(2);
    expect(text).toContain('revoke_token');
    expect(text).toContain('"token_prefix":"fl_live"');
  });
});
