# sxyprn

sxyprn.com api implementation. Node.js/TypeScript library — sibling of
[`pornhub`](https://github.com/rodrigogs/pornhub) and
[`@rodrigogs/xvideos`](https://github.com/rodrigogs/xvideos).

The site map that drives the parsers lives in
[docs/site-structure.md](docs/site-structure.md) (verified live 2026-09-22).

## Install

```sh
npm install sxyprn
```

## Usage

```js
import sxyprn from 'sxyprn';

const wall = await sxyprn.videos.home();

wall.videos[0].videoId; // '6ab1a9bec8445'
wall.videos[0].title;
wall.videos[0].durationSeconds;

const second = await wall.next(); // ?page=30 (offset, not page index)

const details = await sxyprn.videos.details({ url: wall.videos[0].url });

details.streamUrl; // https://sxyprn.com/cdn8/<token>/c5/.../<timestamp>/.../...vid
details.sizeBytes; // data-mgfs, exact byte size
details.tags;
```

### Listings

```js
await sxyprn.videos.home(); // the wall (single page: no pager on the site)
await sxyprn.videos.new({ page: 30 });
await sxyprn.videos.tag('anal', { sm: 'trending' }); // or sm: 'orgasmic'
await sxyprn.videos.search('gina');
await sxyprn.videos.blog('618afb5ec39a8'); // hex id or a named blog slug
await sxyprn.videos.blog('Nympho', { subcategory: true }); // /blog/Nympho/0.html?sc
await sxyprn.videos.topPopular();
await sxyprn.videos.topViewed();
await sxyprn.videos.orgasmic();
```

Every listing returns `{ videos, pagination, refresh, hasNext, next, hasPrevious, previous }`
and is parsed by the same card parser, so `VideoSummary` is identical across
walls (blog cards and the detail page use different counter classes; the parser
handles both).

### Pagination

`page` is the raw `?page=` **offset**, zero-based, step 30 (20 for blogs) —
page 1 is `page: 0`, page 2 is `page: 30`. It is passed through verbatim, and
the step reported in `pagination.step` is read from the page's own pager, so a
layout change is picked up without a hardcoded table.

```js
const first = await sxyprn.videos.tag('anal');
first.pagination; // { page: 0, pages: [0, 30, 60, 90, 120, 56700], step: 30 }
first.hasNext(); // true
const second = await first.next();
```

### Politeness

robots.txt declares `Crawl-delay: 10`, so a module-level throttle keeps request
starts at least 10s apart **across every client in the process**. The interval
can only be raised, never lowered:

```js
sxyprn.configure({
  minRequestIntervalMs: 30_000,
  proxyUrl: 'http://user:pass@proxy.example:8080',
});
```

Transient network failures are retried up to 3 attempts with exponential
backoff and full jitter.

### Public api

| Property | Description |
|---|---|
| `videos.home(options?)` | `div.post_el_small` wall of `/` |
| `videos.new(options?)` | `/new.html` |
| `videos.tag(tag, options?)` | `/<tag>.html` (`sm`: `trending` \| `orgasmic`) |
| `videos.search(keyword, options?)` | `/<keyword>.html` (a search IS a tag page) |
| `videos.blog(author, options?)` | `/blog/<author>/<offset>.html` (`subcategory` adds `?sc`) |
| `videos.topPopular(options?)` | `/popular/top-pop.html/<offset>` |
| `videos.topViewed(options?)` | `/popular/top-viewed.html/<offset>` |
| `videos.orgasmic(options?)` | `/orgasm/<offset>` |
| `videos.details({ url })` | `/post/<hex13>.html` |
| `configure(config)` | Shared throttle floor and proxy |

`VideoSummary`: `videoId`, `url`, `title`, `duration`, `durationSeconds`,
`thumb`, `preview`, `quality`, `bitrate?`, `height?`, `views`, `likes`,
`orgasmic`, `playlist`, `relativeDate`, `author`, `tags`, `subcategory?`,
`subcategoryUrl?`, `externalUrls`, `isExternal`.

`VideoDetails` adds: `uploadDate`, `description`, `contentUrl`, `streamSource`,
`streamUrl`, `sizeMb?`, `sizeBytes?`, `torrentUrl?`, `comments?`. `streamUrl` is
the deobfuscated, same-origin, expiring URL (it 302-redirects to the CDN and
answers `206 video/mp4` to a range request).

## Development

```sh
npm install --legacy-peer-deps  # npm 10 arborist bug on some boxes
npm run test:unit               # offline, pinned by test/fixtures
npm run test:integration        # live, respects the 10s throttle
npm run coverage                # 100% gate on the unit project
npm run build && npm run lint
```

Fixtures under `test/fixtures/` are real pages; refresh them with
`./scripts/refresh-fixtures.sh` (10s between requests) and re-pin
`test/unit/fixtures.test.ts`.

## License

BSD-3-Clause
