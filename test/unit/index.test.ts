import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BASE_URL,
  createRequest,
  DEFAULT_MIN_REQUEST_INTERVAL_MS,
  resetSharedThrottle,
} from '../../src/base.js';
import sxyprn from '../../src/index.js';
import videos from '../../src/videos.js';

afterEach(() => {
  vi.restoreAllMocks();
  resetSharedThrottle();
});

describe('package entry', () => {
  it('exposes the videos api and the shared configuration hook', () => {
    expect(Object.keys(sxyprn).sort()).toEqual(['configure', 'videos']);
    expect(sxyprn.videos).toBe(videos);
    expect(Object.keys(sxyprn.videos).sort()).toEqual([
      'blog',
      'details',
      'home',
      'new',
      'orgasmic',
      'search',
      'tag',
      'topPopular',
      'topViewed',
    ]);
  });

  it('raises the throttle floor through configure', async () => {
    const transport = vi
      .fn()
      .mockResolvedValue({ body: 'ok', statusCode: 200, url: BASE_URL });
    const sleep = vi.fn().mockResolvedValue(undefined);
    let now = 1_000_000;

    sxyprn.configure({ minRequestIntervalMs: 30_000 });

    const request = createRequest({ transport, sleep, now: () => now });

    await request.get('/');
    now += 1_000;
    await request.get('/');

    expect(DEFAULT_MIN_REQUEST_INTERVAL_MS).toBe(10_000);
    expect(sleep).toHaveBeenCalledWith(29_000);
  });
});
