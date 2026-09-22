/**
 * sxyprn.com publishes every wall card as a `div.post_el_small`, so one parser
 * (`parsePostCard`) feeds home/new/tag/top/orgasmic/blog/search listings and
 * the main post of a detail page alike.
 */
export type PostAuthor = {
  /** Blog id (13 hex chars) or the named-blog slug. */
  id: string;
  name: string;
  url: string;
};

export type VideoSummary = {
  /** 13 hex chars, e.g. `6ab1a9bec8445`. */
  videoId: string;
  url: string;
  /** Card/detail text, tags included (the `post_time[title]` attribute). */
  title: string;
  /** `M:SS` / `MM:SS` as rendered. */
  duration: string;
  durationSeconds: number;
  /** Poster (`.webp`), absolute. */
  thumb: string;
  /** Hover-preview mp4, absolute. Empty when the card ships no preview. */
  preview: string;
  /** `HD`/`SD` from the `shd_small` badge (the border colour is not a quality signal). */
  quality: string;
  /** From the `shd_small` badge title (`bitrate:2158|`). */
  bitrate?: number;
  /** From the `shd_small` badge title (`height:480|`), when published. */
  height?: number;
  views: number;
  likes: number;
  orgasmic: number;
  playlist: number;
  /** Relative label as rendered: `21 hours ago`, `Yesterday`, ... */
  relativeDate: string;
  author: PostAuthor;
  /** `a.hash_link` labels, deduplicated in document order. */
  tags: string[];
  subcategory?: string;
  subcategoryUrl?: string;
  /** `a.extlink` targets — non-empty means the post is an embed, not an upload. */
  externalUrls: string[];
  isExternal: boolean;
};

/**
 * Offset-based pagination. `page` is the RAW `?page=` value of the site
 * (zero-based offset, step 30 — 20 for blogs), passed through verbatim:
 * page 1 is `page: 0`, page 2 is `page: 30`.
 */
export type Pagination = {
  page: number;
  pages: number[];
  step: number;
};

export type VideoListResult = {
  videos: VideoSummary[];
  pagination: Pagination;
  refresh: () => Promise<VideoListResult>;
  hasNext: () => boolean;
  next: () => Promise<VideoListResult>;
  hasPrevious: () => boolean;
  previous: () => Promise<VideoListResult>;
};

export type VideoListOptions = {
  page?: number;
};

/**
 * Tag pages carry the sort mode in `sm`; only these two values exist on the
 * site (`?sm=trending` is what the tag cloud links to).
 */
export type TagSort = 'trending' | 'orgasmic';

export type TagOptions = VideoListOptions & {
  sm?: TagSort;
};

export type SearchOptions = VideoListOptions;

export type BlogOptions = VideoListOptions & {
  /** `?sc` — the subcategory view of a blog (`/blog/<Slug>/0.html?sc`). */
  subcategory?: boolean;
};

export type DetailsInput = {
  url: string;
};

export type VideoDetails = VideoSummary & {
  /** Schema.org `uploadDate`, ISO 8601 with offset. */
  uploadDate: string;
  description: string;
  /** Schema.org `contentUrl` (the post URL, as published). */
  contentUrl: string;
  /** Obfuscated `data-vnfo` path, verbatim. */
  streamSource: string;
  /** Deobfuscated, expiring same-origin stream URL. Empty when absent. */
  streamUrl: string;
  /** `size:<n> MB` from the Video Info line. */
  sizeMb?: number;
  /** `data-mgfs` on `#player_el` — exact byte size. */
  sizeBytes?: number;
  /** `TORRENT/MAGNET DOWNLOAD` target (myporn.club). */
  torrentUrl?: string;
  comments?: number;
};
