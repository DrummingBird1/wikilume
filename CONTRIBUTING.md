# Contributing to WikiLume

Thanks for helping. WikiLume is a free, no-account, no-telemetry Chrome extension that gives Wikipedia a clean reading layout.
It is plain JavaScript with no build step and no dependencies, so getting started takes a minute.

## Set up
1. Install Node 22 or newer. There is nothing to `npm install`.
2. `npm run verify` runs the static checks and the unit tests.
3. Load the extension: `chrome://extensions` → Developer mode → Load unpacked → the folder with `manifest.json`.
4. `npm run e2e` runs headless-Chrome checks against a local mock site. It needs Chrome for Testing: branded Chrome ignores
   `--load-extension`. Set `CHROME_PATH` to the Chrome for Testing binary.

## Ground rules
The full list is in [AGENTS.md](AGENTS.md); the short version:
- No accounts, analytics, remote code or third-party servers. The only network traffic is to Wikipedia/Wikimedia APIs.
- The only permission is `storage`. A new permission needs a written reason in the pull request.
- Keep Wikipedia's own article DOM; never re-render articles.
- Every UI string goes into `src/i18n.js` in English and Hebrew, and RTL must keep working.
- Build DOM with `textContent`, never put page text into `innerHTML`.
- Tests are hermetic and never contact wikipedia.org.

## Pull requests
1. Branch from `main`, keep the change focused.
2. Add a unit test for pure logic, or an e2e assertion for UI behaviour.
3. Run `npm run verify` (and `npm run e2e` for UI changes) and say in the PR which you ran and what you did not test.
4. Update `README.md` / `README.en.md` for user-facing changes and `docs/` for design changes.

## Bugs and ideas
Open an issue at https://github.com/DrummingBird1/wikilume/issues. For a bug, include the article URL, your Chrome version, the
extension version and whether other extensions or Wikipedia skins/gadgets are active.

## License
By contributing you agree that your work is released under the MIT license (see [LICENSE](LICENSE)). Wikipedia article text
stays under CC BY-SA 4.0.
