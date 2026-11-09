// `npm run check-store`: pre-publication gate for the Chrome Web Store. Not part of `npm run verify` (it is expected to fail until the
// owner fills in the placeholders). Checks image sizes, listing limits, the zip contents and leftover [[PLACEHOLDERS]].
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const problems = [];
const ok = [];
const fail = (m) => problems.push(m);

function pngSize(rel) {
  const f = path.join(root, rel);
  if (!fs.existsSync(f)) return null;
  const b = fs.readFileSync(f);
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), alpha: (b[25] & 4) !== 0 || b[25] === 3 };
}
function expectSize(rel, w, h) {
  const s = pngSize(rel);
  if (!s) return fail(`${rel}: missing or not a PNG`);
  if (s.w !== w || s.h !== h) return fail(`${rel}: is ${s.w}x${s.h}, must be ${w}x${h}`);
  ok.push(rel);
}

// images
expectSize('icons/icon128.png', 128, 128);
expectSize('store/promo-small-440x280.png', 440, 280);
expectSize('store/promo-marquee-1400x560.png', 1400, 560);
const shots = fs.existsSync(path.join(root, 'store/screenshots')) ? fs.readdirSync(path.join(root, 'store/screenshots')).filter((f) => /\.png$/.test(f)) : [];
if (shots.length < 1 || shots.length > 5) fail(`store/screenshots: ${shots.length} screenshots, the store wants 1 to 5`);
shots.forEach((f) => expectSize('store/screenshots/' + f, 1280, 800));

// text limits
if (manifest.name.length > 75) fail(`manifest name is ${manifest.name.length} characters, limit 75`);
if (manifest.description.length > 132) fail(`manifest description is ${manifest.description.length} characters, limit 132`);
if (JSON.stringify(manifest.permissions) !== '["storage"]') fail('permissions changed: update store/listing.en.md justification and the privacy policy first');
if (manifest.host_permissions && manifest.host_permissions.length) fail('host_permissions present: needs a written justification in store/listing.en.md');
if (manifest.version !== JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version) fail('manifest and package versions differ');

// the package
const zip = path.join(root, 'dist', `wikifree-${manifest.version}-chrome.zip`);
if (!fs.existsSync(zip)) fail(`dist/wikifree-${manifest.version}-chrome.zip is missing: run npm run pack`);
else {
  const names = [];
  const buf = fs.readFileSync(zip);
  for (let i = buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])); i >= 0 && i < buf.length - 46; ) {
    if (buf.readUInt32LE(i) !== 0x02014b50) break;
    const n = buf.readUInt16LE(i + 28), m = buf.readUInt16LE(i + 30), k = buf.readUInt16LE(i + 32);
    names.push(buf.toString('utf8', i + 46, i + 46 + n));
    i += 46 + n + m + k;
  }
  if (!names.includes('manifest.json')) fail('zip: manifest.json is not at the root');
  const stray = names.filter((n) => /^(test|tools|docs|store|site|dist|\.git)/.test(n) || /\.(md|local\.md)$/.test(n));
  if (stray.length) fail('zip contains files that should not ship: ' + stray.slice(0, 5).join(', '));
  ok.push(`zip with ${names.length} files`);
}

// placeholders that must be replaced before publishing
function walk(dir, out = []) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = dir + '/' + e.name;
    if (e.isDirectory()) walk(rel, out);
    else if (/\.(html|md|txt)$/.test(e.name)) out.push(rel);
  }
  return out;
}
const placeholders = new Map();
for (const f of [...walk('site'), ...walk('store')]) {
  for (const m of fs.readFileSync(path.join(root, f), 'utf8').matchAll(/\[\[([A-Z_]+)\]\]/g)) {
    if (!placeholders.has(m[1])) placeholders.set(m[1], new Set());
    placeholders.get(m[1]).add(f);
  }
}
for (const [name, files] of placeholders) fail(`placeholder [[${name}]] is still in: ${[...files].join(', ')}`);

console.log(`ok: ${ok.length} checks passed`);
if (problems.length) {
  console.error(`\n${problems.length} thing(s) block publishing:`);
  problems.forEach((p) => console.error('  - ' + p));
  process.exitCode = 1;
} else console.log('Ready for the store.');
