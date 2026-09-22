import { describe, expect, it } from 'vitest';
import sxyprn from '../../src/index.js';
import type { VideoDetails } from '../../src/types/index.js';

/**
 * The stream algorithm is only useful if the CDN accepts what it produces, so
 * this test resolves a real post and asks for the first kilobyte. The live
 * check on 2026-09-22 returned `302` (same-origin hop) then
 * `206 Partial Content`, `video/mp4`, `Content-Range: bytes 0-1023/430369218`
 * and an `ftyp isom` body — no Referer required.
 */
const findPostWithStream = async (urls: string[]): Promise<VideoDetails> => {
  for (const url of urls) {
    // Each call is spaced by the shared throttle (robots Crawl-delay: 10).
    const details = await sxyprn.videos.details({ url });

    if (details.streamUrl) {
      return details;
    }
  }

  throw new Error('No post with a stream in the first cards of the home wall');
};

describe('sxyprn live stream resolver', () => {
  it('resolves a playable same-origin stream url', async () => {
    const wall = await sxyprn.videos.home();
    const details = await findPostWithStream(
      wall.videos.slice(0, 3).map((video) => video.url),
    );

    expect(details.streamSource).toMatch(/\.vid$/);
    expect(details.streamUrl).toMatch(
      /^https:\/\/sxyprn\.com\/cdn8\/[A-Za-z0-9_.-]+\//,
    );

    const response = await fetch(details.streamUrl, {
      headers: { range: 'bytes=0-1023' },
    });

    expect(response.status).toBe(206);
    expect(response.headers.get('content-type')).toContain('video/mp4');

    if (details.sizeBytes) {
      expect(response.headers.get('content-range')).toBe(
        `bytes 0-1023/${details.sizeBytes}`,
      );
    }

    const body = Buffer.from(await response.arrayBuffer());

    expect(body.byteLength).toBe(1024);
    expect(body.subarray(4, 12).toString('latin1')).toContain('ftyp');
  }, 120_000);
});
