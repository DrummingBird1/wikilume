# WikiFree – a clean Wikipedia reader (browser extension, completely free)

[עברית](README.md) · English

Inspired by Wikiwand: WikiFree replaces Wikipedia's page chrome with a modern reading layout. **Everything is free: no account, no
subscription, no analytics, no third-party servers.** It talks only to Wikipedia's own APIs.

## Features
- Clean layout: large title, description, reading time, last-edited date; sticky table of contents with scroll-spy
- Infobox in a side column; themes (auto, light, sepia, dark); font, text size and reading width
- Hover previews for links and citations; search with suggestions (shortcut `/`), random article, language switcher
- **Multi-language search:** tick extra Wikipedias next to the search box; their results appear beside the current one
- **Bookmarks:** save articles, filter, export/import as JSON, shown in the page and in the toolbar popup
- **Summary:** written on your device by Chrome's built-in AI (asks before the one-time multi-GB model download); falls back to
  the article's opening when unavailable. English, Spanish and Japanese only, so not Hebrew
- **Timeline:** dated events picked from the article text (heuristic)
- Wide cover photo for landscape lead images, and an image lightbox with captions and keyboard navigation
- Read-aloud, full RTL support, English or Hebrew interface, "original view" per tab

## Install (developer mode)
1. Open `chrome://extensions` and turn on **Developer mode**
2. **Load unpacked** and pick this folder (the one containing `manifest.json`)
3. Open any Wikipedia article

## Develop
Node 22+, no dependencies.

```bash
npm run verify   # static checks + unit tests
npm run e2e      # headless Chrome with the real extension against a mock site (needs Chrome; set CHROME_PATH if not found)
npm run pack     # dist/wikifree-<version>-chrome.zip and -firefox.zip
```

Contributing humans and AI agents: start with [AGENTS.md](AGENTS.md), then [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/BACKLOG.md](docs/BACKLOG.md).

## Status
Tested on a hand-written mock Wikipedia and in a real Chrome profile; **not yet verified on real Wikipedia articles**. Firefox and
Edge are untested. No license has been chosen yet; Wikipedia's text is CC BY-SA 4.0.
