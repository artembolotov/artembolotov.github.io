/**
 * Scroll Restoration Owner
 *
 * The gallery uses a nested horizontal scroll container, and Safari's async
 * restoration of nested scrollers is the root cause of horizontal drift after
 * reload. Owning scroll position ourselves removes the fight between the
 * gallery guard and the browser, and eliminates the iOS flicker.
 *
 * That trade-off only makes sense where a gallery actually exists, so this
 * script opts in per page: pages without a gallery keep the browser's native
 * restoration, and pages with one get manual mode plus our own save/restore of
 * the vertical position.
 *
 * Loaded at the end of <body>, so the DOM is parsed when this runs.
 */

(function () {
  if (typeof history === 'undefined' || !('scrollRestoration' in history)) return;
  if (!document.querySelector('.image-gallery')) return;

  try {
    history.scrollRestoration = 'manual';
  } catch (e) {
    return;
  }

  var PREFIX = 'scrollpos:';
  var MAX_ENTRIES = 50;

  // The key is tied to the history entry, not the URL: the same page can sit
  // in several entries with different scroll positions.
  var state = history.state || {};
  if (!state.scrollKey) {
    state.scrollKey = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    try { history.replaceState(state, ''); } catch (e) { return; }
  }
  var storageKey = PREFIX + state.scrollKey;

  function read() {
    try {
      var raw = sessionStorage.getItem(storageKey);
      if (raw === null) return null;
      var y = parseInt(raw, 10);
      return isNaN(y) ? null : y;
    } catch (e) {
      return null;
    }
  }

  // Keep sessionStorage from growing unbounded over a long browsing session.
  function prune() {
    try {
      var keys = [];
      for (var i = 0; i < sessionStorage.length; i++) {
        var k = sessionStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) keys.push(k);
      }
      if (keys.length <= MAX_ENTRIES) return;
      // Keys start with a base36 timestamp, so lexicographic order is age order.
      keys.sort();
      for (var j = 0; j < keys.length - MAX_ENTRIES; j++) {
        sessionStorage.removeItem(keys[j]);
      }
    } catch (e) {}
  }

  function save() {
    try {
      sessionStorage.setItem(storageKey, String(window.scrollY));
      prune();
    } catch (e) {}
  }

  // pagehide covers navigations and bfcache; visibilitychange is the backstop
  // for iOS, where a tab can be discarded without pagehide ever firing.
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') save();
  });

  function restore(event) {
    var target = read();
    if (target === null) return;

    // Coming back from bfcache the layout is already final — one jump is both
    // enough and the least jarring.
    if (event && event.persisted) {
      window.scrollTo(0, target);
      return;
    }

    // On a fresh load the page keeps growing as images decode, so scrollTo can
    // clamp short of the target. Retry until we land or the deadline passes,
    // and bail out the moment the reader takes over.
    var aborted = false;
    var deadline = Date.now() + 3000;

    function stop() { aborted = true; }
    // Deliberately not listening for 'scroll' — our own scrollTo fires it.
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', stop, { passive: true });

    function release() {
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', stop);
    }

    function attempt() {
      if (aborted) { release(); return; }
      window.scrollTo(0, target);
      if (Math.abs(window.scrollY - target) < 2 || Date.now() > deadline) {
        release();
        return;
      }
      requestAnimationFrame(attempt);
    }

    attempt();
  }

  window.addEventListener('pageshow', restore);
})();
