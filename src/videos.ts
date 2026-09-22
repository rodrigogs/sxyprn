import { type Cheerio, type CheerioAPI, load } from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import base from './base.js';
import type {
  BlogOptions,
  DetailsInput,
  PostAuthor,
  SearchOptions,
  TagOptions,
  VideoDetails,
  VideoListOptions,
  VideoListResult,
  VideoSummary,
} from './types/videos.js';

export type {
  BlogOptions,
  DetailsInput,
  Pagination,
  PostAuthor,
  SearchOptions,
  TagOptions,
  TagSort,
  VideoDetails,
  VideoListOptions,
  VideoListResult,
  VideoSummary,
} from './types/videos.js';

const request = base.createRequest();

/** Offset step of every listing except blogs (verified 2026-09-22). */
const DEFAULT_LISTING_STEP = 30;
/** Blog listings render 20 cards per offset step. */
const BLOG_LISTING_STEP = 20;
/** The `data-vnfo` token embeds the SITE host, not the CDN host. */
const STREAM_HOST = new URL(base.BASE_URL).hostname;

/** Post ids in URLs are 13 hex chars (`/post/<hex13>.html`). */
const POST_ID_PATTERN = /\/post\/([0-9a-f]{13})(?:\.html)?/i;
/** Blog ids in URLs are 13 hex chars too; named blogs use a slug instead. */
const BLOG_ID_PATTERN = /\/blog\/([^/?#]+)/i;
const VIEWS_PATTERN = /([\d,]+)\s*views/i;
const VIDEO_INFO_PATTERN = /^Video Info/i;
const DURATION_PATTERN = /duration:(\d{1,2}:\d{2}(?::\d{2})?)/;
const RESOLUTION_PATTERN = /resolution:([A-Za-z]+)(\d+)?/;
const BITRATE_PATTERN = /bitrate:(\d+)/;
const HEIGHT_PATTERN = /height:(\d+)/;
const SIZE_PATTERN = /size:(\d+)/;
const TORRENT_SIZE_PATTERN = /\((\d+)\s*Mb\)/i;

const normalizeText = (value: string | null | undefined): string => {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
};

const uniqueStrings = (values: Array<string | null | undefined>): string[] => {
  return Array.from(
    new Set(values.map((value) => normalizeText(value)).filter(Boolean)),
  );
};

/** First non-empty candidate, `''` when every candidate is empty. */
const firstNonEmpty = (...values: Array<string | undefined>): string => {
  return values.find((value) => Boolean(value)) ?? '';
};

/** Counts render as plain integers, occasionally comma-grouped. */
const parseCount = (value: string | undefined): number => {
  const digits = normalizeText(value).replace(/[^\d]/g, '');

  return digits ? Number.parseInt(digits, 10) : 0;
};

const parseOptionalNumber = (value: string | undefined): number | undefined => {
  return value ? Number.parseInt(value, 10) : undefined;
};

const parseDurationSeconds = (value: string | number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const normalized = normalizeText(String(value));

  if (!normalized) {
    return 0;
  }

  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10);
  }

  if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(normalized)) {
    const parts = normalized
      .split(':')
      .map((part) => Number.parseInt(part, 10));

    return parts.reduce((total, part) => total * 60 + part, 0);
  }

  const iso = normalized.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);

  if (!iso) {
    return 0;
  }

  const hours = Number.parseInt(iso[1] || '0', 10);
  const minutes = Number.parseInt(iso[2] || '0', 10);
  const seconds = Number.parseInt(iso[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
};

const formatDuration = (durationSeconds: number): string => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return '';
  }

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
};

const parsePostId = (value: string | undefined): string => {
  return normalizeText(value?.match(POST_ID_PATTERN)?.[1]);
};

const parseBlogId = (value: string | undefined): string => {
  return normalizeText(value?.match(BLOG_ID_PATTERN)?.[1]);
};

/** `shd_small[title]` is `bitrate:<kbps>|<quality-tier>` (optionally `height:<n>|`). */
const parseBitrate = (value: string | undefined): number | undefined => {
  const match = normalizeText(value).match(BITRATE_PATTERN);

  return match ? Number.parseInt(match[1], 10) : undefined;
};

/** Media hosts are served protocol-relative (`//b2.trafficdeposit.com/...`). */
const absoluteUrl = (value: string | undefined): string => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('//')) {
    return `https:${normalized}`;
  }

  return base.resolveUrl(normalized);
};

const digitalSum = (value: string): number => {
  let total = 0;

  for (const character of value) {
    if (character >= '0' && character <= '9') {
      total += Number(character);
    }
  }

  return total;
};

/**
 * `boo(ss, es)` of main2.js: base64 of `<ss>-<host>-<es>` with the URL-safe
 * alphabet main2.js uses — note `=` maps to `.`, NOT to the standard padding
 * (or `-`/`_` for `+`/`/`, which match).
 */
const encodeStreamToken = (ss: number, es: number): string => {
  return Buffer.from(`${ss}-${STREAM_HOST}-${es}`)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '.');
};

/**
 * Port of `getvsrc()` from main2.js, verified against the live CDN
 * (HTTP 206, `video/mp4`, size matches `data-mgfs`). The obfuscated path is
 * `/cdn/<bucket>/<a>/<b>/<timestamp>/<c>/<d>.vid`:
 *  - segment 1 gains `8/<base64 token of both digit sums>`
 *  - segment 5 loses the sum of both digit sums (an expiring timestamp)
 */
const resolveStreamUrl = (source: string): string => {
  const segments = source.split('/');
  const timestamp = segments[5];

  if (
    segments.length !== 8 ||
    segments.slice(1).some((segment) => !segment) ||
    !/^\d+$/.test(timestamp)
  ) {
    throw new Error(`Invalid stream source: ${source}`);
  }

  const ss = digitalSum(segments[6]);
  const es = digitalSum(segments[7]);

  segments[1] = `${segments[1]}8/${encodeStreamToken(ss, es)}`;
  segments[5] = String(Number(timestamp) - (ss + es));

  return `${base.BASE_URL}${segments.join('/')}`;
};

/**
 * `span.vidsnfo[data-vnfo]` holds `{"<postid>":"<obfuscated path>"}`.
 */
const parseStreamSource = (
  raw: string | undefined,
  videoId: string,
): string => {
  if (!raw) {
    return '';
  }

  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return '';
  }

  const entries = Object.entries(parsed).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );
  const entry = entries.find(([key]) => key === videoId) ?? entries[0];

  return entry?.[1] ?? '';
};

/**
 * The pager is `#center_control a[href]` (never content), and the offset is
 * either a `?page=` query (`/Anal.html?page=30&sm=trending`, `/New.html?page=30`)
 * or a trailing path segment (`/orgasm/30`, `/popular/top-pop.html/30`,
 * `/blog/<id>/20.html`).
 */
const parseOffset = (href: string | undefined): number | null => {
  const normalized = normalizeText(href);

  if (!normalized) {
    return null;
  }

  const query = normalized.match(/[?&]page=(\d+)/);

  if (query) {
    return Number.parseInt(query[1], 10);
  }

  const path = normalized.match(/\/(\d+)(?:\.html)?(?:[?#].*)?$/);

  return path ? Number.parseInt(path[1], 10) : null;
};

const parsePagerOffsets = ($: CheerioAPI): number[] => {
  return $('#center_control a')
    .map((_, element) => parseOffset($(element).attr('href')))
    .get()
    .filter((offset): offset is number => offset !== null);
};

const uniqueSortedOffsets = (offsets: number[], current: number): number[] => {
  return Array.from(new Set([...offsets, current])).sort(
    (left, right) => left - right,
  );
};

/**
 * Cards live in `div.main_content` (home/new/tag/blog/search all ship one) and
 * the detail page keeps its main post in the same wrapper, so prefer the
 * scoped query and fall back to the whole document for snippets without it.
 */
const collectCards = ($: CheerioAPI): Cheerio<Element> => {
  const scoped = $('div.main_content div.post_el_small');

  return scoped.length > 0 ? scoped : $('div.post_el_small');
};

/**
 * The single card parser: every wall (home/new/tag/top/orgasmic/blog/search)
 * and the main post of a detail page render `div.post_el_small`.
 */
const parsePostCard = (
  $: CheerioAPI,
  element: AnyNode,
): VideoSummary | null => {
  const $card = $(element);
  const $time = $card.find('.post_control a.post_time').first();
  const videoId =
    parsePostId($time.attr('href')) ||
    parsePostId($card.find('a.js-pop[href*="/post/"]').first().attr('href')) ||
    normalizeText($card.find('.pes_wl').attr('data-postid'));

  if (!videoId) {
    return null;
  }

  const $author = $card.find('.pes_author_div a[href*="/blog/"]').first();
  const authorUrl = $author.attr('href') ?? '';
  const author: PostAuthor = {
    id: parseBlogId(authorUrl),
    name:
      normalizeText($author.find('.a_name').text()) ||
      normalizeText($author.text()),
    url: base.resolveUrl(authorUrl),
  };
  const $thumb = $card.find('img.mini_post_vid_thumb').first();
  const $badge = $card.find('span.shd_small').first();
  const $subcategory = $card.find('span.post_el_small_subcat').first();
  const subcategoryUrl = $subcategory.closest('a').attr('href');
  const externalUrls = uniqueStrings(
    $card
      .find('a.extlink')
      .map((_, link) => $(link).attr('href'))
      .get(),
  );
  const duration = normalizeText(
    $card.find('span.duration_small').first().text(),
  );

  return {
    videoId,
    url: base.resolveUrl(`/post/${videoId}.html`),
    title:
      normalizeText($time.attr('title')) ||
      normalizeText($card.find('.post_text').first().text()),
    duration,
    durationSeconds: parseDurationSeconds(duration),
    thumb: absoluteUrl($thumb.attr('data-src') ?? $thumb.attr('src')),
    preview: absoluteUrl($card.find('video.hvp_player').first().attr('src')),
    quality: normalizeText($badge.text()),
    bitrate: parseBitrate($badge.attr('title')),
    height: parseOptionalNumber(
      normalizeText($badge.attr('title')).match(HEIGHT_PATTERN)?.[1],
    ),
    views: parseCount(
      normalizeText($card.find('.post_control').first().text()).match(
        VIEWS_PATTERN,
      )?.[1],
    ),
    likes: parseCount(
      $card.find('.vid_like_blog_hl, .vid_like_blog').first().text(),
    ),
    orgasmic: parseCount(
      $card.find('.tm_orgasmic_hl, .vid_orgasm_blog').first().text(),
    ),
    playlist: parseCount(
      $card
        .find('.tm_playlist_hl, .vid_playlist_blog, .vid_playlist_post')
        .first()
        .text(),
    ),
    relativeDate: normalizeText(
      $card.find('.post_control_time span').first().text(),
    ),
    author,
    tags: uniqueStrings(
      $card
        .find('a.hash_link')
        .map(
          (_, link) =>
            $(link).attr('label') ?? $(link).text().replace(/^#/, ''),
        )
        .get(),
    ),
    subcategory: normalizeText($subcategory.text()) || undefined,
    subcategoryUrl: subcategoryUrl
      ? base.resolveUrl(subcategoryUrl)
      : undefined,
    externalUrls,
    isExternal: externalUrls.length > 0,
  };
};

const buildListResult = (
  offset: number,
  html: string,
  step: number,
  reload: (target: number) => Promise<VideoListResult>,
): VideoListResult => {
  const $ = load(html);
  const videos = collectCards($)
    .not('.post_el_post')
    .map((_, element) => parsePostCard($, element))
    .get()
    .filter((video): video is VideoSummary => video !== null);
  const pages = uniqueSortedOffsets(parsePagerOffsets($), offset);
  // The pager's own first gap is the authoritative step (30 everywhere, 20 on
  // blogs), so a layout change is picked up from the page instead of a table.
  const resolvedStep = pages.length > 1 ? pages[1] - pages[0] : step;
  const lastOffset = pages[pages.length - 1];

  return {
    videos,
    pagination: {
      page: offset,
      pages,
      step: resolvedStep,
    },
    refresh: () => reload(offset),
    hasNext: () => offset + resolvedStep <= lastOffset,
    next: () => reload(offset + resolvedStep),
    hasPrevious: () => offset > 0,
    previous: () => reload(Math.max(0, offset - resolvedStep)),
  };
};

const parseDetails = (html: string, url: string): VideoDetails => {
  const $ = load(html);
  const $main = $('div.post_el_small.post_el_post').first();
  const node = $main.get(0);

  if (!node) {
    throw new Error('Missing main post container');
  }

  const summary = parsePostCard($, node);

  if (!summary) {
    throw new Error('Missing main post card');
  }

  const $player = $main.find('video#player_el').first();
  const videoId = firstNonEmpty(
    $player.attr('data-postid'),
    parsePostId(url),
    summary.videoId,
  );
  const microdata = (property: string): string =>
    normalizeText(
      $main.find(`meta[itemprop="${property}"]`).first().attr('content'),
    );
  const videoInfo = normalizeText(
    $main
      .find('div')
      .filter((_, element) => VIDEO_INFO_PATTERN.test($(element).text().trim()))
      .first()
      .text(),
  );
  const resolution = videoInfo.match(RESOLUTION_PATTERN);
  const duration = firstNonEmpty(
    videoInfo.match(DURATION_PATTERN)?.[1],
    formatDuration(parseDurationSeconds(microdata('duration'))),
    summary.duration,
  );
  const $torrent = $main.find('a.mpc_btn').first();
  const $comments = $main.find('.comments_blog').first();
  const streamSource = parseStreamSource(
    $main
      .closest('div.main_content')
      .find('span.vidsnfo')
      .first()
      .attr('data-vnfo'),
    videoId,
  );

  return {
    ...summary,
    videoId,
    url,
    title: firstNonEmpty(microdata('name'), summary.title),
    duration,
    durationSeconds: parseDurationSeconds(duration),
    thumb: firstNonEmpty(
      absoluteUrl($player.attr('poster')),
      absoluteUrl(microdata('thumbnailUrl')),
      summary.thumb,
    ),
    quality: firstNonEmpty(resolution?.[1], summary.quality),
    bitrate:
      parseOptionalNumber(videoInfo.match(BITRATE_PATTERN)?.[1]) ??
      summary.bitrate,
    height: parseOptionalNumber(resolution?.[2]) ?? summary.height,
    sizeMb:
      parseOptionalNumber(videoInfo.match(SIZE_PATTERN)?.[1]) ??
      parseOptionalNumber($torrent.text().match(TORRENT_SIZE_PATTERN)?.[1]),
    sizeBytes: parseOptionalNumber($player.attr('data-mgfs')),
    torrentUrl: normalizeText($torrent.attr('href')) || undefined,
    comments: $comments.length > 0 ? parseCount($comments.text()) : undefined,
    uploadDate: microdata('uploadDate'),
    description: microdata('description'),
    contentUrl: microdata('contentUrl'),
    streamSource,
    streamUrl: streamSource ? resolveStreamUrl(streamSource) : '',
  };
};

const assertOffset = (offset: number): void => {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error(`Invalid page: ${offset}`);
  }
};

const assertName = (value: string, label: string): void => {
  if (!normalizeText(value)) {
    throw new Error(`Invalid ${label}`);
  }
};

const assertVideoUrl = (url: string): void => {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid url');
  }

  if (
    parsed.protocol !== 'https:' ||
    !/(?:^|\.)sxyprn\.com$/i.test(parsed.hostname)
  ) {
    throw new Error('Invalid url');
  }
};

const pageParam = (offset: number): number | undefined => {
  return offset > 0 ? offset : undefined;
};

const withQuery = (
  path: string,
  params: Record<string, string | number | undefined>,
): string => {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }

  const builtQuery = query.toString();

  return builtQuery ? `${path}?${builtQuery}` : path;
};

const homePath = (offset: number): string =>
  withQuery('/', { page: pageParam(offset) });

const newPath = (offset: number): string =>
  withQuery('/new.html', { page: pageParam(offset) });

const tagPath = (tag: string, offset: number, sm: string): string =>
  withQuery(`/${tag}.html`, { page: pageParam(offset), sm });

const searchPath = (keyword: string, offset: number): string =>
  withQuery(`/${keyword}.html`, { page: pageParam(offset) });

const blogPath = (
  author: string,
  offset: number,
  subcategory: boolean,
): string => {
  const path = `/blog/${author}/${offset}.html`;

  return subcategory ? `${path}?sc` : path;
};

const loadListing = async (
  path: string,
  offset: number,
  step: number,
  reload: (target: number) => Promise<VideoListResult>,
): Promise<VideoListResult> => {
  const response = await request.get(path);

  return buildListResult(offset, response.data, step, reload);
};

/**
 * The home wall is not offset paginated: `/?page=30` returns the very same
 * cards as `/` and the page ships no `#center_control` (verified 2026-09-22),
 * so `hasNext()` is always false for it.
 */
const home = async ({
  page = 0,
}: VideoListOptions = {}): Promise<VideoListResult> => {
  assertOffset(page);

  return loadListing(homePath(page), page, DEFAULT_LISTING_STEP, (target) =>
    home({ page: target }),
  );
};

const newest = async ({
  page = 0,
}: VideoListOptions = {}): Promise<VideoListResult> => {
  assertOffset(page);

  return loadListing(newPath(page), page, DEFAULT_LISTING_STEP, (target) =>
    newest({ page: target }),
  );
};

const tag = async (
  tagName: string,
  { page = 0, sm = 'trending' }: TagOptions = {},
): Promise<VideoListResult> => {
  assertName(tagName, 'tag');
  assertOffset(page);

  return loadListing(
    tagPath(tagName, page, sm),
    page,
    DEFAULT_LISTING_STEP,
    (target) => tag(tagName, { page: target, sm }),
  );
};

const search = async (
  keyword: string,
  { page = 0 }: SearchOptions = {},
): Promise<VideoListResult> => {
  assertName(keyword, 'keyword');
  assertOffset(page);

  return loadListing(
    searchPath(keyword, page),
    page,
    DEFAULT_LISTING_STEP,
    (target) => search(keyword, { page: target }),
  );
};

const blog = async (
  author: string,
  { page = 0, subcategory = false }: BlogOptions = {},
): Promise<VideoListResult> => {
  assertName(author, 'author');
  assertOffset(page);

  return loadListing(
    blogPath(author, page, subcategory),
    page,
    BLOG_LISTING_STEP,
    (target) => blog(author, { page: target, subcategory }),
  );
};

const topPopular = async ({
  page = 0,
}: VideoListOptions = {}): Promise<VideoListResult> => {
  assertOffset(page);

  return loadListing(
    `/popular/top-pop.html/${page}`,
    page,
    DEFAULT_LISTING_STEP,
    (target) => topPopular({ page: target }),
  );
};

const topViewed = async ({
  page = 0,
}: VideoListOptions = {}): Promise<VideoListResult> => {
  assertOffset(page);

  return loadListing(
    `/popular/top-viewed.html/${page}`,
    page,
    DEFAULT_LISTING_STEP,
    (target) => topViewed({ page: target }),
  );
};

const orgasmic = async ({
  page = 0,
}: VideoListOptions = {}): Promise<VideoListResult> => {
  assertOffset(page);

  return loadListing(`/orgasm/${page}`, page, DEFAULT_LISTING_STEP, (target) =>
    orgasmic({ page: target }),
  );
};

const details = async (
  { url = '' }: DetailsInput = { url: '' },
): Promise<VideoDetails> => {
  assertVideoUrl(url);

  const response = await request.get(url);

  return parseDetails(response.data, url);
};

const videos = {
  blog,
  details,
  home,
  new: newest,
  orgasmic,
  search,
  tag,
  topPopular,
  topViewed,
};

/** @internal */
export const __private__ = {
  absoluteUrl,
  assertName,
  assertOffset,
  assertVideoUrl,
  blogPath,
  buildListResult,
  collectCards,
  digitalSum,
  encodeStreamToken,
  firstNonEmpty,
  formatDuration,
  homePath,
  newPath,
  normalizeText,
  parseBitrate,
  parseBlogId,
  parseCount,
  parseDetails,
  parseDurationSeconds,
  parseOffset,
  parseOptionalNumber,
  parsePagerOffsets,
  parsePostCard,
  parsePostId,
  parseStreamSource,
  resolveStreamUrl,
  searchPath,
  tagPath,
  uniqueStrings,
  withQuery,
};

export default videos;
