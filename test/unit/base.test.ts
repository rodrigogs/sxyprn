import { afterEach, describe, expect, it, vi } from 'vitest';
import base, {
  BASE_URL,
  computeRetryDelay,
  configureRequest,
  createRequest,
  DEFAULT_MIN_REQUEST_INTERVAL_MS,
  delay,
  reserveRequestSlot,
  resetSharedThrottle,
  resolveUrl,
  shouldRetry,
} from '../../src/base.js';

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  vi.restoreAllMocks();
  resetSharedThrottle();
});

const respondWith = (body: unknown, statusCode = 200) => {
  return vi.fn().mockResolvedValue({
    body,
    statusCode,
    url: `${BASE_URL}/`,
  });
};

/**
 * A clock that advances exactly one crawl-delay per read, so the shared
 * throttle never has to wait and the recorded sleeps are retry backoffs only.
 */
const advancingClock = (): (() => number) => {
  let clock = 0;

  return () => {
    clock += DEFAULT_MIN_REQUEST_INTERVAL_MS;

    return clock;
  };
};

describe('base helpers', () => {
  it('exposes the base url and resolves relative paths', () => {
    expect(BASE_URL).toBe('https://sxyprn.com');
    expect(resolveUrl()).toBe('');
    expect(resolveUrl('/post/6ab1a9bec8445.html')).toBe(
      'https://sxyprn.com/post/6ab1a9bec8445.html',
    );
    expect(resolveUrl('https://sxyprn.com/new.html')).toBe(
      'https://sxyprn.com/new.html',
    );
    expect(base).toMatchObject({
      BASE_URL,
      DEFAULT_MIN_REQUEST_INTERVAL_MS,
      createRequest,
      delay,
      resolveUrl,
    });
  });

  it('waits for the requested delay', async () => {
    vi.useFakeTimers();

    const pending = delay(50);
    let settled = false;
    pending.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(49);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toBeUndefined();
    expect(settled).toBe(true);
  });

  it('detects retryable errors', () => {
    expect(shouldRetry('timeout')).toBe(false);
    expect(shouldRetry(new Error('boom'))).toBe(false);
    expect(
      shouldRetry(
        Object.assign(new Error('timeout'), { name: 'TimeoutError' }),
      ),
    ).toBe(true);
    expect(
      shouldRetry(Object.assign(new Error('reset'), { code: 'ECONNRESET' })),
    ).toBe(true);
    expect(
      shouldRetry(Object.assign(new Error('bad gateway'), { code: 'EOTHER' })),
    ).toBe(false);
  });

  it('builds exponential backoff delays with full jitter', () => {
    expect(computeRetryDelay(1, () => 1)).toBe(750);
    expect(computeRetryDelay(2, () => 1)).toBe(1_500);
    expect(computeRetryDelay(3, () => 0.5)).toBe(1_500);
    // attempt 0 is clamped, so the base can never go sub-750ms.
    expect(computeRetryDelay(0, () => 1)).toBe(750);
    expect(computeRetryDelay(1)).toBeLessThan(750);
  });

  it('reserves throttle slots synchronously', () => {
    let now = 1_000_000;

    expect(reserveRequestSlot(() => now, 10_000)).toBe(0); // first: due immediately
    expect(reserveRequestSlot(() => now, 10_000)).toBe(10_000); // slot taken

    now += 1_500;
    expect(reserveRequestSlot(() => now, 10_000)).toBe(18_500); // still chained

    expect(reserveRequestSlot(() => now, 10_000)).toBe(28_500); // anchor not reached

    now += 100_000;
    expect(reserveRequestSlot(() => now, 10_000)).toBe(0); // anchor overtaken
  });

  it('builds request options and coerces non-string bodies', async () => {
    const transport = respondWith({ ok: true }, 201);
    const request = createRequest({
      transport,
      headers: {
        'x-test': '1',
      },
    });

    await expect(request.get('/new.html')).resolves.toEqual({
      data: '[object Object]',
      statusCode: 201,
      url: 'https://sxyprn.com/',
    });

    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://sxyprn.com/new.html',
        http2: false,
        responseType: 'text',
        throwHttpErrors: true,
        retry: {
          limit: 0,
        },
        timeout: {
          request: 20_000,
        },
        headers: expect.objectContaining({
          'x-test': '1',
          referer: 'https://sxyprn.com/',
        }),
      }),
    );
  });

  it('retries retryable transport errors and then succeeds', async () => {
    const transport = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }),
      )
      .mockResolvedValueOnce({ body: 'ok', statusCode: 200, url: BASE_URL });
    const sleep = vi.fn().mockResolvedValue(undefined);
    const request = createRequest({
      transport,
      sleep,
      now: advancingClock(),
      random: () => 1,
    });

    await expect(request.get('/new.html')).resolves.toEqual({
      data: 'ok',
      statusCode: 200,
      url: BASE_URL,
    });
    expect(transport).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(750);
  });

  it('does not retry non-retryable errors', async () => {
    const error = new Error('boom');
    const transport = vi.fn().mockRejectedValue(error);
    const sleep = vi.fn().mockResolvedValue(undefined);
    const request = createRequest({ transport, sleep });

    await expect(request.get('/new.html')).rejects.toThrow('boom');
    expect(transport).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('stops retrying after the final attempt', async () => {
    const error = Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' });
    const transport = vi.fn().mockRejectedValue(error);
    const sleep = vi.fn().mockResolvedValue(undefined);
    const request = createRequest({
      transport,
      sleep,
      now: advancingClock(),
      random: () => 1,
    });

    await expect(request.get('/new.html')).rejects.toThrow('timeout');
    expect(transport).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 750);
    expect(sleep).toHaveBeenNthCalledWith(2, 1_500);
  });

  it('applies full jitter to the exponential backoff', async () => {
    const error = Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' });
    const transport = vi.fn().mockRejectedValue(error);
    const sleep = vi.fn().mockResolvedValue(undefined);
    const request = createRequest({
      transport,
      sleep,
      now: advancingClock(),
      random: () => 0.5,
    });

    await expect(request.get('/new.html')).rejects.toThrow('timeout');
    expect(sleep).toHaveBeenNthCalledWith(1, 375);
    expect(sleep).toHaveBeenNthCalledWith(2, 750);
  });

  it('uses the default got-scraping transport when none is provided', async () => {
    const gotScraping = vi
      .fn()
      .mockResolvedValue({ body: 'ok', statusCode: 200, url: BASE_URL });

    vi.doMock('got-scraping', () => ({ gotScraping }));

    const { createRequest: createDefaultRequest } = await import(
      '../../src/base.js'
    );

    await expect(createDefaultRequest().get('/new.html')).resolves.toEqual({
      data: 'ok',
      statusCode: 200,
      url: BASE_URL,
    });
    expect(gotScraping).toHaveBeenCalledTimes(1);
  });

  it('passes the proxy url to the transport', async () => {
    const transport = respondWith('ok');
    const request = createRequest({
      transport,
      proxyUrl: 'http://proxy.local:8080',
    });

    await request.get('/new.html');

    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        proxyUrl: 'http://proxy.local:8080',
      }),
    );
  });

  it('routes plain clients through the shared proxy url', async () => {
    const transport = respondWith('ok');

    configureRequest({ proxyUrl: 'http://shared-proxy:3128' });

    const request = createRequest({ transport });

    await request.get('/new.html');

    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({ proxyUrl: 'http://shared-proxy:3128' }),
    );
  });

  it('accepts an empty configuration without lowering the crawl-delay floor', () => {
    configureRequest();
    configureRequest({ minRequestIntervalMs: 10 });

    const transport = respondWith('ok');
    const sleep = vi.fn().mockResolvedValue(undefined);
    let now = 50_000;
    const request = createRequest({ transport, sleep, now: () => now });

    return request
      .get('/new.html')
      .then(() => {
        now += 100;

        return request.get('/new.html');
      })
      .then(() => {
        // The floor wins over the requested 10ms: only a full crawl-delay
        // window frees the next slot.
        expect(sleep).toHaveBeenCalledTimes(1);
        expect(sleep).toHaveBeenLastCalledWith(
          DEFAULT_MIN_REQUEST_INTERVAL_MS - 100,
        );
      });
  });

  it('keeps the largest requested interval across instances', () => {
    const transport = respondWith('ok');
    const sleep = vi.fn().mockResolvedValue(undefined);
    let now = 500_000;

    createRequest({
      transport,
      sleep,
      now: () => now,
      minRequestIntervalMs: 20_000,
    });
    createRequest({
      transport,
      sleep,
      now: () => now,
      minRequestIntervalMs: 0,
    });

    const plain = createRequest({ transport, sleep, now: () => now });

    return plain
      .get('/new.html')
      .then(() => {
        now += 5_000;

        return plain.get('/new.html');
      })
      .then(() => {
        expect(sleep).toHaveBeenCalledTimes(1);
        expect(sleep).toHaveBeenLastCalledWith(15_000);
      });
  });

  it('serializes concurrent callers on the shared slot', async () => {
    const transport = respondWith('ok');
    const sleep = vi.fn().mockResolvedValue(undefined);
    // Frozen clock: an implementation that only records the anchor AFTER the
    // await would hand both concurrent callers the SAME 10s wait, wake them
    // together and fire a burst (breaking the minimum spacing).
    const now = (): number => 10_000;
    const request = createRequest({ transport, sleep, now });

    await request.get('/new.html'); // first slot is due immediately
    expect(sleep).not.toHaveBeenCalled();

    await Promise.all([request.get('/new.html'), request.get('/new.html')]);

    expect(sleep.mock.calls.flat()).toEqual([
      DEFAULT_MIN_REQUEST_INTERVAL_MS,
      DEFAULT_MIN_REQUEST_INTERVAL_MS * 2,
    ]);
  });

  it('restores the crawl-delay default when the throttle is reset', async () => {
    const transport = respondWith('ok');
    const sleep = vi.fn().mockResolvedValue(undefined);
    let now = 10_000;

    createRequest({
      transport,
      sleep,
      now: () => now,
      minRequestIntervalMs: 60_000,
    });
    resetSharedThrottle();

    const request = createRequest({ transport, sleep, now: () => now });

    await request.get('/new.html'); // anchor dropped: slot due immediately
    expect(sleep).not.toHaveBeenCalled();

    now += 100;
    await request.get('/new.html');
    expect(sleep).toHaveBeenCalledWith(DEFAULT_MIN_REQUEST_INTERVAL_MS - 100);
  });
});
