/* WikiFree – content script.
   Takes over a rendered Wikipedia article page: keeps Wikipedia's own article DOM (so every template, table,
   formula and gadget keeps working), but swaps the surrounding skin for a clean reader layout. */
(function () {
  'use strict';

  const WF = globalThis.WF;
  if (!WF) return;

  const html = document.documentElement;
  const BYPASS_KEY = 'wf-bypass';
  const NS = 'http://www.w3.org/2000/svg';

  /* ------------------------------------------------------------------ helpers */

  function h(tag, cls, ...kids) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    for (const k of kids) {
      if (k == null || k === false) continue;
      e.append(k.nodeType ? k : document.createTextNode(String(k)));
    }
    return e;
  }

  const ICONS = {
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    shuffle: '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.97a4 4 0 0 0 3.3-1.7l5.46-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.97a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.04a4 4 0 0 1-3.3-1.8l-.36-.45"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>',
  };

  function icon(name) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'wf-i');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name] || '';
    return s;
  }

  function logo() {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 32 32');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML =
      '<defs><linearGradient id="wf-logo-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#14b8a6"/></linearGradient></defs>' +
      '<rect width="32" height="32" rx="8" fill="url(#wf-logo-grad)"/>' +
      '<path d="M7 10l4.5 12L16 13l4.5 9L25 10" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
    return s;
  }

  const domReady = () =>
    document.readyState !== 'loading'
      ? Promise.resolve()
      : new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));

  const debounce = (fn, ms) => {
    let id;
    return (...a) => {
      clearTimeout(id);
      id = setTimeout(() => fn(...a), ms);
    };
  };

  function bypassed() {
    try {
      return sessionStorage.getItem(BYPASS_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  /* Cheap URL test that runs at document_start, before anything is parsed. */
  function quickGate() {
    let u;
    try {
      u = new URL(location.href);
    } catch (e) {
      return false;
    }
    const bad = ['action', 'oldid', 'diff', 'printable', 'redirect', 'search', 'mobileaction', 'veaction'];
    if (bad.some((k) => u.searchParams.has(k))) return false;
    if (u.pathname.startsWith('/wiki/') && u.pathname.length > 6) return true;
    if (u.pathname === '/w/index.php' && u.searchParams.has('title')) return true;
    return false;
  }

  /* ------------------------------------------------------------------ state */

  let settings = null;
  let t = (k) => k;
  let uiLang = 'en';
  let pageLang = 'en';
  let reloading = false;
  let built = false;
  const ui = {}; // references to chrome elements, set during build

  const reload = () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  };

  function resolvedTheme() {
    if (settings.theme === 'auto') {
      return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return settings.theme;
  }

  function applyDisplay() {
    html.dataset.wfTheme = resolvedTheme();
    html.dataset.wfFont = settings.font;
    html.dataset.wfWidth = settings.width;
    html.style.setProperty('--wf-fs', settings.size + 'px');
    if (ui.themeBtn) {
      ui.themeBtn.replaceChildren(icon(html.dataset.wfTheme === 'dark' ? 'sun' : 'moon'));
    }
  }

  function release() {
    html.classList.remove('wf-pending', 'wf-on');
    delete html.dataset.wfTheme;
    delete html.dataset.wfFont;
    delete html.dataset.wfWidth;
    html.style.removeProperty('--wf-fs');
  }

  function update(patch) {
    Object.assign(settings, patch);
    applyDisplay();
    syncControls();
    const p = WF.saveSettings(patch);
    if ('uiLang' in patch || 'enabled' in patch) {
      Promise.resolve(p).then(reload);
    }
  }

  const syncFns = [];
  const syncControls = () => syncFns.forEach((f) => f());

  /* ------------------------------------------------------------------ entry */

  function main() {
    if (!quickGate()) return;

    if (bypassed()) {
      html.classList.add('wf-bypass');
      WF.loadSettings().then((s) => {
        if (!s.enabled) return;
        const tt = WF.makeT(WF.resolveLang(s.uiLang, html.lang));
        domReady().then(() => {
          if (!document.body || !document.body.classList.contains('ns-0')) return;
          const b = h('button', 'wf-pill', icon('book'), tt('backToReader'));
          b.type = 'button';
          b.addEventListener('click', () => {
            try {
              sessionStorage.removeItem(BYPASS_KEY);
            } catch (e) {
              /* ignore */
            }
            location.reload();
          });
          document.body.append(b);
        });
      });
      return;
    }

    html.classList.add('wf-pending');
    const safety = setTimeout(() => html.classList.remove('wf-pending'), 6000);

    WF.loadSettings()
      .then((s) => {
        settings = s;
        watchSettings();
        if (!s.enabled) {
          release();
          return;
        }
        applyDisplay();
        return domReady().then(() => {
          let ok = false;
          try {
            ok = init();
          } catch (e) {
            console.error('[WikiFree] failed, falling back to the original page', e);
            ok = false;
          }
          if (!ok) release();
        });
      })
      .catch((e) => {
        console.error('[WikiFree]', e);
        release();
      })
      .finally(() => {
        clearTimeout(safety);
        html.classList.remove('wf-pending');
      });
  }

  function watchSettings() {
    WF.onSettingsChanged((ch) => {
      if ('enabled' in ch || 'uiLang' in ch) return reload();
      if (!built) return;
      Object.assign(settings, ch);
      applyDisplay();
      syncControls();
    });
    if (window.matchMedia) {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => settings && settings.theme === 'auto' && html.dataset.wfTheme && applyDisplay();
      mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
    }
  }

  /* ------------------------------------------------------------------ page analysis */

  function isMainPage() {
    const side = document.querySelector('#n-mainpage-description a, #n-mainpage a');
    if (side) {
      try {
        const sp = new URL(side.href, location.href);
        if (sp.pathname === location.pathname && sp.search === location.search) return true;
      } catch (e) {
        /* ignore */
      }
    }
    return [...document.scripts].some((s) => /"wgIsMainPage"\s*:\s*true/.test(s.textContent || ''));
  }

  function getTitle(h1) {
    try {
      const c = document.querySelector('link[rel="canonical"]');
      const u = new URL(c ? c.href : location.href);
      const q = u.searchParams.get('title');
      if (q) return q;
      if (u.pathname.startsWith('/wiki/')) return decodeURIComponent(u.pathname.slice(6));
    } catch (e) {
      /* fall through */
    }
    return h1.textContent.trim();
  }

  function findInfobox(content) {
    const firstH2 = content.querySelector('h2');
    for (const el of content.querySelectorAll('table.infobox, .infobox')) {
      if (el.closest('.navbox')) continue;
      if (el.parentElement && el.parentElement.closest('.infobox')) continue;
      if (firstH2 && !(el.compareDocumentPosition(firstH2) & Node.DOCUMENT_POSITION_FOLLOWING)) continue; // must be in the lead
      return el;
    }
    return null;
  }

  function collectHeadings(content) {
    const out = [];
    content.querySelectorAll('h2, h3').forEach((hd) => {
      if (hd.closest('.infobox, .navbox, .toc, #toc, .thumb, table, .sidebar, .hatnote')) return;
      if (hd.id === 'mw-toc-heading') return;
      const id = hd.id || (hd.querySelector('[id]') || {}).id;
      if (!id) return;
      const clone = hd.cloneNode(true);
      clone.querySelectorAll('.mw-editsection, .mw-editsection-like, style').forEach((n) => n.remove());
      const text = clone.textContent.replace(/\s+/g, ' ').trim();
      if (!text) return;
      out.push({ el: hd, id, text, level: hd.tagName === 'H2' ? 2 : 3 });
    });
    return out;
  }

  const countWords = (content) => {
    let n = 0;
    content.querySelectorAll('.mw-parser-output p').forEach((p) => {
      if (p.closest('table, .navbox, .infobox, .thumb')) return;
      const s = p.textContent.trim();
      if (s) n += s.split(/\s+/).length;
    });
    return n;
  };

  const INV_SEL = [
    'table.infobox', '.infobox', 'table.wikitable', '.wikitable', 'table.navbox', '.navbox', '.sidebar', '.ambox', '.tmbox', '.cmbox', '.ombox',
    '.fmbox', '.imbox', '.mbox-small', '.messagebox', '.sistersitebox', '.toccolours', '.quotebox', 'div[style*="background"]', 'table[style*="background"]',
  ].join(',');

  function markInverted(scope) {
    scope.querySelectorAll(INV_SEL).forEach((el) => {
      if (el.parentElement && el.parentElement.closest('.wf-inv')) return;
      el.classList.add('wf-inv');
    });
  }

  /* ------------------------------------------------------------------ build */

  function init() {
    if (document.getElementById('wf-root')) return true;
    const body = document.body;
    const content = document.getElementById('mw-content-text');
    const h1 = document.getElementById('firstHeading');
    if (!body || !content || !h1 || !body.classList.contains('ns-0')) return false;
    if (!content.querySelector('.mw-parser-output')) return false;
    if (isMainPage()) return false;

    pageLang = html.lang || 'en';
    const dir = html.dir || getComputedStyle(html).direction || 'ltr';
    uiLang = WF.resolveLang(settings.uiLang, pageLang);
    t = WF.makeT(uiLang);

    const title = getTitle(h1);
    const infobox = findInfobox(content);
    const catlinks = document.getElementById('catlinks');
    const redirected = document.querySelector('#contentSub .mw-redirectedfrom');
    const headings = collectHeadings(content);
    const words = countWords(content);

    const root = h('div');
    root.id = 'wf-root';
    root.dir = dir;
    root.lang = pageLang;
    ui.root = root;

    /* ---- header ---- */
    root.append(buildHeader(title));

    /* ---- layout ---- */
    const layout = h('div', 'wf-layout');
    if (!infobox) layout.classList.add('wf-no-aside');
    if (headings.length < 2) layout.classList.add('wf-no-toc');
    root.append(layout);

    const hero = buildHero(h1, redirected, words, title);
    layout.append(hero);

    let toc = null;
    if (headings.length >= 2) {
      toc = buildToc(headings);
      layout.append(toc.el);
    }

    let aside = null;
    if (infobox) {
      aside = h('aside', 'wf-aside');
      const toggle = h('button', 'wf-aside-toggle', h('span', null, t('quickFacts')), icon('chevron'));
      toggle.type = 'button';
      toggle.addEventListener('click', () => aside.classList.toggle('open'));
      const abody = h('div', 'wf-aside-body');
      aside.append(toggle, abody);
      layout.append(aside);
      ui.asideBody = abody;
    }

    const article = h('article', 'wf-article');
    layout.append(article);

    const footer = h('footer', 'wf-footer');
    layout.append(footer);

    const top = h('button', 'wf-top', icon('up'));
    top.type = 'button';
    top.title = t('backToTop');
    top.setAttribute('aria-label', t('backToTop'));
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    root.append(top);
    ui.top = top;

    ui.card = h('div', 'wf-card');
    ui.card.hidden = true;
    root.append(ui.card);

    /* ---- point of no return: from here the original page is modified ---- */
    Array.from(body.children).forEach((c) => {
      if (!/^(SCRIPT|STYLE|LINK|NOSCRIPT)$/.test(c.tagName)) c.classList.add('wf-hide');
    });
    html.classList.add('wf-on');
    body.append(root);
    try {
      if (infobox) ui.asideBody.append(infobox);
      article.append(content);
      if (catlinks) footer.append(catlinks);
      footer.append(buildFooterNote(title));
      markInverted(article);
      if (aside) markInverted(aside);
    } catch (e) {
      console.error('[WikiFree] could not restructure the page, reverting to the original view', e);
      try {
        sessionStorage.setItem(BYPASS_KEY, '1');
      } catch (e2) {
        /* ignore */
      }
      location.reload();
      return true;
    }

    built = true;
    wireScroll(toc);
    wirePreviews();
    wireKeys();
    loadMeta(title, !!infobox);

    // jump to #fragment now that the final layout exists
    if (location.hash.length > 1) {
      requestAnimationFrame(() => {
        let target = null;
        try {
          target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        } catch (e) {
          /* ignore */
        }
        if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
      });
    }
    return true;
  }

  /* ---------------------------------------------------------------- header */

  function menuWithPopover(btnIcon, label, popEl, extraBtnClass) {
    const wrap = h('div', 'wf-menu');
    const btn = h('button', 'wf-btn' + (extraBtnClass ? ' ' + extraBtnClass : ''), icon(btnIcon));
    btn.type = 'button';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    popEl.hidden = true;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = popEl.hidden;
      closePops();
      if (open) {
        popEl.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        const inp = popEl.querySelector('input[type=text]');
        if (inp) inp.focus();
      }
    });
    popEl.addEventListener('click', (e) => e.stopPropagation());
    wrap.append(btn, popEl);
    wrap._btn = btn;
    return wrap;
  }

  function closePops() {
    document.querySelectorAll('#wf-root .wf-pop').forEach((p) => {
      p.hidden = true;
      const b = p.parentElement && p.parentElement.querySelector('.wf-btn');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }

  function buildHeader(title) {
    const header = h('header', 'wf-header');
    const inner = h('div', 'wf-header-inner');
    header.append(inner);

    const menuBtn = h('button', 'wf-btn wf-menu-btn', icon('menu'));
    menuBtn.type = 'button';
    menuBtn.title = t('contents');
    menuBtn.setAttribute('aria-label', t('contents'));
    menuBtn.addEventListener('click', () => toggleDrawer());
    inner.append(menuBtn);

    const brand = h('a', 'wf-brand', logo(), h('span', null, t('brand')));
    // The "Main page" link from the original sidebar, if present
    const mp = document.querySelector('#n-mainpage-description a, #n-mainpage a');
    brand.href = mp ? mp.href : location.origin + '/';
    inner.append(brand);

    inner.append(buildSearch());

    // random
    const rnd = h('a', 'wf-btn wf-hide-sm', icon('shuffle'));
    rnd.href = '/wiki/Special:Random';
    rnd.title = t('random');
    rnd.setAttribute('aria-label', t('random'));
    inner.append(rnd);

    // languages
    const langPop = h('div', 'wf-pop wf-lang-pop');
    const langInput = h('input');
    langInput.type = 'text';
    langInput.placeholder = t('filterLanguages');
    langInput.setAttribute('aria-label', t('filterLanguages'));
    const langList = h('ul', 'wf-langlist');
    langPop.append(langInput, langList);
    ui.langList = langList;
    ui.langInput = langInput;
    ui.langs = [];
    langInput.addEventListener('input', renderLangs);
    const langMenu = menuWithPopover('globe', t('languages'), langPop);
    ui.langMenu = langMenu;
    inner.append(langMenu);

    // theme quick toggle
    const themeBtn = h('button', 'wf-btn');
    themeBtn.type = 'button';
    themeBtn.title = t('toggleTheme');
    themeBtn.setAttribute('aria-label', t('toggleTheme'));
    themeBtn.addEventListener('click', () => {
      update({ theme: html.dataset.wfTheme === 'dark' ? 'light' : 'dark' });
    });
    ui.themeBtn = themeBtn;
    themeBtn.append(icon(html.dataset.wfTheme === 'dark' ? 'sun' : 'moon'));
    inner.append(themeBtn);

    // settings
    inner.append(menuWithPopover('sliders', t('settings'), buildSettings()));

    const prog = h('div', 'wf-progress', h('i'));
    ui.progress = prog.firstChild;
    header.append(prog);

    document.addEventListener('click', closePops);
    return header;
  }

  /* ---------------------------------------------------------------- search */

  function buildSearch() {
    const wrap = h('div', 'wf-search');
    const input = h('input');
    input.type = 'text';
    input.placeholder = t('search');
    input.setAttribute('aria-label', t('search'));
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.autocomplete = 'off';
    input.spellcheck = false;
    const list = h('ul', 'wf-suggest');
    list.hidden = true;
    wrap.append(icon('search'), input, list);
    ui.search = input;

    let token = 0;
    let sel = -1;
    const items = () => Array.from(list.querySelectorAll('a'));
    const close = () => {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      sel = -1;
    };
    const goSearch = (q) => {
      location.href = location.origin + '/w/index.php?title=Special%3ASearch&go=Go&search=' + encodeURIComponent(q);
    };
    const mark = () => items().forEach((a, i) => a.classList.toggle('sel', i === sel));

    const run = debounce(async (q) => {
      const my = ++token;
      let pages = [];
      try {
        const r = await fetch('/w/rest.php/v1/search/title?limit=7&q=' + encodeURIComponent(q));
        if (r.ok) pages = (await r.json()).pages || [];
      } catch (e) {
        /* offline etc. */
      }
      if (my !== token || !input.value.trim()) return;
      list.replaceChildren();
      for (const p of pages) {
        const a = h('a');
        a.href = '/wiki/' + encodeURIComponent(p.key);
        const th = h('div', 'wf-th');
        if (p.thumbnail && p.thumbnail.url) {
          const u = p.thumbnail.url.startsWith('//') ? 'https:' + p.thumbnail.url : p.thumbnail.url;
          th.style.backgroundImage = 'url("' + u.replace(/"/g, '%22') + '")';
        }
        a.append(th, h('div', 'wf-st', h('b', null, p.title), h('span', null, p.description || '')));
        list.append(h('li', null, a));
      }
      const q2 = h('a');
      q2.href = location.origin + '/w/index.php?title=Special%3ASearch&go=Go&search=' + encodeURIComponent(q);
      const gi = h('div', 'wf-th');
      gi.append(icon('search'));
      gi.style.display = 'flex';
      gi.style.alignItems = 'center';
      gi.style.justifyContent = 'center';
      q2.append(gi, h('div', 'wf-st', h('b', null, t('searchGo', { q }))));
      list.append(h('li', null, q2));
      sel = -1;
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }, 140);

    input.addEventListener('input', () => {
      const q = input.value.trim();
      if (!q) {
        token++;
        close();
        return;
      }
      run(q);
    });
    input.addEventListener('keydown', (e) => {
      const els = items();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!els.length) return;
        e.preventDefault();
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length;
        mark();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (sel >= 0 && els[sel]) location.href = els[sel].href;
        else if (input.value.trim()) goSearch(input.value.trim());
      } else if (e.key === 'Escape') {
        close();
        input.blur();
      }
    });
    input.addEventListener('focus', () => {
      if (items().length && input.value.trim()) {
        list.hidden = false;
        input.setAttribute('aria-expanded', 'true');
      }
    });
    list.addEventListener('mousedown', (e) => e.preventDefault()); // keep input focus so clicks register
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) close();
    });
    return wrap;
  }

  /* ---------------------------------------------------------------- settings popover */

  function seg(options, key, labelKey) {
    const row = h('div', 'wf-row');
    row.append(h('span', 'wf-label', t(labelKey)));
    const box = h('div', 'wf-seg');
    const btns = options.map(([val, label]) => {
      const b = h('button', null, t(label));
      b.type = 'button';
      b.addEventListener('click', () => update({ [key]: val }));
      box.append(b);
      return [val, b];
    });
    row.append(box);
    syncFns.push(() => btns.forEach(([val, b]) => b.setAttribute('aria-pressed', String(settings[key] === val))));
    return row;
  }

  const uiDir = () => (uiLang === 'he' ? 'rtl' : 'ltr');

  function buildSettings() {
    // The popover keeps the page direction (so it opens towards the screen); its content follows the interface language.
    const outer = h('div', 'wf-pop');
    const pop = h('div');
    pop.dir = uiDir();
    outer.append(pop);
    pop.append(
      seg([['auto', 'themeAuto'], ['light', 'themeLight'], ['sepia', 'themeSepia'], ['dark', 'themeDark']], 'theme', 'theme'),
      seg([['serif', 'fontSerif'], ['sans', 'fontSans']], 'font', 'font')
    );

    const sizeRow = h('div', 'wf-row');
    sizeRow.append(h('span', 'wf-label', t('textSize')));
    const range = h('input');
    range.type = 'range';
    range.min = '14';
    range.max = '28';
    range.step = '1';
    const out = h('span');
    range.addEventListener('input', () => {
      out.textContent = range.value + 'px';
      update({ size: Number(range.value) });
    });
    sizeRow.append(h('div', 'wf-range-row', range, out));
    syncFns.push(() => {
      range.value = settings.size;
      out.textContent = settings.size + 'px';
    });
    pop.append(sizeRow);

    pop.append(seg([['narrow', 'widthNarrow'], ['medium', 'widthMedium'], ['wide', 'widthWide']], 'width', 'width'));

    const swRow = h('div', 'wf-row');
    const sw = h('label', 'wf-switch', h('span', null, t('previews')));
    const cb = h('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => update({ previews: cb.checked }));
    sw.append(cb);
    swRow.append(sw);
    syncFns.push(() => (cb.checked = !!settings.previews));
    pop.append(swRow);

    const langRow = h('div', 'wf-row');
    langRow.append(h('span', 'wf-label', t('uiLanguage')));
    const sel = h('select');
    [['auto', t('langAuto')], ['en', 'English'], ['he', 'עברית']].forEach(([v, l]) => {
      const o = h('option', null, l);
      o.value = v;
      sel.append(o);
    });
    sel.addEventListener('change', () => update({ uiLang: sel.value }));
    langRow.append(sel);
    syncFns.push(() => (sel.value = settings.uiLang));
    pop.append(langRow);

    const links = h('div', 'wf-link-row');
    const orig = h('button', null, icon('external'), t('original'));
    orig.type = 'button';
    orig.addEventListener('click', () => {
      try {
        sessionStorage.setItem(BYPASS_KEY, '1');
      } catch (e) {
        /* ignore */
      }
      location.reload();
    });
    const off = h('button', null, icon('power'), t('disable'));
    off.type = 'button';
    off.addEventListener('click', () => update({ enabled: false }));
    links.append(orig, off);
    pop.append(links);

    syncControls();
    return outer;
  }

  /* ---------------------------------------------------------------- hero */

  function buildHero(h1, redirected, words, title) {
    const hero = h('section', 'wf-hero');
    hero.id = 'wf-top';
    const grid = h('div', 'wf-hero-grid');
    const text = h('div', 'wf-hero-text');
    grid.append(text);
    hero.append(grid);

    if (redirected) {
      const r = h('div', 'wf-redirected');
      Array.from(redirected.childNodes).forEach((n) => r.append(n.cloneNode(true)));
      text.append(r);
    }

    const titleEl = h('h1', 'wf-title');
    Array.from(h1.childNodes).forEach((n) => titleEl.append(n.cloneNode(true)));
    text.append(titleEl);

    ui.desc = h('p', 'wf-desc');
    text.append(ui.desc);

    const meta = h('div', 'wf-meta');
    const mins = Math.max(1, Math.round(words / (/^(he|iw|ar)/.test(pageLang) ? 170 : 220)));
    meta.append(h('span', null, icon('clock'), t('readingTime', { n: mins })));
    ui.edited = h('span');
    ui.edited.hidden = true;
    meta.append(ui.edited);
    text.append(meta);

    const actions = h('div', 'wf-actions');
    if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      const listen = h('button', 'wf-chip', icon('volume'), h('span', null, t('listen')));
      listen.type = 'button';
      listen.addEventListener('click', () => toggleListen(listen));
      actions.append(listen);
      ui.listen = listen;
    }
    const edit = h('a', 'wf-chip', icon('edit'), t('edit'));
    edit.href = location.origin + '/w/index.php?title=' + encodeURIComponent(title.replace(/ /g, '_')) + '&action=edit';
    actions.append(edit);
    text.append(actions);

    ui.heroGrid = grid;
    return hero;
  }

  /* ---------------------------------------------------------------- table of contents */

  function buildToc(headings) {
    const nav = h('nav', 'wf-toc');
    nav.setAttribute('aria-label', t('contents'));
    nav.append(h('div', 'wf-toc-title', t('contents')));
    const ul = h('ul');
    nav.append(ul);

    const items = []; // {el, li, parent}
    const introLi = h('li');
    const introA = h('a', null, t('intro'));
    introA.href = '#wf-top';
    introLi.append(introA);
    ul.append(introLi);
    items.push({ el: null, li: introLi, parent: null });

    let lastTop = null;
    for (const hd of headings) {
      const li = h('li');
      const a = h('a', null, hd.text);
      a.href = '#' + encodeURIComponent(hd.id).replace(/%3A/g, ':');
      li.append(a);
      if (hd.level === 2 || !lastTop) {
        ul.append(li);
        if (hd.level === 2) lastTop = { li, sub: null };
        items.push({ el: hd.el, li, parent: null });
      } else {
        if (!lastTop.sub) {
          lastTop.sub = h('ul');
          lastTop.li.append(lastTop.sub);
        }
        lastTop.sub.append(li);
        items.push({ el: hd.el, li, parent: lastTop.li });
      }
    }

    nav.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      if (a === introA) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      closeDrawer();
    });

    return { el: nav, items };
  }

  let scrim = null;
  function toggleDrawer() {
    const nav = document.querySelector('#wf-root .wf-toc');
    if (!nav) return;
    if (nav.classList.contains('open')) return closeDrawer();
    nav.classList.add('open');
    scrim = h('div', 'wf-scrim');
    scrim.addEventListener('click', closeDrawer);
    ui.root.append(scrim);
  }
  function closeDrawer() {
    const nav = document.querySelector('#wf-root .wf-toc');
    if (nav) nav.classList.remove('open');
    if (scrim) scrim.remove();
    scrim = null;
  }

  /* ---------------------------------------------------------------- scroll: progress, scroll-spy, back-to-top */

  function wireScroll(toc) {
    let ticking = false;
    let activeKey = null;

    const spy = () => {
      if (!toc) return;
      let cur = 0;
      for (let i = 1; i < toc.items.length; i++) {
        if (toc.items[i].el.getBoundingClientRect().top <= 110) cur = i;
        else break;
      }
      const it = toc.items[cur];
      if (activeKey === it) return;
      activeKey = it;
      toc.items.forEach((x) => x.li.classList.remove('active', 'open'));
      it.li.classList.add('active', 'open');
      if (it.parent) it.parent.classList.add('open');
      const a = it.li.firstElementChild;
      const nav = toc.el;
      const ar = a.getBoundingClientRect();
      const nr = nav.getBoundingClientRect();
      if (ar.top < nr.top + 30) nav.scrollTop -= nr.top + 30 - ar.top;
      else if (ar.bottom > nr.bottom - 30) nav.scrollTop += ar.bottom - (nr.bottom - 30);
    };

    const frame = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      const y = window.scrollY;
      if (ui.progress) ui.progress.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + '%';
      ui.top.classList.toggle('show', y > 700);
      spy();
    };
    window.addEventListener(
      'scroll',
      () => {
        hideCard();
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(frame);
        }
      },
      { passive: true }
    );
    window.addEventListener('resize', () => requestAnimationFrame(frame));
    frame();
  }

  function wireKeys() {
    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        ui.search.focus();
        ui.search.select();
      } else if (e.key === 'Escape') {
        closePops();
        closeDrawer();
        hideCard();
      }
    });
  }

  /* ---------------------------------------------------------------- API metadata: description, hero image, languages, last edit */

  async function loadMeta(title, hasInfobox) {
    let page = null;
    try {
      const q = new URLSearchParams({
        action: 'query', format: 'json', formatversion: '2', redirects: '1', titles: title,
        prop: 'langlinks|pageimages|description|revisions', lllimit: 'max', llprop: 'url|autonym|langname',
        piprop: 'thumbnail', pithumbsize: '700', rvprop: 'timestamp',
      });
      const r = await fetch('/w/api.php?' + q.toString());
      if (r.ok) page = ((await r.json()).query || {}).pages;
      page = page && page[0];
    } catch (e) {
      /* offline – the page still works without the extras */
    }
    if (!page) return;

    if (page.description) ui.desc.textContent = page.description;

    const ts = page.revisions && page.revisions[0] && page.revisions[0].timestamp;
    if (ts) {
      let d = '';
      try {
        d = new Intl.DateTimeFormat(pageLang, { dateStyle: 'long' }).format(new Date(ts));
      } catch (e) {
        d = new Date(ts).toLocaleDateString();
      }
      ui.edited.replaceChildren(icon('calendar'), t('lastEdited', { date: d }));
      ui.edited.hidden = false;
    }

    if (!hasInfobox && page.thumbnail && page.thumbnail.source) {
      const img = h('img', 'wf-hero-img');
      img.src = page.thumbnail.source;
      img.alt = '';
      img.decoding = 'async';
      ui.heroGrid.append(img);
    }

    ui.langs = (page.langlinks || []).slice();
    renderLangs();
  }

  function renderLangs() {
    const list = ui.langList;
    if (!list) return;
    const q = ui.langInput.value.trim().toLowerCase();
    list.replaceChildren();
    const shown = ui.langs.filter(
      (l) => !q || (l.autonym || '').toLowerCase().includes(q) || (l.langname || '').toLowerCase().includes(q) || l.lang.toLowerCase().startsWith(q)
    );
    if (!shown.length) {
      list.append(h('li', 'wf-lang-empty', t('noLanguages')));
      return;
    }
    for (const l of shown) {
      const a = h('a', null, h('b', null, l.autonym || l.lang), h('span', null, l.title));
      a.href = l.url;
      a.hreflang = l.lang;
      list.append(h('li', null, a));
    }
  }

  function buildFooterNote(title) {
    const note = h('div', 'wf-footer-note');
    note.dir = uiDir();
    note.append(h('div', null, t('license')));
    const src = h('a', null, t('sourceArticle'));
    src.href = location.origin + '/wiki/' + encodeURIComponent(title.replace(/ /g, '_'));
    const hist = h('a', null, t('history'));
    hist.href = location.origin + '/w/index.php?title=' + encodeURIComponent(title.replace(/ /g, '_')) + '&action=history';
    note.append(h('div', null, src, hist));
    return note;
  }

  /* ---------------------------------------------------------------- hover previews (links + citations) */

  const summaryCache = new Map();
  let showT = 0;
  let hideT = 0;
  let curLink = null;

  function hideCard() {
    clearTimeout(showT);
    clearTimeout(hideT);
    if (ui.card) ui.card.hidden = true;
    restoreTitle();
    curLink = null;
  }

  let strippedTitle = null;
  function stripTitle(a) {
    restoreTitle();
    if (a.hasAttribute('title')) {
      strippedTitle = [a, a.getAttribute('title')];
      a.removeAttribute('title');
    }
  }
  function restoreTitle() {
    if (strippedTitle) {
      strippedTitle[0].setAttribute('title', strippedTitle[1]);
      strippedTitle = null;
    }
  }

  function linkTitle(a) {
    if (a.origin !== location.origin || !a.pathname.startsWith('/wiki/')) return null;
    if (a.classList.contains('new') || a.classList.contains('image') || a.classList.contains('mw-selflink')) return null;
    if (a.pathname === location.pathname && a.hash) return null;
    try {
      return decodeURIComponent(a.pathname.slice(6)) || null;
    } catch (e) {
      return null;
    }
  }

  function refTarget(a) {
    if (!a.hash || !a.closest('sup.reference')) return null;
    let el = null;
    try {
      el = document.getElementById(decodeURIComponent(a.hash.slice(1)));
    } catch (e) {
      return null;
    }
    return el && (el.querySelector('.reference-text, .mw-reference-text') || el);
  }

  function getSummary(title) {
    if (!summaryCache.has(title)) {
      summaryCache.set(
        title,
        fetch('/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_')), { headers: { accept: 'application/json' } })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      );
    }
    return summaryCache.get(title);
  }

  function placeCard(e, a) {
    const card = ui.card;
    const rects = Array.from(a.getClientRects());
    const r = rects.find((x) => e.clientY >= x.top - 2 && e.clientY <= x.bottom + 2) || rects[0] || a.getBoundingClientRect();
    card.style.visibility = 'hidden';
    card.hidden = false;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    let top = r.bottom + 8;
    if (top + ch > innerHeight - 8 && r.top - ch - 8 > 8) top = r.top - ch - 8;
    let left = r.left + r.width / 2 - cw / 2;
    left = Math.max(12, Math.min(left, innerWidth - cw - 12));
    card.style.top = Math.max(8, top) + 'px';
    card.style.left = left + 'px';
    card.style.visibility = '';
  }

  function wirePreviews() {
    const root = ui.root;
    const card = ui.card;

    card.addEventListener('mouseenter', () => clearTimeout(hideT));
    card.addEventListener('mouseleave', () => {
      clearTimeout(hideT);
      hideT = setTimeout(hideCard, 220);
    });

    root.addEventListener(
      'mouseover',
      (e) => {
        if (!settings.previews) return;
        const a = e.target.closest && e.target.closest('a');
        if (!a || !a.closest('.wf-article, .wf-aside')) return;

        const ref = refTarget(a);
        const title = ref ? null : linkTitle(a);
        if (!ref && !title) return;

        // We draw our own card, so keep Wikipedia's own page-preview popups (bound on the link itself) from also firing.
        e.stopPropagation();
        if (a === curLink) return;

        curLink = a;
        stripTitle(a);
        clearTimeout(hideT);
        clearTimeout(showT);
        showT = setTimeout(async () => {
          if (curLink !== a) return;
          if (ref) {
            card.replaceChildren();
            const box = h('div', 'wf-card-ref');
            Array.from(ref.childNodes).forEach((n) => box.append(n.cloneNode(true)));
            box.querySelectorAll('.mw-cite-backlink, style').forEach((n) => n.remove());
            card.append(box);
            placeCard(e, a);
            return;
          }
          const j = await getSummary(title);
          if (curLink !== a || !j || !j.extract) return;
          card.replaceChildren();
          if (j.thumbnail && j.thumbnail.source) {
            const img = h('img', 'wf-card-img');
            img.src = j.thumbnail.source;
            img.alt = '';
            card.append(img);
          }
          const body = h('div', 'wf-card-body');
          if (j.dir) body.dir = j.dir;
          if (j.lang) body.lang = j.lang;
          body.append(h('h4', null, j.title || title));
          if (j.description) body.append(h('div', 'wf-card-desc', j.description));
          body.append(h('p', null, j.extract));
          card.append(body);
          placeCard(e, a);
        }, 320);
      },
      true
    );

    root.addEventListener(
      'mouseout',
      (e) => {
        const a = e.target.closest && e.target.closest('a');
        if (!a || a !== curLink) return;
        if (a.contains(e.relatedTarget)) return;
        clearTimeout(showT);
        clearTimeout(hideT);
        hideT = setTimeout(hideCard, 220);
      },
      true
    );
  }

  /* ---------------------------------------------------------------- text-to-speech */

  const tts = { active: false, token: 0, items: [], i: 0, cur: null };

  function speechText(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('sup.reference, .mw-editsection, style, script, .noprint, .mwe-math-element, .mw-cite-backlink').forEach((n) => n.remove());
    return c.textContent.replace(/\s+/g, ' ').trim();
  }

  function chunkText(s) {
    const parts = s.match(/[^.!?。׃]+[.!?。׃]*\s*/g) || [s];
    const out = [];
    let buf = '';
    for (const p of parts) {
      if ((buf + p).length > 200 && buf) {
        out.push(buf.trim());
        buf = '';
      }
      buf += p;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  function setListenUi(on) {
    const b = ui.listen;
    if (!b) return;
    b.classList.toggle('on', on);
    b.replaceChildren(icon(on ? 'stop' : 'volume'), h('span', null, on ? t('stopListening') : t('listen')));
  }

  function stopTTS() {
    tts.active = false;
    tts.token++;
    speechSynthesis.cancel();
    if (tts.cur) tts.cur.classList.remove('wf-speaking');
    tts.cur = null;
    setListenUi(false);
  }

  function speakNext(token) {
    if (!tts.active || token !== tts.token) return;
    if (tts.i >= tts.items.length) return stopTTS();
    const el = tts.items[tts.i++];
    const text = speechText(el);
    if (text.length < 2) return speakNext(token);
    if (tts.cur) tts.cur.classList.remove('wf-speaking');
    tts.cur = el;
    el.classList.add('wf-speaking');
    const r = el.getBoundingClientRect();
    if (r.top < 90 || r.bottom > innerHeight - 40) el.scrollIntoView({ block: 'center', behavior: 'smooth' });

    const chunks = chunkText(text);
    let n = 0;
    const run = () => {
      if (!tts.active || token !== tts.token) return;
      if (n >= chunks.length) return speakNext(token);
      const u = new SpeechSynthesisUtterance(chunks[n++]);
      u.lang = pageLang;
      u.onend = run;
      u.onerror = (ev) => {
        if (ev.error === 'interrupted' || ev.error === 'canceled') return;
        run();
      };
      speechSynthesis.speak(u);
    };
    run();
  }

  function toggleListen() {
    if (tts.active) return stopTTS();
    const all = Array.from(document.querySelectorAll('#wf-root .wf-article .mw-parser-output p, #wf-root .wf-article h2, #wf-root .wf-article h3')).filter(
      (el) => !el.closest('table, .navbox, .infobox, .thumb, .reflist, .hatnote')
    );
    let start = all.findIndex((el) => el.getBoundingClientRect().bottom > 100);
    if (start < 0) start = 0;
    tts.items = all;
    tts.i = start;
    tts.active = true;
    const token = ++tts.token;
    speechSynthesis.cancel();
    setListenUi(true);
    speakNext(token);
  }
  window.addEventListener('pagehide', () => {
    if (tts.active && 'speechSynthesis' in window) speechSynthesis.cancel();
  });

  /* ------------------------------------------------------------------ go */
  main();
})();
