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
});

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
  // Toggle Matrix rain canvas
  if (theme === 'matrix-green') {
    startMatrixRain();
  } else {
    stopMatrixRain();
  }
}

/* ── Matrix Digital Rain ── */
let matrixCanvas = null;
let matrixCtx = null;
let matrixRAF = null;
let matrixDrops = [];
let _matrixResizeHandler = null;

const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>{}[]|/\\=+*&@#$%';
const MATRIX_FONT_SIZE = 16;

function startMatrixRain() {
  if (matrixCanvas) return; // already running

  matrixCanvas = document.createElement('canvas');
  matrixCanvas.id = 'matrixRainCanvas';
  matrixCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-2;pointer-events:none;opacity:0.12;';
  document.body.prepend(matrixCanvas);

  matrixCtx = matrixCanvas.getContext('2d');

  function resetDrops() {
    const cols = Math.floor(matrixCanvas.width / MATRIX_FONT_SIZE);
    if (matrixDrops.length !== cols) {
      matrixDrops = Array.from({ length: cols }, (_, i) =>
        matrixDrops[i] !== undefined ? matrixDrops[i] : Math.random() * -100
      );
    }
  }

  function onResize() {
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight;
    resetDrops();
  }

  _matrixResizeHandler = onResize;
  onResize();
  window.addEventListener('resize', _matrixResizeHandler);

  function draw() {
    matrixCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

    const cols = Math.floor(matrixCanvas.width / MATRIX_FONT_SIZE);

    for (let i = 0; i < cols; i++) {
      const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
      const x = i * MATRIX_FONT_SIZE;
      const y = (matrixDrops[i] || 0) * MATRIX_FONT_SIZE;

      const brightness = Math.random() > 0.1 ? '#00ff41' : '#80ffa0';
      matrixCtx.fillStyle = brightness;
      matrixCtx.font = MATRIX_FONT_SIZE + 'px monospace';
      matrixCtx.fillText(char, x, y);

      if (y > matrixCanvas.height && Math.random() > 0.975) {
        matrixDrops[i] = 0;
      }
      matrixDrops[i] = (matrixDrops[i] || 0) + 1;
    }

    matrixRAF = requestAnimationFrame(draw);
  }

  draw();
}

function stopMatrixRain() {
  if (matrixRAF) {
    cancelAnimationFrame(matrixRAF);
    matrixRAF = null;
  }
  if (matrixCanvas) {
    if (_matrixResizeHandler) {
      window.removeEventListener('resize', _matrixResizeHandler);
      _matrixResizeHandler = null;
    }
    matrixCanvas.remove();
    matrixCanvas = null;
    matrixCtx = null;
    matrixDrops = [];
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
