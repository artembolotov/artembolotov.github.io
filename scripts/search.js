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
 * iOS fires the resize only after the keyboard animation ends, so the modal
 * would follow the keyboard late. Instead we resize it as soon as the input
 * gains or loses focus, using the keyboard height measured last time; the
 * resize event then corrects it if the keyboard turned out different.
 *
 * 3. Touch scroll containment. WebKit ignores the dialog's
 * overscroll-behavior, and with the keyboard open the visual viewport is
 * smaller than the layout one, so a drag that the results list can't take
 * (an empty modal before the first search, the header, the list's ends)
 * moves the page behind the modal despite the scroll lock in blog.css. We
 * cancel exactly those drags and let the list scroll natively otherwise.
 * The input is left alone so caret dragging keeps working.
 *
 * 4. Lazy loading. The Component UI script (~40 KB) is not on the critical
 * path: we load it once the page is idle after `load`, or right away when
 * the reader reaches for search. Until then the trigger is a static copy of
 * the component's own button (tag-menu.html), and a click on it or Ctrl/Cmd+K
 * opens the modal as soon as the script arrives. Loading it only on demand
 * was rejected: iOS shows the keyboard only for focus inside the tap itself,
 * so a modal opened after a network round trip would come up without it.
 *
 * Loaded with defer, so <pagefind-modal> is already parsed.
 */

(function () {
  var SRC = '/pagefind/pagefind-component-ui.js';
  var TAG = 'pagefind-modal-trigger';
  var trigger = document.querySelector('.tag-menu-search ' + TAG);
  // Pages without the tag menu (privacy, 404) have no way to open search.
  if (!trigger) return;
  var requested = false;
  var pendingOpen = false;

  function load() {
    if (requested) return;
    requested = true;
    var script = document.createElement('script');
    script.type = 'module';
    script.src = SRC;
    document.head.appendChild(script);
  }

  // The component builds its own button on upgrade; clicking it goes through
  // the component's path, which also keeps aria-expanded in sync. The module
  // defines and upgrades every element synchronously, so by the time
  // whenDefined resolves the modal is registered too.
  function openWhenReady() {
    if (pendingOpen || !window.customElements) return;
    pendingOpen = true;
    load();
    customElements.whenDefined(TAG).then(function () {
      pendingOpen = false;
      var button = document.querySelector(TAG + ' .pf-trigger-btn');
      if (button) button.click();
    });
  }

  function upgraded() {
    return !!(window.customElements && customElements.get(TAG));
  }

  trigger.addEventListener('pointerdown', load);
  trigger.addEventListener('focusin', load);
  trigger.addEventListener('click', function () {
    if (!upgraded()) openWhenReady();
  });

  // Same shortcut as the component (mod+k); once it's upgraded it handles it.
  document.addEventListener('keydown', function (event) {
    if (upgraded() || event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
    var el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
    event.preventDefault();
    openWhenReady();
  });

  function idle() {
    if (window.requestIdleCallback) requestIdleCallback(load, { timeout: 3000 });
    else setTimeout(load, 1000);
  }

  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle);
})();

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
  var modal = document.querySelector('pagefind-modal');
  if (!modal) return;

  var lastY = 0;

  modal.addEventListener('touchstart', function (event) {
    if (event.touches.length === 1) lastY = event.touches[0].clientY;
  }, { passive: true });

  modal.addEventListener('touchmove', function (event) {
    // Pinch-zoom and the input's own gestures stay untouched.
    if (event.touches.length !== 1 || event.target.tagName === 'INPUT') return;

    var y = event.touches[0].clientY;
    var dy = y - lastY; // > 0: finger moves down, content would scroll up
    lastY = y;

    var list = event.target.closest && event.target.closest('pagefind-modal-body');
    if (list) {
      var canUp = list.scrollTop > 0;
      var canDown = list.scrollTop + list.clientHeight < list.scrollHeight - 1;
      if ((dy > 0 && canUp) || (dy < 0 && canDown) || dy === 0) return;
    }
    if (event.cancelable) event.preventDefault();
  }, { passive: false });
})();

(function () {
  var vv = window.visualViewport;
  var modal = document.querySelector('pagefind-modal');
  if (!vv || !modal) return;

  var style = document.documentElement.style;
  var height, top;
  // Visible height without the keyboard and the keyboard's own height,
  // remembered from the last resize.
  var full, keyboard;

  // The visual viewport also fires during pinch-zoom panning; only touch the
  // style when the numbers actually change.
  function set(h, t) {
    if (h !== height) style.setProperty('--search-vh', (height = h) + 'px');
    if (t !== top) style.setProperty('--search-top', (top = t) + 'px');
  }

  function typing() {
    var el = document.activeElement;
    return el && el.tagName === 'INPUT' && modal.contains(el);
  }

  function resize() {
    var h = Math.round(vv.height);
    if (typing()) keyboard = full - h; else full = h;
    set(h, Math.round(vv.offsetTop));
  }

  // Scrolling only moves the visible area; it must not undo the early resize
  // below while the keyboard is still sliding.
  function scroll() {
    set(height, Math.round(vv.offsetTop));
  }

  modal.addEventListener('focusin', function (event) {
    if (event.target.tagName === 'INPUT' && keyboard > 0) set(full - keyboard, top);
  });
  modal.addEventListener('focusout', function (event) {
    if (event.target.tagName === 'INPUT' && keyboard > 0) set(full, 0);
  });

  vv.addEventListener('resize', resize);
  vv.addEventListener('scroll', scroll);
  resize();
})();
