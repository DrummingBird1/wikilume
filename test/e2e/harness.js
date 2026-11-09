// Shared helpers for the end-to-end checks: start a throw-away headless Chrome with the extension loaded, talk to it over
// the DevTools protocol, and collect assertions. No dependencies (needs Node 22+ for the global WebSocket).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const MOCK_PORT = Number(process.env.MOCK_PORT) || 8767;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [];
  if (process.platform === 'win32') {
    for (const base of [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA]) {
      if (base) candidates.push(path.join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium');
  } else {
    for (const dir of (process.env.PATH || '').split(path.delimiter)) {
      for (const n of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) candidates.push(path.join(dir, n));
    }
  }
  const hit = candidates.find((p) => {
    try { return fs.statSync(p).isFile(); } catch (e) { return false; }
  });
  if (!hit) throw new Error('Chrome not found. Set CHROME_PATH to a Chrome or Chromium executable.');
  return hit;
}

/** Copy only what ships in the extension, and let it run on the local mock site instead of wikipedia.org. */
function prepareExtension(dest, real) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of ['icons', 'popup', 'src']) fs.cpSync(path.join(ROOT, name), path.join(dest, name), { recursive: true });
  const mf = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  if (!real) {
    mf.content_scripts[0].matches = ['http://127.0.0.1/*'];
    delete mf.content_scripts[0].exclude_matches;
  }
  fs.writeFileSync(path.join(dest, 'manifest.json'), JSON.stringify(mf, null, 2));
}

/**
 * Start Chrome. `intercept(request)` (optional) answers requests to *.wikipedia.org locally and returns
 * { status, headers, body } – so the tests never send traffic to Wikipedia.
 */
async function startChrome({ intercept, real } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wikilume-e2e-'));
  const extDir = path.join(tmp, 'ext');
  const profile = path.join(tmp, 'profile');
  prepareExtension(extDir, real);
  const args = [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--load-extension=${extDir}`,
    '--disable-features=DisableLoadExtensionCommandLineSwitch', '--no-first-run', '--no-default-browser-check', '--window-size=1400,900',
  ];
  if (process.getuid && process.getuid() === 0) args.push('--no-sandbox');
  args.push('about:blank');
  const chrome = spawn(findChrome(), args, { stdio: 'ignore' });

  // with port 0 Chrome picks a free port and writes it to DevToolsActivePort
  let port = 0;
  for (let i = 0; i < 80 && !port; i++) {
    try { port = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch (e) { await sleep(250); }
  }
  if (!port) { chrome.kill(); throw new Error('Chrome did not start'); }

  const problems = [];

  async function newTab(url = 'about:blank') {
    const t = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURI(url)}`, { method: 'PUT' })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let id = 0;
    const pending = new Map();
    let send;
    ws.onmessage = async (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); return; }
      if (d.method === 'Runtime.exceptionThrown') {
        problems.push('EXCEPTION ' + JSON.stringify(d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description));
      } else if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) {
        problems.push(d.params.type + ' ' + d.params.args.map((a) => a.value || a.description).join(' '));
      } else if (d.method === 'Fetch.requestPaused') {
        const res = intercept && intercept(d.params.request);
        if (!res) return send('Fetch.continueRequest', { requestId: d.params.requestId });
        await send('Fetch.fulfillRequest', {
          requestId: d.params.requestId,
          responseCode: res.status || 200,
          responseHeaders: Object.entries(res.headers || {}).map(([name, value]) => ({ name, value })),
          body: Buffer.from(res.body || '').toString('base64'),
        });
      }
    };
    send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    await send('Runtime.enable');
    await send('Page.enable');
    if (intercept) await send('Fetch.enable', { patterns: [{ urlPattern: 'https://*.wikipedia.org/*' }] });
    const tab = {
      send,
      ev: async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.result.value,
      nav: async (u, waitMs = 3500) => { await send('Page.navigate', { url: u }); await sleep(waitMs); },
      close: () => ws.close(),
    };
    if (url !== 'about:blank') await sleep(3500);
    return tab;
  }

  async function close() {
    chrome.kill();
    await sleep(500);
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }

  return { newTab, close, problems };
}

/** Tiny assertion collector: expect() records failures, report() prints them and returns the process exit code. */
function makeExpect() {
  const failures = [];
  let count = 0;
  return {
    expect(name, ok, detail) {
      count++;
      if (!ok) failures.push(name + (detail !== undefined ? '  ->  ' + JSON.stringify(detail) : ''));
    },
    report(title) {
      if (failures.length) {
        console.error(`\nFAIL ${title}: ${failures.length} of ${count} checks failed`);
        failures.forEach((f) => console.error('  - ' + f));
        return 1;
      }
      console.log(`\nPASS ${title}: ${count} checks`);
      return 0;
    },
  };
}

module.exports = { ROOT, MOCK_PORT, sleep, startChrome, makeExpect, findChrome };
