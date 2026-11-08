// Real-Chrome check of the bookmarks feature: chrome.storage.local persistence and cross-tab sync, in a throw-away profile.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const SRC = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PAGE = 'http://127.0.0.1:8767/wiki/Ada_Example';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-test-'));
const extDir = path.join(tmp, 'ext');
const profile = path.join(tmp, 'profile');
fs.cpSync(SRC, extDir, { recursive: true, filter: (s) => path.resolve(s) === SRC || !/^(tools|README\.md|\.git|test|wikifree|dist)$/.test(path.basename(s)) });
const mf = JSON.parse(fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'));
mf.content_scripts[0].matches = ['http://127.0.0.1/*'];
delete mf.content_scripts[0].exclude_matches;
fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(mf, null, 2));

const port = 9334;
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

async function openTab(url, problems) {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURI(url)}`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    else if (d.method === 'Runtime.exceptionThrown') problems.push('EXCEPTION ' + JSON.stringify(d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description));
    else if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) problems.push(d.params.type + ' ' + d.params.args.map((a) => a.value || a.description).join(' '));
  };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable');
  await send('Page.enable');
  return {
    send,
    ev: async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.result.value,
    nav: async (u) => { await send('Page.navigate', { url: u }); await sleep(2500); },
    close: () => ws.close(),
  };
}

const state = `(() => { const c = document.querySelector('.wf-bm-chip'); return { saved: c && c.classList.contains('saved'), label: c && c.textContent.trim(), heading: document.querySelector('.wf-bm-head b') && document.querySelector('.wf-bm-head b').textContent, rows: document.querySelectorAll('.wf-bm-item').length }; })()`;

(async () => {
  let code = 0;
  const problems = [];
  try {
    await waitForPort();
    const a = await openTab(PAGE, problems);
    await sleep(3000);
    const r = {};
    r.initial = await a.ev(state);
    await a.ev(`document.querySelector('.wf-bm-chip').click()`);
    await sleep(600);
    r.afterSave = await a.ev(state);

    await a.nav(PAGE); // reload: must still be saved (chrome.storage.local)
    r.afterReload = await a.ev(state);

    const b = await openTab(PAGE, problems); // second tab: must see it too
    await sleep(3000);
    r.secondTab = await b.ev(state);

    await a.ev(`document.querySelector('.wf-bm-chip').click()`); // unsave in tab A -> tab B follows via storage.onChanged
    await sleep(800);
    r.tabAAfterUnsave = await a.ev(state);
    r.tabBFollows = await b.ev(state);

    console.log(JSON.stringify(r, null, 2));
    console.log('console problems:', problems.length ? problems : 'none');
    a.close(); b.close();
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
