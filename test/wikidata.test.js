// Run with: node --test test/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/wikidata.js');
const WD = globalThis.WF.wikidata;

const time = (t, precision) => ({ mainsnak: { snaktype: 'value', datavalue: { value: { time: t, precision } } }, rank: 'normal' });

test('isQid and entityUrl only accept real item ids', () => {
  assert.equal(WD.isQid('Q42'), true);
  assert.equal(WD.isQid('Q0'), false);
  assert.equal(WD.isQid('P569'), false);
  assert.equal(WD.isQid('Q42&evil=1'), false);
  assert.equal(WD.entityUrl('nope'), null);
  const u = new URL(WD.entityUrl('Q42'));
  assert.equal(u.hostname, 'www.wikidata.org');
  assert.equal(u.searchParams.get('origin'), '*');
  assert.equal(u.searchParams.get('ids'), 'Q42');
});

test('yearOf reads year precision or better and ignores BCE, low precision and out-of-window years', () => {
  assert.equal(WD.yearOf({ time: '+1815-12-10T00:00:00Z', precision: 11 }), 1815);
  assert.equal(WD.yearOf({ time: '+1815-00-00T00:00:00Z', precision: 9 }), 1815);
  assert.equal(WD.yearOf({ time: '+1810-00-00T00:00:00Z', precision: 8 }), null); // decade
  assert.equal(WD.yearOf({ time: '-0044-03-15T00:00:00Z', precision: 11 }), null); // BCE
  assert.equal(WD.yearOf({ time: '+0500-01-01T00:00:00Z', precision: 9 }), null);
  assert.equal(WD.yearOf({ time: '+2500-01-01T00:00:00Z', precision: 9 }), null);
  assert.equal(WD.yearOf(null), null);
});

test('parseEntity returns sorted, de-duplicated facts and skips deprecated or novalue claims', () => {
  const json = { entities: { Q7259: { claims: {
    P570: [time('+1852-11-27T00:00:00Z', 11)],
    P569: [time('+1815-12-10T00:00:00Z', 11), time('+1815-12-10T00:00:00Z', 11), { rank: 'deprecated', mainsnak: { snaktype: 'value', datavalue: { value: { time: '+1900-01-01T00:00:00Z', precision: 9 } } } }],
    P580: [{ rank: 'normal', mainsnak: { snaktype: 'novalue' } }],
    P106: [time('+1999-01-01T00:00:00Z', 9)], // not a date property we use
  } } } };
  const ev = WD.parseEntity(json, 'Q7259');
  assert.deepEqual(ev.map((e) => [e.year, e.kind]), [[1815, 'wdBorn'], [1852, 'wdDied']]);
  assert.equal(ev[0].source, 'wikidata');
  assert.deepEqual(WD.parseEntity({}, 'Q1'), []);
  assert.deepEqual(WD.parseEntity(null, 'Q1'), []);
});

test('mergeEvents keeps chronological order and puts Wikidata first within a year', () => {
  const text = [{ year: 1843, text: 'a' }, { year: 1815, text: 'b' }];
  const wd = [{ year: 1815, kind: 'wdBorn', source: 'wikidata' }, { year: 1852, kind: 'wdDied', source: 'wikidata' }];
  const m = WD.mergeEvents(text, wd);
  assert.deepEqual(m.map((e) => e.year), [1815, 1815, 1843, 1852]);
  assert.equal(m[0].source, 'wikidata');
  assert.deepEqual(WD.mergeEvents(null, null), []);
});
