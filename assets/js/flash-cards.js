/* ============================================================
   flash-cards.js — the pitch-decks.html equivalent of work.html's
   video-transition cards. There's no video for a PDF deck, so the
   "clip" is a hard-cut flash through a few pages pulled straight
   from the deck: poster -> 3 pages at 250ms each (750ms total) ->
   blurb. Same playing/done state machine as the video cards, driven
   by mouseenter/mouseleave and touch-hold.js's holdstart/holdend.

   Each card carries its frame list as a JSON array in
   data-frames, e.g. data-frames='["a.jpg","b.jpg","c.jpg"]'.

   Load with `defer`:
     <script src="assets/js/flash-cards.js" defer></script>
   ============================================================ */
(function () {
  "use strict";

  var FRAME_MS = 250;   // 3 frames x 250ms = 750ms, matching the video cards' ~1s beat

  document.querySelectorAll('.project-card.has-flash').forEach(function (card) {
    var img = card.querySelector('.poster-flash');
    var frames;
    try { frames = JSON.parse(card.dataset.frames || '[]'); } catch (e) { frames = []; }
    if (!img || !frames.length) return;

    var timers = [];

    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    function start() {
      clearTimers();
      card.classList.remove('done');
      card.classList.add('playing');
      frames.forEach(function (src, i) {
        timers.push(setTimeout(function () { img.src = src; }, i * FRAME_MS));
      });
      timers.push(setTimeout(function () {
        card.classList.remove('playing');
        card.classList.add('done');          // flash finished -> show the blurb
      }, frames.length * FRAME_MS));
    }

    function reset() {                        // hover out, or finger lifted
      clearTimers();
      card.classList.remove('playing', 'done');
    }

    card.addEventListener('mouseenter', start);
    card.addEventListener('mouseleave', reset);
    card.addEventListener('holdstart', start);   // touch: press and hold
    card.addEventListener('holdend', reset);
  });
})();
