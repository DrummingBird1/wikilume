// Takes 5 varied store screenshots for each of the 8 listing languages, from that language's own Wikipedia (real articles, through
// tools/wiki-proxy.js, which injects the extension's own scripts and CSS), 1280x800.
// The extension's interface exists in English and Hebrew only, so the UI language is 'he' for Hebrew and 'en' for the rest; the
// article, its language and its right-to-left or Japanese typography differ per shot set.
// Run: node tools/make-screenshots-langs.js [code ...]   (needs Chrome and internet access; writes store/screenshots/<code>/*.png)
// Manual tool, like make-screenshots.js: never part of `npm run e2e`.
'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, sleep, startChrome } = require('../test/e2e/harness');
const proxy = require('./wiki-proxy');

const W = 1280;
const H = 800;
const OUT = path.join(ROOT, 'store', 'screenshots');

// code → [host language, UI language, article for the light/dark/help shots, article for the timeline shot, search text, two extra search languages]
const LANGS = {
  en: ['en', 'en', '/wiki/Ada_Lovelace', '/wiki/Alan_Turing', 'ada', ['he', 'fr']],
  he: ['he', 'he', '/wiki/' + encodeURIComponent('אלברט_איינשטיין'), '/wiki/' + encodeURIComponent('אלן_טיורינג'), 'איינשטיין', ['en', 'fr']],
  es: ['es', 'en', '/wiki/Miguel_de_Cervantes', '/wiki/Alan_Turing', 'cervantes', ['en', 'fr']],
  fr: ['fr', 'en', '/wiki/' + encodeURIComponent('Napoléon_Ier'), '/wiki/Marie_Curie', 'curie', ['en', 'de']],
  de: ['de', 'en', '/wiki/' + encodeURIComponent('Johann_Wolfgang_von_Goethe'), '/wiki/Albert_Einstein', 'goethe', ['en', 'fr']],
  'pt-BR': ['pt', 'en', '/wiki/Santos-Dumont', '/wiki/' + encodeURIComponent('Machado_de_Assis'), 'santos', ['en', 'es']],
  ru: ['ru', 'en', '/wiki/' + encodeURIComponent('Пушкин,_Александр_Сергеевич'), '/wiki/' + encodeURIComponent('Гагарин,_Юрий_Алексеевич'), 'пушкин', ['en', 'de']],
  ja: ['ja', 'en', '/wiki/' + encodeURIComponent('夏目漱石'), '/wiki/' + encodeURIComponent('織田信長'), '夏目', ['en', 'zh']],
};

function shots(code) {
  const [lang, ui, main, tl, q, extra] = LANGS[code];
  return [
    { name: '1-reader-light', path: main, theme: 'light' },
    { name: '2-dark-theme', path: main, theme: 'dark' },
    { name: '3-timeline', path: tl, theme: 'sepia', open: '.wf-tl-chip' },
    { name: '4-search-languages', path: main, theme: 'light', search: q, extra },
    { name: '5-keyboard-shortcuts', path: tl, theme: 'light', help: true },
  ].map((s) => Object.assign(s, { lang, ui }));
}

(async () => {
  const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(LANGS);
  const hosts = [...new Set(wanted.map((c) => LANGS[c][0] + '.wikipedia.org'))];
  const ports = {};
  hosts.forEach((h, i) => { ports[h] = 8810 + i; });
  const servers = await Promise.all(hosts.map((h) => proxy.start(h, ports[h])));
  const browser = await startChrome({ real: true });
  try {
    const tab = await browser.newTab('about:blank');
    await tab.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await tab.send('Emulation.setScrollbarsHidden', { hidden: true });
    for (const code of wanted) {
      const dir = path.join(OUT, code);
      fs.mkdirSync(dir, { recursive: true });
      for (const s of shots(code)) {
        const origin = `http://127.0.0.1:${ports[s.lang + '.wikipedia.org']}`;
        await tab.nav(origin + '/robots.txt', 800);
        await tab.ev(`localStorage.setItem('wikilume-settings', JSON.stringify({ theme: ${JSON.stringify(s.theme)}, uiLang: ${JSON.stringify(s.ui)} }))`);
        await tab.nav(origin + s.path, 7000);
        const state = await tab.ev(`({ root: !!document.getElementById('wf-root'), theme: document.documentElement.dataset.wfTheme, title: (document.querySelector('h1') || {}).textContent })`);
        if (!state.root) { console.error('reader did not start for', code, s.name, state); continue; }
        await tab.ev(`document.documentElement.dataset.wfTheme = ${JSON.stringify(s.theme)}`);
        if (s.open) {
          const found = await tab.ev(`(() => { const c = document.querySelector(${JSON.stringify(s.open)}); if (c && !c.hidden) { c.click(); return true; } return false; })()`);
          if (!found) console.error('  note: no timeline chip for', code, s.path);
          await sleep(800);
        }
        if (s.help) { await tab.ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))`); await sleep(500); }
        if (s.search) {
          await tab.ev(`(async () => {
            const sl = document.querySelector('.wf-search-lang');
            sl.querySelector('.wf-btn').click();
            for (const code of ${JSON.stringify(s.extra)}) {
              const row = [...sl.querySelectorAll('.wf-sl-row')].find(x => x.querySelector('small').textContent === code);
              if (row) { const cb = row.querySelector('input'); cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
            }
            await new Promise(r => setTimeout(r, 300));
            document.body.click();
            const inp = document.querySelector('.wf-search input'); inp.focus(); inp.value = ${JSON.stringify(s.search)}; inp.dispatchEvent(new Event('input', { bubbles: true }));
          })()`);
          await sleep(2500);
        }
        await sleep(1000);
        const shot = await tab.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        const file = path.join(dir, s.name + '.png');
        fs.writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
        console.log('wrote', path.relative(ROOT, file), JSON.stringify(state.title));
      }
    }
    tab.close();
  } finally {
    await browser.close();
    servers.forEach((v) => v.close());
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
