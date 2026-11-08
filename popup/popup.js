(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let settings;

  function render() {
    const lang = WF.resolveLang(settings.uiLang, '');
    const t = WF.makeT(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';

    $('free').textContent = t('popupFree');
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

  $('enabled').addEventListener('change', (e) => save({ enabled: e.target.checked }));
  $('previews').addEventListener('change', (e) => save({ previews: e.target.checked }));
  $('uiLang').addEventListener('change', (e) => save({ uiLang: e.target.value }));

  WF.loadSettings().then((s) => {
    settings = s;
    render();
  });
})();
