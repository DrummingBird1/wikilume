# Architecture

How WikiFree works and why it is built this way. Read this before changing `src/content.js`.

## Page takeover (the core idea)
WikiFree does **not** re-fetch or re-render the article. The content script runs at `document_start`, and when the page is a normal
article it keeps Wikipedia's rendered DOM and swaps only the surroundings:

1. **URL gate** (`quickGate`): `/wiki/<Title>` or `/w/index.php?title=…` without `action`, `oldid`, `diff`, `printable`, `redirect`,
   `search`… Otherwise the script exits and the page is untouched.
2. `html.wf-pending` hides `<body>` so there is no flash of the old skin (a 6 s safety timer always removes it).
3. Settings are loaded (`chrome.storage.sync`), `data-wf-theme` etc. are set on `<html>`, then we wait for DOM ready.
4. `init()` verifies this really is an article (`body.ns-0`, `#mw-content-text` with `.mw-parser-output`, `#firstHeading`, not the main
   page) and builds our layout. If anything fails it returns false and the original page stays.
5. **Point of no return:** existing `<body>` children get class `wf-hide` (hidden, never removed, so MediaWiki scripts do not throw),
   `html.wf-on` is set, `#wf-root` is appended, and `#mw-content-text`, the lead infobox and `#catlinks` are **moved** into it.
   Moving `#mw-content-text` itself (not a copy) keeps MediaWiki's `wikipage.content` hooks, collapsibles and gadgets working.
   If this step throws, we set a bypass flag and reload.
6. **Bypass:** "Original view" sets `sessionStorage['wf-bypass']` and reloads; a floating pill brings the reader back.

## Layout
`#wf-root` contains the sticky header, a CSS grid (`.wf-layout`: TOC, hero, article, aside, footer) and floating UI (back-to-top,
hover card, lightbox). Grid areas change at 1280px (infobox moves under the title as a collapsible "quick facts" card) and 1000px
(TOC becomes a drawer). Direction follows the page (`html[dir]`); UI text follows the UI language, so popovers keep the page
direction for placement and set `dir` on their content.

## Data and storage
| What | Where | Notes |
|---|---|---|
| Settings | `chrome.storage.sync`, keys = `WF.DEFAULTS` | live via `onChanged`; `enabled`/`uiLang` reload the page |
| Bookmarks | `chrome.storage.local`, one key per bookmark `bm:<host>|<Title>` | no read-modify-write races between tabs; imports are re-validated (only `*.wikipedia.org`, only `upload.wikimedia.org` thumbnails) |
| Bypass flag | `sessionStorage` | per tab, per wiki origin |

Outside the extension (mock page tests) `i18n.js` and `bookmarks.js` fall back to `localStorage` or memory.

## Network
- Same wiki: `/w/api.php` (description, lead image, last edit, language links), `/w/rest.php/v1/search/title` (search),
  `/api/rest_v1/page/summary/<Title>` (hover cards). All same-origin, so no CORS and no host permissions.
- Other wikis (multi-language search): action API with `origin=*` (anonymous CORS). This is why no `host_permissions` are needed.
- Nothing else leaves the browser. The summary runs on-device.

## Decisions worth knowing
- **Own i18n dictionary, not `chrome.i18n`:** the UI language is user-selectable and independent of the browser locale.
- **Dark mode:** Wikipedia's boxes carry light inline colours. We mark top-level boxes with `.wf-inv` and apply
  `filter: invert(1) hue-rotate(180deg)`, re-invert images inside, and invert math/`skin-invert` images when they are not inside
  an inverted box. Near-white box backgrounds are pre-darkened to land close to the page surface.
- **Hover previews:** our `mouseover` listener runs in the capture phase on `#wf-root` and calls `stopPropagation` on article links
  so Wikipedia's own page-preview popups (bound on the link) do not appear twice. The link's `title` is stripped while our card is
  open and restored afterwards.
- **Lightbox:** image links (`a.image`, `a.mw-file-description`) are intercepted in the capture phase. The large URL is the largest
  standard Wikimedia width (1920/1280/960/500) not exceeding `data-file-width`; on error it falls back to the thumbnail.
  Ctrl/Cmd/Shift/middle clicks are left alone.
- **Summary:** `src/summary.js` wraps Chrome's `Summarizer` API (on-device, free). `check()` first, then an explicit consent click
  when the state is `downloadable`, then streaming; the model output is rendered as text only. It supports English, Spanish and
  Japanese output; everything else (Hebrew included) falls back to the article's lead sentences.
- **Timeline:** `src/timeline.js` splits prose into sentences, finds the first plausible year (1000–2099), scores it (position,
  preceding preposition, quantity words such as "more than"), caps events per section, and sorts chronologically. Pure functions.
- **Cover photo:** shown only when the API's lead image is landscape (width/height ≥ 1.25); portrait lead images stay a small
  picture beside the title (when there is no infobox).
- **Search languages:** chosen in a popover on the search box (`searchLangs`), merged round-robin after this wiki's results.

## Testing strategy
1. `npm run check` – static checks.
2. `npm test` – unit tests of the pure modules and i18n.
3. `npm run e2e` – real headless Chrome with the unpacked extension against a hand-written mock site and mocked Wikipedia APIs.
4. **Manual on real Wikipedia** – required for releases; checklist in `docs/BACKLOG.md`. The mock site cannot cover other skins,
   logged-in users or unusual templates.
