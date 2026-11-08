/* WikiFree – bookmarks (saved articles).
   Storage: one chrome.storage.local key per bookmark ("bm:<host>|<Title>"), so saving from two tabs at once never
   overwrites each other and there is no size cap beyond the browser's local quota (10 MB, tens of thousands of entries).
   Falls back to localStorage / memory when chrome.storage is missing (plain-page testing, unit tests).
   Shared by the content script and the toolbar popup. */
(function (global) {
  'use strict';

  const PREFIX = 'bm:';
  const LS_PREFIX = 'wikifree-bm:';
  const HOST_RE = /^[a-z0-9-]{2,30}\.wikipedia\.org$/;
  const THUMB_RE = /^https:\/\/upload\.wikimedia\.org\//;

  const hasChrome = !!(global.chrome && chrome.storage && chrome.storage.local);
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => { try { fn(); } catch (e) { /* a broken listener must not break the others */ } });

  /* ------------------------------------------------------------------ storage backends */

  let store;
  if (hasChrome) {
    store = {
      async all() {
        const all = await chrome.storage.local.get(null);
        return Object.keys(all).filter((k) => k.startsWith(PREFIX)).map((k) => [k, all[k]]);
      },
      async set(obj) { await chrome.storage.local.set(obj); },
      async remove(key) { await chrome.storage.local.remove(key); },
    };
  } else {
    const mem = new Map();
    const ls = () => {
      try { return global.localStorage || null; } catch (e) { return null; }
    };
    store = {
      async all() {
        const s = ls();
        if (!s) return Array.from(mem.entries());
        const out = [];
        for (let i = 0; i < s.length; i++) {
          const k = s.key(i);
          if (k && k.startsWith(LS_PREFIX)) {
            try { out.push([k.slice(LS_PREFIX.length), JSON.parse(s.getItem(k))]); } catch (e) { /* skip corrupt */ }
          }
        }
        return out;
      },
      async set(obj) {
        const s = ls();
        for (const k in obj) s ? s.setItem(LS_PREFIX + k, JSON.stringify(obj[k])) : mem.set(k, obj[k]);
        emit();
      },
      async remove(key) {
        const s = ls();
        s ? s.removeItem(LS_PREFIX + key) : mem.delete(key);
        emit();
      },
    };
  }

  let subscribed = false;
  function onChange(fn) {
    listeners.add(fn);
    if (!subscribed) {
      subscribed = true;
      if (hasChrome) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local' && Object.keys(changes).some((k) => k.startsWith(PREFIX))) emit();
        });
      } else if (global.addEventListener) {
        global.addEventListener('storage', (e) => { if (e.key && e.key.startsWith(LS_PREFIX)) emit(); });
      }
    }
    return () => listeners.delete(fn);
  }

  /* ------------------------------------------------------------------ data model */

  const normKey = (title) => String(title || '').trim().replace(/ /g, '_');
  const idFor = (host, key) => PREFIX + host + '|' + normKey(key);
  const idOf = (e) => idFor(e.host, e.key);
  const clip = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

  /** Turn any object into a clean entry, or null if it can't be one. `strict` also checks the host is a Wikipedia. */
  function toEntry(raw, strict) {
    if (!raw || typeof raw !== 'object') return null;
    const host = String(raw.host || '').toLowerCase();
    const key = normKey(raw.key);
    if (!host || !key || key.length > 255) return null;
    if (strict && !HOST_RE.test(host)) return null;
    let thumb = '';
    if (typeof raw.thumb === 'string') {
      try { thumb = new URL(raw.thumb, 'https://x.invalid/').href; } catch (e) { thumb = ''; }
      if (!THUMB_RE.test(thumb)) thumb = '';
    }
    const added = Number(raw.added);
    return {
      host, key,
      title: clip(raw.title || key.replace(/_/g, ' '), 200),
      desc: clip(raw.desc, 300),
      thumb,
      added: Number.isFinite(added) && added > 0 ? added : Date.now(),
    };
  }

  const urlFor = (e) => 'https://' + e.host + '/wiki/' + encodeURIComponent(e.key);

  /* ------------------------------------------------------------------ operations */

  async function list() {
    const rows = await store.all();
    return rows.map(([, v]) => toEntry(v, false)).filter(Boolean).sort((a, b) => b.added - a.added);
  }

  async function has(id) {
    const rows = await store.all();
    return rows.some(([k]) => k === id);
  }

  async function add(raw) {
    const e = toEntry(raw, false);
    if (!e) return null;
    await store.set({ [idOf(e)]: e });
    return e;
  }

  const remove = (id) => store.remove(id);

  function exportJSON(entries) {
    return JSON.stringify({ app: 'WikiFree', version: 1, exported: new Date().toISOString(), bookmarks: entries.map(({ host, key, title, desc, thumb, added }) => ({ host, key, title, desc, thumb, added })) }, null, 2);
  }

  /** Merge a previously exported file. Existing bookmarks are kept; the file is untrusted, so every entry is re-validated. */
  async function importJSON(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error('invalid'); }
    const arr = Array.isArray(data) ? data : data && Array.isArray(data.bookmarks) ? data.bookmarks : null;
    if (!arr) throw new Error('invalid');
    const existing = new Set((await store.all()).map(([k]) => k));
    const batch = {};
    let skipped = 0;
    for (const raw of arr.slice(0, 20000)) {
      const e = toEntry(raw, true);
      if (!e) { skipped++; continue; }
      const id = idOf(e);
      if (existing.has(id) || batch[id]) { skipped++; continue; }
      batch[id] = e;
    }
    const added = Object.keys(batch).length;
    if (added) await store.set(batch);
    return { added, skipped };
  }

  /* ------------------------------------------------------------------ small DOM helpers (page + popup) */

  function download(filename, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /** Opens the file chooser (must be called from a click handler) and resolves with the file's text. */
  function pickFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.style.display = 'none';
      input.addEventListener('change', () => {
        const f = input.files && input.files[0];
        input.remove();
        if (!f) return reject(new Error('cancelled'));
        if (f.size > 20 * 1024 * 1024) return reject(new Error('invalid'));
        f.text().then(resolve, reject);
      });
      document.body.appendChild(input);
      input.click();
    });
  }

  const matches = (e, q) => !q || (e.title + ' ' + e.desc + ' ' + e.host).toLowerCase().includes(q.toLowerCase());

  /** Fill `container` (a <ul>) with the bookmark rows. opts: { t, onRemove(entry), newTab } */
  function renderList(container, entries, opts) {
    container.replaceChildren();
    for (const e of entries) {
      const li = document.createElement('li');
      li.className = 'wf-bm-item';

      const a = document.createElement('a');
      a.className = 'wf-bm-link';
      a.href = urlFor(e);
      if (opts.newTab) { a.target = '_blank'; a.rel = 'noopener'; }

      const th = document.createElement('div');
      th.className = 'wf-bm-th';
      if (e.thumb) th.style.backgroundImage = 'url("' + e.thumb.replace(/"/g, '%22') + '")';
      else th.textContent = Array.from(e.title)[0] || ''; // no lead image: show the initial instead of an empty box

      const text = document.createElement('div');
      text.className = 'wf-bm-text';
      const b = document.createElement('b');
      b.textContent = e.title;
      b.dir = 'auto';
      const d = document.createElement('span');
      d.textContent = e.desc;
      d.dir = 'auto';
      text.append(b, d);

      const badge = document.createElement('small');
      badge.className = 'wf-bm-lang';
      badge.textContent = e.host.split('.')[0];

      a.append(th, text, badge);

      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'wf-bm-rm';
      rm.textContent = '×';
      rm.title = opts.t('bmRemove');
      rm.setAttribute('aria-label', opts.t('bmRemove') + ': ' + e.title);
      rm.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); opts.onRemove(e); });

      li.append(a, rm);
      container.append(li);
    }
  }

  global.WF = global.WF || {};
  global.WF.bookmarks = { idFor, idOf, urlFor, toEntry, list, has, add, remove, onChange, exportJSON, importJSON, download, pickFile, matches, renderList };
})(typeof globalThis !== 'undefined' ? globalThis : window);
