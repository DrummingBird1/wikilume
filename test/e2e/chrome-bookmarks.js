// Needs the mock server (node test/e2e/mock-server.js, or just run `npm run e2e`).
// Real-Chrome check of bookmarks: chrome.storage.local persistence and live sync between two tabs.
'use strict';
const { MOCK_PORT, startChrome, makeExpect } = require('./harness');

const PAGE = `http://127.0.0.1:${MOCK_PORT}/wiki/Ada_Example`;
const STATE = `(() => {
  const c = document.querySelector('.wf-bm-chip');
  return { saved: !!c && c.classList.contains('saved'), rows: document.querySelectorAll('.wf-bm-item').length };
})()`;

(async () => {
  const { expect, report } = makeExpect();
  const browser = await startChrome();
  try {
    const a = await browser.newTab(PAGE);
    expect('starts unsaved with an empty list', JSON.stringify(await a.ev(STATE)) === JSON.stringify({ saved: false, rows: 0 }));

    await a.ev(`document.querySelector('.wf-bm-chip').click()`);
    await new Promise((r) => setTimeout(r, 600));
    expect('saving updates the chip and the list', JSON.stringify(await a.ev(STATE)) === JSON.stringify({ saved: true, rows: 1 }));

    await a.nav(PAGE);
    expect('the bookmark survives a reload', JSON.stringify(await a.ev(STATE)) === JSON.stringify({ saved: true, rows: 1 }));

    const b = await browser.newTab(PAGE);
    expect('a second tab sees the bookmark', JSON.stringify(await b.ev(STATE)) === JSON.stringify({ saved: true, rows: 1 }));

    await a.ev(`document.querySelector('.wf-bm-chip').click()`);
    await new Promise((r) => setTimeout(r, 800));
    expect('removing in tab A works', JSON.stringify(await a.ev(STATE)) === JSON.stringify({ saved: false, rows: 0 }));
    expect('tab B follows through storage.onChanged', JSON.stringify(await b.ev(STATE)) === JSON.stringify({ saved: false, rows: 0 }));

    expect('no console errors or exceptions in the page', browser.problems.length === 0, browser.problems);
    a.close();
    b.close();
  } catch (e) {
    console.error('E2E ERROR', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
  if (!process.exitCode) process.exitCode = report('chrome-bookmarks');
})();
