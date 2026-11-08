/* WikiFree – shared strings + settings helpers (used by the content script and the popup). */
(function (global) {
  'use strict';

  const STRINGS = {
    en: {
      brand: 'WikiFree',
      search: 'Search Wikipedia',
      searchGo: 'Search for “{q}”',
      random: 'Random article',
      languages: 'Languages',
      filterLanguages: 'Filter languages…',
      noLanguages: 'No other languages',
      noResults: 'No results',
      settings: 'Display settings',
      toggleTheme: 'Change theme',
      contents: 'Contents',
      intro: 'Introduction',
      readingTime: '{n} min read',
      lastEdited: 'Updated {date}',
      listen: 'Listen',
      stopListening: 'Stop',
      edit: 'Edit on Wikipedia',
      original: 'Original view',
      quickFacts: 'Quick facts',
      categories: 'Categories',
      redirectedFrom: 'Redirected from {title}',
      license:
        'Text from Wikipedia, available under the CC BY-SA 4.0 license.',
      sourceArticle: 'Source article',
      history: 'History & authors',
      backToTop: 'Back to top',
      backToReader: 'Back to WikiFree',
      theme: 'Theme',
      themeAuto: 'Auto',
      themeLight: 'Light',
      themeSepia: 'Sepia',
      themeDark: 'Dark',
      font: 'Font',
      fontSerif: 'Serif',
      fontSans: 'Sans',
      textSize: 'Text size',
      width: 'Width',
      widthNarrow: 'Narrow',
      widthMedium: 'Medium',
      widthWide: 'Wide',
      previews: 'Link previews on hover',
      uiLanguage: 'Interface language',
      langAuto: 'Auto',
      disable: 'Turn WikiFree off',
      enable: 'Enable WikiFree',
      enableHint: 'Applies on every Wikipedia article.',
      popupFree: 'Free forever. No account, no subscription.',
      reloadHint: 'Changes apply instantly.',
      save: 'Save',
      saved: 'Saved',
      bookmarks: 'Bookmarks',
      bmFilter: 'Filter bookmarks…',
      bmEmpty: 'No bookmarks yet. Press “Save” at the top of an article.',
      bmRemove: 'Remove',
      bmExport: 'Export',
      bmImport: 'Import',
      bmImported: '{added} added, {skipped} skipped',
      bmImportError: 'This is not a valid WikiFree export file.',
      tabSaved: 'Bookmarks',
      tabSettings: 'Settings',
      about: 'WikiFree is free and open. Wikipedia content is licensed CC BY-SA 4.0.',
    },
    he: {
      brand: 'WikiFree',
      search: 'חיפוש בוויקיפדיה',
      searchGo: 'חיפוש “{q}”',
      random: 'ערך אקראי',
      languages: 'שפות',
      filterLanguages: 'סינון שפות…',
      noLanguages: 'אין שפות נוספות',
      noResults: 'אין תוצאות',
      settings: 'הגדרות תצוגה',
      toggleTheme: 'החלפת ערכת נושא',
      contents: 'תוכן עניינים',
      intro: 'פתיח',
      readingTime: '{n} דק׳ קריאה',
      lastEdited: 'עודכן {date}',
      listen: 'האזנה',
      stopListening: 'עצירה',
      edit: 'עריכה בוויקיפדיה',
      original: 'תצוגה מקורית',
      quickFacts: 'פרטים מהירים',
      categories: 'קטגוריות',
      redirectedFrom: 'הופנה מהערך {title}',
      license: 'הטקסט מוויקיפדיה, ברישיון CC BY-SA 4.0.',
      sourceArticle: 'הערך המקורי',
      history: 'היסטוריה ויוצרים',
      backToTop: 'חזרה למעלה',
      backToReader: 'חזרה ל-WikiFree',
      theme: 'ערכת נושא',
      themeAuto: 'אוטומטי',
      themeLight: 'בהיר',
      themeSepia: 'סֶפּיה',
      themeDark: 'כהה',
      font: 'גופן',
      fontSerif: 'עם שוליים',
      fontSans: 'ללא שוליים',
      textSize: 'גודל טקסט',
      width: 'רוחב',
      widthNarrow: 'צר',
      widthMedium: 'בינוני',
      widthWide: 'רחב',
      previews: 'תצוגה מקדימה של קישורים בריחוף',
      uiLanguage: 'שפת הממשק',
      langAuto: 'אוטומטי',
      disable: 'כיבוי WikiFree',
      enable: 'הפעלת WikiFree',
      enableHint: 'חל על כל ערך בוויקיפדיה.',
      popupFree: 'חינם לתמיד. בלי חשבון ובלי מנוי.',
      reloadHint: 'השינויים חלים מיד.',
      save: 'שמירה',
      saved: 'נשמר',
      bookmarks: 'סימניות',
      bmFilter: 'סינון סימניות…',
      bmEmpty: 'אין עדיין סימניות. לחצו "שמירה" בראש ערך.',
      bmRemove: 'הסרה',
      bmExport: 'ייצוא',
      bmImport: 'ייבוא',
      bmImported: '{added} נוספו, {skipped} דולגו',
      bmImportError: 'הקובץ אינו ייצוא תקין של WikiFree.',
      tabSaved: 'סימניות',
      tabSettings: 'הגדרות',
      about: 'WikiFree חינמי ופתוח. התוכן של ויקיפדיה ברישיון CC BY-SA 4.0.',
    },
  };

  const DEFAULTS = {
    enabled: true,
    theme: 'auto', // auto | light | sepia | dark
    font: 'serif', // serif | sans
    size: 18, // px
    width: 'medium', // narrow | medium | wide
    previews: true,
    uiLang: 'auto', // auto | en | he
  };

  /** Resolve 'auto' to a concrete UI language. */
  function resolveLang(pref, pageLang) {
    if (pref === 'he' || pref === 'en') return pref;
    const nav = (global.navigator && navigator.language) || '';
    if (/^(he|iw)/i.test(nav)) return 'he';
    if (/^(he|iw)/i.test(pageLang || '')) return 'he';
    return 'en';
  }

  function makeT(lang) {
    const table = STRINGS[lang] || STRINGS.en;
    return function t(key, vars) {
      let s = table[key] != null ? table[key] : STRINGS.en[key] != null ? STRINGS.en[key] : key;
      if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
      return s;
    };
  }

  /* ---- settings storage: chrome.storage.sync, with a localStorage fallback (for plain-page testing) ---- */
  const hasChromeStorage = !!(global.chrome && chrome.storage && chrome.storage.sync);

  function loadSettings() {
    if (hasChromeStorage) {
      return chrome.storage.sync.get(DEFAULTS).then((s) => Object.assign({}, DEFAULTS, s));
    }
    try {
      const raw = JSON.parse(localStorage.getItem('wikifree-settings') || '{}');
      return Promise.resolve(Object.assign({}, DEFAULTS, raw));
    } catch (e) {
      return Promise.resolve(Object.assign({}, DEFAULTS));
    }
  }

  function saveSettings(patch) {
    if (hasChromeStorage) return chrome.storage.sync.set(patch);
    try {
      const cur = JSON.parse(localStorage.getItem('wikifree-settings') || '{}');
      localStorage.setItem('wikifree-settings', JSON.stringify(Object.assign(cur, patch)));
    } catch (e) {
      /* ignore */
    }
    return Promise.resolve();
  }

  /** cb(changesObject) – only called with keys that belong to DEFAULTS. */
  function onSettingsChanged(cb) {
    if (!hasChromeStorage) return;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      const out = {};
      let any = false;
      for (const k in changes) {
        if (k in DEFAULTS) {
          out[k] = changes[k].newValue;
          any = true;
        }
      }
      if (any) cb(out);
    });
  }

  global.WF = { STRINGS, DEFAULTS, resolveLang, makeT, loadSettings, saveSettings, onSettingsChanged };
})(typeof globalThis !== 'undefined' ? globalThis : window);
