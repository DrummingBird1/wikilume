/* WikiLume – timeline extraction.
   Pulls dated sentences out of an article and ranks them. Heuristic by design (no AI, no network): a sentence becomes an
   event when it contains a plausible year (1000–2099), scored by where the year sits and what precedes it.
   extractEvents() is pure (see test/timeline.test.js); collectBlocks() is the only DOM-aware part. */
(function (global) {
  'use strict';

  const YEAR_RE = /(?<![\d.,])(1\d{3}|20\d{2})(?!\d)(?![.,]\d)/g;
  const MONEY_BEFORE = /[$€£₪#]\s*$/;
  // words that usually introduce a date ("in 1843", "ב-1843", "seit 1843") – boosts the score
  const PREP_BEFORE = /(^|[\s(\["„“–—-])(in|on|by|since|until|from|during|of|after|before|early|late|mid|c\.|circa|en|desde|hasta|de|depuis|vers|seit|bis|um|im|в|с|до|к|ב|בשנת|עד|מאז|משנת|לפני|אחרי|בסביבות|عام|سنة)[\s־\-‐]*$/i;
  // words that usually mean the number is a quantity, not a year ("more than 1500 copies")
  const QUANT_BEFORE = /(^|[\s(\["„“–—-])(than|over|nearly|approximately|roughly|almost|exceeding|מעל|כמעט|בערך|כ)[\s־\-‐]*$/i;
  // sections that hold references, not narrative
  const SKIP_SECTIONS = /^(references|notes|footnotes|external links|further reading|bibliography|see also|sources|citations|works cited|הערות שוליים|הערות|קישורים חיצוניים|לקריאה נוספת|ביבליוגרפיה|ראו גם|מקורות|الهوامش|مراجع|وصلات خارجية|ссылки|примечания|литература|véase también|referencias|enlaces externos|notes et références|liens externes|literatur|weblinks|einzelnachweise)$/i;

  const clean = (s) =>
    String(s || '')
      .replace(/\[[^\]]{1,24}\]/g, '') // [1], [a], [citation needed]
      .replace(/\s+/g, ' ')
      .trim();

  // Japanese/Chinese sentences end in 。！？ with no space after them; elsewhere a sentence ends at .!?… plus a space and a capital,
  // except after a single capital letter (an initial such as "D.G. Champernowne" or "J. Einstein").
  const SENTENCE_BREAK = /(?<=[。！？])(?=\S)|(?<=[.!?…])(?<!(?:^|[\s.("“‘])\p{Lu}\.)\s+(?=[\p{Lu}\p{Lo}"“„(\d])/u;

  function splitSentences(text) {
    return text.split(SENTENCE_BREAK).map((p) => p.trim()).filter(Boolean);
  }

  /** First plausible year in a sentence: { year, index, prep, quant } or null. */
  function findYear(sentence) {
    YEAR_RE.lastIndex = 0;
    let m;
    while ((m = YEAR_RE.exec(sentence))) {
      const before = sentence.slice(Math.max(0, m.index - 14), m.index);
      if (MONEY_BEFORE.test(before)) continue;
      return { year: Number(m[1]), index: m.index, prep: PREP_BEFORE.test(before), quant: QUANT_BEFORE.test(before) };
    }
    return null;
  }

  function score(sentence, hit) {
    let s = 0;
    if (hit.index <= 45) s += 3;
    else if (hit.index <= 100) s += 1;
    if (hit.prep) s += 3;
    if (hit.quant) s -= 5;
    const len = sentence.length;
    if (len >= 40 && len <= 220) s += 1;
    else if (len < 30) s -= 3;
    else if (len > 320) s -= 2;
    return s;
  }

  function trim(sentence, max) {
    if (sentence.length <= max) return sentence;
    const cut = sentence.lastIndexOf(' ', max);
    return sentence.slice(0, cut > max * 0.6 ? cut : max).replace(/[,;:\s]+$/, '') + '…';
  }

  /** blocks: [{ text, section, el? }] in document order → events sorted chronologically. */
  function extractEvents(blocks, opts) {
    const max = (opts && opts.max) || 40;
    const perSection = (opts && opts.perSection) || 4;
    const seen = new Set();
    const bySection = new Map();
    let order = 0;

    for (const b of blocks) {
      if (SKIP_SECTIONS.test((b.section || '').trim())) continue;
      for (const raw of splitSentences(clean(b.text))) {
        const hit = findYear(raw);
        if (!hit) continue;
        const sc = score(raw, hit);
        if (sc < 2) continue;
        const key = hit.year + '|' + raw.slice(0, 40).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const ev = { year: hit.year, text: trim(raw, 220), section: b.section || '', el: b.el || null, score: sc, order: order++ };
        const list = bySection.get(ev.section) || [];
        list.push(ev);
        bySection.set(ev.section, list);
      }
    }

    let picked = [];
    for (const list of bySection.values()) {
      list.sort((a, b) => b.score - a.score || a.order - b.order);
      picked.push(...list.slice(0, perSection));
    }
    if (picked.length > max) picked = picked.sort((a, b) => b.score - a.score || a.order - b.order).slice(0, max);
    return picked.sort((a, b) => a.year - b.year || a.order - b.order);
  }

  /** DOM: gather prose blocks (paragraphs and bullet items) with the h2 section they belong to. */
  function collectBlocks(root) {
    const blocks = [];
    let section = '';
    const SKIP = 'table, .navbox, .infobox, .thumb, figure, .reflist, ol.references, .mw-references-wrap, .hatnote, .sidebar, .gallery, .toc, #toc, .catlinks, .metadata, .mw-editsection';
    for (const el of root.querySelectorAll('h2, p, li')) {
      if (el.tagName === 'H2') {
        const c = el.cloneNode(true);
        c.querySelectorAll('.mw-editsection, style').forEach((n) => n.remove());
        section = clean(c.textContent);
        continue;
      }
      if (el.closest(SKIP)) continue;
      if (el.tagName === 'LI' && (el.closest('ol') || el.querySelector('cite, a.external, .reference-text'))) continue;
      const c = el.cloneNode(true);
      c.querySelectorAll('sup.reference, .mw-editsection, style, script, .noprint, .mwe-math-element').forEach((n) => n.remove());
      const text = clean(c.textContent);
      if (text.length >= 25) blocks.push({ text, section, el });
    }
    return blocks;
  }

  /** Reading time in whole minutes. Japanese and Chinese have no spaces, so Han/kana characters are counted
      at ~500 per minute instead of treating a whole paragraph as one "word". Other text: words per minute by language. */
  function readingMinutes(texts, lang) {
    const CJK = /[　-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/g; // CJK punctuation, kana, Han, full-width forms
    let words = 0;
    let cjk = 0;
    for (const raw of texts) {
      const s = String(raw || '').trim();
      if (!s) continue;
      const han = s.match(CJK);
      if (han) cjk += han.length;
      const rest = han ? s.replace(CJK, ' ').trim() : s;
      if (rest) words += rest.split(/\s+/).length;
    }
    const wpm = /^(he|iw|ar)/.test(String(lang || '')) ? 170 : 220;
    return Math.max(1, Math.round(words / wpm + cjk / 500));
  }

  global.WF = global.WF || {};
  global.WF.timeline = { extractEvents, splitSentences, findYear, collectBlocks, clean, readingMinutes };
})(typeof globalThis !== 'undefined' ? globalThis : window);
