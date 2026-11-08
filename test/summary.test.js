// Run with: node --test test/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/timeline.js');
require('../src/summary.js');
const S = globalThis.WF.summary;

const blocks = [
  { text: 'Ada Example was a fictional mathematician. She wrote notes. She lived in London. Nothing more.', section: '' },
  { text: 'In 1833 she met Charles Example.', section: 'Early life' },
  { text: 'The memoir appeared in 1843.', section: 'Work' },
];

test('outputLanguage maps to the languages the on-device model can write', () => {
  assert.equal(S.outputLanguage('en-GB'), 'en');
  assert.equal(S.outputLanguage('ja'), 'ja');
  assert.equal(S.outputLanguage('es'), 'es');
  assert.equal(S.outputLanguage('he'), 'en');
  const o = S.baseOptions('he');
  assert.deepEqual(o.expectedInputLanguages, ['he']);
  assert.equal(o.outputLanguage, 'en');
  assert.equal(o.type, 'key-points');
});

test('articleText adds headings and respects the size limit', () => {
  const t = S.articleText(blocks, 10000);
  assert.ok(t.includes('## Early life') && t.includes('## Work'));
  assert.ok(t.startsWith('Ada Example'));
  assert.ok(S.articleText(blocks, 40).length <= 40);
});

test('leadSummary takes the first sentences of the lead, or of the article if there is no lead', () => {
  assert.equal(S.leadSummary(blocks, 2), 'Ada Example was a fictional mathematician. She wrote notes.');
  assert.equal(S.leadSummary([{ text: 'Only section. Second one. Third.', section: 'X' }], 2), 'Only section. Second one.');
  assert.equal(S.leadSummary([], 3), '');
});

test('mdToItems strips markdown and never keeps markup', () => {
  const items = S.mdToItems('# Title\n* **First** point\n- second `point`\n1. third\n\nplain line');
  assert.deepEqual(items.map((i) => i.text), ['Title', 'First point', 'second point', 'third', 'plain line']);
  assert.deepEqual(items.map((i) => i.bullet), [false, true, true, true, false]);
});

test('check reports the missing API, availability states and errors', async () => {
  delete globalThis.Summarizer;
  assert.equal((await S.check('en')).state, 'no-api');
  globalThis.Summarizer = { availability: async () => 'downloadable' };
  const r = await S.check('en');
  assert.equal(r.state, 'downloadable');
  assert.equal(r.opts.outputLanguage, 'en');
  globalThis.Summarizer = { availability: async () => { throw new Error('NotSupportedError'); } };
  const bad = await S.check('he');
  assert.equal(bad.state, 'unavailable');
  assert.match(bad.error, /NotSupported/);
  delete globalThis.Summarizer;
});

function fakeSummarizer(chunks, log) {
  return {
    availability: async () => 'available',
    create: async (opts) => {
      log.createOpts = opts;
      if (opts.monitor) opts.monitor({ addEventListener: (name, cb) => { log.progress = (f) => cb({ loaded: f }); } });
      return {
        inputQuota: 100,
        summarizeStreaming: (text, o) => {
          log.input = text;
          log.context = o.context;
          return new ReadableStream({ start(c) { chunks.forEach((x) => c.enqueue(x)); c.close(); } });
        },
        destroy: () => { log.destroyed = true; },
      };
    },
  };
}

test('run streams incremental chunks, trims input to the quota and destroys the summarizer', async () => {
  const log = {};
  globalThis.Summarizer = fakeSummarizer(['* One', ' two', '\n* Three'], log);
  const seen = [];
  const out = await S.run('x'.repeat(5000), { opts: S.baseOptions('en'), context: 'Ada', onChunk: (s) => seen.push(s), onProgress: () => {} });
  assert.equal(out, '* One two\n* Three');
  assert.deepEqual(seen, ['* One', '* One two', '* One two\n* Three']);
  assert.equal(log.input.length, 2000, 'input is cut to max(2000, quota*3)');
  assert.equal(log.context, 'Ada');
  assert.equal(log.destroyed, true);
  assert.equal(log.createOpts.outputLanguage, 'en');
  delete globalThis.Summarizer;
});

test('run also copes with cumulative chunks (older Chrome builds)', async () => {
  const log = {};
  globalThis.Summarizer = fakeSummarizer(['* One', '* One two', '* One two three'], log);
  const out = await S.run('text', { opts: S.baseOptions('en') });
  assert.equal(out, '* One two three');
  delete globalThis.Summarizer;
});

test('run still destroys the summarizer when streaming fails', async () => {
  const log = {};
  globalThis.Summarizer = {
    create: async () => ({ summarizeStreaming: () => ({ getReader: () => ({ read: async () => { throw new Error('boom'); } }) }), destroy: () => { log.destroyed = true; } }),
  };
  await assert.rejects(() => S.run('text', { opts: S.baseOptions('en') }), /boom/);
  assert.equal(log.destroyed, true);
  delete globalThis.Summarizer;
});
