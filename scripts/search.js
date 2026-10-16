/**
 * Search modal helpers (Pagefind Component UI)
 *
 * 1. Excerpt fitting. Pagefind picks a ~30-word excerpt with the matched words in the middle, and
 * its Component UI clips every excerpt to a single line. On anything narrower
 * than a wide desktop the highlighted word lands past the ellipsis, so the
 * card shows text without the word the reader searched for.
 *
 * We keep the single line and instead drop words from the start of the
 * excerpt until the first <mark> fits, prefixing "…" to show it was cut.
 *
 * 2. Keyboard-aware sizing. iOS Safari doesn't shrink the layout viewport for
 * the on-screen keyboard and exposes no CSS for its height
 * (interactive-widget and env(keyboard-inset-*) aren't supported), so the
 * full-screen modal keeps its results under the keyboard. We mirror the
 * visible area from window.visualViewport into --search-vh / --search-top,
 * and blog.css sizes the modal from them (falling back to dvh without JS).
 *
 * Loaded at the end of <body>, after <pagefind-modal>.
 */

(function () {
  var modal = document.querySelector('pagefind-modal');
  if (!modal || typeof MutationObserver === 'undefined') return;

  var SELECTOR = '.pf-result-excerpt, .pf-heading-excerpt';

  // Leave about a quarter of the line after the match, so it reads in context
  // instead of sitting right against the ellipsis.
  function fits(excerpt, mark) {
    var box = excerpt.getBoundingClientRect();
    return mark.getBoundingClientRect().right <= box.right - box.width / 4;
  }

  function fit(excerpt) {
    var mark = excerpt.querySelector('mark');
    // Zero width means the modal is closed; try again on the next render.
    if (!mark || excerpt.clientWidth === 0 || fits(excerpt, mark)) return;

    // Everything before the first <mark> is plain text.
    excerpt.normalize();
    var lead = excerpt.firstChild;
    if (!lead || lead.nodeType !== Node.TEXT_NODE) return;

    var words = lead.textContent.trim().split(/\s+/);
    while (words.length && !fits(excerpt, mark)) {
      words.shift();
      lead.textContent = '…' + (words.length ? words.join(' ') + ' ' : '');
    }
  }

  var scheduled = false;
  function fitAll() {
    scheduled = false;
    var excerpts = modal.querySelectorAll(SELECTOR);
    for (var i = 0; i < excerpts.length; i++) fit(excerpts[i]);
  }

  // Results render and lazy-load in batches; batch our work per frame.
  // Our own edits only touch text nodes, so they don't retrigger the observer.
  new MutationObserver(function () {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(fitAll);
  }).observe(modal, { childList: true, subtree: true });
})();

(function () {
  var vv = window.visualViewport;
  if (!vv || !document.querySelector('pagefind-modal')) return;

  var style = document.documentElement.style;
  var height, top;

  // The visual viewport also fires during pinch-zoom panning; only touch the
  // style when the numbers actually change.
  function sync() {
    var h = Math.round(vv.height), t = Math.round(vv.offsetTop);
    if (h !== height) style.setProperty('--search-vh', (height = h) + 'px');
    if (t !== top) style.setProperty('--search-top', (top = t) + 'px');
  }

  vv.addEventListener('resize', sync);
  vv.addEventListener('scroll', sync);
  sync();
})();
