// Needs the mock server (node test/e2e/mock-server.js, or just run `npm run e2e`).
// Loads the real extension into headless Chrome and checks cover, timeline, summary consent, lightbox and multi-language search.
// Requests to *.wikipedia.org are answered locally. The summary step never clicks "download": that would fetch a multi-GB model.
'use strict';
const { MOCK_PORT, startChrome, makeExpect } = require('./harness');

const PAGE = `http://127.0.0.1:${MOCK_PORT}/wiki/Wide_Test`;
const WIKI = {
  he: [['עדה דוגמה', 'מתמטיקאית בדיונית', 1]],
  fr: [['Ada Exemple', 'mathématicienne fictive', 1]],
};

function intercept(req) {
  const m = req.url.match(/^https:\/\/([a-z0-9-]+)\.wikipedia\.org\//);
  const pages = ((m && WIKI[m[1]]) || []).map(([title, description, index]) => ({ title, description, index }));
  return { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ query: { pages } }) };
}

(async () => {
  const { expect, report } = makeExpect();
  const browser = await startChrome({ intercept });
  try {
    const tab = await browser.newTab(PAGE);

    const layout = await tab.ev(`({
      root: !!document.getElementById('wf-root'),
      cover: !!document.querySelector('.wf-cover img'),
      timelineChip: !!document.querySelector('.wf-tl-chip') && !document.querySelector('.wf-tl-chip').hidden,
      summaryChip: !!document.querySelector('.wf-sum-chip'),
      bookmarkChip: !!document.querySelector('.wf-bm-chip'),
      searchLangButton: !!document.querySelector('.wf-search-lang .wf-btn'),
    })`);
    expect('reader layout is built', layout.root, layout);
    expect('landscape lead image becomes a cover banner', layout.cover);
    expect('timeline chip appears when the article has dates', layout.timelineChip);
    expect('summary, bookmark and search-language controls exist', layout.summaryChip && layout.bookmarkChip && layout.searchLangButton, layout);

    const wide = await tab.ev(`(() => {
      const t = document.getElementById('wide-bracket');
      const art = document.querySelector('.wf-article').getBoundingClientRect();
      return { tableRight: Math.round(t.getBoundingClientRect().right), articleRight: Math.round(art.right), docW: document.documentElement.scrollWidth, vw: innerWidth, scrolls: t.scrollWidth > t.clientWidth };
    })()`);
    expect('a wide class-less table scrolls inside the column and does not widen the page', wide.tableRight <= wide.articleRight + 1 && wide.docW <= wide.vw + 1 && wide.scrolls, wide);

    const fig = await tab.ev(`(() => {
      const prevTheme = document.documentElement.dataset.wfTheme;
      document.documentElement.dataset.wfTheme = 'dark';
      const f = document.getElementById('modern-thumb');
      const lum = (c) => { const m = c.match(/[\\d.]+/g).map(Number); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
      const r = { figBg: getComputedStyle(f).backgroundColor, capColor: getComputedStyle(f.querySelector('figcaption')).color };
      r.figLum = Math.round(lum(r.figBg)); r.capLum = Math.round(lum(r.capColor));
      document.documentElement.dataset.wfTheme = prevTheme;
      return r;
    })()`);
    expect('modern <figure> thumbnails follow the dark theme (dark box, light caption)', fig.figLum < 80 && fig.capLum > 110, fig);

    const timeline = await tab.ev(`(async () => { document.querySelector('.wf-tl-chip').click(); await new Promise(r => setTimeout(r, 200)); return { items: document.querySelectorAll('.wf-tl-item').length, open: !document.querySelector('.wf-tlp').hidden }; })()`);
    expect('timeline panel opens with events', timeline.open && timeline.items >= 4, timeline);

    // whatever state this Chrome is in, the summary must end in a sane panel and never start a download by itself
    const summary = await tab.ev(`(async () => {
      document.querySelector('.wf-sum-chip').click();
      const p = document.querySelector('.wf-sum');
      const read = () => ({ consent: !!p.querySelector('button.wf-chip'), lead: !!p.querySelector('.wf-lead'), items: p.querySelectorAll('.wf-sum-out li').length, text: p.querySelector('.wf-panel-body').textContent.length });
      // Summarizer.availability() can take several seconds on a cold profile: wait for a settled state, up to 10 s
      let s = read();
      for (let i = 0; i < 50 && !(s.consent || s.lead || s.items > 0); i++) {
        await new Promise(r => setTimeout(r, 200));
        s = read();
      }
      return s;
    })()`);
    expect('summary shows consent, a fallback lead, or a result', summary.consent || summary.lead || summary.items > 0, summary);

    const lightbox = await tab.ev(`(async () => {
      document.querySelector('.wf-cover img').click();
      await new Promise(r => setTimeout(r, 300));
      const lb = document.querySelector('.wf-lb');
      const open = !lb.hidden;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return { open, closedByEsc: lb.hidden };
    })()`);
    expect('cover opens the lightbox and Esc closes it', lightbox.open && lightbox.closedByEsc, lightbox);

    const search = await tab.ev(`(async () => {
      const sl = document.querySelector('.wf-search-lang');
      sl.querySelector('.wf-btn').click();
      for (const code of ['he', 'fr']) {
        const row = [...sl.querySelectorAll('.wf-sl-row')].find(x => x.querySelector('small').textContent === code);
        const cb = row.querySelector('input'); cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await new Promise(r => setTimeout(r, 300));
      document.body.click();
      const inp = document.querySelector('.wf-search input'); inp.focus(); inp.value = 'ada'; inp.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 1200));
      return { count: sl.querySelector('.wf-sl-count').textContent, badges: [...document.querySelectorAll('.wf-suggest .wf-sl-badge')].map(b => b.textContent).sort() };
    })()`);
    expect('chosen languages are counted on the button', search.count === '+2', search);
    expect('results from the other wikis carry language badges', JSON.stringify(search.badges) === JSON.stringify(['FR', 'HE']), search);

    await tab.nav(PAGE);
    const after = await tab.ev(`document.querySelector('.wf-sl-count').textContent`);
    expect('language choice survives a reload (chrome.storage.sync)', after === '+2', after);

    // opening a link with a #fragment must land on the section and highlight it in the table of contents
    await tab.nav(PAGE + '?jump=1#History_3');
    const jump = await tab.ev(`(async () => {
      await new Promise(r => setTimeout(r, 1500));
      const h = document.getElementById('History_3');
      const active = document.querySelector('.wf-toc li.active > a');
      return { top: Math.round(h.getBoundingClientRect().top), scrolled: Math.round(scrollY), active: active && active.textContent, heading: h.textContent.replace(/\\[.*$/, '').trim() };
    })()`);
    expect('a #fragment link scrolls to the section and the contents highlight it', jump.scrolled > 0 && jump.top >= 0 && jump.top <= 110 && jump.active === jump.heading, jump);

    expect('no console errors or exceptions in the page', browser.problems.length === 0, browser.problems);
    tab.close();
  } catch (e) {
    console.error('E2E ERROR', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
  if (!process.exitCode) process.exitCode = report('chrome-features');
})();
