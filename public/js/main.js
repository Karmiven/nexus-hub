// ── NexusHub Client-Side JavaScript ──

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initLanguageSelector();
  initMobileNav();
  initFlashMessages();
  initServerPolling();
});

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
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;

  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);

  themeToggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  });
}

/**
 * Apply theme to the document
 */
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  const lightIcon = document.querySelector('.theme-icon-light');
  const darkIcon = document.querySelector('.theme-icon-dark');

  if (!lightIcon || !darkIcon) return;
  if (theme === 'dark') {
    lightIcon.style.display = 'none';
    darkIcon.style.display = 'inline';
  } else {
    lightIcon.style.display = 'inline';
    darkIcon.style.display = 'none';
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
  
    // Update session language via API
    fetch('/api/language', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
