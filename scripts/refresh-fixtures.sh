#!/usr/bin/env bash
# Refresh the real-HTML fixtures under test/fixtures/.
#
# Run after sxyprn.com changes its layout (the fixture tests fail first, then
# you regenerate with this script and commit). Every request is spaced by
# SLEEP seconds because robots.txt declares `Crawl-delay: 10`.
#
#   ./scripts/refresh-fixtures.sh          # default 10s between requests
#   SLEEP=0 ./scripts/refresh-fixtures.sh  # smoke the script itself
set -euo pipefail

cd "$(dirname "$0")/.."

UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
FIXTURES="test/fixtures"
SLEEP="${SLEEP:-10}"
mkdir -p "$FIXTURES"

fetch() {
  local name="$1" url="$2"

  curl -s -L -A "$UA" "$url" -o "$FIXTURES/$name"
  echo "$name: $(wc -c <"$FIXTURES/$name") bytes"

  if [ "$SLEEP" != "0" ]; then
    sleep "$SLEEP"
  fi
}

fetch listing-home.html "https://sxyprn.com/"
fetch listing-new.html "https://sxyprn.com/new.html"
fetch listing-tag.html "https://sxyprn.com/anal.html?sm=trending"
fetch listing-top-popular.html "https://sxyprn.com/popular/top-pop.html"
fetch listing-orgasmic.html "https://sxyprn.com/orgasm"

# A keyword search IS a tag page on this site (`/<key>.html`).
fetch listing-search.html "https://sxyprn.com/gina.html"

# Post and blog ids are 13 hex chars (the ids in the URL table of
# docs/site-structure.md are hex13 too — a `{12}` quantifier silently
# matches nothing and skips the two derived fetches below).
# `grep -m1` (not `grep | head -1`) so SIGPIPE can never abort the script.
BLOG_ID="$(grep -oE '/blog/[0-9a-f]{13}/0\.html' "$FIXTURES/listing-home.html" | grep -m1 -oE '[0-9a-f]{13}' || true)"

if [ -n "$BLOG_ID" ]; then
  fetch listing-blog.html "https://sxyprn.com/blog/$BLOG_ID/0.html"
else
  echo "WARNING: could not extract a blog id from the home listing; listing-blog.html not refreshed"
fi

POST_ID="$(grep -oE '/post/[0-9a-f]{13}\.html' "$FIXTURES/listing-home.html" | grep -m1 -oE '[0-9a-f]{13}' || true)"

if [ -n "$POST_ID" ]; then
  fetch video-detail.html "https://sxyprn.com/post/$POST_ID.html"
else
  echo "WARNING: could not extract a post id from the home listing; video-detail.html not refreshed"
fi

echo "Done. Run: npm run test:unit"
