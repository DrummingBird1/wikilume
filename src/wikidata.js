/* WikiLume – dated facts about the article's subject from Wikidata (born, died, founded…).
   Wikidata is a Wikimedia project; the anonymous action API allows cross-origin reads with origin=*, so no host permission is needed.
   Pure functions only (see test/wikidata.test.js); the content script does the fetch and merges the result into the timeline. */
(function (global) {
  'use strict';

  // property id → i18n key of its label. A small fixed list on purpose: no extra label lookups, every label is translated by us.
  const PROPS = {
    P569: 'wdBorn',
    P570: 'wdDied',
    P571: 'wdFounded',
    P576: 'wdDissolved',
    P577: 'wdPublished',
    P580: 'wdStarted',
    P582: 'wdEnded',
    P585: 'wdEvent',
  };
  const MIN_YEAR = 1000; // same window as the text heuristic in timeline.js
  const MAX_YEAR = 2099;
  const QID_RE = /^Q[1-9]\d{0,11}$/;

  const isQid = (q) => QID_RE.test(String(q || ''));

  function entityUrl(qid) {
    if (!isQid(qid)) return null;
    const q = new URLSearchParams({ action: 'wbgetentities', format: 'json', origin: '*', props: 'claims', ids: qid });
    return 'https://www.wikidata.org/w/api.php?' + q.toString();
  }

  /** Wikidata time value ("+1815-12-10T00:00:00Z", precision 11 = day, 9 = year) → year or null. Low precision (decade and up) is skipped. */
  function yearOf(value) {
    if (!value || typeof value.time !== 'string' || !(Number(value.precision) >= 9)) return null;
    const m = value.time.match(/^\+(\d{4,})-/); // BCE dates start with "-" and are out of the supported window anyway
    if (!m) return null;
    const y = Number(m[1]);
    return y >= MIN_YEAR && y <= MAX_YEAR ? y : null;
  }

  /** wbgetentities JSON → [{ year, kind (i18n key), prop, source: 'wikidata' }], one per property and year, sorted by year. */
  function parseEntity(json, qid) {
    const ent = json && json.entities && json.entities[qid];
    const claims = ent && ent.claims;
    if (!claims) return [];
    const out = [];
    const seen = new Set();
    for (const prop of Object.keys(PROPS)) {
      for (const c of claims[prop] || []) {
        if (c.rank === 'deprecated') continue;
        const snak = c.mainsnak;
        if (!snak || snak.snaktype !== 'value' || !snak.datavalue) continue;
        const year = yearOf(snak.datavalue.value);
        if (year == null) continue;
        const key = prop + '|' + year;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ year, kind: PROPS[prop], prop, source: 'wikidata' });
      }
    }
    return out.sort((a, b) => a.year - b.year);
  }

  /** Merge Wikidata facts into the text events, keeping chronological order (Wikidata first within the same year). */
  function mergeEvents(textEvents, wdEvents) {
    return (wdEvents || []).concat(textEvents || []).sort((a, b) => a.year - b.year || (a.source === 'wikidata' ? -1 : 0) - (b.source === 'wikidata' ? -1 : 0));
  }

  global.WF = global.WF || {};
  global.WF.wikidata = { PROPS, isQid, entityUrl, yearOf, parseEntity, mergeEvents };
})(typeof globalThis !== 'undefined' ? globalThis : window);
