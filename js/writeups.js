/* =============================================================
   writeups.js — Auto-enumerating writeup cards
   ──────────────────────────────────────────────
   HOW IT WORKS:
   1. Fetches writeups/index.json on page load
   2. Builds a .card element for each entry in the array
   3. Injects all cards into #cards-grid
   4. Wires up live search + tag filter on the generated cards

   TO ADD A NEW WRITEUP:
   Only edit writeups/index.json — add one object:
   {
     "title":       "Challenge Name",
     "file":        "challenge-name.html",   ← filename inside writeups/
     "description": "Short summary.",
     "tags":        ["rev", "htb", "easy"],  ← lowercase, match filter buttons
     "date":        "Jun 2025"
   }
   No changes to this JS file or writeups.html needed.

   TAG MAPPING:
   Tags in index.json map to CSS classes in style.css.
   Known tags and their CSS classes:
     htb      → tag--htb   (red)
     rev      → tag--rev   (blue)
     web      → tag--web   (green)
     pwn      → tag--pwn   (purple)
     misc     → tag--misc  (amber)
   Any unknown tag renders as a neutral .tag with no color.
   ============================================================= */


/* ─────────────────────────────────────────
   TAG → CSS CLASS MAP
   Add new entries here if you add new tag
   colors to style.css.
   ───────────────────────────────────────── */
const TAG_CLASSES = {
  htb:  'tag--htb',
  rev:  'tag--rev',
  web:  'tag--web',
  pwn:  'tag--pwn',
  misc: 'tag--misc',
   dfir:'tag--dfir'
};

/* Known difficulty labels — rendered without a color class */
const DIFFICULTY_TAGS = new Set(['easy', 'medium', 'hard', 'veryeasy', 'insane']);


/* ─────────────────────────────────────────
   BUILD ONE CARD ELEMENT
   Takes a writeup object from index.json
   and returns a fully constructed <article>.
   ───────────────────────────────────────── */
function buildCard(writeup) {
  /* Destructure with safe defaults */
  const {
    title       = 'Untitled',
    file        = '#',
    description = '',
    tags        = [],
    date        = '',
  } = writeup;

  const article = document.createElement('article');
  article.className = 'card';

  /* data-title → used by search */
  article.dataset.title = title.toLowerCase();

  /* data-tags → used by filter (space-separated string) */
  article.dataset.tags = tags.join(' ').toLowerCase();

  /* ── Title link ── */
  const titleLink = document.createElement('a');
  titleLink.href      = `writeups/${file}`;
  titleLink.className = 'card-title';
  titleLink.textContent = title;

  /* ── Description ── */
  const desc = document.createElement('p');
  desc.className   = 'card-desc';
  desc.textContent = description;

  /* ── Tag row ──
     Split tags into two groups:
       colorTags   → htb, rev, web, pwn, misc  (get a color class)
       neutralTags → easy, medium, hard, etc.  (no color class)
  */
  const tagRow = document.createElement('div');
  tagRow.className = 'card-tags';

  tags.forEach(tag => {
    const span = document.createElement('span');
    const colorClass = TAG_CLASSES[tag.toLowerCase()];

    if (colorClass) {
      /* Known colored tag */
      span.className   = `tag ${colorClass}`;
      span.textContent = tag.toUpperCase();
    } else {
      /* Difficulty or unknown tag — neutral style, title-case */
      span.className   = 'tag';
      span.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
    }

    tagRow.appendChild(span);
  });

  /* ── Date ── */
  const dateSpan = document.createElement('span');
  dateSpan.className   = 'card-date';
  dateSpan.textContent = date;

  /* Assemble */
  article.appendChild(titleLink);
  article.appendChild(desc);
  article.appendChild(tagRow);
  article.appendChild(dateSpan);

  return article;
}


/* ─────────────────────────────────────────
   FILTER FUNCTION
   Runs after any change to search or filter.
   ───────────────────────────────────────── */
function filterCards(cards, searchQuery, activeFilter, resultCount, noResults) {
  let visible = 0;

  cards.forEach(card => {
    const title = card.dataset.title || '';
    const desc  = (card.querySelector('.card-desc')?.textContent || '').toLowerCase();
    const tags  = (card.dataset.tags || '').split(' ');

    const matchesSearch =
      searchQuery === '' ||
      title.includes(searchQuery) ||
      desc.includes(searchQuery);

    const matchesFilter =
      activeFilter === 'all' ||
      tags.includes(activeFilter);

    if (matchesSearch && matchesFilter) {
      card.classList.remove('hidden');
      /* Re-trigger entrance animation */
      setTimeout(() => card.classList.add('visible'), 10);
      visible++;
    } else {
      card.classList.add('hidden');
      card.classList.remove('visible');
    }
  });

  /* Update result count label */
  if (resultCount) {
    const total = cards.length;
    resultCount.textContent =
      visible === total
        ? `${total} writeup${total !== 1 ? 's' : ''}`
        : `${visible} of ${total} writeups`;
  }

  /* Show/hide empty state */
  if (noResults) {
    noResults.style.display = visible === 0 ? 'block' : 'none';
  }
}


/* ─────────────────────────────────────────
   MAIN — fetch JSON, build cards, wire events
   ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {

  const grid        = document.getElementById('cards-grid');
  const loadingMsg  = document.getElementById('loading-msg');
  const searchInput = document.getElementById('search-input');
  const filterBtns  = document.querySelectorAll('.filter-btn');
  const noResults   = document.getElementById('no-results');
  const resultCount = document.getElementById('result-count');

  /* ── State ── */
  let activeFilter = 'all';
  let searchQuery  = '';
  let cards        = [];   /* will hold all .card elements after JSON loads */


  /* ── 1. Fetch writeups/index.json ── */
  let writeups = [];
  try {
    const response = await fetch('writeups/index.json');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    writeups = await response.json();

  } catch (err) {
    /* Show a clear error if JSON is missing or malformed */
    if (loadingMsg) {
      loadingMsg.textContent = `Could not load writeups/index.json — ${err.message}`;
      loadingMsg.style.color = 'var(--accent)';
    }
    console.error('writeups.js: failed to fetch index.json', err);
    return;
  }


  /* ── 2. Build and inject cards ── */

  /* Remove the loading placeholder */
  if (loadingMsg) loadingMsg.remove();

  /* Sort newest first — relies on date strings being comparable.
     For strict ordering, use ISO dates (YYYY-MM) in index.json.
     e.g. "2025-06" instead of "Jun 2025" */
  writeups.sort((a, b) => {
    /* Simple reverse-insertion-order fallback if dates aren't sortable */
    if (a.date && b.date) return b.date.localeCompare(a.date);
    return 0;
  });

  /* Build a DocumentFragment to avoid repeated reflows */
  const fragment = document.createDocumentFragment();

  writeups.forEach(writeup => {
    const card = buildCard(writeup);
    fragment.appendChild(card);
  });

  grid.appendChild(fragment);

  /* Collect all cards for filter/search */
  cards = [...grid.querySelectorAll('.card')];


  /* ── 3. Staggered entrance animation ── */
  cards.forEach((card, i) => {
    setTimeout(() => card.classList.add('visible'), i * 70);
  });


  /* ── 4. Initial filter run (shows count, hides empty state) ── */
  filterCards(cards, searchQuery, activeFilter, resultCount, noResults);


  /* ── 5. Search input handler (debounced) ── */
  let debounceTimer;

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = searchInput.value.trim().toLowerCase();
        filterCards(cards, searchQuery, activeFilter, resultCount, noResults);
      }, 150);
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchQuery = '';
        filterCards(cards, searchQuery, activeFilter, resultCount, noResults);
      }
    });
  }


  /* ── 6. Filter button handler ── */
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.getAttribute('data-filter') || 'all';
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterCards(cards, searchQuery, activeFilter, resultCount, noResults);
    });
  });

  /* Set "All" as default active */
  const allBtn = document.querySelector('[data-filter="all"]');
  if (allBtn) allBtn.classList.add('active');

});
