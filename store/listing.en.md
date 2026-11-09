# Chrome Web Store listing – English (default language)

Paste these into the Developer Dashboard → Store listing. Limits are the store's.

## Name (max 75; comes from `manifest.json`)
WikiFree – Clean Wikipedia Reader

> Read `NAME-CHECK.md` before submitting: the name is not cleared.

## Short description (max 132; comes from `manifest.json` `description`)
A clean, modern reading experience for Wikipedia. Free, no accounts, no subscriptions. קריאה נקייה ומודרנית בוויקיפדיה – הכול בחינם.

## Category
Productivity (alternative: Accessibility). Language: English, Hebrew.

## Detailed description (plain text, max 16,000)

WikiFree turns Wikipedia into a calm, modern reading experience. Everything is free: no account, no subscription, no ads, no tracking.

WHAT YOU GET
• A clean layout: large title, short description, reading time and last-edited date
• A floating table of contents that highlights the section you are in
• The infobox in a side column, so the text stays readable
• Themes: automatic, light, sepia and dark – with tables, templates and formulas adapted to each
• Your choice of font, text size and reading width
• Hover previews for links and citations
• Search with suggestions (press / to focus it), a random-article button and a language switcher
• Multi-language search: tick extra Wikipedias next to the search box and see their results side by side
• Bookmarks: save articles, filter them, export and import as a file; available in the page and in the toolbar popup
• Timeline: dated events picked out of the article text
• Summary: written on your own device by Chrome's built-in AI. It asks first before the one-time model download (several GB), and falls back to the article's opening when the AI is not available. Chrome's on-device model writes English, Spanish and Japanese only, so Hebrew articles show the opening instead
• A wide cover photo for landscape lead images, and a lightbox with captions and keyboard navigation
• Read-aloud, full right-to-left support, English or Hebrew interface, and a one-click "original view" for any tab

PRIVATE BY DESIGN
• No account, no analytics, no ads, no remote code
• The only network traffic is to Wikipedia's own servers, the same ones the page already uses
• Your settings and bookmarks stay in your browser
• The only permission requested is "storage"

HOW IT WORKS
WikiFree keeps Wikipedia's own article content (so templates, tables and formulas keep working) and replaces the page chrome around it. Turn it off at any time from the toolbar popup, or press "original view" to see the normal page.

Wikipedia articles are available under CC BY-SA 4.0, and every page keeps a link to the source article and its history.

WikiFree is an independent project. It is not affiliated with or endorsed by the Wikimedia Foundation. Wikipedia is a trademark of the Wikimedia Foundation.

## Single purpose (dashboard → Privacy practices)
Restyles Wikipedia article pages into a clean reading layout (table of contents, themes, previews, bookmarks) without changing the article text.

## Permission justification
- `storage`: saves your reading settings (theme, font, language) and your bookmarks in the browser. Nothing is sent anywhere.
- Content script on `*://*.wikipedia.org/*`: this is the single purpose – it reads the Wikipedia article already on the page and re-lays it out. No other sites.
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
