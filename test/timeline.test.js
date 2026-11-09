// Run with: node --test test/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/timeline.js');
const TL = globalThis.WF.timeline;

test('findYear accepts plausible years and records the context', () => {
  assert.equal(TL.findYear('Nothing here.'), null);
  assert.equal(TL.findYear('In 1843 the memoir appeared.').year, 1843);
  assert.equal(TL.findYear('In 1843 the memoir appeared.').prep, true);
  assert.equal(TL.findYear('Section 12.1999 only'), null, 'a number glued to a dot is not a year');
  assert.equal(TL.findYear('It cost $1500 each.'), null, 'money is not a year');
  assert.equal(TL.findYear('A value of 3.1415 was used.'), null, 'decimals are not years');
  assert.equal(TL.findYear('There were 2150 of them.'), null, 'beyond 2099');
  assert.equal(TL.findYear('More than 1500 copies were sold.').quant, true);
  assert.equal(TL.findYear('ב-1843 פורסם הזיכרון.').year, 1843);
  assert.equal(TL.findYear('ב-1843 פורסם הזיכרון.').prep, true);
});

test('splitSentences splits on sentence ends but keeps abbreviations inside lower-case runs together', () => {
  const s = TL.splitSentences('She was born in 1815. She died in 1852! Was it so? Yes, in 1853 they said so.');
  assert.equal(s.length, 4);
  assert.equal(s[0], 'She was born in 1815.');
});

const sample = [
  { text: 'Ada Example (10 December 1815 – 27 November 1852) was a fictional mathematician and writer.', section: '' },
  { text: 'In 1833 she met Charles Example, who showed her the prototype. She later translated a memoir.', section: 'Early life' },
  { text: 'The memoir was published in 1843 with extensive notes. The notes ran to three times its length.', section: 'Work' },
  { text: 'More than 1500 copies were distributed. Nothing else happened that year at all really.', section: 'Work' },
  { text: 'No dates in this one at all, only prose that goes on for a little while.', section: 'Work' },
  { text: 'Example, C. (1840). Memoir on the engine. London.', section: 'References' },
];

test('extractEvents ranks dated sentences, drops quantities and reference sections, sorts by year', () => {
  const ev = TL.extractEvents(sample);
  assert.deepEqual(ev.map((e) => e.year), [1815, 1833, 1843]);
  assert.ok(ev.every((e) => e.text.length > 0 && e.score >= 2));
  assert.ok(!ev.some((e) => e.text.includes('1500')), 'quantities are filtered out');
  assert.ok(!ev.some((e) => e.section === 'References'), 'reference sections are skipped');
  assert.equal(ev[0].section, '');
});

test('extractEvents caps events per section and overall, keeping the best-scored', () => {
  const many = [{ text: Array.from({ length: 10 }, (_, i) => `In ${1900 + i} something quite notable happened in the story of this place.`).join(' '), section: 'History' }];
  assert.equal(TL.extractEvents(many, { perSection: 3 }).length, 3);
  const spread = Array.from({ length: 30 }, (_, i) => ({ text: `In ${1800 + i} a notable thing happened to the subject of this article.`, section: 'S' + i }));
  assert.equal(TL.extractEvents(spread, { max: 12 }).length, 12);
});

test('extractEvents removes duplicates and bracketed footnotes, and trims long sentences', () => {
  const long = 'In 1850 ' + 'the committee considered a very long list of proposals, '.repeat(8) + 'and finally decided.';
  const ev = TL.extractEvents([
    { text: 'In 1843 the memoir appeared[1][citation needed] to wide acclaim.', section: 'A' },
    { text: 'In 1843 the memoir appeared to wide acclaim.', section: 'A' },
    { text: long, section: 'B' },
  ]);
  assert.equal(ev.filter((e) => e.year === 1843).length, 1);
  assert.ok(!ev[0].text.includes('['));
  const trimmed = ev.find((e) => e.year === 1850);
  assert.ok(trimmed.text.length <= 221 && trimmed.text.endsWith('…'));
});

test('hebrew sentences work too', () => {
  const ev = TL.extractEvents([
    { text: 'עדה דוגמה נולדה בשנת 1815 בלונדון. היא הייתה מתמטיקאית.', section: '' },
    { text: 'ב-1843 פורסם התרגום שלה עם הערות מפורטות רבות.', section: 'עבודתה' },
    { text: 'לאחר מכן לא פרסמה עוד שום דבר חשוב כלל.', section: 'עבודתה' },
  ]);
  assert.deepEqual(ev.map((e) => e.year), [1815, 1843]);
});

test('readingMinutes counts words by language and CJK characters separately', () => {
  const en = Array(2).fill('word '.repeat(220));
  assert.equal(TL.readingMinutes(en, 'en'), 2);
  assert.equal(TL.readingMinutes(['word '.repeat(170)], 'he'), 1);
  assert.equal(TL.readingMinutes(['word '.repeat(340)], 'he'), 2, 'Hebrew and Arabic are read more slowly');
  assert.equal(TL.readingMinutes([], 'en'), 1, 'never below one minute');
  // a long Japanese paragraph has no spaces: it must not count as one word
  assert.equal(TL.readingMinutes(['日本語の文章です。'.repeat(500)], 'ja'), 9);
  assert.equal(TL.readingMinutes(['Albert Einstein（アルベルト・アインシュタイン）'], 'ja'), 1);
});

test('splitSentences keeps initials together and splits Japanese sentences that have no spaces', () => {
  assert.deepEqual(
    TL.splitSentences('He worked with his friend D.G. Champernowne in 1948. Then he left.'),
    ['He worked with his friend D.G. Champernowne in 1948.', 'Then he left.']
  );
  assert.deepEqual(TL.splitSentences('Albert met J. Einstein in 1905. It went well.'), ['Albert met J. Einstein in 1905.', 'It went well.']);
  assert.deepEqual(TL.splitSentences('1879年に生まれた。1880年に移住した。'), ['1879年に生まれた。', '1880年に移住した。']);
  assert.deepEqual(TL.splitSentences('One. Two! Three?'), ['One.', 'Two!', 'Three?']);
});
