# Publishing to the Chrome Web Store

Everything the store asks for is in this folder. What is left needs the owner (account, payment, name decision, URLs).

## What is ready
| Item | File |
|---|---|
| Extension package | `npm run pack` → `dist/wikifree-<version>-chrome.zip` |
| Icon 128×128 | `icons/icon128.png` (in the zip) |
| 5 screenshots 1280×800 | `store/screenshots/` (real Wikipedia, real extension code; regenerate with `npm run screenshots`) |
| Small promo tile 440×280, marquee 1400×560 | `store/promo-*.png` |
| Listing text, English and Hebrew | `store/listing.en.md`, `store/listing.he.md` |
| Single purpose, permission reasons, data disclosures | `store/listing.en.md` |
| Privacy policy page (EN/HE) and project site | `site/` (build with `npm run site`) |
| Name research | `store/NAME-CHECK.md` |

## What the owner has to do
1. **Decide the name** (read `NAME-CHECK.md`). If it changes, follow "How to rename" there.
2. **Create a developer account** at https://chrome.google.com/webstore/devconsole (one-time 5 USD fee, 2-step verification on the Google account).
3. **Publish the site** so the privacy policy has a public URL. `site/` is plain static HTML. Without a remote the options are: a GitHub repository with Pages (the workflow `.github/workflows/pages.yml` publishes `site/`), Netlify/Cloudflare Pages, or any static host. Creating a remote or pushing needs the owner's decision (see `AGENTS.md`).
4. **Fill the placeholders** in `site/` and `store/`: `[[CONTACT_URL]]` (a public contact page or issue tracker; do not put a private e-mail in a public repo) and `[[STORE_URL]]` (the listing address, known only after the first submission: submit, then fill it in and republish the site). Run `npm run site` after editing `tools/build-site.js`, or edit the generated HTML directly.
5. **Choose a license** for the code (none yet; see `docs/BACKLOG.md`).
6. **Test by hand in a normal Chrome**: load unpacked, open real articles. See the checklist in `docs/BACKLOG.md` (an unpacked extension did not inject on https pages in headless Chrome 157, so a hand check that it works in real Chrome is essential).
7. **Run the gate**: `npm run verify && npm run e2e && npm run pack && npm run check-store`. `check-store` fails until the placeholders are replaced.

## Dashboard walkthrough
1. Add new item → upload `dist/wikifree-<version>-chrome.zip`.
2. **Store listing**: description from `listing.en.md` (default language), add Hebrew from `listing.he.md`; category Productivity; upload icon, screenshots, small tile and marquee; add the privacy-policy URL and the website URL.
3. **Privacy practices**: single purpose and permission reasons from `listing.en.md`; no remote code; data collected: none; tick the three certifications.
4. **Distribution**: Public, all regions, free.
5. Submit for review. First reviews of a new developer account typically take from a few days up to a few weeks; the in-page content script on `*.wikipedia.org` is a "specific host" pattern, not "all sites", which keeps review simple.

## Every later release
Bump `manifest.json` and `package.json` together, `npm run verify && npm run e2e && npm run pack`, upload the new zip, add notes. Keep the privacy policy, permissions text and screenshots in step with the code (`check-store` guards the permission list).
