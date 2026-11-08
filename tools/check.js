// `npm run check`: fast static checks that need no browser and no dependencies.
//  1. every JS file parses
//  2. manifest.json is valid MV3 and every file it (and the popup) references exists
//  3. package.json and manifest.json agree on the version
//  4. no machine-specific paths in tracked-style files (the repo may be public, see AGENTS.md)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const problems = [];
const fail = (msg) => problems.push(msg);
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = dir ? dir + '/' + e.name : e.name;
    if (/^(\.git|node_modules|dist)$/.test(e.name)) continue;
    if (e.isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}
const all = walk('');

// 1. syntax
const js = all.filter((f) => /\.js$/.test(f));
for (const f of js) {
  const r = spawnSync(process.execPath, ['--check', path.join(root, f)], { encoding: 'utf8' });
  if (r.status !== 0) fail(`syntax error in ${f}\n${(r.stderr || '').split('\n').slice(0, 6).join('\n')}`);
}

// 2. manifest + popup references
let manifest = null;
try {
  manifest = JSON.parse(read('manifest.json'));
} catch (e) {
  fail('manifest.json is not valid JSON: ' + e.message);
}
if (manifest) {
  if (manifest.manifest_version !== 3) fail('manifest_version must be 3');
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version || '')) fail('manifest version must look like 1.2.3');
  const refs = new Set();
  for (const cs of manifest.content_scripts || []) [...(cs.js || []), ...(cs.css || [])].forEach((f) => refs.add(f));
  Object.values(manifest.icons || {}).forEach((f) => refs.add(f));
  Object.values((manifest.action || {}).default_icon || {}).forEach((f) => refs.add(f));
  if ((manifest.action || {}).default_popup) refs.add(manifest.action.default_popup);
  for (const f of refs) if (!exists(f)) fail(`manifest references a missing file: ${f}`);

  const popup = (manifest.action || {}).default_popup;
  if (popup && exists(popup)) {
    const dir = path.posix.dirname(popup);
    for (const m of read(popup).matchAll(/(?:src|href)="([^"#?]+)"/g)) {
      if (/^(https?:|data:|\/\/)/.test(m[1])) fail(`${popup} loads a remote resource: ${m[1]}`);
      else if (!exists(path.posix.normalize(dir + '/' + m[1]))) fail(`${popup} references a missing file: ${m[1]}`);
    }
  }
  const perms = (manifest.permissions || []).concat(manifest.host_permissions || []);
  console.log(`manifest ${manifest.version}, permissions: ${perms.length ? perms.join(', ') : 'none'}`);
}

// 3. versions agree
try {
  const pkg = JSON.parse(read('package.json'));
  if (manifest && pkg.version !== manifest.version) fail(`package.json version ${pkg.version} differs from manifest.json ${manifest.version}`);
} catch (e) {
  fail('package.json is missing or invalid: ' + e.message);
}

// 4. machine-specific paths (never in shareable files; personal notes belong in *.local.md, which git ignores)
const TEXT = /\.(js|json|md|css|html|yml|yaml|mdc)$/;
for (const f of all.filter((x) => TEXT.test(x) && !/\.local\./.test(x) && !/^tools\/check\.js$/.test(x))) {
  const m = read(f).match(/[A-Za-z]:\\(Users|AI|Documents and Settings)\\/);
  if (m) fail(`${f} contains a machine-specific path (${m[0]}…). Use a relative path or describe it in words.`);
}

if (problems.length) {
  console.error(`\ncheck FAILED (${problems.length}):`);
  problems.forEach((p) => console.error(' - ' + p));
  process.exit(1);
}
console.log(`check OK: ${js.length} JS files parse, manifest and popup references resolve, versions match, no machine paths.`);
