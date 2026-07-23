/* ============================================================
   reveal.js — shared behaviour for the click-to-reveal hero
   (index.html + construction.html). Exposes helpers on
   window.KSAReveal; each page keeps its own reveal sequence inline
   since the content differs, but the palette, the colour-cycle rule,
   and the fit-to-frame measurement live here so they never drift.

   Load synchronously (in <head>) so KSAReveal exists before a page's
   inline reveal script runs.
   ============================================================ */
window.KSAReveal = (function () {
  "use strict";

  // Nine poster-derived tones: 6 muted originals + 3 light desaturated
  // highlights (dusty rose, warm greige, lilac), kept close to white and
  // true to the water image.
  var COLORS = [
    '#DCCFD3',   // soft dusty rose
    '#1B4C4B',   // deep teal
    '#9B92A7',   // light lavender
    '#DDD5CB',   // warm greige
    '#4C6C7B',   // steel blue
    '#3B4F43',   // forest green
    '#D2CBDA',   // soft lilac
    '#868097',   // periwinkle
    '#7E7176'    // mauve
  ];

  // Randomised colour picker: never one of the last `exclude` shown
  // (default 3), so repeats stay arrhythmic but never land too close.
  function makeColorCycler(exclude) {
    exclude = exclude || 3;
    var recent = [];
    return function () {
      var avail = COLORS.filter(function (c) { return recent.indexOf(c) === -1; });
      var pick = avail[Math.floor(Math.random() * avail.length)];
      recent.push(pick);
      if (recent.length > exclude) recent.shift();
      return pick;
    };
  }

  // Fit the reveal copy to the frame width using the REAL rendering font
  // (San Francisco via -apple-system is wider than Helvetica). `measureEls`
  // is a list of elements whose widest rendered content must fit; each is
  // cloned off-screen at 100px with all .word shown. Sets --line-fs and
  // re-fits on resize.
  function fitToFrame(stage, measureEls, opts) {
    opts = opts || {};
    var safety = opts.safety || 0.93;   // leave a gap before the frame edge
    var maxPx = opts.maxPx || 54;
    var minPx = opts.minPx || 16;

    function widthAt100(el) {
      var c = el.cloneNode(true);
      c.removeAttribute('id');
      c.querySelectorAll('.word').forEach(function (w) { w.classList.add('show'); });
      c.style.position = 'absolute';
      c.style.left = '-99999px';
      c.style.top = '0';
      c.style.display = 'inline-block';
      c.style.whiteSpace = 'nowrap';
      c.style.fontSize = '100px';
      document.body.appendChild(c);
      var w = c.getBoundingClientRect().width;
      document.body.removeChild(c);
      return w;
    }

    function fit() {
      var widest = 0;
      measureEls.forEach(function (el) { widest = Math.max(widest, widthAt100(el)); });
      if (!widest) return;
      var target = safety * stage.clientWidth / (widest / 100);
      target = Math.max(minPx, Math.min(target, maxPx));
      document.documentElement.style.setProperty('--line-fs', target.toFixed(2) + 'px');
    }

    fit();
    window.addEventListener('resize', fit);
    return fit;
  }

  return { COLORS: COLORS, makeColorCycler: makeColorCycler, fitToFrame: fitToFrame };
})();
