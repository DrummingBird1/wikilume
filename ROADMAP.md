# Roadmap

Source of truth for where WikiLume stands and what is next. Details and history live in `docs/BACKLOG.md` (open work, risks) and `docs/ARCHITECTURE.md`.
This file only lists what is known; anything not decided is written as an open question, not as a plan.

Last updated: 2026-11-21.

## Current state
- **1.0.0** is published in the Chrome Web Store (2026-11-10). The repository is public (MIT) and the project site and privacy policy are live on GitHub Pages.
- **1.1.0** is merged into `main` (2026-11-16): keyboard shortcuts with an `Alt+Shift+W` toggle command, reading history with "continue reading", dated facts from Wikidata in the timeline, a permanent Firefox add-on id.
- Store listings exist in 8 languages (en, he, es, fr, de, pt-BR, ru, ja): paste-ready descriptions in `store/descriptions/<code>.txt`, five screenshots per language in `store/screenshots/<code>/`, localized name and short description in `_locales/`. `npm run check-store` enforces them.
- `npm run verify` (38 unit tests) and `npm run check-store` pass. CI (`.github/workflows/ci.yml`) ran green once by hand; pushes do not start it automatically.
- Whether the 1.1.0 zip (`npm run pack`) was uploaded to the Web Store is **not recorded** in the repository.

## Next (known open work)
1. **Ship 1.1.0:** the owner uploads `dist/wikilume-1.1.0-chrome.zip`, adds the 7 extra languages in the dashboard (descriptions and screenshots), and re-checks the Privacy practices answers (reading history is local only; Wikidata is a new Wikimedia domain). Review will see the new `commands` entry and background service worker.
2. **Manual check in a real Chrome** (nothing below was verified outside the automated mock site): `Alt+Shift+W` and rebinding, history across browser restarts, Wikidata dates on a person, a company and an event article, RTL of the help card and continue chip, scroll behaviour with real frames, print preview, logged-in skins, Wikipedia's own dark mode and page previews. Checklist: `docs/BACKLOG.md`.
3. **Edge and Firefox:** test the same zip in Edge and `dist/…-firefox.zip` in Firefox (the background script is an event page there). Headless-Edge e2e currently fails on the summary and second-tab bookmark checks; unknown whether that is the harness or a real storage problem.
4. **Make CI start on push** and confirm it on a pull request (it only ran via `workflow_dispatch`).
5. **De-flake e2e:** the summary, `storage.sync` language, second-tab bookmark and new "continue reading" checks fail intermittently because the mock page runs a page-world copy of the scripts beside the extension's.
6. **Housekeeping:** install the published listing in a normal Chrome and open one article; trademark registry search for "WikiLume" (`store/NAME-CHECK.md`).

## Known limitations
- Summary does not work for Hebrew (Chrome's on-device model writes en/es/ja only) and needs desktop Chrome with on-device AI.
- The timeline is a heuristic plus a small set of Wikidata dates (1000–2099 only); it can miss events or read a quantity as a year.
- Mobile (`m.wikipedia.org`) and non-Wikipedia Wikimedia sites are excluded on purpose.
- Bookmarks and history do not sync between devices; bookmark import is only in the in-page popover.
- The interface exists in English and Hebrew only.

## Ideas (not committed, no date)
- "Ask about this article" via Chrome's Prompt API (same language limits) or an optional user-supplied key.
- Reading lists with folders; wider Wikidata use (BCE dates, more properties) if the first version proves useful.
- More summary languages when Chrome adds them.

## Rules that shape any plan
Free, no accounts, no telemetry, only Wikipedia/Wikimedia traffic, only the `storage` permission, Wikipedia's own article DOM kept, EN+HE strings with RTL, CC BY-SA attribution. Every significant change updates all 8 store listings (`AGENTS.md`).

## Open questions
- Was 1.1.0 uploaded to the store, and is it live?
- Are other interface languages wanted (the store listings already cover 8)?
- Which of the ideas above, if any, should be the next minor release?

## Tracking
- A private Artifact mirrors this file. No Trello board was created for this project (the workspace is at its open-board limit).
