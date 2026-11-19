/* ============================================================
   STUDIO DISTRICTS : page-local scroll behaviours.
   Loaded after site.js, on this page only.

   Six additive behaviours. Every one of them is decoration:
   with scripting off, or motion reduced, the page is still a
   complete, readable document in the right order. That is how
   the shared site.js behaves too.

     1. Reading progress along the top edge.
     2. Reveal blocks as they come up.
     3. A quiet marker naming which of the seventeen you are in.
     4. Tap a figure to read it at full size.
     5. Arrive a drawing left to right, once all of it is on screen.
     6. Report each drawing's displayed scale, so its number can be
        set at the size of the labels drawn inside it.
   ============================================================ */
(function () {
  'use strict';

  var reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Tells the head guard the page script is alive, so it leaves the
     reveal animation in place. */
  document.documentElement.classList.add('sd-ready');
  var sections = [].slice.call(document.querySelectorAll('[data-num][data-name]'));

  /* ============================================================
     2. REVEAL
     Deliberately not an IntersectionObserver. A reader who flings
     the page, or lands on a #hash deep inside it, can carry a
     block through the viewport between two observer callbacks,
     and that block then sits at opacity 0 for good: the page
     quietly loses its own copy. Sweeping the remaining list on
     the scroll frame cannot miss one, and the list only shrinks.
     Declared before the scroll frame that calls it.
     ============================================================ */
  var pending = [].slice.call(document.querySelectorAll(
    '.sd-step, .sd-sec__num, .sd-sec__title, .sd-lede, .sd-fig, ' +
    '.sd-quote__inner, .sd-ask__title'
  ));

  function reveal(el) { el.classList.add('is-in'); }

  /* ------------------------------------------------------------
     5. ARRIVE LEFT TO RIGHT
     Global Image Note 3, and section 02's growth chart. Held as a
     shrinking swept list for the same reason the reveal is: a
     reader who flings the page past a figure must not be able to
     leave it masked for good.
     ------------------------------------------------------------ */
  var wipes = [].slice.call(document.querySelectorAll('.sd-fig--wipe'));

  function wipeSweep() {
    if (!wipes.length) return;
    var h = window.innerHeight;
    var rest = [];
    for (var i = 0; i < wipes.length; i++) {
      var el = wipes[i];
      var r  = el.getBoundingClientRect();
      /* Fully on the page is what the note asks for. A drawing
         taller than the viewport can never satisfy that, so it
         settles for lying across the middle of it. */
      var on = (r.height <= h * 0.95)
        ? (r.top >= 0 && r.bottom <= h)
        : (r.top < h * 0.25 && r.bottom > h * 0.6);
      if (on) el.classList.add('is-wiped');
      else rest.push(el);
    }
    wipes = rest;
  }

  /* ------------------------------------------------------------
     6. WHAT SCALE IS THIS DRAWING AT
     The global note asks each figure's number to match the scale of
     the type inside the drawing. The drawings carry 7.5pt labels,
     and the stylesheet multiplies that by what this reports, so a
     figure shown at 58 per cent of drawn size does not carry a
     label twice the size of its own annotations.
     ------------------------------------------------------------ */
  var figs = [].slice.call(document.querySelectorAll('.sd-fig'));

  function measureFigures() {
    for (var i = 0; i < figs.length; i++) {
      var img = figs[i].querySelector('img');
      if (!img || !img.clientWidth) continue;
      var drawn = parseFloat(img.getAttribute('width'));
      if (!drawn) continue;
      figs[i].style.setProperty(
        '--fig-scale', (img.clientWidth / drawn).toFixed(3)
      );
    }
  }

  function sweep() {
    if (!pending.length) return;
    var h = window.innerHeight;
    var rest = [];
    for (var i = 0; i < pending.length; i++) {
      var el = pending[i];
      /* A figure asked to fade on gets a later line. At 0.92 the
         block is still under the fold when the class lands, so the
         fade is finished before the reader can see it happen, which
         is why the page reads as though it had no fade at all. */
      var line = h * (el.classList.contains('sd-fig--fade') ? 0.8 : 0.92);
      if (el.getBoundingClientRect().top < line) reveal(el);
      else rest.push(el);
    }
    pending = rest;
  }

  if (reduced) {
    pending.forEach(reveal);
    pending = [];
    wipes.forEach(function (el) { el.classList.add('is-wiped'); });
    wipes = [];
  }

  /* ============================================================
     1, 2 and 3 share one scroll frame.
     ============================================================ */
  var bar     = document.querySelector('.sd-progress__bar');
  var marker  = document.querySelector('.sd-marker');
  var mkNum   = document.querySelector('.sd-marker__num');
  var mkName  = document.querySelector('.sd-marker__name');
  var hero    = document.querySelector('.sd-hero');
  var heroMed = document.querySelector('.sd-hero__media');
  var plates  = [].slice.call(document.querySelectorAll('[data-par]'));
  var ticking = false;

  function frame() {
    ticking = false;

    var y   = window.pageYOffset || document.documentElement.scrollTop;
    var max = document.documentElement.scrollHeight - window.innerHeight;

    sweep();
    wipeSweep();

    if (bar) bar.style.width = (max > 0 ? Math.min(1, y / max) * 100 : 0) + '%';
    /* Only once it has something to say. Past the last section the
       observer has nothing in its band, and an empty pill is worse
       than no pill. */
    if (marker && hero) {
      marker.classList.toggle(
        'is-on', y > hero.offsetHeight * 0.9 && !!(mkName && mkName.textContent)
      );
    }

    if (reduced) return;

    /* The hero drifts at about a fifth of scroll speed. More than
       that and the title starts to slide off its own building. */
    if (heroMed && y < window.innerHeight * 1.3) {
      heroMed.style.transform = 'translate3d(0,' + (y * 0.22).toFixed(1) + 'px,0)';
    }

    for (var i = 0; i < plates.length; i++) {
      var el = plates[i];
      var r  = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) continue;
      var mid = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      /* The picture drifts inside its frame; the frame itself holds
         still. Moving the frame would slide the whole grid cell and
         open gaps between the plates.

         It also has to be the image for a duller reason: the plates
         are reveal targets, and .is-in carries transform: none with
         an !important that beats an inline style. Written onto the
         figure this parallax computed correctly every frame and was
         thrown away every frame. A custom property sidesteps that,
         and leaves the overscale to the stylesheet. */
      var t = el.querySelector('img') || el;
      t.style.setProperty(
        '--par', (-mid * (parseFloat(el.dataset.par) || 0) * 150).toFixed(1) + 'px'
      );
    }
  }

  /* requestAnimationFrame is the right place to touch the DOM on
     scroll, but it does not run at all while the page is not being
     painted: a background tab, a hidden preview pane, a throttled
     webview, some power-saving modes. Guard the flag with rAF alone
     and it latches on the first starved frame, and the progress bar,
     the reveals and the parallax all stop for good. The timeout is
     the way out. frame() clears the flag itself, so whichever path
     arrives first wins and the other costs one no-op. */
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(frame);
    window.setTimeout(function () { if (ticking) frame(); }, 250);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.addEventListener('load', onScroll);
  document.addEventListener('visibilitychange', onScroll);

  /* An image landing above the fold moves everything under it, so
     re-measure when the figures arrive rather than only on scroll.
     The width and height attributes keep this rare, not pointless. */
  [].forEach.call(document.images, function (img) {
    if (!img.complete) img.addEventListener('load', function () {
      onScroll();
      measureFigures();
    }, { once: true });
  });

  /* The displayed scale changes with the column, so it is measured
     again whenever the column could have changed. */
  window.addEventListener('resize', measureFigures, { passive: true });
  window.addEventListener('load', measureFigures);

  frame();
  measureFigures();

  /* ============================================================
     3. WHICH SECTION
     ============================================================ */
  if ('IntersectionObserver' in window && sections.length && mkNum && mkName) {
    var live = [];
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var i = live.indexOf(e.target);
        if (e.isIntersecting && i === -1) live.push(e.target);
        if (!e.isIntersecting && i !== -1) live.splice(i, 1);
      });
      if (!live.length) return;
      var top = live.reduce(function (a, b) {
        return a.getBoundingClientRect().top <= b.getBoundingClientRect().top ? a : b;
      });
      mkNum.textContent  = top.dataset.num + ' / ' + sections.length;
      mkName.textContent = top.dataset.name;
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    sections.forEach(function (s) { secObs.observe(s); });
  }

  /* ============================================================
     4. FIGURE AT FULL SIZE
     The drawings carry 7 pt labels. At column width some of them
     are below reading size, so every figure can be opened.
     ============================================================ */
  var zoom   = document.querySelector('.sd-zoom');
  var zImg   = document.querySelector('.sd-zoom__img');
  var zClose = document.querySelector('.sd-zoom__close');
  var lastFocus = null;

  function openZoom(img) {
    if (!zoom || !zImg) return;
    lastFocus = document.activeElement;
    zImg.src = img.currentSrc || img.src;
    zImg.alt = img.alt;
    zoom.hidden = false;
    /* Reading a layout property flushes the style change above, so
       the transition still runs from the hidden state. A rAF would
       do the same, but only on a page that is being painted, and an
       overlay that opens at opacity 0 is a trapped reader. */
    void zoom.offsetHeight;
    zoom.classList.add('is-on');
    document.documentElement.style.overflow = 'hidden';
    if (zClose) zClose.focus();
  }

  function closeZoom() {
    if (!zoom || zoom.hidden) return;
    zoom.classList.remove('is-on');
    document.documentElement.style.overflow = '';
    window.setTimeout(function () {
      zoom.hidden = true;
      /* removeAttribute, not src = '': an empty src resolves to the
         page's own URL and the browser goes and fetches it. */
      zImg.removeAttribute('src');
    }, 380);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  [].forEach.call(document.querySelectorAll('.sd-fig[data-zoom]'), function (fig) {
    var media = fig.querySelector('.sd-fig__media');
    var img   = fig.querySelector('img');
    if (!media || !img) return;

    /* The hint is a lie on a screen wide enough to show the whole
       drawing, so it is the measurement that turns it on, not a
       breakpoint guess. */
    function markPannable() {
      media.classList.toggle('is-pannable', media.scrollWidth > media.clientWidth + 2);
    }
    markPannable();
    if (!img.complete) img.addEventListener('load', markPannable, { once: true });
    window.addEventListener('resize', markPannable, { passive: true });

    media.setAttribute('role', 'button');
    media.setAttribute('tabindex', '0');
    media.setAttribute('aria-label', 'Enlarge figure: ' + (img.alt || ''));

    /* Under 820px this same element is a pan region. A drag that
       moved the drawing is not a request to open it. */
    var startX = 0, startLeft = 0;
    media.addEventListener('pointerdown', function (e) {
      startX = e.clientX; startLeft = media.scrollLeft;
    });
    media.addEventListener('click', function (e) {
      if (Math.abs(e.clientX - startX) > 6 ||
          Math.abs(media.scrollLeft - startLeft) > 4) return;
      openZoom(img);
    });
    media.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openZoom(img); }
    });
  });

  if (zClose) zClose.addEventListener('click', closeZoom);
  if (zoom) zoom.addEventListener('click', function (e) {
    if (e.target === zoom || e.target.classList.contains('sd-zoom__stage')) closeZoom();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeZoom();
  });
})();
