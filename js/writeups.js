/* =============================================================
   writeups.js — Search + filter logic for writeups.html

   HOW IT WORKS:
   - Each .card element has data attributes (data-tags, data-title)
   - Typing in #search-input filters cards by title + description text
   - Clicking a .filter-btn filters by tag (data-tags attribute)
   - Both filters work together (AND logic)

   HOW TO ADD A NEW WRITEUP:
   You don't need to touch this file at all.
   Just add a new .card element in writeups.html with:
     data-tags="htb rev"        ← space-separated tags
     data-title="Challenge Name" ← for search indexing
   ============================================================= */


document.addEventListener('DOMContentLoaded', () => {

  /* ── Element references ── */
  const searchInput  = document.getElementById('search-input');
  const filterBtns   = document.querySelectorAll('.filter-btn');
  const cards        = document.querySelectorAll('.card');
  const noResults    = document.getElementById('no-results');
  const resultCount  = document.getElementById('result-count');

  /* ── State ── */
  let activeFilter = 'all';   // currently selected tag filter
  let searchQuery  = '';      // current search string


  /* ─────────────────────────────────────────
     CORE FILTER FUNCTION
     Runs after any change to search or filter.
     Shows/hides cards based on both conditions.
     ───────────────────────────────────────── */
  function filterCards() {
    let visibleCount = 0;

    cards.forEach(card => {
      const title = (card.getAttribute('data-title') || '').toLowerCase();
      const desc  = (card.querySelector('.card-desc')?.textContent || '').toLowerCase();
      const tags  = (card.getAttribute('data-tags') || '').toLowerCase().split(' ');

      // Check search match — looks in title AND description text
      const matchesSearch =
        searchQuery === '' ||
        title.includes(searchQuery) ||
        desc.includes(searchQuery);

      // Check tag filter match
      const matchesFilter =
        activeFilter === 'all' ||
        tags.includes(activeFilter);

      if (matchesSearch && matchesFilter) {
        card.classList.remove('hidden');
        visibleCount++;

        // Trigger entrance animation if not already visible
        // Small timeout so the browser has time to un-hide the card
        setTimeout(() => card.classList.add('visible'), 10);
      } else {
        card.classList.add('hidden');
        card.classList.remove('visible');
      }
    });

    // Update the result count label
    if (resultCount) {
      resultCount.textContent =
        visibleCount === cards.length
          ? `${cards.length} writeup${cards.length !== 1 ? 's' : ''}`
          : `${visibleCount} of ${cards.length} writeups`;
    }

    // Show/hide the empty state message
    if (noResults) {
      noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }


  /* ─────────────────────────────────────────
     SEARCH INPUT HANDLER
     Debounced so it doesn't fire on every keystroke.
     ───────────────────────────────────────── */
  let debounceTimer;

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);

      debounceTimer = setTimeout(() => {
        // Normalize: lowercase, trim extra spaces
        searchQuery = searchInput.value.trim().toLowerCase();
        filterCards();
      }, 150);  // 150ms debounce — feels instant but avoids thrashing
    });

    // Allow pressing Escape to clear the search
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchQuery = '';
        filterCards();
      }
    });
  }


  /* ─────────────────────────────────────────
     FILTER BUTTON HANDLER
     Sets the active filter and updates button states.
     ───────────────────────────────────────── */
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Read which filter this button represents
      // e.g. <button class="filter-btn" data-filter="rev">Rev</button>
      activeFilter = btn.getAttribute('data-filter') || 'all';

      // Update active styling — remove from all, add to clicked
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      filterCards();
    });
  });


  /* ─────────────────────────────────────────
     INITIAL RUN
     Show all cards on page load with stagger.
     ───────────────────────────────────────── */
  filterCards();

  // Stagger the initial card entrances
  cards.forEach((card, i) => {
    setTimeout(() => {
      card.classList.add('visible');
    }, i * 70);
  });

  // Set "All" as the default active filter button
  const allBtn = document.querySelector('[data-filter="all"]');
  if (allBtn) allBtn.classList.add('active');

});
