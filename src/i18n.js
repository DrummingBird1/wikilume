/* WikiLume – shared strings + settings helpers (used by the content script and the popup). */
(function (global) {
  'use strict';

  const STRINGS = {
    en: {
      brand: 'WikiLume',
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
      backToReader: 'Back to WikiLume',
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
      disable: 'Turn WikiLume off',
      enable: 'Enable WikiLume',
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
      bmImportError: 'This is not a valid WikiLume export file.',
      tabSaved: 'Bookmarks',
      tabSettings: 'Settings',
      summary: 'Summary',
      timeline: 'Timeline',
      close: 'Close',
      summaryLoading: 'Summarizing on your device…',
      summaryDownloading: 'Downloading the on-device model… {p}%',
      summaryNote: 'Generated on your device by Chrome’s built-in AI. Nothing is sent anywhere, and it can make mistakes.',
      summaryUnsupported: 'On-device summaries are not available here: they need a recent desktop Chrome with built-in AI, and a supported language. Showing the article’s opening instead.',
      summaryFailed: 'Could not create a summary. Showing the article’s opening instead.',
      summaryDownloadAsk: 'Summaries are written on your device. Chrome first has to download its built-in AI model once, which is a few GB. Continue?',
      summaryDownloadGo: 'Download and summarize',
      leadHeading: 'From the article’s opening',
      timelineNote: 'Dates picked automatically from the article text, so some may be missed or misread. Click an event to jump to it.',
      timelineCount: '{n} events',
      searchLanguages: 'Search in more languages',
      searchLangsHint: 'Results from the languages you tick appear next to results from this Wikipedia.',
      thisWiki: 'This Wikipedia',
      cover: 'Wide cover photo',
      lbPrev: 'Previous image',
      lbNext: 'Next image',
      fileDetails: 'File page',
      about: 'WikiLume is free and open. Wikipedia content is licensed CC BY-SA 4.0.',
    },
    he: {
      brand: 'WikiLume',
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
      backToReader: 'חזרה ל-WikiLume',
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
      disable: 'כיבוי WikiLume',
      enable: 'הפעלת WikiLume',
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
      bmImportError: 'הקובץ אינו ייצוא תקין של WikiLume.',
      tabSaved: 'סימניות',
      tabSettings: 'הגדרות',
      summary: 'סיכום',
      timeline: 'ציר זמן',
      close: 'סגירה',
      summaryLoading: 'מסכם במחשב שלך…',
      summaryDownloading: 'מוריד את המודל המקומי… {p}%',
      summaryNote: 'נוצר במחשב שלך על ידי ה-AI המובנה של Chrome. שום דבר לא נשלח החוצה, והוא עלול לטעות.',
      summaryUnsupported: 'סיכום מקומי לא זמין כאן: הוא דורש Chrome עדכני בדסקטופ עם AI מובנה, ושפה נתמכת. מוצג פתיח הערך במקום.',
      summaryFailed: 'לא הצלחתי ליצור סיכום. מוצג פתיח הערך במקום.',
      summaryDownloadAsk: 'הסיכום נכתב במחשב שלך. קודם Chrome צריך להוריד פעם אחת את מודל ה-AI המובנה שלו, כמה ג׳יגה. להמשיך?',
      summaryDownloadGo: 'להוריד ולסכם',
      leadHeading: 'מתוך פתיח הערך',
      timelineNote: 'תאריכים שנבחרו אוטומטית מטקסט הערך, ולכן ייתכנו החמצות וטעויות. לחיצה על אירוע קופצת אליו.',
      timelineCount: '{n} אירועים',
      searchLanguages: 'חיפוש בשפות נוספות',
      searchLangsHint: 'תוצאות מהשפות שסימנתם יופיעו לצד תוצאות הוויקיפדיה הנוכחית.',
      thisWiki: 'הוויקיפדיה הנוכחית',
      cover: 'תמונת קאבר רחבה',
      lbPrev: 'התמונה הקודמת',
      lbNext: 'התמונה הבאה',
      fileDetails: 'דף הקובץ',
      about: 'WikiLume חינמי ופתוח. התוכן של ויקיפדיה ברישיון CC BY-SA 4.0.',
    },
  };

  const DEFAULTS = {
    enabled: true,
    theme: 'auto', // auto | light | sepia | dark
    font: 'serif', // serif | sans
    size: 18, // px
    width: 'medium', // narrow | medium | wide
    previews: true,
    cover: true, // wide cover photo above the article when the lead image is landscape
    searchLangs: [], // extra Wikipedia language codes to search alongside the current one
    uiLang: 'auto', // auto | en | he
  };

  /** Languages offered for multi-language search: [code, name in its own language]. */
  const SEARCH_LANGS = [
    ['en', 'English'], ['he', 'עברית'], ['ar', 'العربية'], ['ru', 'Русский'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'],
    ['it', 'Italiano'], ['pt', 'Português'], ['nl', 'Nederlands'], ['pl', 'Polski'], ['uk', 'Українська'], ['tr', 'Türkçe'], ['fa', 'فارسی'],
    ['ja', '日本語'], ['zh', '中文'], ['ko', '한국어'], ['sv', 'Svenska'], ['cs', 'Čeština'], ['hu', 'Magyar'], ['ro', 'Română'],
    ['el', 'Ελληνικά'], ['fi', 'Suomi'], ['da', 'Dansk'], ['no', 'Norsk'], ['bg', 'Български'], ['sr', 'Српски'], ['hr', 'Hrvatski'],
    ['ca', 'Català'], ['id', 'Bahasa Indonesia'], ['vi', 'Tiếng Việt'], ['th', 'ไทย'], ['hi', 'हिन्दी'], ['simple', 'Simple English'],
  ];

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
      const raw = JSON.parse(localStorage.getItem('wikilume-settings') || '{}');
      return Promise.resolve(Object.assign({}, DEFAULTS, raw));
    } catch (e) {
      return Promise.resolve(Object.assign({}, DEFAULTS));
    }
  }

  function saveSettings(patch) {
    if (hasChromeStorage) return chrome.storage.sync.set(patch);
    try {
      const cur = JSON.parse(localStorage.getItem('wikilume-settings') || '{}');
      localStorage.setItem('wikilume-settings', JSON.stringify(Object.assign(cur, patch)));
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

  global.WF = { STRINGS, DEFAULTS, SEARCH_LANGS, resolveLang, makeT, loadSettings, saveSettings, onSettingsChanged };
})(typeof globalThis !== 'undefined' ? globalThis : window);
