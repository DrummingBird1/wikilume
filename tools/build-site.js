// Generates the static project site in site/ (English at the root, Hebrew in site/he/). No dependencies.
// Run: node tools/build-site.js. Placeholders in [[DOUBLE_BRACKETS]] must be replaced before publishing (npm run check-store lists them).
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const write = (rel, text) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
};

const L = {
  en: {
    dir: 'ltr', lang: 'en', pre: '', other: ['he/', 'עברית'], priv: 'privacy.html', home: './',
    title: 'WikiLume – a clean, free reader for Wikipedia', desc: 'A clean, modern reading layout for Wikipedia. Free, no accounts, no tracking.',
    nav: ['Features', 'Privacy'],
    hero: ['Wikipedia, made for reading.', 'A calm, modern layout with contents, themes, previews, bookmarks and multi-language search. Free. No account. No tracking.'],
    cta: ['Add to Chrome', 'See features'],
    featH: 'Everything you need to read comfortably',
    feats: [
      ['Clean layout', 'Large title, reading time, a floating table of contents and the infobox in a side column.'],
      ['Themes', 'Automatic, light, sepia and dark, with tables, templates and formulas adapted. Your font, size and width.'],
      ['Previews and search', 'Hover cards for links and citations, suggestions as you type, random article, language switcher.'],
      ['Multi-language search', 'Tick extra Wikipedias and compare their results side by side.'],
      ['Bookmarks', 'Save articles, filter, export and import as a file. In the page and in the toolbar popup.'],
      ['Timeline', 'Dated events picked out of the article text.'],
      ['On-device summary', "Written on your own device by Chrome's built-in AI, only after you agree to the one-time model download."],
      ['Right-to-left ready', 'Full Hebrew and RTL support, English or Hebrew interface, read-aloud, cover photo and lightbox.'],
    ],
    shotsH: 'See it',
    caps: ['Light theme', 'Dark theme', 'Hebrew, right to left', 'Timeline', 'Search several languages at once'],
    privH: 'Private by design',
    priv1: 'No account, no analytics, no ads, no remote code. The only network traffic goes to Wikipedia itself. Settings and bookmarks stay in your browser. The only permission is "storage".',
    priv2: 'Read the privacy policy',
    foot: 'WikiLume is an independent project. It is not affiliated with or endorsed by the Wikimedia Foundation. Wikipedia is a trademark of the Wikimedia Foundation. Article text is available under CC BY-SA 4.0 and every page links to the source article and its history.',
  },
  he: {
    dir: 'rtl', lang: 'he', pre: '../', other: ['../', 'English'], priv: 'privacy.html', home: './',
    title: 'WikiLume – קורא חינמי ונקי לוויקיפדיה', desc: 'תצוגת קריאה נקייה ומודרנית לוויקיפדיה. חינם, בלי חשבון, בלי מעקב.',
    nav: ['יכולות', 'פרטיות'],
    hero: ['ויקיפדיה, מותאמת לקריאה.', 'תצוגה רגועה ומודרנית עם תוכן עניינים, ערכות נושא, תצוגה מקדימה, סימניות וחיפוש רב-לשוני. חינם. בלי חשבון. בלי מעקב.'],
    cta: ['הוספה ל-Chrome', 'לכל היכולות'],
    featH: 'כל מה שצריך כדי לקרוא בנוחות',
    feats: [
      ['פריסה נקייה', 'כותרת גדולה, זמן קריאה, תוכן עניינים צף ותיבת המידע בעמודה צדדית.'],
      ['ערכות נושא', 'אוטומטי, בהיר, ספיה וכהה, כולל התאמה של טבלאות, תבניות ונוסחאות. גופן, גודל ורוחב לבחירתכם.'],
      ['תצוגה מקדימה וחיפוש', 'כרטיסים בריחוף מעל קישורים והפניות, הצעות תוך כדי הקלדה, ערך אקראי ומעבר בין שפות.'],
      ['חיפוש רב-לשוני', 'מסמנים עוד ויקיפדיות ומשווים את התוצאות שלהן זו לצד זו.'],
      ['סימניות', 'שמירת ערכים, סינון, ייצוא וייבוא לקובץ. בעמוד ובחלון התוסף.'],
      ['ציר זמן', 'אירועים עם תאריכים שנשלפים מטקסט הערך.'],
      ['סיכום במכשיר', 'נכתב אצלכם במכשיר בידי ה-AI המובנה של Chrome, ורק אחרי שהסכמתם להורדת המודל החד-פעמית.'],
      ['מותאם לימין לשמאל', 'תמיכה מלאה בעברית וב-RTL, ממשק בעברית או באנגלית, הקראה בקול, תמונת כותרת ותצוגה מוגדלת.'],
    ],
    shotsH: 'איך זה נראה',
    caps: ['ערכת נושא בהירה', 'ערכת נושא כהה', 'עברית, מימין לשמאל', 'ציר זמן', 'חיפוש בכמה שפות בבת אחת'],
    privH: 'פרטיות מעצם התכנון',
    priv1: 'בלי חשבון, בלי אנליטיקה, בלי פרסומות ובלי קוד מרוחק. התעבורה היחידה היא לוויקיפדיה עצמה. ההגדרות והסימניות נשארות בדפדפן. ההרשאה היחידה היא "storage".',
    priv2: 'מדיניות הפרטיות',
    foot: 'WikiLume הוא פרויקט עצמאי. הוא אינו קשור לקרן ויקימדיה ואינו מאושר על ידה. Wikipedia הוא סימן מסחרי של קרן ויקימדיה. טקסט הערכים זמין ברישיון CC BY-SA 4.0, ובכל עמוד יש קישור לערך המקורי ולהיסטוריית העריכות שלו.',
  },
};

const P = {
  en: {
    title: 'Privacy policy – WikiLume', h1: 'Privacy policy', upd: 'Last updated: 2026-11-09',
    sections: [
      ['Summary', '<p>WikiLume does not collect, store on a server, sell or share any personal data. It has no account system, no analytics and no advertising. It talks only to Wikipedia.</p>'],
      ['What the extension does with your data', '<ul><li><b>Pages you read.</b> WikiLume runs on Wikipedia article pages (<code>*.wikipedia.org</code>) and re-lays out the article that your browser already loaded. The page content is processed locally in your browser and is not sent to us or to anyone else.</li><li><b>Settings.</b> Your choices (theme, font, text size, width, interface language, extra search languages) are stored with <code>chrome.storage.sync</code>, so Chrome may sync them between your own devices through your Google account. We never receive them.</li><li><b>Bookmarks.</b> Saved articles are stored with <code>chrome.storage.local</code> on your device only. Export creates a file on your computer; import reads a file you choose.</li></ul>'],
      ['Network requests', '<p>The only requests made are to Wikipedia\'s own servers (<code>*.wikipedia.org</code>): search suggestions, link previews, article metadata and the images the page already uses. These requests go straight from your browser to Wikipedia, which receives them as it would from any reader and handles them under the <a href="https://foundation.wikimedia.org/wiki/Policy:Privacy_policy">Wikimedia Foundation privacy policy</a>. WikiLume contacts no other server.</p>'],
      ['On-device summary', '<p>The summary feature uses the AI built into Chrome (the Summarizer API), which runs on your device. The article text is not sent to us. Chrome downloads its model once, only after you click to agree, and Chrome\'s own terms and privacy notice apply to that model.</p>'],
      ['Permissions', '<ul><li><code>storage</code>: to keep your settings and bookmarks.</li><li>Content script on <code>*://*.wikipedia.org/*</code>: to re-lay out Wikipedia articles. The extension requests no other site access.</li></ul>'],
      ['What we do not do', '<ul><li>No analytics, telemetry, crash reporting, advertising or tracking of any kind.</li><li>No remote code: everything that runs is inside the extension package.</li><li>No selling or transferring of user data to third parties.</li></ul>'],
      ['Children', '<p>The extension collects no data from anyone, including children.</p>'],
      ['Changes', '<p>If this policy changes, the new version will be published at this address with a new date.</p>'],
      ['Contact', '<p>Questions: <a href="https://github.com/DrummingBird1/wikilume/issues">https://github.com/DrummingBird1/wikilume/issues</a></p>'],
      ['Not affiliated', '<p class="note">WikiLume is an independent project. It is not affiliated with or endorsed by the Wikimedia Foundation. Wikipedia is a trademark of the Wikimedia Foundation. Article text is available under CC BY-SA 4.0.</p>'],
    ],
  },
  he: {
    title: 'מדיניות פרטיות – WikiLume', h1: 'מדיניות פרטיות', upd: 'עודכן לאחרונה: 2026-11-09',
    sections: [
      ['בקצרה', '<p>WikiLume לא אוסף, לא שומר בשרת, לא מוכר ולא משתף שום מידע אישי. אין בו מערכת חשבונות, אין אנליטיקה ואין פרסומות. הוא מדבר רק עם ויקיפדיה.</p>'],
      ['מה התוסף עושה עם המידע שלכם', '<ul><li><b>עמודים שאתם קוראים.</b> התוסף פועל בעמודי ערכים בוויקיפדיה (<code>*.wikipedia.org</code>) ומסדר מחדש את הערך שהדפדפן כבר טען. תוכן העמוד מעובד מקומית בדפדפן ואינו נשלח אלינו או לאף גורם אחר.</li><li><b>הגדרות.</b> הבחירות שלכם (ערכת נושא, גופן, גודל טקסט, רוחב, שפת ממשק, שפות חיפוש נוספות) נשמרות ב-<code>chrome.storage.sync</code>, כך ש-Chrome עשוי לסנכרן אותן בין המכשירים שלכם דרך חשבון Google שלכם. אנחנו אף פעם לא מקבלים אותן.</li><li><b>סימניות.</b> ערכים שמורים נשמרים ב-<code>chrome.storage.local</code> במכשיר שלכם בלבד. ייצוא יוצר קובץ במחשב שלכם; ייבוא קורא קובץ שבחרתם.</li></ul>'],
      ['בקשות רשת', '<p>הבקשות היחידות נשלחות לשרתים של ויקיפדיה עצמה (<code>*.wikipedia.org</code>): הצעות חיפוש, תצוגה מקדימה של קישורים, מטא-נתונים של הערך והתמונות שהעמוד כבר משתמש בהן. הבקשות יוצאות ישירות מהדפדפן שלכם לוויקיפדיה, שמקבלת אותן כמו מכל קורא אחר ומטפלת בהן לפי <a href="https://foundation.wikimedia.org/wiki/Policy:Privacy_policy">מדיניות הפרטיות של קרן ויקימדיה</a>. WikiLume לא פונה לשום שרת אחר.</p>'],
      ['סיכום במכשיר', '<p>תכונת הסיכום משתמשת ב-AI המובנה של Chrome (Summarizer API), שרץ במכשיר שלכם. טקסט הערך לא נשלח אלינו. Chrome מוריד את המודל פעם אחת, רק אחרי שלחצתם להסכמה, ועל המודל חלים התנאים והודעת הפרטיות של Chrome.</p>'],
      ['הרשאות', '<ul><li><code>storage</code>: לשמירת ההגדרות והסימניות.</li><li>סקריפט תוכן על <code>*://*.wikipedia.org/*</code>: לסידור מחדש של ערכי ויקיפדיה. התוסף לא מבקש גישה לאף אתר אחר.</li></ul>'],
      ['מה אנחנו לא עושים', '<ul><li>בלי אנליטיקה, טלמטריה, דיווח קריסות, פרסום או מעקב מכל סוג.</li><li>בלי קוד מרוחק: כל מה שרץ נמצא בתוך חבילת התוסף.</li><li>בלי מכירה או העברה של מידע משתמשים לצדדים שלישיים.</li></ul>'],
      ['ילדים', '<p>התוסף לא אוסף מידע משום אדם, כולל ילדים.</p>'],
      ['שינויים', '<p>אם המדיניות תשתנה, הגרסה החדשה תפורסם בכתובת הזו עם תאריך חדש.</p>'],
      ['יצירת קשר', '<p>שאלות: <a href="https://github.com/DrummingBird1/wikilume/issues">https://github.com/DrummingBird1/wikilume/issues</a></p>'],
      ['אין קשר רשמי', '<p class="note">WikiLume הוא פרויקט עצמאי. הוא אינו קשור לקרן ויקימדיה ואינו מאושר על ידה. Wikipedia הוא סימן מסחרי של קרן ויקימדיה. טקסט הערכים זמין ברישיון CC BY-SA 4.0.</p>'],
    ],
  },
};

const shots = ['1-reader-light', '2-dark-theme', '3-hebrew-rtl', '4-timeline', '5-search-languages'];

const head = (t, title, desc) => `<!doctype html>
<html lang="${t.lang}" dir="${t.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="icon" href="${t.pre}img/icon.png">
<link rel="stylesheet" href="${t.pre}style.css">
</head>
<body>
<div class="wrap"><header class="top"><a class="brand" href="${t.home}"><img src="${t.pre}img/icon.png" alt="">WikiLume</a>
<nav><a href="${t.home}#features">${t.nav[0]}</a><a href="${t.priv}">${t.nav[1]}</a><a href="${t.other[0]}" hreflang="${t.lang === 'en' ? 'he' : 'en'}">${t.other[1]}</a></nav></header></div>
`;
const foot = (t) => `<footer><div class="wrap">${t.foot}</div></footer>
</body>
</html>
`;

// the files in site/img are copies of the icon and the store screenshots
fs.mkdirSync(path.join(root, 'site', 'img'), { recursive: true });
fs.copyFileSync(path.join(root, 'icons', 'icon128.png'), path.join(root, 'site', 'img', 'icon.png'));
for (const s of shots) {
  const src = path.join(root, 'store', 'screenshots', s + '.png');
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(root, 'site', 'img', s + '.png'));
}

for (const k of ['en', 'he']) {
  const t = L[k];
  const p = P[k];
  const dir = k === 'en' ? 'site/' : 'site/he/';
  write(dir + 'index.html', head(t, t.title, t.desc) + `<section class="hero"><div class="wrap"><h1>${t.hero[0]}</h1><p>${t.hero[1]}</p>
<a class="btn" href="https://chromewebstore.google.com/detail/wikilume-%E2%80%93-clean-wikipedi/ijfhflgjhfnjfcjhcbfhgedpmgkikdlj">${t.cta[0]}</a><a class="btn ghost" href="#features">${t.cta[1]}</a></div></section>
<div class="wrap">
<img class="shot" src="${t.pre}img/${k === 'he' ? '3-hebrew-rtl' : '1-reader-light'}.png" width="1280" height="800" alt="${t.title}">
<h2 id="features">${t.featH}</h2>
<div class="grid">
${t.feats.map(([h, d]) => `<div class="card"><h3>${h}</h3><p>${d}</p></div>`).join('\n')}
</div>
<h2>${t.shotsH}</h2>
<div class="gallery">
${shots.map((s, i) => `<figure><img class="shot" loading="lazy" src="${t.pre}img/${s}.png" width="1280" height="800" alt="${t.caps[i]}"><figcaption>${t.caps[i]}</figcaption></figure>`).join('\n')}
</div>
<h2>${t.privH}</h2>
<p>${t.priv1} <a href="${t.priv}">${t.priv2}</a></p>
</div>
` + foot(t));
  write(dir + 'privacy.html', head(t, p.title, p.title) + `<main class="wrap doc"><h1>${p.h1}</h1><p>${p.upd}</p>
${p.sections.map(([h, b]) => `<h2>${h}</h2>\n${b}`).join('\n')}
</main>
` + foot(t));
}
console.log('site written');
