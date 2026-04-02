// ── NexusHub Client-Side JavaScript ──

/**
 * Reveal the page once theme CSS is fully loaded.
 * Uses visibility:hidden → visible (no layout shift, no flash).
 * Content area fades in separately for SPA-like feel.
 */
function revealPage() {
  // Remove the inline bg override set before CSS loaded — let theme CSS take full control
  if (typeof window.__clearBgOverride === 'function') {
    window.__clearBgOverride();
    window.__clearBgOverride = null;
  }
  document.body.classList.add('page-rendered');
  requestAnimationFrame(function () {
    var main = document.querySelector('.main-content');
    var footer = document.querySelector('.footer');
    if (main) main.classList.add('content-ready');
    if (footer) footer.classList.add('content-ready');
  });
}

function waitForThemeAndReveal() {
  var themeLink = document.getElementById('theme-stylesheet');
  if (themeLink && !themeLink.sheet) {
    themeLink.addEventListener('load', revealPage);
    setTimeout(revealPage, 400);
  } else {
    revealPage();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  waitForThemeAndReveal();
  initLucideIcons();
  initSpaNavigation();
  initThemeToggle();
  initLanguageSelector();
  initMobileNav();
  initFlashMessages();
  initServerPolling();
  formatLocalTimes();
  runInlinePageScripts();
});

// ═══════════════════════════════════════════════════════════════
//  SPA NAVIGATION (pjax-like: fetch + swap content, no page reload)
// ═══════════════════════════════════════════════════════════════

var _spaNavigating = false;

/**
 * Checks whether a URL is eligible for SPA navigation.
 * Returns false for external links, auth actions, API calls etc.
 */
function isSpaEligible(href) {
  if (!href) return false;
  // Only same-origin relative/absolute paths
  try {
    var url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    var path = url.pathname;
    // Skip: API, auth actions, file downloads, socket.io, admin pages
    if (/^\/(api|socket\.io)\//i.test(path)) return false;
    if (/\/auth\/logout/i.test(path)) return false;
    if (/^\/admin\b/i.test(path)) return false;
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Perform SPA navigation: fetch new page, extract content, swap in-place.
 */
async function spaNavigateTo(href, pushState) {
  if (_spaNavigating) return;
  _spaNavigating = true;

  var main = document.querySelector('.main-content');
  var footer = document.querySelector('.footer');

  // ── Fade out current content ──
  if (main) main.classList.remove('content-ready');
  if (footer) footer.classList.remove('content-ready');

  try {
    var res = await fetch(href, {
      headers: { 'X-Requested-With': 'SpaNav' },
      credentials: 'same-origin'
    });

    // If server redirected (e.g. login required), follow it
    if (res.redirected) {
      window.location.href = res.url;
      return;
    }

    // If not HTML, fall back to normal navigation
    var ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html')) {
      window.location.href = href;
      return;
    }

    var html = await res.text();

    // ── Parse the response ──
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');

    var newMain = doc.querySelector('.main-content');
    var newFooter = doc.querySelector('.footer');
    var newTitle = doc.querySelector('title');
    var newCsrf = doc.querySelector('meta[name="csrf-token"]');
    // Collect flash messages
    var newFlashes = doc.querySelectorAll('.flash');

    if (!newMain) {
      // Page structure doesn't match — fall back to full navigation
      window.location.href = href;
      return;
    }

    // Wait for fade-out to finish (300ms transition)
    await new Promise(r => setTimeout(r, 280));

    // ── Swap content (disable transitions during swap to prevent white/border flash) ──
    document.body.classList.add('spa-swapping');
    main.innerHTML = newMain.innerHTML;
    if (footer && newFooter) footer.innerHTML = newFooter.innerHTML;

    // Update title
    if (newTitle) document.title = newTitle.textContent;

    // Update CSRF token
    if (newCsrf) {
      var oldCsrf = document.querySelector('meta[name="csrf-token"]');
      if (oldCsrf) oldCsrf.setAttribute('content', newCsrf.getAttribute('content'));
    }

    // Insert flash messages
    var existingFlashes = document.querySelectorAll('.flash');
    existingFlashes.forEach(f => f.remove());
    if (newFlashes.length > 0) {
      var navbar = document.querySelector('.navbar');
      newFlashes.forEach(f => {
        if (navbar && navbar.nextSibling) {
          navbar.parentNode.insertBefore(f, navbar.nextSibling);
        }
      });
    }

    // Collect and execute inline <script> tags from the new main content
    var newPageScripts = doc.querySelectorAll('.main-content script, .footer script');
    // Also check for page-specific scripts that load external resources (chart.js, socket.io, etc.)
    var externalScripts = doc.querySelectorAll('script[src]');
    var pageLevelScripts = [];
    externalScripts.forEach(function(s) {
      var src = s.getAttribute('src');
      // Skip scripts that are already loaded in our page
      if (src && !document.querySelector('script[src="' + src + '"]')) {
        pageLevelScripts.push(s);
      }
    });

    // Push state
    if (pushState !== false) {
      history.pushState({ spaNav: true }, '', href);
    }

    // ── Re-initialize page-specific stuff ──
    initLucideIcons();
    formatLocalTimes();
    initFlashMessages();
    initServerPolling();
    if (typeof window.i18n !== 'undefined') {
      window.i18n.updatePageContent();
    }

    // Execute page-specific external scripts, then inline scripts
    await loadExternalScripts(pageLevelScripts);
    executeInlineScripts(newPageScripts);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });

    // ── Fade in new content (remove spa-swapping only after first paint with correct styles) ──
    requestAnimationFrame(function () {
      // Force reflow so new elements compute their theme colors before transitions re-enable
      void main.offsetHeight;
      document.body.classList.remove('spa-swapping');
      requestAnimationFrame(function () {
        main.classList.add('content-ready');
        if (footer) footer.classList.add('content-ready');
      });
    });

  } catch (err) {
    console.warn('[SPA] Navigation failed, falling back:', err);
    window.location.href = href;
    return;
  } finally {
    _spaNavigating = false;
  }
}

/**
 * Load external script tags sequentially
 */
function loadExternalScripts(scriptElements) {
  return Array.from(scriptElements).reduce(function (chain, oldScript) {
    return chain.then(function () {
      return new Promise(function (resolve) {
        var s = document.createElement('script');
        s.src = oldScript.getAttribute('src');
        if (oldScript.getAttribute('crossorigin')) s.crossOrigin = oldScript.getAttribute('crossorigin');
        s.onload = resolve;
        s.onerror = resolve; // don't block on failure
        document.body.appendChild(s);
      });
    });
  }, Promise.resolve());
}

/**
 * Execute inline <script> tags from freshly swapped content
 */
function executeInlineScripts(scriptElements) {
  scriptElements.forEach(function (oldScript) {
    if (oldScript.src) return; // external scripts handled separately
    var s = document.createElement('script');
    s.textContent = oldScript.textContent;
    document.body.appendChild(s);
    s.remove();
  });
}

/**
 * Run inline scripts that were in the original page's main-content on first load
 */
function runInlinePageScripts() {
  // Already executed by browser on first load — nothing to do
}

/**
 * Set up SPA navigation: intercept clicks + handle back/forward
 */
function initSpaNavigation() {
  // ── Intercept link clicks ──
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href]');
    if (!link) return;

    var href = link.getAttribute('href');

    // Skip: anchors, js:, mailto, tel, new-tab, download, modifier keys
    if (!href || href.startsWith('#') || href.startsWith('javascript:') ||
        href.startsWith('mailto:') || href.startsWith('tel:') ||
        link.target === '_blank' || link.hasAttribute('download') ||
        e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

    if (!isSpaEligible(href)) return;

    e.preventDefault();
    // Don't navigate to the same page
    if (new URL(href, window.location.origin).href === window.location.href) return;

    spaNavigateTo(href, true);
  });

  // ── Handle browser back/forward ──
  window.addEventListener('popstate', function (e) {
    spaNavigateTo(window.location.href, false);
  });

  // ── Fade out on form submissions that navigate ──
  document.addEventListener('submit', function (e) {
    if (e.defaultPrevented) return;
    var form = e.target;
    if (form.id === 'newsForm' || form.id === 'chatForm') return;
    var main = document.querySelector('.main-content');
    var footer = document.querySelector('.footer');
    if (main) main.classList.remove('content-ready');
    if (footer) footer.classList.remove('content-ready');
  });

  // ── Handle bfcache restore ──
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      document.body.classList.add('page-rendered');
      var main = document.querySelector('.main-content');
      var footer = document.querySelector('.footer');
      if (main) main.classList.add('content-ready');
      if (footer) footer.classList.add('content-ready');
    }
  });

  // Save initial state
  history.replaceState({ spaNav: true }, '', window.location.href);
}

/**
 * Get the site-wide timezone set by admin
 */
function getSiteTimezone() {
  return window.SITE_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get locale string based on current language
 */
function getLocaleForLang() {
  var lang = (typeof window.i18n !== 'undefined') ? window.i18n.getCurrentLanguage() : 'en';
  return lang === 'ru' ? 'ru-RU' : 'en-US';
}

/**
 * Format a single date according to format type and user timezone
 */
/**
 * Parse a timestamp string, treating ambiguous formats (no Z/offset) as UTC
 * because SQLite CURRENT_TIMESTAMP stores UTC.
 */
function parseTimestamp(dateStr) {
  if (!dateStr) return new Date(NaN);
  var s = String(dateStr).trim();
  // If it already has timezone info (Z, +, - offset), parse as-is
  if (/Z$/i.test(s) || /[+-]\d{2}:\d{2}$/.test(s) || /[+-]\d{4}$/.test(s)) {
    return new Date(s);
  }
  // SQLite format: "2026-03-02 14:00:00" — treat as UTC by appending Z
  // Replace space between date and time with T for ISO format
  s = s.replace(' ', 'T');
  if (!/T/.test(s)) s += 'T00:00:00';
  return new Date(s + 'Z');
}

function formatTimestamp(dateStr, format) {
  var tz = getSiteTimezone();
  var locale = getLocaleForLang();
  var d = parseTimestamp(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  try {
    if (format === 'time') {
      return d.toLocaleTimeString(locale, { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } else if (format === 'date') {
      return d.toLocaleDateString(locale, { timeZone: tz, year: 'numeric', month: 'short', day: 'numeric' });
    } else {
      return d.toLocaleString(locale, { timeZone: tz, year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    }
  } catch (e) {
    // Fallback if timezone is invalid
    if (format === 'time') return d.toLocaleTimeString(locale);
    if (format === 'date') return d.toLocaleDateString(locale);
    return d.toLocaleString(locale);
  }
}

/**
 * Format all elements with class 'local-time' using the user's timezone
 */
function formatLocalTimes() {
  document.querySelectorAll('.local-time').forEach(function(el) {
    var ts = el.getAttribute('data-timestamp');
    var fmt = el.getAttribute('data-format') || 'datetime';
    if (ts) {
      el.textContent = formatTimestamp(ts, fmt);
    }
  });
}

// Expose globally so dynamic pages (community chat, monitoring) can use it
window.formatLocalTimes = formatLocalTimes;
window.formatTimestamp = formatTimestamp;
window.parseTimestamp = parseTimestamp;

/**
 * Initialize Lucide icons across the page
 */
function initLucideIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Global helper for refreshing icons after dynamic content changes
window.refreshIcons = function() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

function initMobileNav() {
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (!navToggle || !navLinks) return;

  navToggle.addEventListener('click', (e) => {
    e.preventDefault();
    navLinks.classList.toggle('active');
  });

  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
    });
  });
}

function initFlashMessages() {
  document.querySelectorAll('.flash').forEach(flash => {
    setTimeout(() => {
      flash.style.transition = 'opacity 0.5s, transform 0.5s';
      flash.style.opacity = '0';
      flash.style.transform = 'translateY(-20px)';
      setTimeout(() => flash.remove(), 500);
    }, 5000);
  });
}

function initServerPolling() {
  if (!document.querySelector('.server-card')) return;
  setInterval(async () => {
    try {
      const res = await fetch('/api/servers');
      const data = await res.json();
      if (data.success && data.servers) {
        updateServerCards(data.servers);
      }
    } catch (e) {
      // Silent fail
    }
  }, 30000);
}

/**
 * Initialize theme toggle functionality
 * Theme is already applied by the head script. We only set up the change listener.
 * Theme effects are auto-started by theme-effects.js — no need to call setTheme() here.
 */
function initThemeToggle() {
  const themeSwitcher = document.getElementById('themeSwitcher');
  if (!themeSwitcher) return;

  // Selector value already set by inline script in header
  themeSwitcher.addEventListener('change', (e) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  });
}

/**
 * Apply theme to the document (called only when user switches theme)
 */
function setTheme(theme) {
  // Enable transitions for smooth theme change
  document.documentElement.classList.add('theme-transitioning');
  document.documentElement.setAttribute('data-theme', theme);
  // Update theme stylesheet
  var link = document.getElementById('theme-stylesheet');
  if (link) link.href = '/css/themes/' + theme + '.css';
  // Switch canvas effect via theme-effects engine
  if (window.themeEffects) {
    window.themeEffects.switch(theme);
  }
  // Remove transitioning class after animations complete
  setTimeout(function() {
    document.documentElement.classList.remove('theme-transitioning');
  }, 500);
}

/**
 * Initialize language selector functionality
 */
function initLanguageSelector() {
  const languageSelector = document.getElementById('languageSelector');
  if (!languageSelector) return;
  if (typeof window.i18n === 'undefined') return;

  const currentLang = window.i18n.getCurrentLanguage();
  languageSelector.value = currentLang;

  window.i18n.updatePageContent();

  languageSelector.addEventListener('change', (e) => {
    window.i18n.setLanguage(e.target.value);
    formatLocalTimes();
  
    // Update session language via API
    fetch('/api/language', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'x-csrf-token': document.querySelector('meta[name="csrf-token"]')?.content || ''
      },
      body: JSON.stringify({ language: e.target.value })
    }).then(function(res) {
      var newToken = res.headers.get('X-CSRF-Token');
      if (newToken) {
        var meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) meta.setAttribute('content', newToken);
      }
    }).catch(() => {});
  });
}

/**
 * Update server cards with fresh status data
 */
function updateServerCards(servers) {
  servers.forEach(srv => {
    // Find card links that point to this server
    const links = document.querySelectorAll(`a[href="/servers/${srv.id}"], a[href*="/servers/${srv.id}"]`);
    links.forEach(link => {
      const card = link.closest('.server-card');
      if (!card) return;

      // Update status indicator
      const indicator = card.querySelector('.server-status-indicator');
      if (indicator) {
        indicator.className = `server-status-indicator status-${srv.status}`;
      }

      // Update badge
      const badge = card.querySelector('.status-badge');
      if (badge) {
        badge.className = `status-badge badge-${srv.status}`;
        badge.textContent = srv.status === 'online' ? 'Online' : 'Offline';
      }
    });
  });
}
