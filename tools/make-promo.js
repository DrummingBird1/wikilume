// Renders the Chrome Web Store promo images from the icon and the screenshots in store/screenshots/.
// Run: node tools/make-promo.js   (after tools/make-screenshots.js; needs Chrome)  ->  store/promo-small-440x280.png, store/promo-marquee-1400x560.png
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ROOT, sleep, startChrome } = require('../test/e2e/harness');

const OUT = path.join(ROOT, 'store');
const b64 = (f) => fs.readFileSync(path.join(ROOT, f)).toString('base64');
const icon = 'data:image/png;base64,' + b64('icons/icon128.png');
const shotA = 'data:image/png;base64,' + b64('store/screenshots/1-reader-light.png');
const shotB = 'data:image/png;base64,' + b64('store/screenshots/2-dark-theme.png');
const NAME = 'WikiFree';

const base = `*{box-sizing:border-box;margin:0}body{font-family:'Segoe UI',system-ui,sans-serif;overflow:hidden;color:#fff;
background:linear-gradient(135deg,#4f46e5 0%,#2563eb 45%,#14b8a6 100%);position:relative}
.card{position:absolute;border-radius:16px;box-shadow:0 20px 50px rgba(15,23,42,.45);background-size:cover;background-position:top left;border:1px solid rgba(255,255,255,.4)}
.brand{display:flex;align-items:center;gap:18px;position:absolute}
.brand img{border-radius:22%;box-shadow:0 8px 24px rgba(15,23,42,.35)}
.brand b{font-weight:700;letter-spacing:-.02em}
.tag{position:absolute;font-weight:500;opacity:.95}`;

const small = `<style>${base}
body{width:440px;height:280px}
.card{width:300px;height:190px;right:-100px;bottom:-60px;transform:rotate(-6deg);background-image:url(${shotA});background-size:560px auto}
.brand{left:26px;top:30px}.brand img{width:64px;height:64px}.brand b{font-size:38px}
.tag{left:28px;top:112px;font-size:20px;line-height:1.3;width:200px}</style>
<div class="brand"><img src="${icon}"><b>${NAME}</b></div><div class="tag">Wikipedia,<br>made for reading.</div><div class="card"></div>`;

const marquee = `<style>${base}
body{width:1400px;height:560px}
.card{width:520px;height:330px;background-size:860px auto}
.c1{right:40px;top:60px;transform:rotate(3deg);background-image:url(${shotA})}
.c2{right:210px;top:190px;transform:rotate(-4deg);background-image:url(${shotB})}
.brand{left:80px;top:150px}.brand img{width:110px;height:110px}.brand b{font-size:84px}
.tag{left:84px;top:300px;font-size:34px;line-height:1.3;width:520px}</style>
<div class="brand"><img src="${icon}"><b>${NAME}</b></div><div class="tag">A clean, free reading layout for Wikipedia.</div><div class="card c2"></div><div class="card c1"></div>`;

(async () => {
  const browser = await startChrome({ real: true });
  try {
    const tab = await browser.newTab('about:blank');
    for (const [file, html, w, h] of [['promo-small-440x280.png', small, 440, 280], ['promo-marquee-1400x560.png', marquee, 1400, 560]]) {
      const tmp = path.join(os.tmpdir(), 'wf-promo-' + file + '.html');
      fs.writeFileSync(tmp, '<!doctype html><meta charset="utf-8">' + html);
      await tab.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
      await tab.nav('file:///' + tmp.split(path.sep).join('/'), 1200);
      await sleep(300);
      const shot = await tab.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUT, file), Buffer.from(shot.result.data, 'base64'));
      console.log('wrote store/' + file);
      fs.rmSync(tmp, { force: true });
    }
    tab.close();
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
