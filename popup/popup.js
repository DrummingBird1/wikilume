(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const BM = WF.bookmarks;
  const HI = WF.history;
  let settings;
  let tab = null; // 'saved' | 'settings' – chosen once, after the first load
  let all = [];
  let hist = [];

  const T = () => WF.makeT(WF.resolveLang(settings.uiLang, ''));

  function renderTabs(t) {
    const box = $('tabs');
    box.replaceChildren();
    [['saved', t('tabSaved') + (all.length ? ' (' + all.length + ')' : '')], ['history', t('tabHistory')], ['settings', t('tabSettings')]].forEach(([id, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.textContent = label;
      b.setAttribute('aria-pressed', String(tab === id));
      b.addEventListener('click', () => { tab = id; render(); });
      box.append(b);
    });
    $('panelSaved').hidden = tab !== 'saved';
    $('panelHistory').hidden = tab !== 'history';
    $('panelSettings').hidden = tab !== 'settings';
  }

  function renderSaved(t) {
    const input = $('bmFilter');
    input.placeholder = t('bmFilter');
    input.setAttribute('aria-label', t('bmFilter'));
    input.hidden = !all.length;
    const shown = all.filter((e) => BM.matches(e, input.value.trim()));
    BM.renderList($('bmList'), shown, { t, newTab: true, onRemove: (e) => BM.remove(BM.idOf(e)) });
    $('bmEmpty').hidden = !!shown.length;
    $('bmEmpty').textContent = all.length ? t('noResults') : t('bmEmpty');
    const ex = $('bmExport');
    ex.textContent = t('bmExport');
    ex.disabled = !all.length;
  }

  function renderHistory(t) {
    // reuse the bookmark row renderer: the progress goes where the description would be
    const rows = hist.map((e) => ({ host: e.host, key: e.key, title: e.title, desc: t('histProgress', { n: e.pct }), thumb: '' }));
    BM.renderList($('histList'), rows, { t, newTab: true, onRemove: (e) => HI.remove(e.host, e.key) });
    $('histEmpty').hidden = !!hist.length;
    $('histEmpty').textContent = t('histEmpty');
    const c = $('histClear');
    c.textContent = t('histClear');
    c.disabled = !hist.length;
  }

  function render() {
    const t = T();
    const lang = WF.resolveLang(settings.uiLang, '');
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';

    $('free').textContent = t('popupFree');
    renderTabs(t);
    renderSaved(t);
    renderHistory(t);

    $('enableLabel').textContent = t('enable');
    $('enableHint').textContent = t('enableHint');
    $('themeLabel').textContent = t('theme');
    $('previewsLabel').textContent = t('previews');
    $('histLabel').textContent = t('histRemember');
    $('histHint').textContent = t('histRememberHint');
    $('langLabel').textContent = t('uiLanguage');
    $('hint').textContent = t('reloadHint');
    $('about').textContent = t('about');

    $('enabled').checked = !!settings.enabled;
    $('previews').checked = !!settings.previews;
    $('historyOn').checked = settings.history !== false;

    const seg = $('theme');
    seg.replaceChildren();
    [['auto', 'themeAuto'], ['light', 'themeLight'], ['sepia', 'themeSepia'], ['dark', 'themeDark']].forEach(([val, key]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t(key);
      b.setAttribute('aria-pressed', String(settings.theme === val));
      b.addEventListener('click', () => save({ theme: val }));
      seg.append(b);
    });

    const sel = $('uiLang');
    sel.replaceChildren();
    [['auto', t('langAuto')], ['en', 'English'], ['he', 'עברית']].forEach(([v, l]) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = l;
      sel.append(o);
    });
    sel.value = settings.uiLang;
  }

  function save(patch) {
    Object.assign(settings, patch);
    WF.saveSettings(patch);
    render();
  }

  async function reloadList() {
    all = await BM.list();
    if (settings) render();
  }

  $('enabled').addEventListener('change', (e) => save({ enabled: e.target.checked }));
  $('historyOn').addEventListener('change', (e) => save({ history: e.target.checked }));
  $('histClear').addEventListener('click', () => HI.clear());
  HI.onChange(async () => { hist = await HI.list(); if (settings) render(); });
  $('previews').addEventListener('change', (e) => save({ previews: e.target.checked }));
  $('uiLang').addEventListener('change', (e) => save({ uiLang: e.target.value }));
  $('bmFilter').addEventListener('input', () => renderSaved(T()));
  $('bmExport').addEventListener('click', () => {
    BM.download('wikilume-bookmarks-' + new Date().toISOString().slice(0, 10) + '.json', BM.exportJSON(all));
  });
  BM.onChange(reloadList);

  Promise.all([WF.loadSettings(), BM.list(), HI.list()]).then(([s, list, h]) => {
    settings = s;
    all = list;
    hist = h;
    tab = all.length ? 'saved' : 'settings';
    render();
  });
})();
