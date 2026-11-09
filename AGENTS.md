# WikiLume – agent guide

WikiLume is a Manifest V3 browser extension (Chrome first) that replaces Wikipedia's page chrome with a clean reading layout:
table of contents, infobox column, themes, link previews, bookmarks, multi-language search, timeline, on-device summary,
cover photo, lightbox. Plain JavaScript, no build step, **no dependencies**. Reply in the language the user writes in
(the owner mostly writes Hebrew); code, comments and docs stay in English, with the README also available in Hebrew.

## Product rules (do not break these)
- **Free, no accounts, no telemetry, no third-party servers.** The only network traffic is to Wikipedia/Wikimedia APIs.
  Summaries use Chrome's on-device AI, never a paid API. Do not add analytics, remote code or tracking.
- **Keep Wikipedia's own article DOM.** We move `#mw-content-text` into our layout instead of re-rendering, so templates, math
  and gadgets keep working. Never re-implement article rendering.
- **Keep CC BY-SA attribution** (footer links to the source article and its history).
- **Least privilege.** The only permission is `storage`. Any new permission or host permission needs a written reason.
- **English and Hebrew UI, RTL must work.** Every new string goes into `src/i18n.js` for both languages.
- **Never download the AI model without an explicit click.** It is several GB (`src/summary.js` asks first).

## Commands
Node 22 or newer. Nothing to install (`npm install` is not needed; `pnpm run` works the same).

| Command | What it does |
|---|---|
| `npm run verify` | **Run before saying you are done.** Static checks (`tools/check.js`) plus all unit tests |
| `npm run check` | Syntax of every JS file, manifest and popup references, version match, no machine-specific paths |
| `npm test` | Unit tests only (`test/*.test.js`) |
| `npm run e2e` | Starts the mock site and runs headless-Chrome checks with the real extension (needs Chrome; set `CHROME_PATH` if it is not found) |
| `npm run pack` | Builds `dist/wikilume-<version>-chrome.zip` and `-firefox.zip` (`dist/` is git-ignored) |
| `npm run icons` | Regenerates `icons/` |

Load it manually: `chrome://extensions` → Developer mode → Load unpacked → this folder (the one with `manifest.json`).

## Where things are
- `manifest.json` – content script order matters: `i18n.js` → `bookmarks.js` → `timeline.js` → `summary.js` → `content.js`
- `src/content.js` – the reader: page takeover, header, search, settings, hero, panels, lightbox, previews, TTS
- `src/reader.css` – all styling; scoped by `html[data-wf-theme]`, `html.wf-on`, `#wf-root`; classes start with `wf-`
- `src/i18n.js` – strings (en, he), `DEFAULTS` for settings, settings storage helpers, search-language list
- `src/bookmarks.js` – bookmark storage, import/export, list rendering (shared with the popup)
- `src/timeline.js`, `src/summary.js` – pure logic, unit-tested
- `popup/` – toolbar popup (bookmarks tab, settings tab)
- `test/*.test.js` unit tests; `test/e2e/` mock MediaWiki site + headless-Chrome checks
- `tools/` – `check.js`, `pack.js`, `make-icons.js`
- `docs/ARCHITECTURE.md` – how it works and why (read before changing `content.js`); `docs/BACKLOG.md` – open work and decisions

## Conventions
- Modules are IIFEs that attach to `globalThis.WF`; no imports, no bundler. Keep new logic **pure and testable** in its own
  file when it does not need the DOM.
- Build DOM with the `h()` helper and `textContent`. Never put page or model text into `innerHTML` (the only `innerHTML` is our
  own static icon markup).
- CSS: use CSS variables for colours and logical properties (`inline-start`, `padding-inline`…) so RTL works. Wikipedia's light
  boxes are handled in dark mode by the `.wf-inv` invert trick; do not hard-code colours.
- Settings live in `chrome.storage.sync` (keys = `WF.DEFAULTS`) and apply live through `onChanged`; only `enabled` and `uiLang`
  reload the page. Bookmarks use one `chrome.storage.local` key each (`bm:<host>|<Title>`) so tabs never overwrite each other.
- Bump `manifest.json` and `package.json` versions together (`npm run check` enforces it).
- No machine-specific paths, personal e-mail or private notes in tracked files (the repo may become public). Personal context
  goes in `*.local.md`, which git ignores. `npm run check` enforces the path rule.

## Testing rules
- Pure logic → add a unit test. UI behaviour → extend `test/e2e/chrome-features.js` or `chrome-bookmarks.js` with an assertion.
- Tests must stay hermetic: requests to `*.wikipedia.org` are intercepted and answered locally. Never hit the real site from tests.
- The e2e mock page is hand-written to mimic MediaWiki's DOM. It does **not** replace checking real articles (other skins,
  logged-in users, odd templates); see the checklist in `docs/BACKLOG.md`.
- Some agent browsers block `wikipedia.org`. Use the mock site, and ask the owner to try real articles in their own Chrome.

## Gotchas
- `node --test <directory>` fails on Node 24; use the glob (`npm test` already does).
- Chrome 137+ only loads unpacked extensions from the command line with `--disable-features=DisableLoadExtensionCommandLineSwitch`
  (the e2e harness passes it).
- Chrome's Summarizer API writes only English, Spanish and Japanese, so Hebrew articles fall back to the article's lead.
- Wikimedia thumbnails exist only at standard widths (500, 960, 1280, 1920) and never above the original width (`data-file-width`);
  the lightbox falls back to the small image if the large one fails.
- Wikipedia's own page-preview popups are suppressed in the capture phase on our links; do not stop other events there.

## Git and releases
- Work on a branch; prefer pull requests. Never force-push. Do **not** push, add or change a remote, or publish to a browser
  store without the owner's explicit approval.
- Do not commit `dist/`, secrets or `.env` files.
- Definition of done: `npm run verify` passes, `npm run e2e` passes for UI changes (or say why it was not run), docs updated
  (`README.md` and `README.en.md` for user-facing changes, `docs/` for design changes), and the report states what was **not** tested.

If a `HANDOFF.local.md` exists next to this file, read it first: it is a local, untracked snapshot of the current state.
