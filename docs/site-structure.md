# sxyprn.com — Site Structure Map

Verified live on **2026-09-22** with a desktop Chrome UA from a residential IP.
Everything below was probed with real requests; page sizes and counts are from
that day. robots.txt declares `User-agent: * / Crawl-delay: 10` — keep the
library's default request interval at **>= 10s** unless the user overrides it.

## Identity

- Title: `SexyPorn - Free Porn Site`. Brands itself "SxyPrn" / "YPS" / "SexyPorn".
- Microblog-style "Porn Wall": the feed is a list of **posts**, each post embeds
  ONE video (or an image gallery, or an external embed).
- No region gates, no datacenter-IP blocking observed, no Cloudflare challenge.
  Plain HTTP 200 with a desktop UA; ~210–450 KB pages.

## URL space

| Section | URL | Notes |
|---|---|---|
| Home / wall | `/` | tag cloud + wall of `post_el_small` cards |
| New | `/new.html` | "New - 94854 videos", `?sm=latest` implied |
| Hot | `/hot.html` | 24h hot wall |
| Tag page | `/<Tag>.html` | e.g. `/anal.html` — **case-insensitive** (`/Anal.html` = `/anal.html`) |
| Tag sorting | `?sm=trending` \| `?sm=orgasmic` | only two values observed |
| Tag pagination | `?page=N` | **OFFSET, step 30, zero-based.** Page 2 = `?page=30`. Home pager: plain `?page=N`; tag pager keeps current `sm` |
| Popular | `/popular/top-pop.html` | "Top content by hand during the last week [Page 1]" |
| Most viewed | `/popular/top-viewed.html` | |
| Orgasmic feed | `/orgasm` | no `.html` suffix |
| Popular searches | `/searches/0.html` | keyword cloud, no video cards |
| Blog (author) | `/blog/<hex13>/0.html` | hex id, e.g. `/blog/618afb5ec39a8/0.html` |
| Blog (named) | `/blog/<Slug>/0.html` | e.g. `/blog/Nympho/0.html?sc` (`?sc` = subcategory view) |
| Post (video) | `/post/<hex13>.html` | hex id, e.g. `/post/6ab1a9bec8445.html`; bare `/post/<hex13>` also serves (microdata contentUrl). Post ids and blog ids are both **13** hex chars. |
| Search | `/<key>.html` | `search(key)` in `main2.js` navigates to `/<key>.html` — a keyword search IS a tag page (e.g. `/gina.html` → "Gina - 623 videos", same card markup). Titles end in `(latest)` vs `(trending)` by current `sm`. |
| Live search (suggest) | `POST /php/livesearch.php` | |
| Community | `/community/0.html` | |
| Watch later | `/watchlater` | requires login |

### User/session features (login-gated, out of scope for v0)

`/php/login.php`, `/php/logout.php`, watchlater, subscriptions
(`/php/mysubs_append.php`), comments (`/php/comment_*.php`), likes
(`/php/likes.php`), uploads (`/blog/vid_loader*.php`), donate. Only the public
endpoints are in the library's scope.

## Listing card anatomy (`div.post_el_small`)

Every wall/listing card carries:

- `.pes_author_div a` → author `/blog/<hex13>/0.html`, display name in `.a_name`
  (star icons = reputation).
- `.pes_wl` → watch-later button, `data-postid`.
- `.post_text` → free-form text with inline tag links `a.hash_link[label]` →
  `/tag.html?sm=...` and `<b class="sub_cat_s" data-subkey>` subcategory link
  `/blog/<SubCat>/0.html?sc`; external embed links `a.extlink` (streamcash.to,
  vidara.so, lulustream...) when the post is an embed, not an upload.
- `a.js-pop[href="/post/<hex12>.html"]` → the post link (also the canonical
  video URL).
- `.vid_container[data-hvp]` with:
  - `img.mini_post_vid_thumb.lazyload[data-src]` → poster (`.webp`),
    `onerror` fallback `/css/converting.png`.
  - `video.hvp_player[src]` → hover-preview mp4 (`vidthumb.mp4`), hidden until
    hover, `display:none`.
  - `span.duration_small` → `M:SS`/`MM:SS` duration text; inline style border
    color `#6aaf4c` on **every** card — it does NOT encode the quality bucket
    (SD cards carry it too), `title="s<server>->c<chunk>"`.
  - `span.shd_small` → `HD` **or `SD`** badge, monospace `#ef9639`,
    `title="bitrate:<kbps>|<quality-tier>"`, sometimes
    `title="bitrate:671|height:480|"` (the height is published only for some
    cards). Cards without the badge expose no quality at all.
  - `span.post_el_small_subcat` → subcategory chip.
  - `.emoji_zone[data-emoji]` → reaction counters (JSON `[{"i":<id>,"v":<count>}]`).
- `.post_control` → `a.post_time[href="/post/<hex13>.html"]` with
  `<span>` relative date ("Yesterday", "3 days ago") + `<strong>·</strong> <N> views`,
  `.vid_like_blog_hl` like count, `.tm_orgasmic_hl` "orgasmic" count,
  `.tm_playlist_hl` playlist count.
- **Counter classes differ per wall**: home/new/tag/search/top/orgasmic cards use
  the `*_hl` classes above, while blog listings and the detail page use
  `.vid_like_blog`, `.vid_orgasm_blog`, `.vid_playlist_blog`, `.comments_blog`
  (and `.vid_playlist_post` on the detail page, whose text is `+`). A card
  parser has to query both families.

## Pagination

- Numeric pager at `#center_control`: `a.ctrl_el` blocks, page 1 = `?page=0`,
  page N = `?page=(N-1)*30`. **Offset-based, 30 cards per page, zero-based.**
- The pager link shape depends on the section (verified 2026-09-22):
  - query-style: `/New.html?page=30`, `/Anal.html?page=30&sm=trending`,
    `/Gina.html?page=30`
  - path-style: `/orgasm/30`, `/popular/top-pop.html/30`,
    `/popular/top-viewed.html/30`, `/blog/<id-or-slug>/20.html` (blogs step **20**,
    not 30)
- The pager lists the first five offsets plus the last one, so the step has to be
  read from the pager itself (or from the pager's last entry for `hasNext`).
- `div.next_page` = "Next Page >" **without an href** (a span inside), so it is
  only a presence hint — the pager is the source of truth.
- **The home wall is not paginated**: `/` ships no `#center_control`, and
  `/?page=30` returns byte-identical content to `/` (verified twice on
  2026-09-22). Only `/new.html` and the tag/search/orgasmic/popular/blog pages
  move through offsets.
- "Page N" also appears in `<title>` for popular/orgasmic pages; tag pages put
  the total in the title: "Anal - 56717 videos on SexyPorn".

## Post detail page (`/post/<hex13>.html`)

- The whole post lives in `div.post_el_small.post_el_post` (the related wall
  below renders `div.post_el_small` **without** `post_el_post`) — scope every
  detail selector to it.
- `<span class="vidsnfo" data-vnfo='{"<pid>":"<obfuscated path>"}'>` — the
  stream source (see below). It is a **sibling** of the main post container
  (both are children of `div.main_content`).
- `<video id="player_el" data-postid data-mgfs src poster>` — `src` is EMPTY in
  HTML; `getvsrc()` in `main2.js` fills it client-side. `data-mgfs` is the exact
  byte size.
- Schema.org microdata (VideoObject) on `#vid_container_id`: `name`,
  `description`, `thumbnailUrl`, `uploadDate` (ISO 8601 with offset),
  `duration` (ISO 8601 `PT26M35S`), `contentUrl` (the post URL; the JS rewrites
  it to the resolved stream).
- `div.mpc_div a.mpc_btn` → "TORRENT/MAGNET DOWNLOAD (<size> Mb)" → myporn.club link.
- `Video Info -> duration:<MM:SS> · resolution:<HD|SD><n> · bitrate:<n> kb/s · size:<n> MB`
  as plain text in a class-less `div` (the `<b>` wrappers around each value are
  inline, so `text()` reads the whole line).
- `.post_control[data-orgasm][data-like][data-id][data-postid][data-aid]` — like
  / orgasmic counters, author id. On this page the counters are
  `.vid_like_blog`, `.vid_orgasm_blog`, `.vid_playlist_post` (text `+`) and
  `.comments_blog` (a real comment count, not lazy-loaded).
- Author box `/blog/<hex13>/0.html`; comments load lazily via
  `POST /php/comment_load.php`.
- Related wall below: the same `post_el_small` cards (a parser must scope to
  the main post container, NOT walk all cards). The wall can repeat the very
  post being viewed (observed: twice), so dedupe by `videoId` if that matters.

## Stream URL deobfuscation (VERIFIED)

`main2.js` (`getvsrc()`):

```js
var vidsnfo = $('.vidsnfo').data('vnfo');   // { "<postid>": "/cdn/c5/..." }
tmp = src.split("/");
tmp[1] += "8/" + boo(ssut51(tmp[6]), ssut51(tmp[7]));
preda(tmp);                                  // tmp[5] -= ssut51(tmp[6]) + ssut51(tmp[7])
url = "https://sxyprn.com" + tmp.join("/")
```

Helpers:

```js
ssut51(s) = sum of decimal digits in s
boo(ss, es) = base64("<ss>-<host>-<es>")
              .replace('+','-').replace('/','_').replace('=','.')
```

Note the alphabet: `=` becomes `.` (NOT the standard base64url padding), and the
`<host>` inside the token is the site host (`sxyprn.com`), not the CDN bucket.

Example (post 6ab1a9bec8445, 2026-09-22):

```
data-vnfo: /cdn/c5/a1g4136zb2w0u25z1140t9rzn5d2i/sP_RCBW3GdHtIYgbP0iCBA/1790107219/w6o1n81a5f6b25deuch3p9jar84/9t6qawb516a59wb9ehcr8x4c4u5.vid
resolved:  https://sxyprn.com/cdn8/NTgtc3h5cHJuLmNvbS03MQ../c5/a1g4136zb2w0u25z1140t9rzn5d2i/sP_RCBW3GdHtIYgbP0iCBA/1790107090/w6o1n81a5f6b25deuch3p9jar84/9t6qawb516a59wb9ehcr8x4c4u5.vid
```

The digit sums of the last two segments are **58** (`tmp[6]`) and **71**
(`tmp[7]`), so `tmp[5] = 1790107219 - (58 + 71) = 1790107090`, and
`base64("58-sxyprn.com-71") = "NTgtc3h5cHJuLmNvbS03MQ=="` → `=` → `.` gives the
`NTgtc3h5cHJuLmNvbS03MQ..` hop in the resolved URL. (An earlier revision of this
doc claimed `55 + 54`; that was a typo and the segment sums above are what the
live CDN validates.)

Validation result: `HTTP 206`, `Content-Type: video/mp4`,
`Content-Range: bytes 0-1023/430369218` (size matches `data-mgfs="430369218"`),
body starts with `ftyp isom`. No Referer was sent and it still worked.

## Media hosts

- `b1|b2|b3.trafficdeposit.com` — posters (`/pivi/.../img/.../0.webp`) and
  hover previews (`/pivi/.../vid/.../vidthumb.mp4`). Served protocol-relative;
  prepend `https:`.
- Streams are proxied through **sxyprn.com itself** (`/cdn8/<token>/...`) —
  same-origin, expiring (timestamp segment), no Referer required (verified).
- Blog avatars: `*.trafficdeposit.com/blog/img/...`.

## Tag taxonomy

The tag cloud on the home page (hundreds of tags, all `/<Tag>.html?sm=trending`):
`Hardcore`, `Anal`, `BigTits`, `Blowjob`, `Creampie`, `Casting`, `Roleplay`,
`Milf`, `Deepthroat`, `Interracial`, `POV`, `Cowgirl`, `Onlyfans`, `Black`,
`Teen`, `Latin`, `BBC`, `Artporn`, `DAP`, `trans`, ... Slugs may mix case
(`/Anal.html` and `/anal.html` are the same page); canonical form appears
lowercase in hash links. There is no flat A-Z category index page — the cloud
IS the navigation, plus `/searches/0.html` for popular search keywords.

## Parser guidance

- One card parser (`parsePostCard`) feeds home/new/tag/top/orgasmic/blog/search
  listings alike — they all render `post_el_small`.
- Never parse `#center_control` as content; it is the pager.
- Filter out `a.extlink` posts from video-only flows, or model them as embeds
  with a `externalUrl` field (the site itself distinguishes uploads vs embeds).
  Both kinds can still expose a stream, so `extlink` alone is not a reason to
  skip the detail page.
- `duration` text is `M:SS` / `MM:SS` — convert to seconds for the API.
- Titles carry inline hashtag links; use the card's `post_time[title]`
  attribute or the detail page's microdata `name` for the clean title.
- Comment counts are NOT in the listing markup — detail page only.

## CI expectation

sxyprn.com serves plain 200s to datacenter IPs (verified from this box; GitHub
Actions runners should be fine — same situation as xvideos, opposite of
pornhub). Integration tests can run unconditionally, but respect the
`Crawl-delay: 10` in any loop.
