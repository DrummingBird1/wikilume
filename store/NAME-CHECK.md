# Name check: "WikiFree" (checked 2026-11-09)

This is research, not legal advice. Nobody ran a trademark search in a registry (USPTO, EUIPO, Israel Patent Office); do that before relying on the name.

## Findings
| Check | Result |
|---|---|
| Chrome Web Store, exact name "WikiFree" | No listing found by web search (the store's own search was not queried: it needs a browser session, do it by hand). Many similar Wikipedia reskins exist (Wikiwand, We Love Wikipedia, Wiki Reader, Wikilite, NewWiki), so the category is crowded. |
| `wikifree.com` | **Registered since 2004 and live**, titled "WikiFree – Free Online Courses, Templates & eBooks". A different business, same name. |
| `wikifree.org` | Registered (site did not answer). |
| `wikifree.net` | Registered 2025-09-10. |
| `wikifree.app`, `.dev`, `.io`, `.me`, `.co` | RDAP lookups returned "not found" (probably unregistered): verify at a registrar. |
| npm package `wikifree`, GitHub user `wikifree` | Not found. |
| Wikimedia trademark policy | "Wiki" alone is not a Wikimedia mark; the marks are Wikipedia, Wikimedia, MediaWiki, Wikibooks and so on. Using "Wikipedia" descriptively in the subtitle is normal for add-ons, but the policy says use must not suggest endorsement and asks for a "not affiliated" notice. Domains containing a Wikimedia mark need permission, so do **not** register a domain with "wikipedia" in it. The site and listing already carry the disclaimer. |
| Chrome Web Store policy | Names and listings must not mislead or imply endorsement by another organisation, and must not infringe trademarks. "Clean Wikipedia Reader" is descriptive and fine; the risk is the first word. |

## Assessment
- **Legal to use?** Probably acceptable as a free add-on, but not cleared: an established business (wikifree.com, in operation for over twenty years) already trades under the identical name. Even in a different field this can bring a complaint, a store takedown or a forced rename later, after reviews and users exist.
- **Available?** Not as a `.com`/`.org`/`.net`. Free as a store listing name today as far as search shows.
- **Looks like Wikipedia?** "Wiki" in the name plus the "W" icon is close to Wikimedia branding. The icon is a generic W in a gradient square, not the Wikipedia globe, which is the right call. Keep it that way.

## Recommendation
Pick a name before the first submission: renaming after launch costs reviews and users, renaming now costs one line. Options whose `.com` and `.app` looked unregistered on 2026-11-09 (verify again): **WikiLume**, **WikiCalm**. If you keep "WikiFree", expect the risk above and at least avoid owning "wikifree" domains that clash with the existing site (use the GitHub Pages address).

## How to rename
The name lives in: `manifest.json` (`name`, `short_name`, `action.default_title`), `popup/popup.html`, `src/i18n.js`, `src/content.js` (header brand), `README.md`, `README.en.md`, `store/*.md`, `site/*`, and `NAME` in `tools/make-promo.js`. Then run `npm run icons` (if the icon changes), `node tools/make-screenshots.js`, `node tools/make-promo.js`, `npm run verify`.
