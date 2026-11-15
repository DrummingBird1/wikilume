# Chrome Web Store listing – English (default language)

Paste these into the Developer Dashboard → Store listing. Limits are the store's.

## Name (max 75; comes from `_locales/en/messages.json`)
WikiLume – Clean Wikipedia Reader

> Name chosen: WikiLume (2026-11-09). Before submitting, search the Web Store and trademark registries by hand (see `NAME-CHECK.md`).

## Short description (max 132; comes from `_locales/en/messages.json`, must match)
A clean, modern reading layout for Wikipedia: themes, contents, bookmarks, multi-language search. Free, no accounts.

## Category
Productivity (alternative: Accessibility). Languages: English (default), Hebrew, Spanish, French, German, Portuguese (Brazil), Russian, Japanese. One listing file per language: `listing.<code>.md`; all eight must be updated on every significant change (see `AGENTS.md`).

## Detailed description
Moved out so it can be pasted whole: [`descriptions/en.txt`](descriptions/en.txt) (plain text, nothing else in the file).

## Single purpose (dashboard → Privacy practices)
Restyles Wikipedia article pages into a clean reading layout (table of contents, themes, previews, bookmarks) without changing the article text.

## Permission justification
- `storage`: saves your reading settings (theme, font, language), your bookmarks and your reading history in the browser. Nothing is sent anywhere.
- Content script on `*://*.wikipedia.org/*`: this is the single purpose – it reads the Wikipedia article already on the page and re-lays it out. No other sites. Dates of the article's subject are read from `www.wikidata.org` with an anonymous cross-origin request (no host permission needed).
- No remote code, no host permissions beyond that match pattern.

## Data usage disclosures (dashboard → Privacy practices)
Collected data: none of the listed categories. Tick all three certifications (no selling, no use unrelated to the single purpose, no creditworthiness use).
Note for the "Website content" category: the extension reads the page you are on locally to lay it out; it does not collect or transmit it.

## Privacy policy URL
Use the published `privacy.html` of the site (see `PUBLISHING.md`).

## Images
- Icon 128×128: `icons/icon128.png` (inside the zip)
- Screenshots (1280×800): `store/screenshots/1…5-*.png`
- Small promo tile (440×280): `store/promo-small-440x280.png`
- Marquee (1400×560): `store/promo-marquee-1400x560.png`

## Screenshot captions (if the dashboard asks)
1. A clean reading layout with contents and infobox
2. Dark theme
3. Full right-to-left support in Hebrew
4. Timeline of the article's dated events
5. Search several language editions at once
