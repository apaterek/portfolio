/* ============================================================
   contour-links.js — the shared behaviour for every contour link.

   Two jobs:
   1. Inject the #round goo filter once (so the SVG def lives in
      one place instead of being copy-pasted into every page).
   2. Clone each .stack's crisp text into a silhouette .shape
      layer — idempotently, so re-running never stacks a 3rd copy.

   Load with `defer` so the DOM is ready when this runs:
     <script src="assets/js/contour-links.js" defer></script>
   ============================================================ */
(function () {
  "use strict";

  /* 1 — Inject the shared corner-rounding filter, unless a page
     already carries it. stdDeviation is the radius dial: lower =
     sharper turns, higher = rounder. (writing.html used 3.) */
  if (!document.getElementById("round")) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true");
    svg.style.position = "absolute";
    svg.innerHTML =
      '<defs><filter id="round">' +
      '<feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>' +
      '<feColorMatrix in="blur" mode="matrix" ' +
      'values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"/>' +
      '</filter></defs>';
    document.body.insertBefore(svg, document.body.firstChild);
  }

  /* 2 — Clone each card's text into a silhouette layer. Guarded:
     if a .shape already exists (e.g. this file was saved from a
     browser after the script ran, baking the shape into source),
     skip re-cloning so we don't stack a third layer. */
  document.querySelectorAll(".stack").forEach(function (stack) {
    if (stack.querySelector(".shape")) return;      // already cloned, bail
    var lines = stack.querySelector(".lines");
    if (!lines) return;
    var shape = lines.cloneNode(true);
    shape.classList.add("shape");
    shape.setAttribute("aria-hidden", "true");
    stack.prepend(shape);
  });

  /* 3 — Arrhythmic askew (opt-in). For links inside an `.askew` container
     (e.g. the Writing grid), nudge each one left or right off its column's
     centre on load. Horizontal only; buttons stay level and the puzzle-piece
     internals are untouched. Direction strictly alternates so no two consecutive
     icons shift the same way, and the random magnitude (up to 30px, which stays
     inside the column margin even for the widest icon, so nothing collides) lets
     some land at or near centre. Echoes the arrhythmic colour cycles. */
  var askewSign = Math.random() < 0.5 ? 1 : -1;   // random starting side
  document.querySelectorAll(".askew .stack").forEach(function (stack, i) {
    if (i > 0) askewSign = -askewSign;             // alternate: never two in a row the same way
    var x = askewSign * Math.random() * 30;        // 0..30px left/right; some land near centre
    stack.style.transform = "translateX(" + x.toFixed(1) + "px)";
  });
})();
