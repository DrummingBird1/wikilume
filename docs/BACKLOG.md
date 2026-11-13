# Backlog

Open work, known risks and decisions waiting for the owner. Update this file when you finish or discover something.

## Before a release
- [x] **Store assets prepared** (see `store/PUBLISHING.md`): screenshots, promo tiles, EN/HE listing text, privacy policy and project site in `site/`. Site is live at drummingbird1.github.io/wikilume. Published in the Chrome Web Store on 2026-11-10; the site links to the listing (license: MIT).
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
- [ ] The CI workflow in `.github/workflows/ci.yml` has no run yet (pushes did not trigger it); it now also has `workflow_dispatch`,
  so `gh workflow run ci.yml --ref <branch>` starts it. Confirm it is green once.
- [ ] Install the published listing from the Web Store in a normal Chrome and open one article.
- [ ] Hebrew store listing in the dashboard (text in `store/listing.he.md`).
- [ ] Trademark registry search for "WikiLume" (USPTO, EUIPO, Israel Patent Office); see `store/NAME-CHECK.md`.
- [ ] Flaky e2e checks under Chrome for Testing (summary, `storage.sync` language persistence, second-tab bookmark).

## Decided
- **License:** MIT (`LICENSE`), holder DrummingBird1. Wikipedia text stays CC BY-SA 4.0.
- **Hosting:** public repository https://github.com/DrummingBird1/wikilume, site on GitHub Pages.
- **Store release:** published 2026-11-10 (see `AGENTS.md` for the listing URL). Later releases: `AGENTS.md` → "Releasing a new version".

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
