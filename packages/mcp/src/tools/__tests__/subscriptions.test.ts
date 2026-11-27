import { describe, it, expect, beforeEach } from 'vitest';
import { createToolHarness, lastRequest, makeResponse, mockFetch } from './harness.js';
import { registerSubscriptionsTools } from '../subscriptions.js';

const harness = createToolHarness();

describe('subscriptions tools', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    registerSubscriptionsTools(harness.server);
  });

  it('list_subscriptions reads the escaped org subscriptions collection', async () => {
    mockFetch.mockResolvedValue(makeResponse([{ id: 's1', product: 'ferrvault' }]));

    const result = await harness.call('list_subscriptions', { org_slug: 'acme corp' });

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/acme%20corp\/subscriptions$/);
    expect(req.method).toBe('GET');
    expect(req.headers['x-api-token']).toBe('test-token');
    expect(result.content[0].text).toContain('ferrvault');
  });

  it('activate_subscription posts product and tier', async () => {
    mockFetch.mockResolvedValue(makeResponse({ id: 's1', status: 'trialing' }));

    const result = await harness.call('activate_subscription', {
      org_slug: 'acme',
      product: 'ferrtrack',
      tier: 'pro',
    });

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/acme\/subscriptions$/);
    expect(req.method).toBe('POST');
    expect(req.body).toEqual({ product: 'ferrtrack', tier: 'pro' });
    expect(result.content[0].text).toContain('trialing');
  });

  it('update_subscription patches only the tier on the product path', async () => {
    mockFetch.mockResolvedValue(makeResponse({ id: 's1', tier: 'team' }));

    await harness.call('update_subscription', {
      org_slug: 'acme',
      product: 'ferrgrowth',
      tier: 'team',
    });

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/acme\/subscriptions\/ferrgrowth$/);
    expect(req.method).toBe('PATCH');
    expect(req.body).toEqual({ tier: 'team' });
  });

  it('cancel_subscription defaults to cancelling at period end without a query string', async () => {
    mockFetch.mockResolvedValue(makeResponse(undefined, 204));

    const result = await harness.call('cancel_subscription', {
      org_slug: 'acme',
      product: 'ferrfleet',
    });

    const req = lastRequest();
    expect(req.url).toMatch(/\/orgs\/acme\/subscriptions\/ferrfleet$/);
    expect(req.method).toBe('DELETE');
    expect(result.content[0].text).toBe(
      'Subscription ferrfleet on acme set to cancel at period end.',
    );
  });

  it('cancel_subscription with immediate=true adds the query and says so', async () => {
    mockFetch.mockResolvedValue(makeResponse(undefined, 204));

    const result = await harness.call('cancel_subscription', {
      org_slug: 'acme',
      product: 'ferrfleet',
      immediate: true,
    });

    expect(lastRequest().url).toMatch(/\/subscriptions\/ferrfleet\?immediate=true$/);
    expect(result.content[0].text).toBe('Subscription ferrfleet on acme cancelled immediately.');
  });

  it('cancel_subscription with immediate=false does not cut off immediately', async () => {
    mockFetch.mockResolvedValue(makeResponse(undefined, 204));

    const result = await harness.call('cancel_subscription', {
      org_slug: 'acme',
      product: 'ferrlens',
      immediate: false,
    });

    expect(lastRequest().url).not.toContain('immediate');
    expect(result.content[0].text).toContain('set to cancel at period end');
  });

  it('propagates API errors rather than reporting success', async () => {
    mockFetch.mockResolvedValue(makeResponse({ message: 'billing info required' }, 402));

    await expect(
      harness.call('activate_subscription', {
        org_slug: 'acme',
        product: 'ferrvault',
        tier: 'pro',
      }),
    ).rejects.toThrow();
  });
});
