# Backlog

Open work, known risks and decisions waiting for the owner. Update this file when you finish or discover something.

## Before a release
- [x] **Store assets prepared** (see `store/PUBLISHING.md`): screenshots, promo tiles, EN/HE listing text, privacy policy and project site in `site/`. Site is live at drummingbird1.github.io/wikilume. Still open: `[[CONTACT_URL]]` / `[[STORE_URL]]` placeholders (license: MIT, done). `npm run check-store` lists what blocks submission.
- [x] **Branded Google Chrome 157 ignores `--load-extension`** (its log says "--load-extension is not allowed in Google Chrome"), so the extension never loaded there. Use Chrome for Testing (`CHROME_PATH=<...>/chrome-win64/chrome.exe`, e.g. from `~/.cache/puppeteer/chrome`). With it the extension runs on real articles (en, he, fr, ja, ar, Special:Random, Special:Search) with no script errors; Main Page and Talk pages are intentionally left alone. Still worth one look in the owner's normal Chrome.
- [x] **Real Wikipedia, via a local test proxy** (done once, in an agent browser pane that serves real pages with the extension
  scripts injected; not a real installed extension). Checked on en/he/ar/ja articles, stubs, disambiguation, redirects, math,
  galleries, wide sports tables, Vector 2022 / legacy / Timeless / Monobook / Minerva skins, hover cards, lightbox, search in
  other languages, bookmarks popup import/export, kill switch, UI language switch, RTL. It found and fixed: wide class-less
  tables widening the page, modern `<figure typeof="mw:File/Thumb">` thumbnails staying white in dark mode, `#fragment` links
  landing slightly low (wrong TOC highlight), reading time for Japanese/Chinese, English dates in a Hebrew UI, timeline
  sentence splitting after initials and in Japanese.
- [ ] **Still to do by hand in a real Chrome with the extension installed:** scroll behaviour with real frames (the agent pane
  does not paint, so scroll-spy and smooth scrolling were only checked with a shim), print preview, logged-in sessions,
  Wikipedia's own dark mode combined with the dark theme, and whether Wikipedia's own page previews ever appear next to ours.
- [ ] Original checklist for that manual pass:
  - a long English article with many templates (infobox, navboxes, hatnotes, references, math)
  - a Hebrew article (RTL layout, TOC on the right, Hebrew UI)
  - a disambiguation page, a redirect (`#contentSub` note), a very short stub (no TOC)
  - a logged-in session with a non-default skin (Vector legacy, Timeless, Monobook) and Wikipedia's own dark mode
  - dark theme on colourful tables (election results, sports tables), and print preview
  - hover cards for links and citations while Wikipedia's own page previews are enabled
  - lightbox on thumbnails, galleries and the infobox image; timeline on an article with many dates
  - search with extra languages ticked
- [ ] Test the package in **Edge** (same zip should work) and **Firefox** (`dist/…-firefox.zip`; the add-on id is a placeholder).
  `npm run e2e` with `CHROME_PATH` pointing at headless Edge currently fails: the summary check never settles and a bookmark
  saved in one tab disappears once a second tab opens (Chrome passes). Unknown whether this is headless-Edge/harness-only or a
  real storage problem, so try bookmarks in a normal Edge window first.
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
