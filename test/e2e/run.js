// `npm run e2e`: start the mock site, run every Chrome check against it, stop the site. Exit code 1 if anything failed.
'use strict';
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { MOCK_PORT, sleep, findChrome } = require('./harness');

const SCRIPTS = ['chrome-features.js', 'chrome-bookmarks.js'];

(async () => {
  try {
    console.log('Chrome:', findChrome());
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const server = spawn(process.execPath, [path.join(__dirname, 'mock-server.js')], { stdio: 'inherit', env: { ...process.env, MOCK_PORT: String(MOCK_PORT) } });
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    try { up = (await fetch(`http://127.0.0.1:${MOCK_PORT}/wiki/Ada_Example`)).ok; } catch (e) { await sleep(150); }
  }
  let failed = !up;
  if (!up) console.error(`The mock server did not start on port ${MOCK_PORT} (is it already in use? set MOCK_PORT).`);
  for (const s of up ? SCRIPTS : []) {
    console.log(`\n=== ${s}`);
    const r = spawnSync(process.execPath, [path.join(__dirname, s)], { stdio: 'inherit', env: { ...process.env, MOCK_PORT: String(MOCK_PORT) } });
    if (r.status !== 0) failed = true;
  }
  server.kill();
  process.exit(failed ? 1 : 0);
})();
