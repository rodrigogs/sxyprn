# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-22

### Added

- Project scaffold (TypeScript, ESM+CJS dual package, Vitest, Biome) following the
  `pornhub` / `xvideos` family conventions.
- Site structure map for sxyprn.com (`docs/site-structure.md`), verified live 2026-09-22,
  including the `data-vnfo` stream-URL deobfuscation algorithm and its validation
  against a real request (HTTP 206, `video/mp4`).
- `src/base.ts`: `got-scraping` transport, 3 attempts with exponential backoff and full
  jitter, proxy support, and a module-level throttle whose slot is reserved
  synchronously before any await. The interval is a floor: it starts at the robots.txt
  `Crawl-delay` (10s) and the largest requested value wins.
- Listings, all parsed by the single `parsePostCard`: `videos.home`, `videos.new`,
  `videos.tag(tag, { sm })`, `videos.search(keyword)`, `videos.blog(author, { subcategory })`,
  `videos.topPopular`, `videos.topViewed`, `videos.orgasmic`. Offset pagination
  (`?page=` verbatim, zero-based, step 30, 20 for blogs) with `refresh` / `next` /
  `previous` / `hasNext` / `hasPrevious`, and the step inferred from the page's own pager.
- `videos.details({ url })` for `/post/<hex13>.html`: schema.org microdata (name,
  description, thumbnailUrl, uploadDate, duration, contentUrl), the `Video Info` line
  (duration, resolution, bitrate, size), `data-mgfs` byte size, myporn.club torrent link,
  comment count, tags from `hash_links` — every selector scoped to the main post
  container (`div.post_el_small.post_el_post`) so the related wall cannot leak in.
- Stream resolver: port of `getvsrc()` from `main2.js`, pinned bit-for-bit by the
  captured example in `docs/site-structure.md` and validated live (302 → HTTP 206,
  `video/mp4`, `Content-Range: bytes 0-1023/430369218`, `ftyp isom`).
- `__private__` test helpers for parser/loader internals (family convention), 100%
  unit coverage gate, unit tests that never touch the network, and live integration
  tests that respect the throttle.

### Fixed

- `scripts/refresh-fixtures.sh` matched post ids with `{12}` hex chars, so it silently
  skipped the blog and post detail fixtures. Post and blog ids are 13 hex chars.

### Changed

- `docs/site-structure.md` corrections found while implementing: post ids are hex13;
  the `duration_small` border colour is not a quality signal (the `shd_small` badge is,
  and it also renders `SD`); blog listings use a 20-offset step and the detail-style
  counter classes; the pager is path-style for `/orgasm`, `/popular/*` and `/blog/*`;
  `div.next_page` carries no href; the home wall ignores `?page=`; the stream example's
  digit sums are 58 and 71 (not 55 and 54).

[0.1.0]: https://github.com/rodrigogs/sxyprn/releases/tag/v0.1.0
