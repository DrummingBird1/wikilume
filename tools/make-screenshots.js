// Takes the Chrome Web Store screenshots: real Wikipedia articles (through tools/wiki-proxy.js, which injects the extension's own
// scripts and CSS) rendered by headless Chrome at 1280x800. (An unpacked extension loaded with --load-extension did not inject on
// https sites in headless Chrome 157, hence the proxy.)
// Run: node tools/make-screenshots.js      (needs Chrome and internet access; writes store/screenshots/*.png)
// This is a manual tool, not part of `npm run e2e` (the tests must never touch the real site).
'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, sleep, startChrome } = require('../test/e2e/harness');
const proxy = require('./wiki-proxy');

const PORTS = { 'en.wikipedia.org': 8801, 'he.wikipedia.org': 8802 };

const OUT = path.join(ROOT, 'store', 'screenshots');
const W = 1280;
const H = 800;

// name, url, theme, UI language, what to do before the shot
const SHOTS = [
  { name: '1-reader-light', path: '/wiki/Ada_Lovelace', wiki: 'en.wikipedia.org', theme: 'light', ui: 'en', scroll: 0 },
  { name: '2-dark-theme', path: '/wiki/Alan_Turing', wiki: 'en.wikipedia.org', theme: 'dark', ui: 'en', scroll: 0 },
  { name: '3-hebrew-rtl', path: '/wiki/אלברט_איינשטיין', wiki: 'he.wikipedia.org', theme: 'light', ui: 'he', scroll: 0 },
  { name: '4-timeline', path: '/wiki/Alan_Turing', wiki: 'en.wikipedia.org', theme: 'sepia', ui: 'en', scroll: 0, open: '.wf-tl-chip' },
  { name: '5-search-languages', path: '/wiki/Ada_Lovelace', wiki: 'en.wikipedia.org', theme: 'light', ui: 'en', scroll: 0, search: 'ada' },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const servers = await Promise.all(Object.entries(PORTS).map(([wiki, port]) => proxy.start(wiki, port)));
  const browser = await startChrome({ real: true });
  try {
    const tab = await browser.newTab('about:blank');
    await tab.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await tab.send('Emulation.setScrollbarsHidden', { hidden: true });
    for (const s of SHOTS) {
      const origin = `http://127.0.0.1:${PORTS[s.wiki]}`;
      await tab.nav(origin + '/wiki/Special:Random?x=0', 500).catch(() => {});
      await tab.nav(origin + '/robots.txt', 800);
      await tab.ev(`localStorage.setItem('wikifree-settings', JSON.stringify({ theme: ${JSON.stringify(s.theme)}, uiLang: ${JSON.stringify(s.ui)} }))`);
      await tab.nav(origin + s.path, 7000);
      const state = await tab.ev(`({ on: document.documentElement.classList.contains('wf-on'), root: !!document.getElementById('wf-root'), theme: document.documentElement.dataset.wfTheme })`);
      if (!state.root) { console.error('reader did not start for', s.name, state); continue; }
      await tab.ev(`document.documentElement.dataset.wfTheme = ${JSON.stringify(s.theme)}`);
      if (s.open) { await tab.ev(`document.querySelector(${JSON.stringify(s.open)}).click()`); await sleep(800); }
      if (s.search) {
        await tab.ev(`(async () => {
          const sl = document.querySelector('.wf-search-lang');
          sl.querySelector('.wf-btn').click();
          for (const code of ['he', 'fr']) {
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
      const file = path.join(OUT, s.name + '.png');
      fs.writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
      console.log('wrote', path.relative(ROOT, file), state);
    }
    tab.close();
  } finally {
    await browser.close();
    servers.forEach((v) => v.close());
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
