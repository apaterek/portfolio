/* ============================================================
   autoplay.js — make every autoplay video actually autoplay and
   loop, especially on mobile.

   iOS/Safari blocks muted autoplay (and shows a play-button overlay)
   unless the video is muted as a PROPERTY. The HTML `muted` attribute
   alone has a long-standing WebKit bug where the property isn't set,
   so the browser treats the video as having audio and refuses to play.
   Programmatic play() on a genuinely muted video is allowed without a
   gesture, so forcing v.muted = true then play() fixes it.

   Only targets <video autoplay>. The work-card transition clips have no
   autoplay attribute (they're started by hover / press-and-hold), so
   they're untouched.

   Load with `defer`:
     <script src="assets/js/autoplay.js" defer></script>
   (project pages: use ../assets/js/autoplay.js)
   ============================================================ */
(function () {
  "use strict";

  var vids = Array.prototype.slice.call(document.querySelectorAll('video[autoplay]'));
  if (!vids.length) return;

  function play(v) {
    v.muted = true;                       // the property, not just the attribute
    v.setAttribute('muted', '');
    var p = v.play();
    if (p && typeof p.catch === 'function') p.catch(function () {});
  }

  vids.forEach(function (v) {
    play(v);
    if (v.hasAttribute('loop')) {         // belt-and-suspenders for looping
      v.addEventListener('ended', function () { v.currentTime = 0; play(v); });
    }
  });

  // If autoplay was still blocked (e.g. Low Power Mode), start on the very
  // first user interaction anywhere — no dedicated play button needed.
  function onGesture() {
    vids.forEach(function (v) { if (v.paused) play(v); });
    document.removeEventListener('touchstart', onGesture);
    document.removeEventListener('pointerdown', onGesture);
    document.removeEventListener('click', onGesture);
  }
  document.addEventListener('touchstart', onGesture, { once: true, passive: true });
  document.addEventListener('pointerdown', onGesture, { once: true });
  document.addEventListener('click', onGesture, { once: true });

  // Resume after the tab is backgrounded and returns.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) vids.forEach(function (v) { if (v.paused) play(v); });
  });
})();
