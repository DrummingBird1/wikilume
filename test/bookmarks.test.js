// Run with: node --test test/
// Exercises src/bookmarks.js against an in-memory localStorage stub (no browser needed).
const test = require('node:test');
const assert = require('node:assert/strict');

class MemStorage {
  constructor() { this.m = new Map(); }
  get length() { return this.m.size; }
  key(i) { return Array.from(this.m.keys())[i] ?? null; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
Object.defineProperty(globalThis, 'localStorage', { value: new MemStorage(), configurable: true, writable: true });
require('../src/bookmarks.js');
const BM = globalThis.WF.bookmarks;

const clear = () => globalThis.localStorage.m.clear();
const sample = (over = {}) => ({ host: 'en.wikipedia.org', key: 'Ada Example', title: 'Ada Example', desc: 'Fictional mathematician', thumb: 'https://upload.wikimedia.org/a.jpg', added: 1000, ...over });

test('ids normalise spaces to underscores', () => {
  assert.equal(BM.idFor('en.wikipedia.org', 'Ada Example'), 'bm:en.wikipedia.org|Ada_Example');
  assert.equal(BM.idFor('en.wikipedia.org', 'Ada_Example'), BM.idFor('en.wikipedia.org', ' Ada Example '));
});

test('toEntry cleans fields and rejects bad input', () => {
  assert.equal(BM.toEntry(null), null);
  assert.equal(BM.toEntry({ host: 'en.wikipedia.org' }), null, 'needs a key');
  assert.equal(BM.toEntry({ host: 'evil.example.com', key: 'X' }, true), null, 'strict mode only accepts wikipedia hosts');
  assert.ok(BM.toEntry({ host: 'evil.example.com', key: 'X' }, false), 'non-strict (own saves) accepts any host');
  const e = BM.toEntry({ host: 'EN.wikipedia.org', key: 'A B', desc: 'x'.repeat(1000), thumb: 'javascript:alert(1)' }, true);
  assert.equal(e.host, 'en.wikipedia.org');
  assert.equal(e.key, 'A_B');
  assert.equal(e.title, 'A B');
  assert.equal(e.desc.length, 300);
  assert.equal(e.thumb, '', 'non-wikimedia thumbnails are dropped');
  assert.equal(BM.toEntry({ host: 'en.wikipedia.org', key: 'A', thumb: '//upload.wikimedia.org/x.png' }, true).thumb, 'https://upload.wikimedia.org/x.png');
  assert.equal(BM.toEntry({ host: 'en.wikipedia.org', key: 'A', thumb: 'http://upload.wikimedia.org/x.png' }, true).thumb, '', 'http is not accepted');
});

test('urlFor encodes the title', () => {
  assert.equal(BM.urlFor({ host: 'he.wikipedia.org', key: 'עדה' }), 'https://he.wikipedia.org/wiki/' + encodeURIComponent('עדה'));
  assert.equal(BM.urlFor({ host: 'en.wikipedia.org', key: 'AC/DC' }), 'https://en.wikipedia.org/wiki/AC%2FDC');
});

test('add / has / list / remove, newest first, and change notifications', async () => {
  clear();
  let changes = 0;
  const off = BM.onChange(() => changes++);
  await BM.add(sample({ key: 'First', added: 1 }));
  await BM.add(sample({ key: 'Second', added: 2 }));
  assert.equal(await BM.has(BM.idFor('en.wikipedia.org', 'First')), true);
  assert.deepEqual((await BM.list()).map((e) => e.key), ['Second', 'First']);
  await BM.add(sample({ key: 'First', title: 'First (updated)', added: 1 })); // same id → replaced, not duplicated
  assert.equal((await BM.list()).length, 2);
  await BM.remove(BM.idFor('en.wikipedia.org', 'First'));
  assert.equal(await BM.has(BM.idFor('en.wikipedia.org', 'First')), false);
  assert.equal(changes, 4);
  off();
  await BM.remove(BM.idFor('en.wikipedia.org', 'Second'));
  assert.equal(changes, 4, 'unsubscribed listener is not called');
});

test('export then import round-trips and merges without overwriting', async () => {
  clear();
  await BM.add(sample({ key: 'One', added: 10 }));
  await BM.add(sample({ key: 'Two', host: 'he.wikipedia.org', title: 'שניים', added: 20 }));
  const dump = BM.exportJSON(await BM.list());
  assert.equal(JSON.parse(dump).app, 'WikiLume');

  clear();
  await BM.add(sample({ key: 'One', title: 'Local title wins', added: 5 }));
  const res = await BM.importJSON(dump);
  assert.deepEqual(res, { added: 1, skipped: 1 });
  const all = await BM.list();
  assert.equal(all.length, 2);
  assert.equal(all.find((e) => e.key === 'One').title, 'Local title wins');
  assert.equal(all.find((e) => e.host === 'he.wikipedia.org').title, 'שניים');
});

test('import treats the file as untrusted', async () => {
  clear();
  const file = JSON.stringify({ bookmarks: [
    { host: 'en.wikipedia.org', key: 'Good', thumb: 'https://upload.wikimedia.org/ok.jpg' },
    { host: 'evil.example.com', key: 'Bad host' },
    { host: 'en.wikipedia.org.evil.com', key: 'Suffix trick' },
    { host: 'en.wikipedia.org', key: '' },
    { host: 'en.wikipedia.org', key: 'Script thumb', thumb: 'javascript:alert(1)' },
    'not an object',
  ] });
  const res = await BM.importJSON(file);
  assert.deepEqual(res, { added: 2, skipped: 4 });
  const all = await BM.list();
  assert.equal(all.find((e) => e.key === 'Script_thumb').thumb, '');
  await assert.rejects(() => BM.importJSON('{not json'), /invalid/);
  await assert.rejects(() => BM.importJSON('{"hello":1}'), /invalid/);
});

test('matches filters on title, description and wiki host', () => {
  const e = sample();
  assert.ok(BM.matches(e, ''));
  assert.ok(BM.matches(e, 'ada'));
  assert.ok(BM.matches(e, 'MATHEMATICIAN'));
  assert.ok(BM.matches(e, 'en.wiki'));
  assert.ok(!BM.matches(e, 'zzz'));
});
