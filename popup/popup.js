(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const BM = WF.bookmarks;
  let settings;
  let tab = null; // 'saved' | 'settings' – chosen once, after the first load
  let all = [];

  const T = () => WF.makeT(WF.resolveLang(settings.uiLang, ''));

  function renderTabs(t) {
    const box = $('tabs');
    box.replaceChildren();
    [['saved', t('tabSaved') + (all.length ? ' (' + all.length + ')' : '')], ['settings', t('tabSettings')]].forEach(([id, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.textContent = label;
      b.setAttribute('aria-pressed', String(tab === id));
      b.addEventListener('click', () => { tab = id; render(); });
      box.append(b);
    });
    $('panelSaved').hidden = tab !== 'saved';
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

  function render() {
    const t = T();
    const lang = WF.resolveLang(settings.uiLang, '');
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';

    $('free').textContent = t('popupFree');
    renderTabs(t);
    renderSaved(t);

    $('enableLabel').textContent = t('enable');
    $('enableHint').textContent = t('enableHint');
    $('themeLabel').textContent = t('theme');
    $('previewsLabel').textContent = t('previews');
    $('langLabel').textContent = t('uiLanguage');
    $('hint').textContent = t('reloadHint');
    $('about').textContent = t('about');

    $('enabled').checked = !!settings.enabled;
    $('previews').checked = !!settings.previews;

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
  $('previews').addEventListener('change', (e) => save({ previews: e.target.checked }));
  $('uiLang').addEventListener('change', (e) => save({ uiLang: e.target.value }));
  $('bmFilter').addEventListener('input', () => renderSaved(T()));
  $('bmExport').addEventListener('click', () => {
    BM.download('wikifree-bookmarks-' + new Date().toISOString().slice(0, 10) + '.json', BM.exportJSON(all));
  });
  BM.onChange(reloadList);

  Promise.all([WF.loadSettings(), BM.list()]).then(([s, list]) => {
    settings = s;
    all = list;
    tab = all.length ? 'saved' : 'settings';
    render();
  });
})();
