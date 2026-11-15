# Publishing to the Chrome Web Store

Everything the store asks for is in this folder. What is left needs the owner (account, payment, name decision, URLs).

## What is ready
| Item | File |
|---|---|
| Extension package | `npm run pack` → `dist/wikilume-<version>-chrome.zip` |
| Icon 128×128 | `icons/icon128.png` (in the zip) |
| 5 screenshots 1280×800 | `store/screenshots/` (real Wikipedia, real extension code; regenerate with `npm run screenshots`) |
| 5 screenshots per listing language | `store/screenshots/<code>/` (that language's own Wikipedia; regenerate with `npm run screenshots:langs`, needs internet) |
| Small promo tile 440×280, marquee 1400×560 | `store/promo-*.png` |
| **Detailed description per language, paste-ready** (plain text, the whole file is the description) | `store/descriptions/<code>.txt` for `en`, `he`, `es`, `fr`, `de`, `pt-BR`, `ru`, `ja` |
| Notes per language (name, short description, category; no description text) | `store/listing.<code>.md`; name and short description also in `_locales/<code>/messages.json` |
| Single purpose, permission reasons, data disclosures | `store/listing.en.md` |
| Privacy policy page (EN/HE) and project site | `site/` (build with `npm run site`) |
| Name research | `store/NAME-CHECK.md` |

## What the owner has to do
1. **Name**: WikiLume was chosen (the old name WikiFree clashed with wikifree.com; see `NAME-CHECK.md`). Search the Web Store and a trademark registry by hand before submitting.
2. **Developer account**: the owner already has one. Open https://chrome.google.com/webstore/devconsole.
3. **Site is published** (GitHub Pages, deployed from `main` by `.github/workflows/pages.yml` when `site/` changes): https://drummingbird1.github.io/wikilume/ . Privacy policy URL for the dashboard: https://drummingbird1.github.io/wikilume/privacy.html . Repository: https://github.com/DrummingBird1/wikilume .
4. **Store URL**: done. The site's install button points at the live listing (`STORE_URL` was replaced in `tools/build-site.js`). If the listing address ever changes, edit it there, run `npm run site` and push to `main`.
5. **License**: MIT, see `LICENSE` (done).
6. **Test by hand in a normal Chrome**: load unpacked, open real articles. See the checklist in `docs/BACKLOG.md` (automated runs need Chrome for Testing because branded Chrome ignores `--load-extension`; a hand check in the owner's own Chrome is still worth doing).
7. **Run the gate**: `npm run verify && npm run e2e && npm run pack && npm run check-store`. `check-store` fails until the placeholders are replaced.

## Dashboard walkthrough
1. Add new item → upload `dist/wikilume-<version>-chrome.zip`.
2. **Store listing**: description from `descriptions/en.txt` (default language), then add each other language (he, es, fr, de, pt-BR, ru, ja) and paste its `descriptions/<code>.txt` (name and short description are filled from the package's `_locales`); category Productivity; upload icon, screenshots, small tile and marquee; add the privacy-policy URL and the website URL.
3. **Privacy practices**: single purpose and permission reasons from `listing.en.md`; no remote code; data collected: none; tick the three certifications.
4. **Distribution**: Public, all regions, free.
5. Submit for review. First reviews of a new developer account typically take from a few days up to a few weeks; the in-page content script on `*.wikipedia.org` is a "specific host" pattern, not "all sites", which keeps review simple.

## Every later release
Bump `manifest.json` and `package.json` together, `npm run verify && npm run e2e && npm run pack`, upload the new zip, add notes. Keep the privacy policy, permissions text, screenshots and **all eight listings** in step with the code (`check-store` guards the permission list and that every listing exists and matches `_locales`).
