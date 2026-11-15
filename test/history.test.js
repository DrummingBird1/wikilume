// Run with: node --test test/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/history.js');
const HI = globalThis.WF.history;

test('clampPct keeps whole percentages between 0 and 100', () => {
  assert.equal(HI.clampPct(42.6), 43);
  assert.equal(HI.clampPct(-5), 0);
  assert.equal(HI.clampPct(250), 100);
  assert.equal(HI.clampPct('abc'), 0);
  assert.equal(HI.clampPct(undefined), 0);
});

test('toEntry validates host and key and normalises the rest', () => {
  assert.equal(HI.toEntry(null), null);
  assert.equal(HI.toEntry({ host: 'evil.example.com', key: 'A' }, true), null); // strict: only *.wikipedia.org may become a link
  assert.ok(HI.toEntry({ host: '127.0.0.1', key: 'A' })); // the content script itself may record the mock site
  assert.equal(HI.toEntry({ host: 'en.wikipedia.org', key: '' }), null);
  const e = HI.toEntry({ host: 'EN.wikipedia.org', key: 'Ada Lovelace', title: '  Ada  Lovelace ', pct: 61.2, ts: 5 });
  assert.deepEqual(e, { host: 'en.wikipedia.org', key: 'Ada_Lovelace', title: 'Ada Lovelace', ts: 5, pct: 61 });
});

test('oldestToDrop returns the ids beyond the newest max entries', () => {
  const rows = [['a', { ts: 1 }], ['b', { ts: 4 }], ['c', { ts: 3 }], ['d', { ts: 2 }]];
  assert.deepEqual(HI.oldestToDrop(rows, 2).sort(), ['a', 'd']);
  assert.deepEqual(HI.oldestToDrop(rows, 10), []);
});

test('record, get, list, remove and clear work against the in-memory store', async () => {
  await HI.clear();
  await HI.record({ host: 'en.wikipedia.org', key: 'Moon', title: 'Moon', pct: 20 });
  await new Promise((r) => setTimeout(r, 5));
  await HI.record({ host: 'he.wikipedia.org', key: 'ירח', title: 'ירח', pct: 5 });
  await HI.record({ host: 'en.wikipedia.org', key: 'Moon', title: 'Moon', pct: 80 }); // update, not a duplicate
  const all = await HI.list();
  assert.equal(all.length, 2);
  assert.equal(all[0].key, 'Moon'); // newest first
  assert.equal((await HI.get('en.wikipedia.org', 'Moon')).pct, 80);
  await HI.record({ host: 'bad.example.org', key: 'X' }); // recorded, but never listed (list() is strict)
  assert.equal((await HI.list()).length, 2);
  await HI.remove('bad.example.org', 'X');
  await HI.remove('en.wikipedia.org', 'Moon');
  assert.equal((await HI.list()).length, 1);
  await HI.clear();
  assert.equal((await HI.list()).length, 0);
});

test('the history never grows past MAX entries', async () => {
  await HI.clear();
  for (let i = 0; i < HI.MAX + 5; i++) await HI.record({ host: 'en.wikipedia.org', key: 'Page' + i });
  assert.equal((await HI.list()).length, HI.MAX);
});
