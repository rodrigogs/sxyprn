import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { __private__ } from '../../src/videos.js';

/**
 * These fixtures are real pages captured from sxyprn.com. They pin the live
 * layout so a site change breaks these tests instead of production code.
 * Refresh with scripts/refresh-fixtures.sh (10s between requests, per
 * robots.txt `Crawl-delay`).
 */
const readFixture = (name: string): string =>
  readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8');

const unusedLoader = async (): Promise<never> => {
  throw new Error('unused');
};

const loadListing = (name: string, offset = 0, step = 30) =>
  __private__.buildListResult(offset, readFixture(name), step, unusedLoader);

const FIRST_CARDS: Record<string, Record<string, unknown>> = {
  'listing-home.html': {
    videoId: '6ab1a9bec8445',
    duration: '26:35',
    durationSeconds: 1_595,
    quality: 'HD',
    bitrate: 2_158,
    views: 20_664,
    likes: 24,
    orgasmic: 8,
    playlist: 26,
    relativeDate: '21 hours ago',
    author: {
      id: '618afb5ec39a8',
      name: 'AJ47',
      url: 'https://sxyprn.com/blog/618afb5ec39a8/0.html',
    },
    subcategory: 'Nympho',
    subcategoryUrl: 'https://sxyprn.com/blog/Nympho/0.html?sc',
    isExternal: true,
  },
  'listing-new.html': {
    videoId: '6ab2d40a6f9a7',
    duration: '37:24',
    quality: 'HD',
    bitrate: 1_316,
    views: 27,
    likes: 0,
    orgasmic: 0,
    playlist: 0,
    relativeDate: '11 minutes ago',
    author: { id: '67af5240183ff', name: 'Redluv' },
    subcategory: 'Slayed',
    isExternal: true,
  },
  'listing-tag.html': {
    videoId: '6ab1341887592',
    duration: '15:55',
    durationSeconds: 955,
    quality: 'HD',
    bitrate: 1_123,
    views: 96_852,
    likes: 119,
    orgasmic: 63,
    playlist: 96,
    relativeDate: 'Yesterday',
    author: { id: '63933c0ddaf6c', name: 'TommyTV' },
    externalUrls: [],
    isExternal: false,
  },
  'listing-search.html': {
    videoId: '6ab2a1b9d335d',
    duration: '38:13',
    quality: 'HD',
    bitrate: 973,
    views: 212,
    likes: 3,
    orgasmic: 1,
    playlist: 0,
    relativeDate: '3 hours ago',
    author: { id: '5a6534e03bbb4', name: 'camusdeacuarios' },
    subcategory: undefined,
    externalUrls: [],
  },
  'listing-blog.html': {
    videoId: '6ab2c0af19306',
    duration: '57:47',
    quality: 'HD',
    bitrate: 2_212,
    relativeDate: 'Hour ago',
    author: { id: '618afb5ec39a8', name: 'AJ47' },
    // Blog cards render the detail-style counter classes, not the wall ones.
    likes: 5,
    orgasmic: 3,
    playlist: 1,
    isExternal: true,
  },
  'listing-orgasmic.html': {
    videoId: '6aaf9434ec6ed',
    duration: '45:23',
    quality: 'SD',
    bitrate: 671,
    height: 480,
    views: 88_754,
    likes: 141,
    orgasmic: 68,
    playlist: 105,
    relativeDate: '2 days ago',
    author: { id: '68e256ea83355', name: 'BlackSmith' },
    subcategory: 'Only Fans',
    isExternal: true,
  },
  'listing-top-popular.html': {
    videoId: '6ab1731b4e126',
    duration: '19:15',
    quality: 'HD',
    bitrate: 1_007,
    views: 59_950,
    likes: 42,
    orgasmic: 21,
    playlist: 50,
    relativeDate: 'Yesterday',
    author: { id: '6a71d57594165', name: 'DrNasty' },
    subcategory: undefined,
  },
};

describe('real HTML fixtures', () => {
  it.each(Object.entries(FIRST_CARDS))(
    'parses the first card of %s',
    (name, expected) => {
      const result = loadListing(name);

      expect(result.videos.length).toBeGreaterThan(0);
      expect(result.videos[0]).toMatchObject(expected);
      expect(result.videos[0].url).toBe(
        `https://sxyprn.com/post/${expected.videoId}.html`,
      );
      expect(result.videos[0].thumb).toMatch(/^https:\/\//);
      expect(result.videos[0].preview).toMatch(/^https:\/\//);
    },
  );

  it('keeps every hash_link label as a tag', () => {
    const tags = loadListing('listing-tag.html').videos[0].tags;

    expect(tags.slice(0, 5)).toEqual([
      'anal',
      'New',
      'BigDicks',
      'Blowjob',
      'deepthroat',
    ]);
    // The site mixes cases (`bigdicks` next to `BigDicks`); both are kept.
    expect(tags).toHaveLength(15);
  });

  it('parses the whole home wall with no pager', () => {
    const result = loadListing('listing-home.html');

    expect(result.videos).toHaveLength(99);
    expect(result.pagination).toEqual({ page: 0, pages: [0], step: 30 });
    expect(result.hasNext()).toBe(false);
    expect(result.hasPrevious()).toBe(false);
    expect(
      result.videos.map((video) => video.title).filter(Boolean).length,
    ).toBeGreaterThan(0);
    // 36 cards carry a badge (32 HD, 4 SD); the rest stay empty rather than
    // guessing from the duration border colour, which is not a quality signal.
    expect(new Set(result.videos.map((video) => video.quality))).toEqual(
      new Set(['HD', 'SD', '']),
    );
  });

  it('reads tag pagination as a 30-step offset pager', () => {
    const result = loadListing('listing-tag.html');

    expect(result.videos).toHaveLength(30);
    expect(result.pagination.page).toBe(0);
    expect(result.pagination.step).toBe(30);
    expect(result.pagination.pages[1]).toBe(30);
    expect(result.pagination.pages.at(-1)).toBe(56_700);
    expect(result.hasNext()).toBe(true);

    const second = loadListing('listing-tag.html', 30);

    expect(second.pagination.page).toBe(30);
    expect(second.hasPrevious()).toBe(true);
  });

  it('reads the new and search pagers', () => {
    const fresh = loadListing('listing-new.html');

    expect(fresh.videos).toHaveLength(30);
    expect(fresh.pagination.pages.at(-1)).toBe(94_830);
    expect(fresh.pagination.step).toBe(30);

    const search = loadListing('listing-search.html');

    expect(search.videos).toHaveLength(30);
    expect(search.pagination.pages.at(-1)).toBe(600);
    expect(search.pagination.step).toBe(30);
  });

  it('infers the 20-step blog pager and the path-style pagers', () => {
    const posts = loadListing('listing-blog.html');

    expect(posts.videos).toHaveLength(20);
    expect(posts.pagination.step).toBe(20);
    expect(posts.pagination.pages.at(-1)).toBe(8_760);

    const orgasmic = loadListing('listing-orgasmic.html');

    expect(orgasmic.videos).toHaveLength(30);
    expect(orgasmic.pagination.pages.at(-1)).toBe(9_930);
    expect(orgasmic.pagination.step).toBe(30);

    const popular = loadListing('listing-top-popular.html');

    expect(popular.videos).toHaveLength(30);
    expect(popular.pagination.pages.at(-1)).toBe(17_670);
  });

  it('parses the post detail page', () => {
    const details = __private__.parseDetails(
      readFixture('video-detail.html'),
      'https://sxyprn.com/post/6ab1a9bec8445.html',
    );

    expect(details).toMatchObject({
      videoId: '6ab1a9bec8445',
      url: 'https://sxyprn.com/post/6ab1a9bec8445.html',
      title:
        'New Gina - Training My Nympho Stepsister #anal #asian #bigtits #blowjob #hardcore #interracial #pov #trans',
      duration: '26:35',
      durationSeconds: 1_595,
      quality: 'HD',
      height: 720,
      bitrate: 2_158,
      sizeMb: 410,
      sizeBytes: 430_369_218,
      uploadDate: '2026-09-21T22:03:42+00:00',
      contentUrl: 'https://sxyprn.com/post/6ab1a9bec8445',
      torrentUrl: 'https://myporn.club/t/ffiX96Is',
      comments: 0,
      views: 20_610,
      likes: 24,
      orgasmic: 8,
      playlist: 0,
      relativeDate: '21 hours ago',
      author: {
        id: '618afb5ec39a8',
        name: 'AJ47',
        url: 'https://sxyprn.com/blog/618afb5ec39a8/0.html',
      },
      tags: [
        'anal',
        'asian',
        'bigtits',
        'blowjob',
        'hardcore',
        'interracial',
        'pov',
        'trans',
      ],
      externalUrls: [
        'https://streamcash.to/embed/u5iIe_E9RF',
        'https://vidara.so/e/W668Pvchhd7H',
      ],
      isExternal: true,
    });
    expect(details.description).toContain('Free blog video: New');
    expect(details.thumb).toBe(
      'https://b2.trafficdeposit.com/pivi/0/11/img/9s7AwLbPPbd8M9EL6hf9xQ/1790107200/618afb5ec39a8/6ab1a9bec8445/0.webp',
    );
    // Obfuscated source as published, with `\/` unescaped by the JSON parse.
    expect(details.streamSource).toBe(
      '/cdn/c5/01b4w3jz42j0e2yzm1f0m9azv522s/ZwmoTmDYOUsrOpg_VDb-8w/1790109154/3r641d8yalfvbl5te7cz3x9nae8/vr61adbl11an90bmemc6884s4e5.vid',
    );
    // Same-origin, expiring: segment 1 gains the `cdn8/<token>` hop and the
    // timestamp drops by the digit sums (54 + 53).
    expect(details.streamUrl).toBe(
      'https://sxyprn.com/cdn8/NTQtc3h5cHJuLmNvbS01Mw../c5/01b4w3jz42j0e2yzm1f0m9azv522s/ZwmoTmDYOUsrOpg_VDb-8w/1790109047/3r641d8yalfvbl5te7cz3x9nae8/vr61adbl11an90bmemc6884s4e5.vid',
    );
  });

  it('keeps the related wall out of the detail parse', () => {
    const html = readFixture('video-detail.html');
    const details = __private__.parseDetails(
      html,
      'https://sxyprn.com/post/6ab1a9bec8445.html',
    );
    const related = __private__.buildListResult(0, html, 30, unusedLoader);

    // 25 cards on the page: only the main post container is dropped.
    expect(related.videos).toHaveLength(24);
    // The related wall repeats the current post (verified live, twice), so the
    // scoping that matters is on the detail fields: they must come from the
    // main card whatever the wall repeats.
    expect(
      related.videos.some((video) => video.videoId === details.videoId),
    ).toBe(true);
    expect(details.title).toBe(
      'New Gina - Training My Nympho Stepsister #anal #asian #bigtits #blowjob #hardcore #interracial #pov #trans',
    );
    expect(details.tags).toHaveLength(8);
    expect(details.author).toMatchObject({ id: '618afb5ec39a8', name: 'AJ47' });
  });
});
