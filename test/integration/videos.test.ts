import { describe, expect, it } from 'vitest';
import sxyprn from '../../src/index.js';

const POST_ID = /^[0-9a-f]{13}$/;

/**
 * Live tests. sxyprn.com serves plain 200s to datacenter IPs (verified
 * 2026-09-22) and robots.txt declares `Crawl-delay: 10`, which the shared
 * throttle enforces between every request below — so this file stays polite
 * without any sleep of its own.
 */
describe('sxyprn live integration', () => {
  it('loads the real home wall', async () => {
    const wall = await sxyprn.videos.home();

    expect(wall.videos.length).toBeGreaterThan(0);
    expect(wall.pagination.page).toBe(0);
    expect(wall.videos[0].videoId).toMatch(POST_ID);
    expect(wall.videos[0].url).toBe(
      `https://sxyprn.com/post/${wall.videos[0].videoId}.html`,
    );
    expect(wall.videos[0].title.length).toBeGreaterThan(0);
    expect(wall.videos[0].thumb).toMatch(/^https:\/\//);
    expect(wall.videos[0].author.url).toContain('/blog/');
  });

  it('walks tag pagination with the site step', async () => {
    const first = await sxyprn.videos.tag('anal', { sm: 'trending' });

    expect(first.videos).toHaveLength(30);
    expect(first.pagination.step).toBe(30);
    expect(first.pagination.pages[1]).toBe(30);
    expect(first.hasNext()).toBe(true);
    expect(first.hasPrevious()).toBe(false);

    const second = await first.next();

    expect(second.pagination.page).toBe(30);
    expect(second.videos.length).toBeGreaterThan(0);
    expect(second.videos[0].videoId).not.toBe(first.videos[0].videoId);
    expect(second.hasPrevious()).toBe(true);

    const back = await second.previous();

    expect(back.pagination.page).toBe(0);
    expect(back.videos[0].videoId).toBe(first.videos[0].videoId);
  });

  it('loads a real post detail page', async () => {
    const wall = await sxyprn.videos.home();
    const [card] = wall.videos;
    const details = await sxyprn.videos.details({ url: card.url });

    expect(details.videoId).toBe(card.videoId);
    expect(details.title.length).toBeGreaterThan(0);
    expect(details.durationSeconds).toBeGreaterThan(0);
    expect(details.uploadDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(details.contentUrl).toContain(card.videoId);
    expect(details.author.url).toContain('/blog/');
    expect(details.views).toBeGreaterThan(0);
    expect(details.tags.length).toBeGreaterThan(0);
    expect(details.tags.length).toBeLessThan(50);
    expect(details.thumb).toMatch(/^https:\/\//);
  });
});
