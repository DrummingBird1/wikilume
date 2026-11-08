# Backlog

Open work, known risks and decisions waiting for the owner. Update this file when you finish or discover something.

## Before a release
- [ ] **Try it on real Wikipedia** (never done: the mock site is hand-written). Check at least:
  - a long English article with many templates (infobox, navboxes, hatnotes, references, math)
  - a Hebrew article (RTL layout, TOC on the right, Hebrew UI)
  - a disambiguation page, a redirect (`#contentSub` note), a very short stub (no TOC)
  - a logged-in session with a non-default skin (Vector legacy, Timeless, Monobook) and Wikipedia's own dark mode
  - dark theme on colourful tables (election results, sports tables), and print preview
  - hover cards for links and citations while Wikipedia's own page previews are enabled
  - lightbox on thumbnails, galleries and the infobox image; timeline on an article with many dates
  - search with extra languages ticked
- [ ] Test the package in **Edge** (same zip should work) and **Firefox** (`dist/…-firefox.zip`; the add-on id is a placeholder).
- [ ] The CI workflow in `.github/workflows/ci.yml` has never run (no remote yet).

## Decisions waiting for the owner
- **License:** none chosen. Without one, nobody else may reuse the code. Wikipedia text stays CC BY-SA 4.0 regardless.
- **Hosting:** the repository has no remote. Sharing it with other people or agents needs a remote (or a `git bundle`).
  Creating a remote and pushing needs the owner's explicit approval.
- **Store release:** needs a developer account and store screenshots. Check each store's branding policy for names containing
  "Wikipedia" before choosing the listing name.

## Known limitations
- Summary does not work for Hebrew (Chrome's model writes en/es/ja only) and needs desktop Chrome with on-device AI.
- Timeline is a heuristic: it misses events and sometimes reads a quantity as a year (e.g. "1500 soldiers").
- Mobile (`m.wikipedia.org`) and non-Wikipedia Wikimedia sites are excluded on purpose.
- Bookmarks do not sync between devices (export/import only); `chrome.storage.sync` quotas are too small.
- Import of bookmarks is only in the in-page popover (a file picker closes the toolbar popup).

## Ideas
- "Ask about this article" and suggested questions via Chrome's Prompt API (same language limits) or an optional user-supplied API key.
- Timeline from Wikidata dates instead of text heuristics.
- Reading history / "continue reading", reading lists with folders.
- Keyboard shortcuts for bookmark and theme; a command to toggle the reader.
- More summary languages when Chrome adds them.
