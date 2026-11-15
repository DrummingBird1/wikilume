/* WikiLume – reading history ("continue reading").
   Storage: one chrome.storage.local key per article ("hist:<host>|<Title>") holding { host, key, title, ts, pct }, so two tabs never
   overwrite each other. Local only, capped at MAX entries (oldest dropped). Falls back to memory when chrome.storage is missing
   (unit tests, plain-page testing). The pure helpers (clampPct, toEntry, oldestToDrop) are unit-tested in test/history.test.js. */
(function (global) {
  'use strict';

  const PREFIX = 'hist:';
  const MAX = 200;
  const HOST_RE = /^[a-z0-9-]{2,30}\.wikipedia\.org$/;

  const hasChrome = !!(global.chrome && chrome.storage && chrome.storage.local);
  const LS_PREFIX = 'wikilume-hist:';
  const mem = new Map();
  const lsOrNull = () => { try { return global.localStorage || null; } catch (e) { return null; } };
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => { try { fn(); } catch (e) { /* one broken listener must not break the others */ } });

  const store = hasChrome
    ? {
        async all() {
          const all = await chrome.storage.local.get(null);
          return Object.keys(all).filter((k) => k.startsWith(PREFIX)).map((k) => [k, all[k]]);
        },
        async get(id) { return (await chrome.storage.local.get(id))[id]; },
        async set(obj) { await chrome.storage.local.set(obj); },
        async remove(keys) { await chrome.storage.local.remove(keys); },
      }
    : {
        // plain pages (mock site, unit tests): localStorage when there is one, memory otherwise
        async all() {
          const ls = lsOrNull();
          if (!ls) return Array.from(mem.entries());
          const out = [];
          for (let i = 0; i < ls.length; i++) {
            const k = ls.key(i);
            if (k && k.startsWith(LS_PREFIX)) {
              try { out.push([k.slice(LS_PREFIX.length), JSON.parse(ls.getItem(k))]); } catch (e) { /* skip corrupt */ }
            }
          }
          return out;
        },
        async get(id) {
          const ls = lsOrNull();
          if (!ls) return mem.get(id);
          try { const v = ls.getItem(LS_PREFIX + id); return v == null ? undefined : JSON.parse(v); } catch (e) { return undefined; }
        },
        async set(obj) {
          const ls = lsOrNull();
          for (const k in obj) ls ? ls.setItem(LS_PREFIX + k, JSON.stringify(obj[k])) : mem.set(k, obj[k]);
          emit();
        },
        async remove(keys) {
          const ls = lsOrNull();
          [].concat(keys).forEach((k) => (ls ? ls.removeItem(LS_PREFIX + k) : mem.delete(k)));
          emit();
        },
      };

  function onChange(fn) {
    listeners.add(fn);
    if (hasChrome && listeners.size === 1) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && Object.keys(changes).some((k) => k.startsWith(PREFIX))) emit();
      });
    }
    return () => listeners.delete(fn);
  }

  const normKey = (title) => String(title || '').trim().replace(/ /g, '_');
  const idFor = (host, key) => PREFIX + host + '|' + normKey(key);
  const clip = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

  /** Scroll position as a whole percentage from 0 to 100; anything that is not a number becomes 0. */
  function clampPct(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
  }

  /** Clean entry or null. `strict` also requires a *.wikipedia.org host (used for anything that becomes a link in the popup). */
  function toEntry(raw, strict) {
    if (!raw || typeof raw !== 'object') return null;
    const host = String(raw.host || '').toLowerCase();
    const key = normKey(raw.key);
    if (!host || !key || key.length > 255) return null;
    if (strict && !HOST_RE.test(host)) return null;
    const ts = Number(raw.ts);
    return { host, key, title: clip(raw.title || key.replace(/_/g, ' '), 200), ts: Number.isFinite(ts) && ts > 0 ? ts : Date.now(), pct: clampPct(raw.pct) };
  }

  /** Given [id, entry] rows, the ids to delete so that at most `max` (the newest) remain. */
  function oldestToDrop(rows, max) {
    const limit = Math.max(0, max == null ? MAX : max);
    if (rows.length <= limit) return [];
    return rows.slice().sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0)).slice(limit).map((r) => r[0]);
  }

  async function get(host, key) {
    return toEntry(await store.get(idFor(host, key)));
  }

  /** Save or update an article. Prunes only when a new article is added, so scroll updates stay cheap. */
  async function record(raw) {
    const e = toEntry(Object.assign({}, raw, { ts: Date.now() }));
    if (!e) return null;
    const id = idFor(e.host, e.key);
    const isNew = (await store.get(id)) === undefined;
    await store.set({ [id]: e });
    if (isNew) {
      const drop = oldestToDrop(await store.all(), MAX);
      if (drop.length) await store.remove(drop);
    }
    return e;
  }

  async function list() {
    return (await store.all()).map(([, v]) => toEntry(v, true)).filter(Boolean).sort((a, b) => b.ts - a.ts);
  }

  const remove = (host, key) => store.remove(idFor(host, key));
  async function clear() {
    const ids = (await store.all()).map(([k]) => k);
    if (ids.length) await store.remove(ids);
  }

  global.WF = global.WF || {};
  global.WF.history = { MAX, idFor, clampPct, toEntry, oldestToDrop, get, record, list, remove, clear, onChange };
})(typeof globalThis !== 'undefined' ? globalThis : window);
