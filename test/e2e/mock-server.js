// Local test harness: serves synthetic MediaWiki-shaped article pages (hand-written, not copied from Wikipedia),
// mock API endpoints, and the extension files, so the content script can be exercised in a normal browser tab.
const http = require('http');
const fs = require('fs');
const path = require('path');
const EXT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const PORT = Number(process.env.MOCK_PORT) || 8767;

const para = (s) => `<p>${s}</p>`;
const LOREM = [
  'The early work of the subject concerned <a href="/wiki/Charles_Example" title="Charles Example">Charles Example</a> and the design of the <a href="/wiki/Analytical_Engine" title="Analytical Engine">Analytical Engine</a>, a mechanical general-purpose computer.<sup id="cite_ref-1" class="reference"><a href="#cite_note-1">[1]</a></sup>',
  'Later writings explored how such machines might be applied to music, graphics and general symbolic manipulation, a notion that was unusually far-sighted for its day.<sup id="cite_ref-2" class="reference"><a href="#cite_note-2">[2]</a></sup> A red link to <a href="/w/index.php?title=Missing_Page&amp;action=edit&amp;redlink=1" class="new" title="Missing Page (page does not exist)">a missing page</a> appears here.',
  'Contemporaries described the notes as the most complete account of the engine then available, running to several times the length of the original memoir they annotated, and containing what is often cited as the first published algorithm intended for a machine.',
  'The correspondence that survives shows steady collaboration over a number of years, interrupted by illness, and a shared interest in applying mathematics to practical problems of the age.',
];
const longText = () => LOREM.map(para).join('\n') + LOREM.map(para).join('\n');

function sections(prefix, count) {
  let out = '';
  for (let i = 1; i <= count; i++) {
    out += `<div class="mw-heading mw-heading2"><h2 id="${prefix}_${i}">${prefix} section ${i}</h2><span class="mw-editsection"><span class="mw-editsection-bracket">[</span><a href="/w/index.php?action=edit&amp;section=${i}">edit</a><span class="mw-editsection-bracket">]</span></span></div>`;
    out += longText();
    out += para(`In ${1830 + i * 3} the subject published a notable work on topic ${i}, which was widely read in the following years. A later reprint appeared in ${1860 + i * 5} to renewed interest.`);
    if (i === 3) {
      out += `<figure class="mw-default-size"><div class="thumb tleft"><div class="thumbinner" style="width:222px;"><a href="/wiki/File:Wide.jpg" class="image"><img class="thumbimage" src="/img/thumb/a/ab/Wide.jpg/220px-Wide.jpg" data-file-width="3000" data-file-height="2000" width="220" height="147" alt="Wide test"></a><div class="thumbcaption">A second picture for the lightbox gallery.</div></div></div></figure>`;
    }
    if (i % 2 === 1) {
      out += `<div class="mw-heading mw-heading3"><h3 id="${prefix}_${i}_sub">Subsection ${i}.1</h3><span class="mw-editsection">[edit]</span></div>` + para(LOREM[0]);
    }
    if (i === 1) {
      out += `<figure class="mw-default-size" typeof="mw:File/Thumb"><div class="thumb tright"><div class="thumbinner" style="width:222px;"><a href="/wiki/File:Portrait.svg" class="image"><img class="thumbimage" src="/img/portrait.svg" width="220" height="220" alt=""></a><div class="thumbcaption">A portrait used as a test image with a fairly long caption to see wrapping.</div></div></div></figure>`;
    }
    if (i === 2) {
      out += `<table class="wikitable"><caption>Test table</caption><tbody><tr><th>Year</th><th>Event</th><th>Place</th><th>Notes</th><th>More notes</th><th>Even more notes</th><th>Wide column wide column</th></tr>` +
        `<tr><td>1833</td><td>Meeting</td><td>London</td><td style="background:#ffdddd">Red cell</td><td>text</td><td>text</td><td>some long content in this cell to force the table wider than the column</td></tr>` +
        `<tr><td>1843</td><td>Publication</td><td>London</td><td style="background:#ddffdd">Green cell</td><td>text</td><td>text</td><td>some long content in this cell to force the table wider than the column</td></tr></tbody></table>`;
      // current MediaWiki thumbnail markup: a bare <figure> with a <figcaption>, light colours from Wikipedia's own CSS
      out += `<figure class="mw-default-size" typeof="mw:File/Thumb" id="modern-thumb" style="background:#f8f9fa;border:1px solid #c8ccd1;padding:3px"><a href="/wiki/File:Portrait.svg" class="mw-file-description"><img src="/img/portrait.svg" width="220" height="220" alt=""></a><figcaption style="color:#202122;background:#f8f9fa">A modern figure caption.</figcaption></figure>`;
      out += `<table id="wide-bracket" style="white-space:nowrap;border-collapse:separate"><tbody><tr><td>Round of 16 bracket cell one</td><td>Quarter-finals bracket cell two</td><td>Semi-finals bracket cell three</td><td>Final bracket cell four</td><td>Third place bracket cell five</td><td>Trailing cell six</td></tr></tbody></table>`;
      out += `<p>Inline formula: <span class="mwe-math-element"><img class="mwe-math-fallback-image-inline" src="/img/math.svg" alt="x squared" style="vertical-align:-0.3ex;height:2.3ex;"></span> and a box:</p>`;
      out += `<div style="background:#eaf3ff;border:1px solid #99b;padding:8px">A light blue note box with inline background.</div>`;
      out += `<table class="box-Unreferenced plainlinks metadata ambox ambox-content"><tbody><tr><td class="mbox-text">This article needs additional citations. (ambox)</td></tr></tbody></table>`;
    }
  }
  return out;
}

function articleBody(lang) {
  const he = lang === 'he';
  const infobox = `<table class="infobox biography vcard"><tbody>` +
    `<tr><th colspan="2" class="infobox-above" style="background:#cfe2f3;font-size:125%">${he ? 'עדה דוגמה' : 'Ada Example'}</th></tr>` +
    `<tr><td colspan="2" class="infobox-image"><a href="/wiki/File:Portrait.svg" class="image"><img src="/img/portrait.svg" width="220" height="220" alt=""></a></td></tr>` +
    `<tr><th scope="row" class="infobox-label">Born</th><td class="infobox-data">10 December 1815<br>London</td></tr>` +
    `<tr><th scope="row" class="infobox-label">Died</th><td class="infobox-data">27 November 1852</td></tr>` +
    `<tr><th scope="row" class="infobox-label">Known for</th><td class="infobox-data"><a href="/wiki/Analytical_Engine">Analytical Engine</a> notes</td></tr>` +
    `</tbody></table>`;
  const navbox = `<div class="navbox" style="border:1px solid #a2a9b1;background:#fdfdfd;padding:3px"><table class="nowraplinks" style="background:#fdfdfd;width:100%"><tbody><tr><th class="navbox-title" style="background:#ccccff;text-align:center">Navigation box</th></tr><tr><td class="navbox-list" style="background:#f8f9fa"><a href="/wiki/Charles_Example">Charles Example</a> · <a href="/wiki/Analytical_Engine">Analytical Engine</a></td></tr></tbody></table></div>`;
  const refs = `<div class="mw-heading mw-heading2"><h2 id="References">References</h2><span class="mw-editsection">[edit]</span></div>` +
    `<div class="reflist"><ol class="references"><li id="cite_note-1"><span class="mw-cite-backlink"><a href="#cite_ref-1">↑</a></span> <span class="reference-text">Example, Charles (1840). <i>Memoir on the engine</i>. London: Fictional Press.</span></li>` +
    `<li id="cite_note-2"><span class="mw-cite-backlink"><a href="#cite_ref-2">↑</a></span> <span class="reference-text">Notes upon the memoir (1843). <a class="external text" href="https://example.org/">Example.org</a>.</span></li></ol></div>`;
  return `<div class="mw-content-${he ? 'rtl' : 'ltr'} mw-parser-output" lang="${lang}" dir="${he ? 'rtl' : 'ltr'}">` +
    `<div class="hatnote navigation-not-searchable">${he ? 'הערך הזה עוסק בדמות בדיונית.' : 'This article is about a fictional person. For other uses, see <a href="/wiki/Example_(disambiguation)">Example</a>.'}</div>` +
    infobox +
    `<p><b>${he ? 'עדה דוגמה' : 'Ada Example'}</b> ${he ? 'הייתה מתמטיקאית וסופרת בדיונית שכתבה על מכונות חישוב.' : 'was a fictional mathematician and writer, known for her notes on a proposed mechanical computer.'}<sup id="cite_ref-1b" class="reference"><a href="#cite_note-1">[1]</a></sup></p>` +
    para(LOREM[2]) +
    sections(he ? 'Heb' : 'History', 6) + refs + navbox + `</div>`;
}

function page(name, lang) {
  const he = lang === 'he';
  const dir = he ? 'rtl' : 'ltr';
  const title = he ? 'עדה דוגמה' : 'Ada Example';
  return `<!DOCTYPE html>
<html class="client-nojs" lang="${lang}" dir="${dir}">
<head><meta charset="UTF-8"><title>${title} - Wikipedia</title>
<link rel="canonical" href="http://127.0.0.1:${PORT}/wiki/${name}">
<script>(RLCONF={"wgNamespaceNumber":0,"wgAction":"view","wgIsMainPage":false});</script>
<style>
/* a rough imitation of Wikipedia's own CSS, to check that our overrides win */
body{margin:0;background:#f6f6f6;font-family:sans-serif;color:#202122}
.mw-page-container{background:#fff;max-width:960px;margin:0 auto;padding:16px}
h1,h2{font-family:'Linux Libertine',Georgia,'Times',serif;font-weight:normal}
.mw-heading2{border-bottom:1px solid #a2a9b1;margin-bottom:.5em}
.mw-body-content{font-size:.875em;line-height:1.6}
.mw-body-content p{margin:.5em 0}
a{color:#0645ad;text-decoration:none} a.new{color:#ba0000}
.infobox{float:right;clear:right;width:22em;margin:.5em 0 1em 1em;border:1px solid #a2a9b1;background:#f8f9fa;font-size:88%;line-height:1.5em;border-spacing:3px;padding:.2em}
.infobox th,.infobox td{vertical-align:top;padding:.2em}
.thumb.tright{float:right;clear:right;margin:.5em 0 1.3em 1.4em}
.thumbinner{border:1px solid #c8ccd1;background:#f8f9fa;font-size:94%;overflow:hidden;padding:3px}
.wikitable{background:#f8f9fa;border:1px solid #a2a9b1;border-collapse:collapse;margin:1em 0}
.wikitable th,.wikitable td{border:1px solid #a2a9b1;padding:.2em .4em}.wikitable th{background:#eaecf0;text-align:center}
.ambox{border:1px solid #a2a9b1;border-inline-start:10px solid #36c;background:#fbfbfb;margin:0 10%;width:80%}
.navbox{clear:both;margin-top:1em;font-size:88%}
.hatnote{font-style:italic;padding-left:1.6em;margin-bottom:.5em}
.reference{line-height:1}
.catlinks{border:1px solid #a2a9b1;background:#f8f9fa;padding:5px;margin-top:1em;clear:both}
.mw-editsection{font-size:small;margin-left:1em}
#footer{color:#54595d;font-size:.75em;padding:2em 0}
</style>
<link rel="stylesheet" href="/ext/src/reader.css">
<script src="/ext/src/i18n.js"></script>
<script src="/ext/src/bookmarks.js"></script>
<script src="/ext/src/timeline.js"></script>
<script src="/ext/src/summary.js"></script>
<script src="/ext/src/content.js"></script>
</head>
<body class="skin-vector-2022 ns-0 ns-subject page-${name} mw-editable action-view">
<div class="vector-header-container" style="background:#eee;padding:10px">ORIGINAL WIKIPEDIA HEADER (should be hidden)</div>
<div class="mw-page-container">
<nav id="mw-panel">ORIGINAL SIDEBAR (should be hidden) <ul><li id="n-mainpage-description"><a href="/wiki/Main_Page">Main page</a></li></ul></nav>
<main id="content" class="mw-body">
<header class="mw-body-header"><h1 id="firstHeading" class="firstHeading mw-first-heading"><span class="mw-page-title-main">${title}</span></h1></header>
<div id="bodyContent" class="vector-body">
<div id="contentSub"><div id="mw-content-subtitle"></div></div>
<div id="mw-content-text" class="mw-body-content">${articleBody(lang)}</div>
<div id="catlinks" class="catlinks"><div id="mw-normal-catlinks" class="mw-normal-catlinks"><a href="/wiki/Special:Categories">Categories</a>: <ul><li><a href="/wiki/Category:Fictional_people">Fictional people</a></li><li><a href="/wiki/Category:Test_pages">Test pages</a></li></ul></div></div>
</div></main>
<footer id="footer">ORIGINAL FOOTER (should be hidden)</footer>
</div>
</body></html>`;
}

const svg = {
  'portrait.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f59e0b"/><stop offset="1" stop-color="#be185d"/></linearGradient></defs><rect width="220" height="220" fill="url(#g)"/><circle cx="110" cy="85" r="38" fill="#fff" opacity=".9"/><path d="M40 220c0-48 31-80 70-80s70 32 70 80z" fill="#fff" opacity=".9"/></svg>',
  'wide.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="400" viewBox="0 0 960 400"><defs><linearGradient id="w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0ea5e9"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs><rect width="960" height="400" fill="url(#w)"/><circle cx="700" cy="120" r="60" fill="#fde68a"/><path d="M0 400 L260 180 L420 330 L600 210 L960 400Z" fill="#0f172a" opacity=".55"/></svg>',
  'math.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="24" viewBox="0 0 40 24"><text x="2" y="19" font-size="20" font-family="serif" fill="#000">x²+1</text></svg>',
};

const SUMMARY = {
  title: 'Charles Example', description: 'Fictional inventor of mechanical engines', lang: 'en', dir: 'ltr',
  extract: 'Charles Example was a fictional polymath and inventor who designed an early mechanical computer. His designs were never fully built in his lifetime, but later reconstructions demonstrated that they would have worked as intended.',
  thumbnail: { source: '/img/portrait.svg', width: 220, height: 220 },
};

const json = (res, o) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = decodeURIComponent(u.pathname);
  if (p.startsWith('/ext/')) {
    const f = path.resolve(EXT, p.slice(5));
    if (!f.startsWith(EXT)) { res.writeHead(403); return res.end(); }
    return fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('nf'); }
      const t = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }[path.extname(f)] || 'text/plain';
      res.writeHead(200, { 'Content-Type': t, 'Cache-Control': 'no-store' }); res.end(d);
    });
  }
  if (p.startsWith('/img/thumb/')) { res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); return res.end(svg['portrait.svg']); }
  if (p.startsWith('/img/')) { const s = svg[p.slice(5)]; if (s) { res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); return res.end(s); } }
  if (p === '/w/api.php') {
    const wide = (u.searchParams.get('titles') || '').includes('Wide');
    return json(res, { query: { pages: [{ pageid: 1, title: 'Ada Example', description: 'Fictional mathematician and writer',
      thumbnail: wide ? { source: '/img/wide.svg', width: 960, height: 400 } : { source: '/img/portrait.svg', width: 220, height: 220 },
      original: wide ? { source: '/img/wide.svg', width: 3000, height: 1250 } : undefined, revisions: [{ timestamp: '2026-10-03T10:20:00Z' }],
      langlinks: [['he', 'עברית', 'Hebrew', 'עדה דוגמה'], ['fr', 'français', 'French', 'Ada Exemple'], ['de', 'Deutsch', 'German', 'Ada Beispiel'], ['es', 'español', 'Spanish', 'Ada Ejemplo']].map(([lang, autonym, langname, title]) => ({ lang, autonym, langname, title, url: `https://${lang}.example.org/wiki/${encodeURIComponent(title)}` })) }] } });
  }
  if (p === '/w/rest.php/v1/search/title') {
    const q = (u.searchParams.get('q') || '').toLowerCase();
    const all = [['Ada_Example', 'Ada Example', 'Fictional mathematician'], ['Ada_Lovelace_Day', 'Ada Lovelace Day', 'Annual celebration'], ['Adagio', 'Adagio', 'Musical tempo']];
    return json(res, { pages: all.filter((x) => x[1].toLowerCase().includes(q)).map(([key, title, description]) => ({ id: 1, key, title, description, thumbnail: { url: '/img/portrait.svg' } })) });
  }
  if (p.startsWith('/api/rest_v1/page/summary/')) return json(res, SUMMARY);
  if (p === '/wiki/Main_Page') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<!doctype html><title>Main</title><body class="mainpage"><p>main page</p>'); }
  if (p.startsWith('/wiki/')) {
    const name = p.slice(6);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(page(name, name.startsWith('Hebrew') ? 'he' : 'en'));
  }
  res.writeHead(404); res.end('nf');
}).listen(PORT, '127.0.0.1', () => console.log('test server on ' + PORT));
