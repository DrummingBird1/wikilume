// Real-Chrome check of the reader features (cover, timeline, summary state, multi-language search, lightbox) with the
// extension loaded in a throw-away profile. Requests to *.wikipedia.org are intercepted and answered locally, so no
// traffic goes to Wikipedia.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const SRC = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PAGE = 'http://127.0.0.1:8767/wiki/Wide_Test';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-test-'));
const extDir = path.join(tmp, 'ext');
const profile = path.join(tmp, 'profile');
fs.cpSync(SRC, extDir, { recursive: true, filter: (s) => path.resolve(s) === SRC || !/^(tools|README\.md|\.git|test|wikifree|dist)$/.test(path.basename(s)) });
const mf = JSON.parse(fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'));
mf.content_scripts[0].matches = ['http://127.0.0.1/*'];
delete mf.content_scripts[0].exclude_matches;
fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(mf, null, 2));

const port = 9335;
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--load-extension=${extDir}`,
  '--disable-features=DisableLoadExtensionCommandLineSwitch', '--no-first-run', '--no-default-browser-check', '--window-size=1400,900', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitForPort() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) return; } catch (e) { /* retry */ }
    await sleep(250);
  }
  throw new Error('chrome did not start');
}

const MOCK = {
  he: [['עדה דוגמה', 'מתמטיקאית בדיונית', 1]],
  fr: [['Ada Exemple', 'mathématicienne fictive', 1]],
};

(async () => {
  let code = 0;
  const problems = [];
  const intercepted = [];
  try {
    await waitForPort();
    const t = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURI('about:blank')}`, { method: 'PUT' })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 0;
    const pending = new Map();
    let send;
    ws.onmessage = async (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); return; }
      if (d.method === 'Runtime.exceptionThrown') problems.push('EXCEPTION ' + JSON.stringify(d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description));
      else if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) problems.push(d.params.type + ' ' + d.params.args.map((a) => a.value || a.description).join(' '));
      else if (d.method === 'Fetch.requestPaused') {
        const url = d.params.request.url;
        const m2 = url.match(/^https:\/\/([a-z0-9-]+)\.wikipedia\.org\//);
        intercepted.push(url.slice(0, 80));
        const pages = ((m2 && MOCK[m2[1]]) || []).map(([title, description, index]) => ({ title, description, index }));
        await send('Fetch.fulfillRequest', {
          requestId: d.params.requestId, responseCode: 200,
          responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }],
          body: Buffer.from(JSON.stringify({ query: { pages } })).toString('base64'),
        });
      }
    };
    send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.result.value;
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: 'https://*.wikipedia.org/*' }] });
    await send('Page.navigate', { url: PAGE });
    await sleep(4000);

    const r = {};
    r.layout = await ev(`({
      root: !!document.getElementById('wf-root'),
      cover: !!document.querySelector('.wf-cover img'),
      chips: [...document.querySelectorAll('.wf-actions .wf-chip')].map(c => (c.hidden ? '(hidden) ' : '') + c.textContent.trim()),
      searchLangButton: !!document.querySelector('.wf-search-lang .wf-btn')
    })`);

    // timeline
    r.timeline = await ev(`(async () => { const c = document.querySelector('.wf-tl-chip'); c.click(); await new Promise(r => setTimeout(r, 200)); return { items: document.querySelectorAll('.wf-tl-item').length, sub: document.querySelector('.wf-tlp .wf-panel-sub').textContent }; })()`);

    // summary: whichever state this Chrome is in, it must end in a sane panel and never start a download by itself
    r.summary = await ev(`(async () => { document.querySelector('.wf-sum-chip').click(); await new Promise(r => setTimeout(r, 1500)); const p = document.querySelector('.wf-sum'); return { apiType: typeof Summarizer, availability: typeof Summarizer === 'function' || typeof Summarizer === 'object' ? await Summarizer.availability({ expectedInputLanguages: ['en'], outputLanguage: 'en' }).catch(e => 'err ' + e.message) : 'n/a', panelText: p.querySelector('.wf-panel-body').textContent.slice(0, 110), hasConsentButton: !!p.querySelector('button.wf-chip') }; })()`);

    // lightbox from the cover
    r.lightbox = await ev(`(async () => { document.querySelector('.wf-cover img').click(); await new Promise(r => setTimeout(r, 300)); const lb = document.querySelector('.wf-lb'); const open = !lb.hidden; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return { open, closedByEsc: lb.hidden }; })()`);

    // multi-language search through chrome.storage.sync (real extension storage)
    r.search = await ev(`(async () => {
      const sl = document.querySelector('.wf-search-lang');
      sl.querySelector('.wf-btn').click();
      for (const code of ['he', 'fr']) { const row = [...sl.querySelectorAll('.wf-sl-row')].find(x => x.querySelector('small').textContent === code); const cb = row.querySelector('input'); cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
      await new Promise(r => setTimeout(r, 300));
      document.body.click();
      const inp = document.querySelector('.wf-search input'); inp.focus(); inp.value = 'ada'; inp.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 1200));
      return { badge: sl.querySelector('.wf-sl-count').textContent, results: [...document.querySelectorAll('.wf-suggest a')].map(a => a.textContent.replace(/\\s+/g, ' ').trim()) };
    })()`);

    // the language choice must survive a reload (stored in chrome.storage.sync)
    await send('Page.navigate', { url: PAGE });
    await sleep(3500);
    r.afterReload = await ev(`document.querySelector('.wf-sl-count').textContent`);

    console.log(JSON.stringify(r, null, 2));
    console.log('intercepted wikipedia requests (answered locally):', intercepted.length, intercepted.slice(0, 3));
    console.log('console problems:', problems.length ? problems : 'none');
    ws.close();
  } catch (e) {
    console.error('TEST FAILED', e);
    code = 1;
  } finally {
    chrome.kill();
    await sleep(500);
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    process.exit(code);
  }
})();
