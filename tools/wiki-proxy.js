// Dev tool: a local reverse proxy that serves REAL Wikipedia pages with the extension's own scripts and CSS injected,
// so the reader can be driven and photographed in any browser (used by tools/make-screenshots.js).
// It is not part of the extension and never ships. Run: WIKI=en.wikipedia.org PORT=8798 node tools/wiki-proxy.js
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SCRIPTS = ['i18n', 'bookmarks', 'timeline', 'summary', 'content'];
const INJECT = '<link rel="stylesheet" href="/__wf/reader.css">' + SCRIPTS.map((f) => `<script src="/__wf/${f}.js"></script>`).join('');
const DROP = ['content-encoding', 'content-length', 'transfer-encoding', 'content-security-policy', 'strict-transport-security', 'set-cookie'];

function start(wiki, port) {
  const server = http.createServer(async (q, r) => {
    try {
      if (q.url.startsWith('/__wf/')) {
        const name = q.url.slice(6).split('?')[0];
        if (name === 'reader.css') {
          r.writeHead(200, { 'content-type': 'text/css', 'cache-control': 'no-store' });
          return r.end(read('src/reader.css'));
        }
        if (!SCRIPTS.includes(name.replace(/\.js$/, ''))) { r.writeHead(404); return r.end(); }
        // the scripts read location.hostname to know which wiki they are on; the proxy answers on 127.0.0.1
        r.writeHead(200, { 'content-type': 'application/javascript', 'cache-control': 'no-store' });
        return r.end(read('src/' + name).replace(/location\.hostname/g, `'${wiki}'`));
      }
      const resp = await fetch(new URL('https://' + wiki + q.url), {
        headers: { 'user-agent': 'WikiFree-dev-proxy/1.0 (local screenshots)', accept: q.headers.accept || '*/*', 'accept-language': q.headers['accept-language'] || 'en' },
        redirect: 'manual',
      });
      const headers = {};
      resp.headers.forEach((v, k) => { if (!DROP.includes(k)) headers[k] = v; });
      if (headers.location) headers.location = headers.location.replace(/^https?:\/\/[^/]+/, '');
      let body = Buffer.from(await resp.arrayBuffer());
      if ((headers['content-type'] || '').includes('text/html')) {
        body = Buffer.from(body.toString('utf8').split('https://' + wiki + '/').join('/').replace(/<head[^>]*>/i, (m) => m + INJECT));
      }
      r.writeHead(resp.status, headers);
      r.end(body);
    } catch (e) {
      r.writeHead(500);
      r.end(String(e));
    }
  });
  return new Promise((res) => server.listen(port, '127.0.0.1', () => res(server)));
}

if (require.main === module) start(process.env.WIKI || 'en.wikipedia.org', Number(process.env.PORT) || 8798).then(() => console.log('proxy up'));
module.exports = { start };
