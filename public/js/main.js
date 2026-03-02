// ── NexusHub Client-Side JavaScript ──

// Fade-in on page load
document.body.classList.add('page-ready');

document.addEventListener('DOMContentLoaded', () => {
  initLucideIcons();
  initPageTransitions();
  initThemeToggle();
  initLanguageSelector();
  initMobileNav();
  initFlashMessages();
  initServerPolling();
  formatLocalTimes();
});

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

/**
 * Smooth page transitions — intercept link clicks, fade out, then navigate
 */
function initPageTransitions() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    // Skip: external links, anchors, javascript:, new-tab, download, or special
    if (!href || href.startsWith('#') || href.startsWith('javascript:') ||
        href.startsWith('mailto:') || href.startsWith('tel:') ||
        link.target === '_blank' || link.hasAttribute('download') ||
        e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

    // Skip logout (needs full reload)
    if (href.includes('/auth/logout')) return;

    e.preventDefault();
    document.body.classList.remove('page-ready');
    setTimeout(() => { window.location.href = href; }, 120);
  });

  // Handle browser back/forward
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      document.body.classList.add('page-ready');
    }
  });

  // Fade out on form submissions that navigate (not AJAX)
  document.addEventListener('submit', (e) => {
    if (e.defaultPrevented) return;
    const form = e.target;
    // Skip forms handled by JS (e.g. news modal with fetch)
    if (form.id === 'newsForm' || form.id === 'chatForm') return;
    document.body.classList.remove('page-ready');
  });
}

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
 */
function initThemeToggle() {
  const themeSwitcher = document.getElementById('themeSwitcher');
  if (!themeSwitcher) return;

  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);
  themeSwitcher.value = savedTheme;

  themeSwitcher.addEventListener('change', (e) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  });
}

/**
 * Apply theme to the document
 */
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  // Update theme stylesheet to load only the active theme CSS
  var link = document.getElementById('theme-stylesheet');
  if (link) link.href = '/css/themes/' + theme + '.css';
  // Switch canvas effect via theme-effects engine
  if (window.themeEffects) {
    window.themeEffects.switch(theme);
  }
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
        'x-csrf-token': document.querySelector('meta[name="csrf-token"]')?.content || ''
      },
      body: JSON.stringify({ language: e.target.value })
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
