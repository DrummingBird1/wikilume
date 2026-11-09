# Publishing to the Chrome Web Store

Everything the store asks for is in this folder. What is left needs the owner (account, payment, name decision, URLs).

## What is ready
| Item | File |
|---|---|
| Extension package | `npm run pack` → `dist/wikilume-<version>-chrome.zip` |
| Icon 128×128 | `icons/icon128.png` (in the zip) |
| 5 screenshots 1280×800 | `store/screenshots/` (real Wikipedia, real extension code; regenerate with `npm run screenshots`) |
| Small promo tile 440×280, marquee 1400×560 | `store/promo-*.png` |
| Listing text, English and Hebrew | `store/listing.en.md`, `store/listing.he.md` |
| Single purpose, permission reasons, data disclosures | `store/listing.en.md` |
| Privacy policy page (EN/HE) and project site | `site/` (build with `npm run site`) |
| Name research | `store/NAME-CHECK.md` |

## What the owner has to do
1. **Name**: WikiLume was chosen (the old name WikiFree clashed with wikifree.com; see `NAME-CHECK.md`). Search the Web Store and a trademark registry by hand before submitting.
2. **Developer account**: the owner already has one. Open https://chrome.google.com/webstore/devconsole.
3. **Publish the site** so the privacy policy has a public URL. `site/` is plain static HTML. Without a remote the options are: a GitHub repository with Pages (the workflow `.github/workflows/pages.yml` publishes `site/`), Netlify/Cloudflare Pages, or any static host. Creating a remote or pushing needs the owner's decision (see `AGENTS.md`).
4. **Fill the store placeholder** in `site/`: the contact link already points to the repository issue tracker. The listing address is known only after the first submission: submit, replace the `STORE_URL` placeholder in `tools/build-site.js` (in double square brackets), and run `npm run site`, then republish.
5. **License**: MIT, see `LICENSE` (done).
6. **Test by hand in a normal Chrome**: load unpacked, open real articles. See the checklist in `docs/BACKLOG.md` (automated runs need Chrome for Testing because branded Chrome ignores `--load-extension`; a hand check in the owner's own Chrome is still worth doing).
7. **Run the gate**: `npm run verify && npm run e2e && npm run pack && npm run check-store`. `check-store` fails until the placeholders are replaced.

## Dashboard walkthrough
1. Add new item → upload `dist/wikilume-<version>-chrome.zip`.
2. **Store listing**: description from `listing.en.md` (default language), add Hebrew from `listing.he.md`; category Productivity; upload icon, screenshots, small tile and marquee; add the privacy-policy URL and the website URL.
3. **Privacy practices**: single purpose and permission reasons from `listing.en.md`; no remote code; data collected: none; tick the three certifications.
4. **Distribution**: Public, all regions, free.
5. Submit for review. First reviews of a new developer account typically take from a few days up to a few weeks; the in-page content script on `*.wikipedia.org` is a "specific host" pattern, not "all sites", which keeps review simple.

## Every later release
Bump `manifest.json` and `package.json` together, `npm run verify && npm run e2e && npm run pack`, upload the new zip, add notes. Keep the privacy policy, permissions text and screenshots in step with the code (`check-store` guards the permission list).
