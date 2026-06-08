/* =============================================================
   main.js — Shared JavaScript for every page
   ─────────────────────────────────────────────
   Handles:
     1. Dark / light theme toggle (localStorage + OS preference)
     2. Active nav link highlighting
     3. Staggered entrance animations (IntersectionObserver)
     4. Auto prev / next nav on writeup pages (reads index.json)

   HOW TO INCLUDE:
     Root pages  (index.html, writeups.html):
       <script src="js/main.js"></script>

     Writeup pages (writeups/*.html):
       <script src="../js/main.js"></script>
   ============================================================= */


/* ═════════════════════════════════════════════════════════════
   1. THEME TOGGLE
   ─────────────────────────────────────────────────────────────
   Priority order for initial theme:
     1. User's saved choice in localStorage
     2. OS-level prefers-color-scheme
     3. Default: light

   applyTheme() is called immediately (outside DOMContentLoaded)
   so the correct theme is set before the first paint — prevents
   a flash of the wrong theme (FOUT).
   ═════════════════════════════════════════════════════════════ */

/**
 * Write data-theme onto <html> and update the toggle button icon.
 * Safe to call before DOMContentLoaded — btn lookup is guarded.
 * @param {'light'|'dark'} theme
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  const btn = document.getElementById('theme-toggle');
  if (btn) {
    // ☀  = currently dark, click to go light
    // ◑  = currently light, click to go dark
    btn.textContent = theme === 'dark' ? '☀' : '◑';
    btn.setAttribute(
      'aria-label',
      `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`
    );
  }
}

/**
 * Return the theme that should be active on load.
 * @returns {'light'|'dark'}
 */
function getSavedTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;

  // Fall back to OS preference
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/* Apply before first paint */
applyTheme(getSavedTheme());

document.addEventListener('DOMContentLoaded', () => {

  /* Re-apply now that the button exists in the DOM */
  applyTheme(getSavedTheme());

  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';

    /* Enable CSS transitions only during the toggle so
       hover/focus states don't feel sluggish day-to-day */
    document.body.classList.add('theme-transitioning');
    applyTheme(next);
    localStorage.setItem('theme', next);

    setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
    }, 300);
  });
});


/* ═════════════════════════════════════════════════════════════
   2. ACTIVE NAV LINK
   ─────────────────────────────────────────────────────────────
   Adds class="active" to whichever .nav-links anchor whose href
   filename matches the current page filename.

   e.g. on writeups.html the "Writeups" link gets .active.
   Works for both root pages and pages in subdirectories because
   we compare only the last path segment (the filename).
   ═════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* Default to 'index.html' when pathname ends in '/' */
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('.nav-links a').forEach(link => {
    const linkFile = link.getAttribute('href').split('/').pop();
    if (linkFile === currentFile) {
      link.classList.add('active');
    }
  });
});


/* ═════════════════════════════════════════════════════════════
   3. STAGGERED ENTRANCE ANIMATIONS
   ─────────────────────────────────────────────────────────────
   Uses IntersectionObserver to detect when elements scroll into
   view, then adds class="visible" to trigger the CSS transition
   defined in style.css (.animate-in, .writeup-row, .card).

   Elements animate once — observer stops watching after firing.

   To make any element animate in, add class="animate-in":
     <div class="animate-in">...</div>
   ═════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  const targets = document.querySelectorAll('.animate-in, .writeup-row, .card');
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;

        /* Stagger: each element waits 60ms longer than the previous */
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 60);

        /* Stop observing — element only needs to animate once */
        observer.unobserve(entry.target);
      });
    },
    {
      threshold:  0.1,                  /* fire when 10% visible        */
      rootMargin: '0px 0px -40px 0px',  /* slightly before bottom edge  */
    }
  );

  targets.forEach(el => observer.observe(el));
});


/* ═════════════════════════════════════════════════════════════
   4. AUTO PREV / NEXT WRITEUP NAVIGATION
   ─────────────────────────────────────────────────────────────
   Only runs on pages that contain a .writeup-nav element
   (i.e. individual writeup pages — not the listing page).

   How it works:
     1. Reads writeups/index.json (one level up from writeups/)
     2. Finds the current page's filename in the array
     3. Fills the prev/next links based on neighbours in the array

   Index.json order convention:
     First entry  = newest writeup
     Last entry   = oldest writeup
   So "next" = newer (lower index) and "prev" = older (higher index).

   Fails silently — if the fetch fails, the nav stays empty.
   You can still add static links in the HTML as a fallback.
   ═════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {

  /* Only run on writeup pages */
  const nav = document.querySelector('.writeup-nav');
  if (!nav) return;

  /* Current filename — e.g. "graverobber.html" */
  const currentFile = window.location.pathname.split('/').pop();
  if (!currentFile) return;

  /* Fetch the shared writeups manifest */
  let writeups = [];
  try {
    /* Writeup pages live in writeups/, so index.json is one level up */
    const res = await fetch('../writeups/index.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeups = await res.json();
  } catch (err) {
    /* Fail silently — static fallback links in the HTML still work */
    console.warn('main.js: could not load writeups/index.json for prev/next nav', err);
    return;
  }

  /* Find this page's position in the manifest */
  const idx = writeups.findIndex(w => w.file === currentFile);
  if (idx === -1) return;  /* page not listed in index.json — bail */

  /* index.json is newest-first, so:
       prev (older) = higher index
       next (newer) = lower index                                    */
  const prevWriteup = writeups[idx + 1] || null;
  const nextWriteup = writeups[idx - 1] || null;

  /* Build the nav HTML */
  let html = '';

  if (prevWriteup) {
    html += `
      <a href="${prevWriteup.file}" class="writeup-nav-link prev">
        <span>← Previous</span>
        ${escapeHtml(prevWriteup.title)}
      </a>`;
  } else {
    /* Empty spacer keeps "next" pushed to the right */
    html += `<span></span>`;
  }

  if (nextWriteup) {
    html += `
      <a href="${nextWriteup.file}" class="writeup-nav-link next">
        <span>Next →</span>
        ${escapeHtml(nextWriteup.title)}
      </a>`;
  }

  nav.innerHTML = html;
});


/* ─────────────────────────────────────────
   HELPER — escape HTML special characters
   Used when injecting titles from JSON into
   innerHTML to prevent XSS.
   ───────────────────────────────────────── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}
