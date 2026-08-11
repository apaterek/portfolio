/* ============================================================
   flash-cards.js — the pitch-decks.html equivalent of work.html's
   video-transition cards. There's no video for a PDF deck, so the
   "clip" is a hard-cut flash through a few pages pulled straight
   from the deck: poster -> 3 pages at 250ms each (750ms total) ->
   blurb. Same playing/done state machine as the video cards, driven
   by mouseenter/mouseleave and touch-hold.js's holdstart/holdend.

   Each card carries its frame list as a JSON array in
   data-frames, e.g. data-frames='["a.jpg","b.jpg","c.jpg"]'.

   WHY THE FRAMES ARE WARMED (do not remove the preloader): a frame is
   only on screen for FRAME_MS. Fetched at hover time, it arrives well
   after its own slot has passed (measured ~180ms per frame on a fast
   connection, worse on mobile), so the montage collapses into
   poster -> blurb and the animation is never actually seen. The video
   cards get this for free via <video preload="auto">; images need it
   done by hand. Warming happens after load, on idle, so it costs the
   initial render nothing.

   Load with `defer`:
     <script src="assets/js/flash-cards.js" defer></script>
   ============================================================ */
(function () {
  "use strict";

  var FRAME_MS = 250;   // 3 frames x 250ms = 750ms, matching the video cards' ~1s beat
  var warmed = [];      // holds decoded frames so they can't be garbage-collected

  // Fetch + decode every card's frames once the page itself is done, so the
  // first hover cuts instantly instead of waiting on the network.
  function warmFrames() {
    document.querySelectorAll('.project-card.has-flash').forEach(function (card) {
      var list;
      try { list = JSON.parse(card.dataset.frames || '[]'); } catch (e) { return; }
      list.forEach(function (src) {
        var im = new Image();
        im.src = src;
        warmed.push(im);
      });
    });
  }

  function scheduleWarm() {
    if (window.requestIdleCallback) requestIdleCallback(warmFrames, { timeout: 2000 });
    else setTimeout(warmFrames, 300);
  }
  if (document.readyState === 'complete') scheduleWarm();
  else window.addEventListener('load', scheduleWarm);

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
