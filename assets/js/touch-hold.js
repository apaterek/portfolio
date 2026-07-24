/* ============================================================
   touch-hold.js — press-and-hold stands in for hover on touch.

   Touch devices have no hover, so the site's hover experiences (the
   work-card clip -> blurb, the writing link fill/invert) would other-
   wise be unreachable. Holding a finger on a card/link engages the
   same state hover does; lifting ends it.

   Tap vs hold:
     - a quick tap still follows the link (normal navigation)
     - a hold shows the experience and does NOT navigate
     - dragging past MOVE_TOL is a scroll, so the hold is cancelled

   For each opted-in element it:
     - toggles the `holding` class (CSS pairs this with :hover)
     - fires `holdstart` / `holdend` events (JS sequences hook in)

   Load with `defer`:
     <script src="assets/js/touch-hold.js" defer></script>
   ============================================================ */
(function () {
  "use strict";

  // Only stand in for hover where the device actually has touch.
  var hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (!hasTouch) return;

  var HOLD_MS = 180;   // longer than a tap, short enough to feel immediate
  var MOVE_TOL = 10;   // finger travel (px) that means "scrolling", not "holding"
  var SELECTOR = '.project-card, .stack';

  document.querySelectorAll(SELECTOR).forEach(function (el) {
    var timer = null, held = false, blockClick = false, x0 = 0, y0 = 0;

    function engage() {
      held = true;
      el.classList.add('holding');
      el.dispatchEvent(new CustomEvent('holdstart'));
    }

    function release() {
      clearTimeout(timer);
      if (!held) return;                 // a plain tap: leave navigation alone
      held = false;
      blockClick = true;                 // a hold is not a tap: don't navigate
      setTimeout(function () { blockClick = false; }, 600);
      el.classList.remove('holding');
      el.dispatchEvent(new CustomEvent('holdend'));
    }

    el.addEventListener('touchstart', function (e) {
      if (e.touches.length > 1) return;
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      clearTimeout(timer);
      timer = setTimeout(engage, HOLD_MS);
    }, { passive: true });

    el.addEventListener('touchmove', function (e) {
      if (!e.touches.length) return;
      if (Math.abs(e.touches[0].clientX - x0) > MOVE_TOL ||
          Math.abs(e.touches[0].clientY - y0) > MOVE_TOL) {
        clearTimeout(timer);             // the finger is scrolling, not holding
        release();
      }
    }, { passive: true });

    el.addEventListener('touchend', release);
    el.addEventListener('touchcancel', release);

    // Swallow the click that follows a hold so it doesn't open the link.
    el.addEventListener('click', function (e) {
      if (blockClick) {
        e.preventDefault();
        e.stopPropagation();
        blockClick = false;
      }
    }, true);

    // Don't let the OS long-press menu hijack the gesture.
    el.addEventListener('contextmenu', function (e) {
      if (held) e.preventDefault();
    });
  });
})();
