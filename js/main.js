/* =============================================================
   main.js — Shared JavaScript for every page
   Handles:
     1. Dark/light theme toggle (with localStorage persistence)
     2. Active nav link highlighting
     3. Staggered entrance animations via IntersectionObserver

   HOW TO USE:
   Include this script at the bottom of every page:
     <script src="../js/main.js"></script>   (from writeups/)
     <script src="js/main.js"></script>       (from root)
   ============================================================= */


/* ─────────────────────────────────────────
   1. THEME TOGGLE
   Persists user's choice in localStorage.
   Applies the theme before first paint to
   avoid a flash of wrong theme (FOUT).
   ───────────────────────────────────────── */

/**
 * Apply a theme to the <html> element.
 * @param {'light'|'dark'} theme
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  // Update the toggle button icon
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    // ☀ for light mode, ◑ for dark mode
    btn.textContent = theme === 'dark' ? '☀' : '◑';
    btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  }
}

/**
 * Read saved theme from localStorage.
 * Falls back to the user's OS preference, then 'light'.
 * @returns {'light'|'dark'}
 */
function getSavedTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;

  // Check OS-level dark mode preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

// Apply theme immediately (before DOM paints) to prevent flash
applyTheme(getSavedTheme());

// Once DOM is ready, wire up the toggle button
document.addEventListener('DOMContentLoaded', () => {

  // Re-apply in case the DOMContentLoaded fires before the above runs
  applyTheme(getSavedTheme());

  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next    = current === 'dark' ? 'light' : 'dark';

      // Add transition class so CSS variables animate smoothly
      document.body.classList.add('theme-transitioning');

      applyTheme(next);
      localStorage.setItem('theme', next);

      // Remove transition class after animation completes
      setTimeout(() => {
        document.body.classList.remove('theme-transitioning');
      }, 300);
    });
  }
});


/* ─────────────────────────────────────────
   2. ACTIVE NAV LINK
   Adds class="active" to the nav link whose
   href matches the current page filename.
   ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('.nav-links a').forEach(link => {
    const linkPage = link.getAttribute('href').split('/').pop();
    if (linkPage === currentPage) {
      link.classList.add('active');
    }
  });
});


/* ─────────────────────────────────────────
   3. STAGGERED ENTRANCE ANIMATIONS
   Uses IntersectionObserver to watch for
   elements entering the viewport, then adds
   the "visible" class to trigger their CSS
   opacity/transform transition.

   Usage in HTML:
     <div class="animate-in">...</div>
   Any element with class "animate-in" will
   fade+slide up when it scrolls into view.
   ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  // Gather all elements that should animate in
  const animateEls = document.querySelectorAll('.animate-in, .writeup-row, .card');

  if (!animateEls.length) return;

  // Create the observer
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Stagger each element by 60ms × its index
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, i * 60);

          // Once animated in, no need to observe anymore
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold:  0.1,   // trigger when 10% of element is visible
      rootMargin: '0px 0px -40px 0px',  // trigger slightly before bottom edge
    }
  );

  animateEls.forEach(el => observer.observe(el));
});
