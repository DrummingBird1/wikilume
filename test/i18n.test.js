// Run with: node --test test/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/i18n.js');
const WF = globalThis.WF;

test('English and Hebrew define exactly the same keys', () => {
  const en = Object.keys(WF.STRINGS.en).sort();
  const he = Object.keys(WF.STRINGS.he).sort();
  assert.deepEqual(he.filter((k) => !en.includes(k)), [], 'keys only in Hebrew');
  assert.deepEqual(en.filter((k) => !he.includes(k)), [], 'keys only in English');
});

test('placeholders such as {n} or {date} match between the two languages', () => {
  const vars = (s) => (s.match(/\{[a-zA-Z]+\}/g) || []).sort().join(',');
  for (const k of Object.keys(WF.STRINGS.en)) {
    assert.equal(vars(WF.STRINGS.he[k]), vars(WF.STRINGS.en[k]), `placeholders differ for "${k}"`);
  }
});

test('makeT substitutes variables and falls back to English, then to the key', () => {
  const he = WF.makeT('he');
  assert.equal(he('readingTime', { n: 7 }), WF.STRINGS.he.readingTime.replace('{n}', '7'));
  assert.equal(WF.makeT('xx')('save'), WF.STRINGS.en.save);
  assert.equal(WF.makeT('en')('no-such-key'), 'no-such-key');
});

test('resolveLang prefers an explicit choice, then the page language', () => {
  assert.equal(WF.resolveLang('he', 'en'), 'he');
  assert.equal(WF.resolveLang('en', 'he'), 'en');
  assert.equal(WF.resolveLang('auto', 'he'), 'he');
});

test('search languages are valid, unique wiki codes', () => {
  const codes = WF.SEARCH_LANGS.map((l) => l[0]);
  assert.equal(new Set(codes).size, codes.length, 'duplicate code');
  for (const [code, name] of WF.SEARCH_LANGS) {
    assert.match(code, /^[a-z0-9-]{2,30}$/, code);
    assert.ok(name && name.length < 40);
  }
  assert.ok(codes.includes('en') && codes.includes('he'));
});

test('defaults cover the new settings', () => {
  assert.equal(WF.DEFAULTS.cover, true);
  assert.deepEqual(WF.DEFAULTS.searchLangs, []);
  assert.equal(WF.DEFAULTS.enabled, true);
});
