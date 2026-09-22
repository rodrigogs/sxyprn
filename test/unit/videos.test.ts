import { load } from 'cheerio';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VideoListResult } from '../../src/types/videos.js';
import { __private__ } from '../../src/videos.js';

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  vi.restoreAllMocks();
});

const STREAM_SOURCE =
  '/cdn/c5/01b4w3jz42j0e2yzm1f0m9azv522s/ZwmoTmDYOUsrOpg_VDb-8w/1790109154/3r641d8yalfvbl5te7cz3x9nae8/vr61adbl11an90bmemc6884s4e5.vid';

/**
 * The doc example (docs/site-structure.md), pinned bit-for-bit. Its
 * `(55 + 54)` note is a typo: the segment digit sums are 58 and 71, and
 * 1790107219 - 129 is exactly the timestamp the doc resolves to.
 */
const DOC_STREAM_SOURCE =
  '/cdn/c5/a1g4136zb2w0u25z1140t9rzn5d2i/sP_RCBW3GdHtIYgbP0iCBA/1790107219/w6o1n81a5f6b25deuch3p9jar84/9t6qawb516a59wb9ehcr8x4c4u5.vid';
const DOC_STREAM_URL =
  'https://sxyprn.com/cdn8/NTgtc3h5cHJuLmNvbS03MQ../c5/a1g4136zb2w0u25z1140t9rzn5d2i/sP_RCBW3GdHtIYgbP0iCBA/1790107090/w6o1n81a5f6b25deuch3p9jar84/9t6qawb516a59wb9ehcr8x4c4u5.vid';

const LISTING_HTML = `<html><head><title>Anal - 56717 videos on SexyPorn</title></head><body>
<div class="main_content">
  <div class="post_el_small">
    <div class="pes_author_div transition"><a href="/blog/618afb5ec39a8/0.html" class="tdn"><span class="a_char">J</span><span class="a_name">AJ47<i class="stars"></i></span></a></div>
    <div class="pes_wl transition" data-postid="6ab1a9bec8445"><span class="wl_btn"></span></div>
    <div class="post_text" style="">Gina - Training My Nympho Stepsister <a class="hash_link tdn transition" label="anal" href="/anal.html?sm=trending">#anal</a> <a class="hash_link tdn transition" label="asian" href="/asian.html?sm=trending">#asian</a> <b class="post_b_text_el"><a href="https://vidara.so/e/W668Pvchhd7H" class="extlink_icon extlink">vidara.so</a></b></div>
    <a href="/post/6ab1a9bec8445.html" aria-label="Gina video" class="js-pop"></a>
    <div class="vid_container" data-hvp="0"><a href="/post/6ab1a9bec8445.html" class="js-pop"></a><div class="post_vid_thumb">
      <img class="mini_post_vid_thumb lazyload" data-src="//b2.trafficdeposit.com/pivi/0/11/img/9s7/0.webp">
      <video loop muted preload="none" class="hvp_player" src="//b2.trafficdeposit.com/pivi/0/11/vid/CEDR/vidthumb.mp4" style="display: none;"></video>
      <a href="/blog/Nympho/0.html?sc"><span class="post_el_small_subcat transition">Nympho</span></a>
      <span class="duration_small" style="border: 1px solid #6aaf4c" title="s11->c5">26:35</span>
      <span class="shd_small" title="bitrate:2158|">HD</span>
    </div></div>
    <div class="post_control"><a class="tdn post_time" href="/post/6ab1a9bec8445.html" title="Gina - Training My Nympho Stepsister #anal #asian {https://vidara.so/e/W668Pvchhd7H}"><div class="post_control_time"><span>21 hours ago</span><strong>·</strong> 20,374 views</div></a><span class="vid_like_blog_hl small_post_control">24</span><span class="tm_orgasmic_hl small_post_control">8</span><span class="tm_playlist_hl small_post_control">26</span> </div>
  </div>
</div>
<div id="center_control"><a href="/Anal.html?page=0&amp;sm=trending"><div class="ctrl_el ctrl_sel">1</div></a><a href="/Anal.html?page=30&amp;sm=trending"><div class="ctrl_el">2</div></a><a href="/Anal.html?page=56700&amp;sm=trending"><div class="ctrl_el">1890</div></a></div>
</body></html>`;

const DETAIL_HTML = `<html><body>
<div class="main_content">
  <span style="display:none" class="vidsnfo" data-vnfo='{"6ab1a9bec8445":"${STREAM_SOURCE}"}'></span>
  <div class="post_el_small post_el_post"><div class="post_el_wrap">
    <div class="pes_author_div pes_edit_div transition" data-aid="618afb5ec39a8"><a href="/blog/618afb5ec39a8/0.html" class="tdn"><span class="a_char">J</span><span class="a_name">AJ47</span></a></div>
    <div class="post_text" style=""><h1 style="font-size:16px;"> <b class="post_b_text_blog">New</b> <a class="ps_link tdn transition" data-subkey="Gina" href="/Gina.html">Gina</a> - Training My <b class="sub_cat_s" data-subkey="Nympho">Nympho </b>Stepsister <a class="hash_link tdn transition" label="anal" href="/anal.html?sm=trending">#anal</a> <b class="post_b_text_blog"><a href="https://vidara.so/e/W668Pvchhd7H" class="extlink_icon extlink">vidara.so</a></b></h1></div>
    <div id="vid_container_id" itemprop="video" itemscope="" itemtype="http://schema.org/VideoObject" class="vid_container" style="">
      <meta itemprop="name" content="New&#10;Gina - Training My Nympho Stepsister #anal " />
      <meta itemprop="thumbnailUrl" content="//b2.trafficdeposit.com/pivi/0/11/img/9s7/0.webp" />
      <meta itemprop="description" content="Free blog video: New&#10;Gina - Training My Nympho Stepsister #anal " />
      <meta itemprop="uploadDate" content="2026-09-21T22:03:42+00:00" />
      <meta itemprop="duration" content="PT26M35S" />
      <meta itemprop="contentUrl" content="https://sxyprn.com/post/6ab1a9bec8445" />
      <video id="player_el" class="player_el player_el_nc" data-postid="6ab1a9bec8445" data-mgfs="430369218" src="" poster="//b2.trafficdeposit.com/pivi/0/11/img/9s7/0.webp" controls=""></video>
      <div id="np_checker_wrap" style="height:20px;"></div>
    </div>
    <div class="mpc_div"><a class="tdn mpc_btn" href="https://myporn.club/t/ffiX96Is" target="_blank">TORRENT/MAGNET DOWNLOAD (410 Mb)</a></div>
    <div style="color:#B3B4B7;font-family:monospace;font-size:10px;">Video Info -&gt; duration:<b>26:35</b> · resolution:<b>HD</b>720 · bitrate:<b>2158</b> kb/s · size:<b>410</b> MB</div>
    <div class="post_control" data-orgasm="n" data-like="n" data-id="6ab1a9bec8445" data-postid="6ab1a9bec8445" data-aid="618afb5ec39a8"><a class="tdn post_time" href="/post/6ab1a9bec8445.html" title="{New} Gina - Training My Nympho Stepsister"><div class="post_control_time"><span>21 hours ago</span><strong>·</strong> 20610 views</div></a><span class="vid_emoji_blog small_post_control">4</span><span class="vid_like_blog small_post_control">24</span><span class="vid_orgasm_blog small_post_control">8</span><span class="vid_playlist_post vid_playlist_blog small_post_control">+</span><span class="comments_blog small_post_control" data-postid="6ab1a9bec8445">0</span></div>
  </div></div>
  <div class="post_el_small">
    <div class="pes_author_div transition"><a href="/blog/deadbeefdeadb/0.html" class="tdn"><span class="a_name">RELATED</span></a></div>
    <div class="post_text">RELATED CARD <a class="hash_link" label="leak" href="/leak.html?sm=trending">#leak</a></div>
    <div class="post_control"><a class="tdn post_time" href="/post/aaaaaaaaaaaaa.html" title="RELATED TITLE"><div class="post_control_time"><span>2 days ago</span><strong>·</strong> 999 views</div></a></div>
  </div>
</div>
</body></html>`;

type StubResponse = string | Error;

/** The same wall without the pager, so each section's own step applies. */
const WALL_HTML = `${LISTING_HTML.split('<div id="center_control">')[0]}</body></html>`;

const firstCard = (
  $: ReturnType<typeof load>,
  selector = 'div.post_el_small',
) => {
  const element = $(selector).get(0);

  if (!element) {
    throw new Error(`Expected ${selector}`);
  }

  return element;
};

/**
 * Fresh module graph with a stubbed transport. The shared throttle is armed at
 * the robots crawl-delay (10s), so `reset` is used between simulated requests
 * to drop the anchor and keep unit tests off the clock.
 */
const loadModules = async (
  responses: StubResponse | Record<string, StubResponse>,
) => {
  const calls: string[] = [];
  const gotScraping = vi.fn(async (options: { url: string }) => {
    calls.push(options.url);
    const body =
      typeof responses === 'string' || responses instanceof Error
        ? responses
        : responses[options.url];

    if (body instanceof Error) {
      throw body;
    }

    return { body: body ?? '', statusCode: 200, url: options.url };
  });

  vi.doMock('got-scraping', () => ({ gotScraping }));

  const base = await import('../../src/base.js');
  const videos = (await import('../../src/videos.js')).default;

  return {
    base,
    videos,
    calls,
    gotScraping,
    reset: () => {
      base.resetSharedThrottle();
    },
  };
};

describe('stream resolver', () => {
  it('resolves the captured doc example bit-for-bit', () => {
    expect(__private__.resolveStreamUrl(DOC_STREAM_SOURCE)).toBe(
      DOC_STREAM_URL,
    );
  });

  it('encodes the token with the main2.js alphabet (`=` becomes `.`)', () => {
    expect(__private__.encodeStreamToken(58, 71)).toBe(
      'NTgtc3h5cHJuLmNvbS03MQ..',
    );
    expect(__private__.digitalSum('w6o1n81a5f6b25deuch3p9jar84')).toBe(58);
    expect(__private__.digitalSum('9t6qawb516a59wb9ehcr8x4c4u5.vid')).toBe(71);
  });

  it('rejects malformed stream sources', () => {
    expect(() => __private__.resolveStreamUrl('/cdn/c5/x.vid')).toThrow(
      'Invalid stream source',
    );
    expect(() =>
      __private__.resolveStreamUrl('/cdn/c5/a/b/not-a-timestamp/c/d.vid'),
    ).toThrow('Invalid stream source');
    expect(() =>
      __private__.resolveStreamUrl('/cdn/c5/a/b/1790107219//d.vid'),
    ).toThrow('Invalid stream source');
  });
});

describe('card and detail parsing', () => {
  it('parses one card with every field', () => {
    const $ = load(LISTING_HTML);
    const card = __private__.parsePostCard($, firstCard($));

    expect(card).toEqual({
      videoId: '6ab1a9bec8445',
      url: 'https://sxyprn.com/post/6ab1a9bec8445.html',
      title:
        'Gina - Training My Nympho Stepsister #anal #asian {https://vidara.so/e/W668Pvchhd7H}',
      duration: '26:35',
      durationSeconds: 1_595,
      thumb: 'https://b2.trafficdeposit.com/pivi/0/11/img/9s7/0.webp',
      preview: 'https://b2.trafficdeposit.com/pivi/0/11/vid/CEDR/vidthumb.mp4',
      quality: 'HD',
      bitrate: 2_158,
      height: undefined,
      views: 20_374,
      likes: 24,
      orgasmic: 8,
      playlist: 26,
      relativeDate: '21 hours ago',
      author: {
        id: '618afb5ec39a8',
        name: 'AJ47',
        url: 'https://sxyprn.com/blog/618afb5ec39a8/0.html',
      },
      tags: ['anal', 'asian'],
      subcategory: 'Nympho',
      subcategoryUrl: 'https://sxyprn.com/blog/Nympho/0.html?sc',
      externalUrls: ['https://vidara.so/e/W668Pvchhd7H'],
      isExternal: true,
    });
  });

  it('falls back to the post links, text labels and `.post_text` title', () => {
    const $ = load(`
      <div class="post_el_small">
        <div class="post_text">Bare card <a class="hash_link" href="/x.html?sm=trending">#bare</a></div>
        <a href="/post/aaaaaaaaaaaaa" class="js-pop"></a>
      </div>
      <div class="post_el_small">
        <div class="pes_wl" data-postid="bbbbbbbbbbbbb"></div>
        <div class="pes_author_div"><a href="/blog/Nympho/0.html">Named Blog</a></div>
      </div>
    `);

    expect(__private__.parsePostCard($, firstCard($))).toMatchObject({
      videoId: 'aaaaaaaaaaaaa',
      url: 'https://sxyprn.com/post/aaaaaaaaaaaaa.html',
      title: 'Bare card #bare',
      duration: '',
      durationSeconds: 0,
      quality: '',
      bitrate: undefined,
      views: 0,
      likes: 0,
      orgasmic: 0,
      playlist: 0,
      relativeDate: '',
      tags: ['bare'],
      subcategory: undefined,
      subcategoryUrl: undefined,
      externalUrls: [],
      isExternal: false,
    });

    expect(
      __private__.parsePostCard($, $('div.post_el_small').get(1)),
    ).toMatchObject({
      videoId: 'bbbbbbbbbbbbb',
      title: '',
      author: {
        id: 'Nympho',
        name: 'Named Blog',
        url: 'https://sxyprn.com/blog/Nympho/0.html',
      },
    });
  });

  it('returns null for cards without a post reference', () => {
    const $ = load(
      '<div class="post_el_small"><div class="post_text">No link</div></div>',
    );

    expect(__private__.parsePostCard($, firstCard($))).toBeNull();
  });

  it('reads the stream source for the played post id', () => {
    expect(__private__.parseStreamSource(undefined, 'x')).toBe('');
    expect(__private__.parseStreamSource('{not json', 'x')).toBe('');
    expect(__private__.parseStreamSource('{"a":1}', 'x')).toBe('');
    expect(
      __private__.parseStreamSource(
        `{"6ab1a9bec8445":"${STREAM_SOURCE}"}`,
        '6ab1a9bec8445',
      ),
    ).toBe(STREAM_SOURCE);
    // Falls back to the only entry when the key does not match the player.
    expect(
      __private__.parseStreamSource(`{"other":"${STREAM_SOURCE}"}`, 'x'),
    ).toBe(STREAM_SOURCE);
  });

  it('parses the detail page from the main post container only', () => {
    const details = __private__.parseDetails(
      DETAIL_HTML,
      'https://sxyprn.com/post/6ab1a9bec8445.html',
    );

    expect(details).toMatchObject({
      videoId: '6ab1a9bec8445',
      url: 'https://sxyprn.com/post/6ab1a9bec8445.html',
      title: 'New Gina - Training My Nympho Stepsister #anal',
      duration: '26:35',
      durationSeconds: 1_595,
      thumb: 'https://b2.trafficdeposit.com/pivi/0/11/img/9s7/0.webp',
      preview: '',
      quality: 'HD',
      height: 720,
      bitrate: 2_158,
      views: 20_610,
      likes: 24,
      orgasmic: 8,
      playlist: 0,
      relativeDate: '21 hours ago',
      tags: ['anal'],
      subcategory: undefined,
      author: expect.objectContaining({ id: '618afb5ec39a8', name: 'AJ47' }),
      uploadDate: '2026-09-21T22:03:42+00:00',
      description:
        'Free blog video: New Gina - Training My Nympho Stepsister #anal',
      contentUrl: 'https://sxyprn.com/post/6ab1a9bec8445',
      sizeMb: 410,
      sizeBytes: 430_369_218,
      torrentUrl: 'https://myporn.club/t/ffiX96Is',
      comments: 0,
      streamSource: STREAM_SOURCE,
      streamUrl:
        'https://sxyprn.com/cdn8/NTQtc3h5cHJuLmNvbS01Mw../c5/01b4w3jz42j0e2yzm1f0m9azv522s/ZwmoTmDYOUsrOpg_VDb-8w/1790109047/3r641d8yalfvbl5te7cz3x9nae8/vr61adbl11an90bmemc6884s4e5.vid',
    });
  });

  it('keeps the related wall and its counters out of the details', () => {
    const details = __private__.parseDetails(
      DETAIL_HTML,
      'https://sxyprn.com/post/6ab1a9bec8445.html',
    );

    expect(details.views).toBe(20_610);
    expect(details.tags).not.toContain('leak');
    expect(details.author.name).toBe('AJ47');
    expect(details.title).not.toContain('RELATED');
  });

  it('falls back when the detail page ships no video info or badge', () => {
    const details = __private__.parseDetails(
      `<div class="main_content">
        <div class="post_el_small post_el_post">
          <div class="pes_author_div"><a href="/blog/618afb5ec39a8/0.html"><span class="a_name">AJ47</span></a></div>
          <div class="post_text">No info card</div>
          <div class="vid_container"><video id="player_el" data-postid="ccccccccccccc" poster="//b1.trafficdeposit.com/0.webp"></video></div>
          <div class="mpc_div"><a class="mpc_btn" href="https://myporn.club/t/x">TORRENT/MAGNET DOWNLOAD (12 Mb)</a></div>
          <span class="shd_small" title="bitrate:900|height:480|">SD</span>
          <span class="duration_small">1:02:03</span>
          <div class="post_control"><a class="post_time" href="/post/ccccccccccccc.html" title="Fallback"><div class="post_control_time"><span>2 days ago</span><strong>·</strong> 12 views</div></a></div>
        </div>
      </div>`,
      'https://sxyprn.com/post/ccccccccccccc.html',
    );

    expect(details).toMatchObject({
      videoId: 'ccccccccccccc',
      title: 'Fallback',
      duration: '1:02:03',
      durationSeconds: 3_723,
      quality: 'SD',
      height: 480,
      bitrate: 900,
      thumb: 'https://b1.trafficdeposit.com/0.webp',
      sizeMb: 12,
      sizeBytes: undefined,
      comments: undefined,
      torrentUrl: 'https://myporn.club/t/x',
      views: 12,
      uploadDate: '',
      description: '',
      contentUrl: '',
      streamSource: '',
      streamUrl: '',
    });
  });

  it('takes the video id from the url when the player omits it', () => {
    const details = __private__.parseDetails(
      `<div class="main_content"><div class="post_el_small post_el_post">
        <div class="post_text">URL id</div>
        <a class="js-pop" href="/post/eeeeeeeeeeeee.html"></a>
        <video id="player_el" poster="//b1.trafficdeposit.com/0.webp"></video>
      </div></div>`,
      'https://sxyprn.com/post/ddddddddddddd.html',
    );

    // The requested url identifies the post; the card link cannot override it.
    expect(details.videoId).toBe('ddddddddddddd');
    expect(details.url).toBe('https://sxyprn.com/post/ddddddddddddd.html');
  });

  it('rejects pages without a main post container or card', () => {
    expect(() =>
      __private__.parseDetails(
        '<div class="post_el_small"><a class="js-pop" href="/post/aaaaaaaaaaaaa.html"></a></div>',
        'https://sxyprn.com/post/aaaaaaaaaaaaa.html',
      ),
    ).toThrow('Missing main post container');

    expect(() =>
      __private__.parseDetails(
        '<div class="post_el_small post_el_post"><div class="post_text">no ids</div></div>',
        'https://sxyprn.com/',
      ),
    ).toThrow('Missing main post card');
  });
});

describe('listing helpers', () => {
  it('parses ids out of hrefs', () => {
    expect(__private__.parsePostId('/post/6ab1a9bec8445.html')).toBe(
      '6ab1a9bec8445',
    );
    expect(
      __private__.parsePostId('https://sxyprn.com/post/6ab1a9bec8445'),
    ).toBe('6ab1a9bec8445');
    expect(__private__.parsePostId('/blog/618afb5ec39a8/0.html')).toBe('');
    expect(__private__.parsePostId(undefined)).toBe('');
    expect(__private__.parseBlogId('/blog/618afb5ec39a8/0.html')).toBe(
      '618afb5ec39a8',
    );
    expect(__private__.parseBlogId('/blog/Nympho/0.html?sc')).toBe('Nympho');
    expect(__private__.parseBlogId(undefined)).toBe('');
  });

  it('parses pager offsets from query and path shapes', () => {
    expect(__private__.parseOffset('/Anal.html?page=30&sm=trending')).toBe(30);
    expect(__private__.parseOffset('/New.html?page=94830')).toBe(94_830);
    expect(__private__.parseOffset('/orgasm/9930')).toBe(9_930);
    expect(__private__.parseOffset('/popular/top-pop.html/17670')).toBe(17_670);
    expect(__private__.parseOffset('/blog/618afb5ec39a8/20.html')).toBe(20);
    expect(__private__.parseOffset('/blog/Nympho/0.html?sc')).toBe(0);
    expect(__private__.parseOffset('/anal.html?sm=trending')).toBeNull();
    expect(__private__.parseOffset('')).toBeNull();
    expect(__private__.parseOffset(undefined)).toBeNull();
  });

  it('collects the pager offsets', () => {
    const $ = load(LISTING_HTML);

    expect(__private__.parsePagerOffsets($)).toEqual([0, 30, 56_700]);
  });

  it('parses durations, counts and quality hints', () => {
    expect(__private__.parseDurationSeconds('26:35')).toBe(1_595);
    expect(__private__.parseDurationSeconds('1:02:03')).toBe(3_723);
    expect(__private__.parseDurationSeconds('PT26M35S')).toBe(1_595);
    expect(__private__.parseDurationSeconds('PT1H')).toBe(3_600);
    expect(__private__.parseDurationSeconds('457')).toBe(457);
    expect(__private__.parseDurationSeconds(457)).toBe(457);
    expect(__private__.parseDurationSeconds(Number.NaN)).toBe(0);
    expect(__private__.parseDurationSeconds('')).toBe(0);
    expect(__private__.parseDurationSeconds('nonsense')).toBe(0);
    expect(__private__.formatDuration(0)).toBe('');
    expect(__private__.formatDuration(1_595)).toBe('26:35');
    expect(__private__.formatDuration(3_723)).toBe('1:02:03');
    expect(__private__.parseCount('20,374 views')).toBe(20_374);
    expect(__private__.parseCount('+')).toBe(0);
    expect(__private__.parseCount(undefined)).toBe(0);
    expect(__private__.parseOptionalNumber('410')).toBe(410);
    expect(__private__.parseOptionalNumber(undefined)).toBeUndefined();
    expect(__private__.parseBitrate('bitrate:2158|')).toBe(2_158);
    expect(__private__.parseBitrate('bitrate:671|height:480|')).toBe(671);
    expect(__private__.parseBitrate(undefined)).toBeUndefined();
  });

  it('normalizes text, urls and unique lists', () => {
    expect(__private__.normalizeText('  a \n b ')).toBe('a b');
    expect(__private__.normalizeText(undefined)).toBe('');
    expect(__private__.uniqueStrings(['a', ' a ', '', undefined])).toEqual([
      'a',
    ]);
    expect(__private__.firstNonEmpty('', undefined, 'b')).toBe('b');
    expect(__private__.firstNonEmpty('', undefined)).toBe('');
    expect(__private__.absoluteUrl(undefined)).toBe('');
    expect(__private__.absoluteUrl('//b2.trafficdeposit.com/a.webp')).toBe(
      'https://b2.trafficdeposit.com/a.webp',
    );
    expect(__private__.absoluteUrl('/css/converting.png')).toBe(
      'https://sxyprn.com/css/converting.png',
    );
    expect(
      __private__.absoluteUrl('https://b2.trafficdeposit.com/a.webp'),
    ).toBe('https://b2.trafficdeposit.com/a.webp');
  });

  it('builds every listing path', () => {
    expect(__private__.homePath(0)).toBe('/');
    expect(__private__.homePath(30)).toBe('/?page=30');
    expect(__private__.newPath(0)).toBe('/new.html');
    expect(__private__.newPath(30)).toBe('/new.html?page=30');
    expect(__private__.tagPath('anal', 0, 'trending')).toBe(
      '/anal.html?sm=trending',
    );
    expect(__private__.tagPath('anal', 30, 'orgasmic')).toBe(
      '/anal.html?page=30&sm=orgasmic',
    );
    expect(__private__.searchPath('gina', 0)).toBe('/gina.html');
    expect(__private__.searchPath('gina', 600)).toBe('/gina.html?page=600');
    expect(__private__.blogPath('618afb5ec39a8', 0, false)).toBe(
      '/blog/618afb5ec39a8/0.html',
    );
    expect(__private__.blogPath('Nympho', 20, true)).toBe(
      '/blog/Nympho/20.html?sc',
    );
    expect(__private__.withQuery('/x', { page: undefined, sm: '' })).toBe('/x');
  });

  it('validates user input', () => {
    expect(() => __private__.assertOffset(-1)).toThrow('Invalid page: -1');
    expect(() => __private__.assertOffset(1.5)).toThrow('Invalid page: 1.5');
    expect(() => __private__.assertOffset(0)).not.toThrow();
    expect(() => __private__.assertName('  ', 'tag')).toThrow('Invalid tag');
    expect(() => __private__.assertName('anal', 'tag')).not.toThrow();
    expect(() => __private__.assertVideoUrl('')).toThrow('Invalid url');
    expect(() =>
      __private__.assertVideoUrl('http://sxyprn.com/post/x.html'),
    ).toThrow('Invalid url');
    expect(() =>
      __private__.assertVideoUrl('https://evil.com/post/x.html'),
    ).toThrow('Invalid url');
    expect(() =>
      __private__.assertVideoUrl('https://sxyprn.com/post/6ab1a9bec8445.html'),
    ).not.toThrow();
  });

  it('builds a list result with pagination helpers', async () => {
    const targets: number[] = [];
    const reload = async (target: number) => {
      targets.push(target);

      return { pagination: { page: target } } as unknown as VideoListResult;
    };
    const result = __private__.buildListResult(0, LISTING_HTML, 30, reload);

    expect(result.videos).toHaveLength(1);
    expect(result.videos[0].videoId).toBe('6ab1a9bec8445');
    expect(result.pagination).toEqual({
      page: 0,
      pages: [0, 30, 56_700],
      step: 30,
    });
    expect(result.hasNext()).toBe(true);
    expect(result.hasPrevious()).toBe(false);

    await result.refresh();
    await result.next();
    await result.previous();

    expect(targets).toEqual([0, 30, 0]);

    const lastPage = __private__.buildListResult(
      56_700,
      LISTING_HTML,
      30,
      reload,
    );

    expect(lastPage.hasNext()).toBe(false);
    expect(lastPage.hasPrevious()).toBe(true);
  });

  it('infers the step from the pager and falls back to the section step', () => {
    const reload = async (target: number) =>
      ({ pagination: { page: target } }) as unknown as VideoListResult;
    const blogHtml = `<div class="main_content"><div class="post_el_small"><a class="js-pop" href="/post/aaaaaaaaaaaaa.html"></a></div></div>
      <div id="center_control"><a href="/blog/618afb5ec39a8/0.html"></a><a href="/blog/618afb5ec39a8/20.html"></a><a href="/blog/618afb5ec39a8/8760.html"></a></div>`;
    const blog = __private__.buildListResult(0, blogHtml, 30, reload);

    // The pager's own first gap (20) wins over the section constant (30).
    expect(blog.pagination.step).toBe(20);
    expect(blog.pagination.pages).toEqual([0, 20, 8_760]);

    const single = __private__.buildListResult(
      0,
      '<div class="main_content"><div class="post_el_small"><a class="js-pop" href="/post/aaaaaaaaaaaaa.html"></a></div></div>',
      30,
      reload,
    );

    expect(single.pagination.pages).toEqual([0]);
    expect(single.pagination.step).toBe(30);
    expect(single.hasNext()).toBe(false);
  });

  it('skips the detail main container and unparseable cards in listings', () => {
    const result = __private__.buildListResult(
      0,
      `<div class="main_content">
        <div class="post_el_small post_el_post"><div class="post_control"><a class="post_time" href="/post/aaaaaaaaaaaaa.html"></a></div></div>
        <div class="post_el_small"><div class="post_text">no ids</div></div>
      </div>`,
      30,
      async () => {
        throw new Error('unused');
      },
    );

    expect(result.videos).toEqual([]);
    expect(result.pagination.pages).toEqual([0]);
  });

  it('falls back to the whole document when there is no main content', () => {
    const result = __private__.buildListResult(
      0,
      '<div class="post_el_small"><a class="js-pop" href="/post/aaaaaaaaaaaaa.html"></a></div>',
      30,
      async () => {
        throw new Error('unused');
      },
    );

    expect(result.videos).toHaveLength(1);
  });
});

describe('videos api', () => {
  it('loads the home wall', async () => {
    const { videos, calls } = await loadModules(LISTING_HTML);
    const result = await videos.home();

    expect(calls).toEqual(['https://sxyprn.com/']);
    expect(result.videos).toHaveLength(1);
    expect(result.videos[0].title).toBe(
      'Gina - Training My Nympho Stepsister #anal #asian {https://vidara.so/e/W668Pvchhd7H}',
    );
  });

  it('requests every listing url shape', async () => {
    const { videos, calls, reset } = await loadModules(LISTING_HTML);
    const expectations: Array<[() => Promise<unknown>, string]> = [
      [() => videos.home({ page: 30 }), 'https://sxyprn.com/?page=30'],
      [() => videos.new({ page: 30 }), 'https://sxyprn.com/new.html?page=30'],
      [
        () => videos.tag('anal', { page: 30, sm: 'orgasmic' }),
        'https://sxyprn.com/anal.html?page=30&sm=orgasmic',
      ],
      [() => videos.tag('anal'), 'https://sxyprn.com/anal.html?sm=trending'],
      [
        () => videos.search('gina', { page: 0 }),
        'https://sxyprn.com/gina.html',
      ],
      [
        () => videos.blog('618afb5ec39a8', { page: 20, subcategory: true }),
        'https://sxyprn.com/blog/618afb5ec39a8/20.html?sc',
      ],
      [
        () => videos.topPopular({ page: 30 }),
        'https://sxyprn.com/popular/top-pop.html/30',
      ],
      [
        () => videos.topViewed({ page: 0 }),
        'https://sxyprn.com/popular/top-viewed.html/0',
      ],
      [() => videos.orgasmic({ page: 90 }), 'https://sxyprn.com/orgasm/90'],
    ];

    for (const [load, url] of expectations) {
      reset();
      await load();
      expect(calls.at(-1)).toBe(url);
    }
  });

  it('navigates the pagination helpers', async () => {
    const { videos, calls, reset } = await loadModules(LISTING_HTML);
    const first = await videos.tag('anal');

    reset();
    await first.next();
    expect(calls.at(-1)).toBe(
      'https://sxyprn.com/anal.html?page=30&sm=trending',
    );

    reset();
    await first.previous();
    expect(calls.at(-1)).toBe('https://sxyprn.com/anal.html?sm=trending');

    reset();
    await first.refresh();
    expect(calls.at(-1)).toBe('https://sxyprn.com/anal.html?sm=trending');
  });

  it('navigates every listing through its own reload closure', async () => {
    const { videos, calls, reset } = await loadModules(WALL_HTML);
    const cases: Array<{
      load: (api: typeof videos) => Promise<VideoListResult>;
      url: string;
      next: string;
    }> = [
      { load: (api) => api.home(), url: '/', next: '/?page=30' },
      { load: (api) => api.new(), url: '/new.html', next: '/new.html?page=30' },
      {
        load: (api) => api.tag('anal'),
        url: '/anal.html?sm=trending',
        next: '/anal.html?page=30&sm=trending',
      },
      {
        load: (api) => api.search('gina'),
        url: '/gina.html',
        next: '/gina.html?page=30',
      },
      {
        load: (api) => api.blog('618afb5ec39a8'),
        url: '/blog/618afb5ec39a8/0.html',
        next: '/blog/618afb5ec39a8/20.html',
      },
      {
        load: (api) => api.topPopular(),
        url: '/popular/top-pop.html/0',
        next: '/popular/top-pop.html/30',
      },
      {
        load: (api) => api.topViewed(),
        url: '/popular/top-viewed.html/0',
        next: '/popular/top-viewed.html/30',
      },
      {
        load: (api) => api.orgasmic(),
        url: '/orgasm/0',
        next: '/orgasm/30',
      },
    ];

    for (const { load, url, next } of cases) {
      reset();
      const first = await load(videos);
      expect(calls.at(-1)).toBe(`https://sxyprn.com${url}`);

      reset();
      await first.refresh();
      expect(calls.at(-1)).toBe(`https://sxyprn.com${url}`);

      reset();
      await first.next();
      expect(calls.at(-1)).toBe(`https://sxyprn.com${next}`);

      reset();
      await first.previous();
      // Offset 0 is the floor: previous() clamps to the first page.
      expect(calls.at(-1)).toBe(`https://sxyprn.com${url}`);
    }
  });

  it('rejects invalid input before any request', async () => {
    const { videos, calls } = await loadModules(LISTING_HTML);

    await expect(videos.new({ page: -1 })).rejects.toThrow('Invalid page: -1');
    await expect(videos.tag('')).rejects.toThrow('Invalid tag');
    await expect(videos.search('   ')).rejects.toThrow('Invalid keyword');
    await expect(videos.blog('')).rejects.toThrow('Invalid author');
    await expect(videos.details()).rejects.toThrow('Invalid url');
    await expect(
      videos.details({ url: 'https://evil.com/post/x.html' }),
    ).rejects.toThrow('Invalid url');
    expect(calls).toEqual([]);
  });

  it('propagates transport failures', async () => {
    const { videos } = await loadModules(new Error('boom'));

    await expect(videos.new()).rejects.toThrow('boom');
  });

  it('loads post details through the shared request', async () => {
    const { videos, calls } = await loadModules(DETAIL_HTML);
    const details = await videos.details({
      url: 'https://sxyprn.com/post/6ab1a9bec8445.html',
    });

    expect(calls).toEqual(['https://sxyprn.com/post/6ab1a9bec8445.html']);
    expect(details).toMatchObject({
      videoId: '6ab1a9bec8445',
      title: 'New Gina - Training My Nympho Stepsister #anal',
      streamUrl:
        'https://sxyprn.com/cdn8/NTQtc3h5cHJuLmNvbS01Mw../c5/01b4w3jz42j0e2yzm1f0m9azv522s/ZwmoTmDYOUsrOpg_VDb-8w/1790109047/3r641d8yalfvbl5te7cz3x9nae8/vr61adbl11an90bmemc6884s4e5.vid',
    });
  });

  it('maps by url when several responses are stubbed', async () => {
    const { videos } = await loadModules({
      'https://sxyprn.com/?page=30': LISTING_HTML,
      'https://sxyprn.com/post/6ab1a9bec8445.html': DETAIL_HTML,
    });

    const wall = await videos.home({ page: 30 });

    expect(wall.pagination.page).toBe(30);
    expect(wall.videos).toHaveLength(1);
  });
});
