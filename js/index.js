/* =============================================================
   index.js — Recent Writeups section for the landing page
   ─────────────────────────────────────────────────────────────
   Fetches writeups/index.json (the same file used by writeups.js)
   and injects the N most recent entries as .writeup-row elements
   into #recent-writeups-list on the homepage.

   HOW TO CHANGE HOW MANY ROWS APPEAR:
   Edit the RECENT_LIMIT constant below.

   HOW TO ADD A NEW WRITEUP:
   Only edit writeups/index.json — this file never needs changing.
   ============================================================= */

/* How many recent writeups to show on the homepage */
const RECENT_LIMIT = 3;

/* Same tag→class map as writeups.js */
const TAG_CLASSES_IDX = {
  htb:  'tag--htb',
  rev:  'tag--rev',
  web:  'tag--web',
  pwn:  'tag--pwn',
  misc: 'tag--misc',
  dfir: 'tag--dfir'
};


/* ─────────────────────────────────────────
   BUILD ONE ROW ELEMENT
   Returns a .writeup-row div for the homepage.
   ───────────────────────────────────────── */
function buildRow(writeup) {
  const { title = 'Untitled', file = '#', tags = [], date = '' } = writeup;

  const row = document.createElement('div');
  row.className = 'writeup-row animate-in';

  /* Title link */
  const link = document.createElement('a');
  link.href      = `writeups/${file}`;
  link.className = 'writeup-row-title';
  link.textContent = title;

  /* Meta: tags + date */
  const meta = document.createElement('div');
  meta.className = 'writeup-row-meta';

  /* Show only the first two tags to keep the row tidy */
  tags.slice(0, 2).forEach(tag => {
    const span = document.createElement('span');
    const colorClass = TAG_CLASSES_IDX[tag.toLowerCase()];
    span.className   = colorClass ? `tag ${colorClass}` : 'tag';
    span.textContent = colorClass ? tag.toUpperCase() : tag;
    meta.appendChild(span);
  });

  /* Date */
  const dateSpan = document.createElement('span');
  dateSpan.className   = 'writeup-date';
  dateSpan.textContent = date;
  meta.appendChild(dateSpan);

  row.appendChild(link);
  row.appendChild(meta);

  return row;
}


/* ─────────────────────────────────────────
   MAIN
   ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {

  const container = document.getElementById('recent-writeups-list');
  if (!container) return;

  /* Fetch the shared index */
  let writeups = [];
  try {
    const res = await fetch('writeups/index.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeups = await res.json();
  } catch (err) {
    /* Fail silently on the homepage — just hide the section */
    console.warn('index.js: could not load writeups/index.json', err);
    container.closest('section')?.style.setProperty('display', 'none');
    return;
  }

  /* Take the first N (JSON should be ordered newest-first) */
  const recent = writeups.slice(0, RECENT_LIMIT);

  /* Build and inject rows */
  const fragment = document.createDocumentFragment();
  recent.forEach(w => fragment.appendChild(buildRow(w)));
  container.appendChild(fragment);

  /* Trigger staggered entrance animation */
  const rows = container.querySelectorAll('.writeup-row');
  rows.forEach((row, i) => {
    setTimeout(() => row.classList.add('visible'), i * 80);
  });

});
