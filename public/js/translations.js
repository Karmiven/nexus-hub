// ═══════════════════════════════════════════════════════════════
//  NexusHub i18n — Dynamic Language Loader
//  Language files live in /js/lang/{code}.js
//  Each file calls window.__loadLang({ _label: 'English', ... })
//  Adding a new language = creating a new .js file in /js/lang/
// ═══════════════════════════════════════════════════════════════

var _i18nLanguages = {};   // { en: { _label, ...keys }, ru: { ... } }
var _i18nReady = false;

/**
 * Register a callback for when i18n is ready.
 * If already ready, fires immediately.
 */
window.i18nReady = function(cb) {
  if (_i18nReady && window.i18n) {
    cb();
  } else {
    window.addEventListener('i18nReady', cb, { once: true });
  }
};

/**
 * Called by each lang file to register its translations
 */
window.__loadLang = function(data) {
  // noop — replaced per-load by loadLanguageFile()
};

/**
 * Load a single language file by code
 */
function loadLanguageFile(code) {
  return new Promise(function(resolve) {
    // If already loaded, skip
    if (_i18nLanguages[code]) return resolve();

    var script = document.createElement('script');
    script.src = '/js/lang/' + code + '.js?v=' + (window.__version || Date.now());

    window.__loadLang = function(data) {
      _i18nLanguages[code] = data;
      resolve();
    };

    script.onerror = function() {
      console.warn('[i18n] Failed to load language: ' + code);
      resolve(); // don't block on missing files
    };

    document.head.appendChild(script);
  });
}

/**
 * Discover available languages from /api/languages then load them all
 */
function initI18nSystem() {
  fetch('/api/languages')
    .then(function(r) { return r.json(); })
    .then(function(langs) {
      // langs = ['en', 'ru', ...]
      var chain = Promise.resolve();
      langs.forEach(function(code) {
        chain = chain.then(function() { return loadLanguageFile(code); });
      });
      return chain;
    })
    .catch(function() {
      // Fallback: load en + ru if API fails
      return loadLanguageFile('en').then(function() { return loadLanguageFile('ru'); });
    })
    .then(function() {
      window.i18n = new I18n();
      window.t = function(key, params) { return window.i18n.t(key, params); };
      _i18nReady = true;

      // Apply translations to current page
      window.i18n.updatePageContent();

      // Update language selector with available languages
      window.i18n.buildLanguageSelector();

      // Notify all listeners that i18n is ready
      window.dispatchEvent(new Event('i18nReady'));
    });
}

/**
 * Translation system
 */
class I18n {
  constructor() {
    this.translations = _i18nLanguages;
    this.currentLang = this.detectLanguage();
    document.documentElement.lang = this.currentLang;
  }

  /**
   * Detect user's preferred language
   */
  detectLanguage() {
    var available = Object.keys(this.translations);
    if (!available.length) return 'en';

    // Check localStorage first
    var saved = localStorage.getItem('language');
    if (saved && this.translations[saved]) return saved;

    // Check browser language
    var browserLang = navigator.language.split('-')[0];
    if (this.translations[browserLang]) return browserLang;

    // Check URL parameter
    var urlParams = new URLSearchParams(window.location.search);
    var urlLang = urlParams.get('lang');
    if (urlLang && this.translations[urlLang]) return urlLang;

    // Default to English or first available
    return this.translations['en'] ? 'en' : available[0];
  }

  /**
   * Get translation for a key
   */
  t(key, params) {
    params = params || {};
    var langData = this.translations[this.currentLang] || this.translations['en'] || {};
    var translation = langData[key] || key;

    return translation.replace(/\{(\w+)\}/g, function(match, param) {
      return params[param] !== undefined ? params[param] : match;
    });
  }

  /**
   * Set language
   */
  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem('language', lang);
      document.documentElement.lang = lang;

      this.updatePageContent();
      this.updateLanguageSelector();

      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: lang } }));
    }
  }

  /**
   * Get current language
   */
  getCurrentLanguage() {
    return this.currentLang;
  }

  /**
   * Get available languages
   */
  getAvailableLanguages() {
    return Object.keys(this.translations);
  }

  /**
   * Update page content with translations
   */
  updatePageContent() {
    document.querySelectorAll('[data-i18n]').forEach(function(element) {
      var key = element.getAttribute('data-i18n');
      element.textContent = window.i18n.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(element) {
      var key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = window.i18n.t(key);
    });

    var title = document.querySelector('title');
    if (title && title.textContent) {
      var titleKey = title.textContent;
      var translated = window.i18n.t(titleKey);
      if (translated !== titleKey) {
        title.textContent = translated;
      }
    }
  }

  /**
   * Build language selector options dynamically from loaded languages
   */
  buildLanguageSelector() {
    var selector = document.getElementById('languageSelector');
    if (!selector) return;

    var current = this.currentLang;
    selector.innerHTML = '';

    var langs = this.getAvailableLanguages();
    langs.forEach(function(code) {
      var opt = document.createElement('option');
      opt.value = code;
      // Use _label from the language file, fallback to uppercase code
      var langData = _i18nLanguages[code];
      opt.textContent = (langData && langData._label) ? langData._label : code.toUpperCase();
      if (code === current) opt.selected = true;
      selector.appendChild(opt);
    });
  }

  /**
   * Update language selector UI
   */
  updateLanguageSelector() {
    var selector = document.querySelector('.language-selector');
    if (selector) {
      selector.value = this.currentLang;
    }
  }

  /**
   * Format time relative to now
   */
  formatTimeAgo(timestamp) {
    var now = Date.now();
    var diff = now - timestamp;
    var minutes = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days = Math.floor(diff / 86400000);

    if (days > 0) return this.t('days_ago', { days: days });
    if (hours > 0) return this.t('hours_ago', { hours: hours });
    if (minutes > 0) return this.t('minutes_ago', { minutes: minutes });
    return this.t('just_now');
  }
}

// Start loading languages immediately
initI18nSystem();
