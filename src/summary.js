/* WikiLume – article summaries.
   Free path: Chrome's built-in on-device Summarizer API (Gemini Nano). No account, no API key, nothing leaves the computer.
   It only exists in recent desktop Chrome, needs a one-time model download, and (as of writing) summarises English, Spanish
   and Japanese. Everything here degrades gracefully: when it is missing we fall back to the article's own lead sentences.
   Pure helpers + a thin wrapper around the API – no DOM, so it is unit-testable with a fake Summarizer. */
(function (global) {
  'use strict';

  const OUT_LANGS = ['en', 'es', 'ja'];
  const baseLang = (l) => String(l || 'en').toLowerCase().split('-')[0];
  const outputLanguage = (pageLang) => (OUT_LANGS.includes(baseLang(pageLang)) ? baseLang(pageLang) : 'en');

  function baseOptions(pageLang) {
    const b = baseLang(pageLang);
    return {
      type: 'key-points',
      format: 'markdown',
      length: 'medium',
      sharedContext: 'This is an encyclopedia article from Wikipedia.',
      expectedInputLanguages: [b],
      expectedContextLanguages: [b],
      outputLanguage: outputLanguage(pageLang),
    };
  }

  /** Plain text for the model: section headings plus prose, cut at maxChars. blocks = timeline.collectBlocks() output. */
  function articleText(blocks, maxChars) {
    let out = '';
    let section = null;
    for (const b of blocks) {
      if (b.section !== section) {
        section = b.section;
        if (section) out += '\n## ' + section + '\n';
      }
      out += b.text + '\n';
      if (out.length >= maxChars) break;
    }
    return out.slice(0, maxChars).trim();
  }

  /** The no-AI fallback: the first few sentences of the lead. */
  function leadSummary(blocks, maxSentences) {
    const n = maxSentences || 3;
    const lead = blocks.filter((b) => !b.section);
    const src = lead.length ? lead : blocks;
    const split = global.WF && global.WF.timeline ? global.WF.timeline.splitSentences : (s) => s.split(/(?<=[.!?])\s+/);
    const out = [];
    for (const b of src) {
      for (const s of split(b.text)) {
        out.push(s);
        if (out.length >= n) return out.join(' ');
      }
    }
    return out.join(' ');
  }

  /** Markdown list from the model → plain items (we never inject model output as HTML). */
  function mdToItems(md) {
    return String(md || '')
      .split(/\r?\n/)
      .map((line) => ({
        bullet: /^\s*([*\-•]|\d+[.)])\s+/.test(line),
        text: line
          .replace(/^\s*([*\-•]|\d+[.)])\s+/, '')
          .replace(/^#+\s*/, '')
          .replace(/(\*\*|__)(.+?)\1/g, '$2')
          .replace(/[`*_]{1,2}/g, '')
          .trim(),
      }))
      .filter((i) => i.text);
  }

  /** { state: 'no-api' | 'unavailable' | 'downloadable' | 'downloading' | 'available', opts } */
  async function check(pageLang) {
    const S = global.Summarizer;
    if (!S || typeof S.availability !== 'function') return { state: 'no-api' };
    const opts = baseOptions(pageLang);
    try {
      return { state: await S.availability(opts), opts };
    } catch (e) {
      return { state: 'unavailable', opts, error: String((e && e.message) || e) };
    }
  }

  /** Summarise `text`; o = { opts, context, onProgress(0..1), onChunk(textSoFar), signal }. Resolves with the full text. */
  async function run(text, o) {
    const S = global.Summarizer;
    const sum = await S.create(Object.assign({}, o.opts, {
      signal: o.signal,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => o.onProgress && o.onProgress(e.loaded));
      },
    }));
    try {
      const maxChars = Math.max(2000, Math.min(24000, Math.floor((sum.inputQuota || 8000) * 3)));
      const input = text.slice(0, maxChars);
      let acc = '';
      if (typeof sum.summarizeStreaming === 'function') {
        const reader = sum.summarizeStreaming(input, { context: o.context, signal: o.signal }).getReader();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          // chunks are incremental in current Chrome but were cumulative in older builds: handle both
          acc = acc && value.startsWith(acc) ? value : acc + value;
          if (o.onChunk) o.onChunk(acc);
        }
      } else {
        acc = await sum.summarize(input, { context: o.context, signal: o.signal });
        if (o.onChunk) o.onChunk(acc);
      }
      return acc;
    } finally {
      try { if (sum.destroy) sum.destroy(); } catch (e) { /* ignore */ }
    }
  }

  global.WF = global.WF || {};
  global.WF.summary = { OUT_LANGS, outputLanguage, baseOptions, articleText, leadSummary, mdToItems, check, run };
})(typeof globalThis !== 'undefined' ? globalThis : window);
