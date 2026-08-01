/* ============================================================
   app.js — Budget Actual

   An adjustable budget-vs-actual for film and experiential
   production and post. Everything lives in localStorage; nothing
   leaves the device. No build step, no dependencies.

   The money model, taken from a real commercial actual:

     estimate line   qty x units x rate
     section total   sum(lines) + P&W on the lines flagged for it
     hard cost       sum(sections)
     adjusters       pool / insurance / fees / markup, each a
                     percentage of the hard cost or of the running
                     total, or a flat override
     grand total     hard cost + adjusters

     change order    awarded gross, less the markup the shop retains,
                     equals the spendable working budget
     actual entry    qty x rate, plus employer fringe when the payee
                     is not incorporated, or a manual override
     variance        working budget - actual to date
   ============================================================ */

(function () {
  'use strict';

  /* ---------- small helpers ------------------------------- */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const uid = () => Math.random().toString(36).slice(2, 10);
  const blank = (v) => v === '' || v === null || v === undefined;
  const num = (v) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
  const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function money(v, cents) {
    const n = num(v);
    const opts = cents
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { minimumFractionDigits: 0, maximumFractionDigits: 0 };
    return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', opts);
  }

  /* Compact form for the header pill: $44.3k */
  function moneyShort(v) {
    const n = Math.abs(num(v));
    const sign = num(v) < 0 ? '-' : '';
    if (n >= 1000000) return sign + '$' + (n / 1000000).toFixed(n >= 10000000 ? 0 : 1) + 'm';
    if (n >= 10000) return sign + '$' + (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'k';
    return money(v);
  }

  const pct = (v) => String(round2(num(v) * 100)) + '%';

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ---------- persistence --------------------------------- */

  const KEY = 'budgetActual.v1';
  let DB = { projects: [], activeId: null, tab: 'summary' };
  let saveTimer = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) DB = JSON.parse(raw);
    } catch (e) {
      console.warn('Could not read saved projects', e);
    }
    if (!DB || !Array.isArray(DB.projects)) DB = { projects: [], activeId: null, tab: 'summary' };
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      const p = active();
      if (p) p.updatedAt = Date.now();
      try {
        localStorage.setItem(KEY, JSON.stringify(DB));
      } catch (e) {
        toast('Could not save. Storage may be full.');
      }
    }, 120);
  }

  const active = () => DB.projects.find((p) => p.id === DB.activeId) || null;

  /* ---------- project construction ------------------------ */

  function newProject(templateKey, name) {
    const t = TEMPLATES[templateKey] || TEMPLATES.blank;
    return {
      id: uid(),
      name: name || 'Untitled job',
      template: templateKey,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      info: {
        productionCompany: '', address: '', city: '', phone: '',
        client: '', agency: '', contact: '', email: '',
        jobNumber: '', product: '', title: '', bidVersion: '001',
        date: today(), startDate: '', deliveryDate: '',
        deliverables: '', versions: '', aspect: '', frameRate: '',
        format: '', schedule: '', notes: ''
      },
      settings: { currency: 'USD', pwRate: t.pwRate, pwLabel: 'P&W' },
      sections: t.sections.map(function (s) {
        return {
          id: uid(),
          code: s.code,
          name: s.name,
          pw: !!s.pw,
          open: false,
          lines: s.lines.map(function (l) {
            return { id: uid(), code: l[0], desc: l[1], qty: '', units: '', unit: l[2], rate: '', pw: !!l[3] };
          })
        };
      }),
      adjusters: t.adjusters.map(function (a) {
        return { id: uid(), label: a.label, mode: a.mode, rate: a.rate, amount: a.amount || 0, base: a.base };
      }),
      changeOrders: [],
      actuals: [],
      bidSnapshot: null
    };
  }

  function buildSample() {
    const p = newProject('film', SAMPLE.name);
    p.info = Object.assign(p.info, SAMPLE.info);
    p.settings = Object.assign(p.settings, SAMPLE.settings);

    p.adjusters = SAMPLE.adjusters.map(function (a) {
      return { id: uid(), label: a.label, mode: a.mode, rate: a.rate || 0, amount: a.amount || 0, base: a.base };
    });
    p.changeOrders = SAMPLE.changeOrders.map(function (c) {
      return { id: uid(), label: c.label, gross: c.gross, retain: c.retain, spendable: c.spendable };
    });

    /* price the lines the bid actually carried */
    Object.keys(SAMPLE.priced).forEach(function (code) {
      const sec = p.sections.find(function (s) { return s.code === code; });
      if (!sec) return;
      SAMPLE.priced[code].forEach(function (v) {
        const line = sec.lines.find(function (l) { return l.code === v.code; });
        if (!line) return;
        line.qty = v.qty; line.units = v.units; line.rate = v.rate;
      });
    });

    p.actuals = SAMPLE.actuals.map(function (a) {
      const sec = p.sections.find(function (s) { return s.code === a.section; });
      return {
        id: uid(),
        sectionId: sec ? sec.id : p.sections[0].id,
        code: a.code || '',
        date: a.date || '',
        vendor: a.vendor || '',
        desc: a.desc || '',
        qty: a.qty, unit: a.unit || 'days', rate: a.rate,
        invoice: a.invoice || '',
        inc: !!a.inc,
        fringe: a.fringe,
        override: a.override,
        status: a.status || 'pending',
        include: a.include !== false,
        note: a.note || ''
      };
    });

    p.sections.forEach(function (s) { s.open = ['A', 'B', 'D', 'E'].indexOf(s.code) > -1; });
    p.bidSnapshot = snapshot(p);
    return p;
  }

  /* ---------- the calculation engine ---------------------- */

  function lineTotal(l) {
    const q = blank(l.qty) ? 1 : num(l.qty);
    const u = blank(l.units) ? 1 : num(l.units);
    return round2(q * u * num(l.rate));
  }

  function sectionEstimate(sec, p) {
    let base = 0, pwBase = 0;
    sec.lines.forEach(function (l) {
      const t = lineTotal(l);
      base += t;
      if (l.pw) pwBase += t;
    });
    /* The fringe line rounds to the dollar, the way the paper form does:
       the sample bid carries P&W as 783 and 559, not 782.53 and 558.95,
       and its section subtotals are whole dollars because of it. Actuals
       keep their cents; only this estimate line rounds. */
    const pw = sec.pw ? Math.round(pwBase * num(p.settings.pwRate)) : 0;
    return { base: round2(base), pw: pw, total: round2(base + pw) };
  }

  function actualTotal(a, p) {
    if (!blank(a.override)) return round2(num(a.override));
    const base = num(a.qty) * num(a.rate);
    const fringe = a.inc ? 0 : base * (blank(a.fringe) ? num(p.settings.pwRate) : num(a.fringe));
    return round2(base + fringe);
  }

  /* Run the adjuster stack over any hard-cost figure. Used twice: once
     on the estimate to get the grand total, once on the actual to get
     what the job bills at if it closes where it stands. */
  function runAdjusters(p, hard) {
    let running = round2(hard);
    const rows = p.adjusters.map(function (a) {
      const base = a.base === 'hard' ? hard : running;
      /* Percentages round to the dollar, like the P&W line and like the
         summary page of the paper form, which carries whole dollars
         throughout. A flat amount is taken exactly as typed. */
      const amount = a.mode === 'flat' ? round2(num(a.amount)) : Math.round(base * num(a.rate));
      running = round2(running + amount);
      return { id: a.id, label: a.label, mode: a.mode, rate: a.rate, base: a.base, amount: amount, on: round2(base) };
    });
    return { rows: rows, grand: running, adjustersTotal: round2(running - hard) };
  }

  function coSpendable(c) {
    if (!blank(c.spendable)) return round2(num(c.spendable));
    return round2(num(c.gross) * (1 - num(c.retain)));
  }

  function calc(p) {
    const sections = p.sections.map(function (s) {
      const est = sectionEstimate(s, p);
      let actual = 0, held = 0, count = 0;
      p.actuals.forEach(function (a) {
        if (a.sectionId !== s.id) return;
        const t = actualTotal(a, p);
        if (a.include === false) { held += t; return; }
        actual += t; count++;
      });
      actual = round2(actual);
      return {
        section: s,
        estimate: est.total,
        estimateBase: est.base,
        pw: est.pw,
        actual: actual,
        held: round2(held),
        count: count,
        variance: round2(est.total - actual)
      };
    });

    const hard = round2(sections.reduce(function (t, s) { return t + s.estimate; }, 0));
    const actual = round2(sections.reduce(function (t, s) { return t + s.actual; }, 0));
    const held = round2(sections.reduce(function (t, s) { return t + s.held; }, 0));

    const est = runAdjusters(p, hard);
    const atActual = runAdjusters(p, actual);

    const cos = p.changeOrders.map(function (c) {
      return { co: c, spendable: coSpendable(c) };
    });
    const awarded = round2(cos.reduce(function (t, c) { return t + num(c.co.gross); }, 0));
    const spendable = round2(cos.reduce(function (t, c) { return t + c.spendable; }, 0));

    /* No change orders yet? Then the estimate is the working budget. */
    const usingCOs = cos.length > 0;
    const working = usingCOs ? spendable : hard;

    return {
      sections: sections,
      hard: hard,
      actual: actual,
      held: held,
      pwTotal: round2(sections.reduce(function (t, s) { return t + s.pw; }, 0)),
      adjusters: est.rows,
      adjustersTotal: est.adjustersTotal,
      grand: est.grand,
      grandAtActual: atActual.grand,
      changeOrders: cos,
      awarded: awarded,
      spendable: spendable,
      usingCOs: usingCOs,
      working: working,
      variance: round2(working - actual),
      burn: working > 0 ? clamp(actual / working, 0, 2) : 0
    };
  }

  function snapshot(p) {
    const c = calc(p);
    const bySection = {};
    c.sections.forEach(function (s) { bySection[s.section.id] = s.estimate; });
    return { at: Date.now(), hard: c.hard, grand: c.grand, sections: bySection };
  }

  /* ---------- chrome -------------------------------------- */

  function toast(msg) {
    let el = $('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('on'); }, 2200);
  }

  function renderTop() {
    const p = active();
    const bar = $('#topbar');
    if (!p) { bar.innerHTML = ''; return; }
    const c = calc(p);
    const over = c.variance < 0;
    bar.innerHTML =
      '<button class="jobswitch" id="switchProject">' +
        '<span class="jobname">' + esc(p.name) + '</span>' +
        '<span class="jobmeta">' + esc(p.info.jobNumber || p.info.client || TEMPLATES[p.template].label) + ' <i>▾</i></span>' +
      '</button>' +
      '<div class="pill ' + (over ? 'bad' : 'good') + '">' +
        '<span class="pill-k">' + (over ? 'OVER' : 'LEFT') + '</span>' +
        '<span class="pill-v">' + moneyShort(Math.abs(c.variance)) + '</span>' +
      '</div>';
    $('#switchProject').addEventListener('click', projectSheet);
  }

  function setTab(tab) {
    DB.tab = tab;
    save();
    render();
  }

  function syncFab() {
    const fab = $('#fab');
    if (fab) fab.hidden = DB.tab !== 'actuals' || !active();
  }

  function render() {
    const p = active();
    renderTop();
    $$('#tabs button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.tab === DB.tab);
      b.setAttribute('aria-current', b.dataset.tab === DB.tab ? 'page' : 'false');
    });
    const view = $('#view');
    window.scrollTo(0, 0);
    if (!p) { renderWelcome(view); syncFab(); return; }
    if (DB.tab === 'budget') renderBudget(view, p);
    else if (DB.tab === 'actuals') renderActuals(view, p);
    else if (DB.tab === 'job') renderJob(view, p);
    else renderSummary(view, p);
    syncFab();
  }

  /* ---------- welcome ------------------------------------- */

  function renderWelcome(view) {
    view.innerHTML =
      '<div class="welcome">' +
        '<h1>Budget<br>Actual</h1>' +
        '<p>An adjustable budget versus actual for film and experiential production and post. ' +
        'Build the estimate, log costs as they land, watch the variance move.</p>' +
        '<div class="wbtns">' +
          '<button class="btn primary" data-new="film">New film / commercial job</button>' +
          '<button class="btn" data-new="experiential">New experiential job</button>' +
          '<button class="btn" data-new="blank">Start blank</button>' +
          '<button class="btn ghost" id="loadSample">Open the sample actual</button>' +
        '</div>' +
        '<p class="fine">Everything is stored on this device only. Export JSON from the JOB tab to move a project or back it up.</p>' +
      '</div>';
    $$('[data-new]', view).forEach(function (b) {
      b.addEventListener('click', function () { createProject(b.dataset.new); });
    });
    $('#loadSample').addEventListener('click', function () {
      const p = buildSample();
      DB.projects.push(p);
      DB.activeId = p.id;
      save();
      setTab('summary');
      toast('Sample loaded');
    });
  }

  function createProject(templateKey) {
    const p = newProject(templateKey, TEMPLATES[templateKey].label + ' job');
    DB.projects.push(p);
    DB.activeId = p.id;
    save();
    setTab('job');
    toast('Name the job in JOB DETAILS');
  }

  /* ---------- summary ------------------------------------- */

  function renderSummary(view, p) {
    const c = calc(p);
    const over = c.variance < 0;
    const burnPct = Math.round(c.burn * 100);

    let h = '';

    /* hero */
    h += '<section class="hero ' + (over ? 'bad' : 'good') + '" id="hero">' +
      '<div class="hero-row"><span id="heroLabel">' + (c.usingCOs ? 'Working budget' : 'Hard cost estimate') + '</span><b id="heroWorking">' + money(c.working) + '</b></div>' +
      '<div class="hero-row"><span>Actual to date</span><b id="heroActual">' + money(c.actual) + '</b></div>' +
      '<div class="hero-var"><span id="heroVarLabel">' + (over ? 'Over by' : 'Remaining') + '</span><b id="heroVar">' + money(Math.abs(c.variance)) + '</b></div>' +
      '<div class="bar"><i id="heroBar" style="width:' + Math.min(100, burnPct) + '%"></i></div>' +
      '<div class="bar-label" id="heroBurn">' + burnPct + '% committed' +
      (c.held > 0 ? ' &middot; ' + money(c.held) + ' held' : '') + '</div>' +
      '</section>';

    /* section rollup */
    h += '<section class="card"><h2>Sections</h2>' +
      '<div class="roll head"><span>Account</span><span>Est</span><span>Act</span><span>Var</span></div>';
    c.sections.forEach(function (s) {
      const v = s.variance;
      const p2 = s.estimate > 0 ? clamp(s.actual / s.estimate, 0, 1.6) : (s.actual > 0 ? 1.6 : 0);
      h += '<button class="roll" data-jump="' + s.section.id + '">' +
        '<span class="roll-name"><b>' + esc(s.section.code) + '</b> ' + esc(s.section.name) + '</span>' +
        '<span>' + money(s.estimate) + '</span>' +
        '<span>' + money(s.actual) + '</span>' +
        '<span class="' + (v < 0 ? 'neg' : v > 0 ? 'pos' : 'zero') + '">' + money(v) + '</span>' +
        '<span class="roll-bar"><i class="' + (v < 0 ? 'neg' : '') + '" style="width:' +
          Math.min(100, Math.round(p2 / 1.6 * 100)) + '%"></i></span>' +
        '</button>';
    });
    h += '<div class="roll total"><span>HARD COST</span><span>' + money(c.hard) + '</span>' +
      '<span>' + money(c.actual) + '</span>' +
      '<span class="' + (c.hard - c.actual < 0 ? 'neg' : 'pos') + '">' + money(round2(c.hard - c.actual)) + '</span></div>';
    h += '</section>';

    /* adjusters */
    h += '<section class="card"><h2>Markup <button class="mini" id="addAdj">+ Row</button></h2>' +
      '<p class="hint">Each row takes a percentage of the hard cost or of the running total, or a flat amount. Tap a value to change it.</p>' +
      '<div class="adjrows">';
    h += '<div class="adjrow static"><span class="adj-label">HARD COST</span><span class="adj-amt">' + money(c.hard) + '</span></div>';
    c.adjusters.forEach(function (a) {
      h += '<div class="adjrow" data-adj="' + a.id + '">' +
        '<input class="adj-label" value="' + esc(a.label) + '" data-f="label" aria-label="Markup row name">' +
        '<span class="adj-ctl">' +
          '<select data-f="mode" aria-label="Mode">' +
            '<option value="percent"' + (a.mode === 'percent' ? ' selected' : '') + '>%</option>' +
            '<option value="flat"' + (a.mode === 'flat' ? ' selected' : '') + '>flat</option>' +
          '</select>' +
          (a.mode === 'percent'
            ? '<input class="num" inputmode="decimal" data-f="rate" value="' + (num(a.rate) * 100) + '" aria-label="Percent">' +
              '<select data-f="base" aria-label="Base">' +
                '<option value="hard"' + (a.base === 'hard' ? ' selected' : '') + '>of hard</option>' +
                '<option value="running"' + (a.base === 'running' ? ' selected' : '') + '>of running</option>' +
              '</select>'
            : '<input class="num wide" inputmode="decimal" data-f="amount" value="' + num(a.amount) + '" aria-label="Amount">') +
        '</span>' +
        '<span class="adj-amt">' + money(a.amount) + '</span>' +
        '<button class="del" data-deladj="' + a.id + '" aria-label="Delete row">&times;</button>' +
        '</div>';
    });
    h += '</div>' +
      '<div class="grandrow big"><span>GRAND TOTAL (estimate)</span><b id="sGrand">' + money(c.grand) + '</b></div>' +
      '<div class="grandrow sub"><span>Same markup at today\'s actual</span><b id="sGrandAct">' + money(c.grandAtActual) + '</b></div>' +
      '</section>';

    /* change orders / working budget */
    h += '<section class="card"><h2>Working budget <button class="mini" id="addCO">+ Award</button></h2>' +
      '<p class="hint">What the client awarded, less the markup the shop keeps. What is left is what you can actually spend.</p>';
    if (!c.changeOrders.length) {
      h += '<p class="empty">No awards logged. The hard cost estimate is standing in as the working budget.</p>';
    } else {
      h += '<div class="corows">';
      c.changeOrders.forEach(function (x) {
        h += '<div class="corow" data-co="' + x.co.id + '">' +
          '<input class="co-label" value="' + esc(x.co.label) + '" data-f="label" aria-label="Award name">' +
          '<span class="co-nums">' +
            '<label>Gross<input class="num" inputmode="decimal" data-f="gross" value="' + num(x.co.gross) + '"></label>' +
            '<label>Retain %<input class="num" inputmode="decimal" data-f="retain" value="' + round2(num(x.co.retain) * 100) + '"></label>' +
            '<label>Spendable<input class="num" inputmode="decimal" data-f="spendable" placeholder="' + round2(num(x.co.gross) * (1 - num(x.co.retain))) + '" value="' + (blank(x.co.spendable) ? '' : num(x.co.spendable)) + '"></label>' +
          '</span>' +
          '<span class="co-amt">' + money(x.spendable) + '</span>' +
          '<button class="del" data-delco="' + x.co.id + '" aria-label="Delete award">&times;</button>' +
          '</div>';
      });
      h += '</div>' +
        '<div class="grandrow sub"><span>Awarded gross</span><b id="sAwarded">' + money(c.awarded) + '</b></div>' +
        '<div class="grandrow big"><span>SPENDABLE WORKING</span><b id="sSpendable">' + money(c.spendable) + '</b></div>';
    }
    h += '</section>';

    /* bid snapshot drift */
    h += '<section class="card"><h2>Bid drift</h2>';
    if (p.bidSnapshot) {
      const d = round2(c.hard - p.bidSnapshot.hard);
      h += '<div class="grandrow"><span>Bid locked ' + new Date(p.bidSnapshot.at).toLocaleDateString() + '</span><b>' + money(p.bidSnapshot.hard) + '</b></div>' +
        '<div class="grandrow"><span>Hard cost now</span><b>' + money(c.hard) + '</b></div>' +
        '<div class="grandrow"><span>Moved</span><b class="' + (d > 0 ? 'neg' : d < 0 ? 'pos' : 'zero') + '">' + (d > 0 ? '+' : '') + money(d) + '</b></div>' +
        '<button class="btn small" id="relock">Re-lock to today</button>';
    } else {
      h += '<p class="empty">Lock the bid to keep a baseline, then watch how far the adjusted budget travels from it.</p>' +
        '<button class="btn small" id="relock">Lock the bid</button>';
    }
    h += '</section>';

    view.innerHTML = h;

    /* wiring */
    $$('[data-jump]', view).forEach(function (b) {
      b.addEventListener('click', function () {
        const sec = p.sections.find(function (s) { return s.id === b.dataset.jump; });
        if (sec) sec.open = true;
        save();
        setTab('budget');
        setTimeout(function () {
          const el = $('[data-section="' + b.dataset.jump + '"]');
          if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }, 40);
      });
    });

    $$('[data-adj]', view).forEach(function (row) {
      const a = p.adjusters.find(function (x) { return x.id === row.dataset.adj; });
      $$('[data-f]', row).forEach(function (input) {
        const write = function () {
          const f = input.dataset.f;
          if (f === 'rate') a.rate = num(input.value) / 100;
          else if (f === 'amount') a.amount = num(input.value);
          else a[f] = input.value;
          save();
        };
        /* mode and base swap which controls are on screen, so those rebuild
           the card. Free text and numbers only refresh the totals, or the
           field being typed into would lose focus. */
        if (input.tagName === 'SELECT') {
          input.addEventListener('change', function () { write(); renderSummary(view, p); });
        } else {
          input.addEventListener('input', function () { write(); refreshAdjNumbers(view, p); });
        }
      });
    });

    $$('[data-deladj]', view).forEach(function (b) {
      b.addEventListener('click', function () {
        p.adjusters = p.adjusters.filter(function (x) { return x.id !== b.dataset.deladj; });
        save(); renderSummary(view, p); renderTop();
      });
    });

    $('#addAdj').addEventListener('click', function () {
      p.adjusters.push({ id: uid(), label: 'NEW ROW', mode: 'percent', rate: 0.1, amount: 0, base: 'hard' });
      save(); renderSummary(view, p); renderTop();
    });

    $$('[data-co]', view).forEach(function (row) {
      const co = p.changeOrders.find(function (x) { return x.id === row.dataset.co; });
      $$('[data-f]', row).forEach(function (input) {
        input.addEventListener('input', function () {
          const f = input.dataset.f;
          if (f === 'retain') co.retain = num(input.value) / 100;
          else if (f === 'gross') co.gross = num(input.value);
          else if (f === 'spendable') co.spendable = blank(input.value.trim()) ? null : num(input.value);
          else co[f] = input.value;
          save();
          refreshCONumbers(view, p);
        });
      });
    });

    $$('[data-delco]', view).forEach(function (b) {
      b.addEventListener('click', function () {
        p.changeOrders = p.changeOrders.filter(function (x) { return x.id !== b.dataset.delco; });
        save(); renderSummary(view, p); renderTop();
      });
    });

    const addCO = $('#addCO');
    if (addCO) addCO.addEventListener('click', function () {
      const c2 = calc(p);
      p.changeOrders.push({ id: uid(), label: 'Award ' + (p.changeOrders.length + 1), gross: c2.grand, retain: 0.2, spendable: null });
      save(); renderSummary(view, p); renderTop();
    });

    const relock = $('#relock');
    if (relock) relock.addEventListener('click', function () {
      p.bidSnapshot = snapshot(p);
      save(); renderSummary(view, p);
      toast('Bid locked');
    });
  }

  /* Update only the numbers, so a field being typed into keeps focus. */
  function refreshHero(view, c) {
    const set = function (id, text) { const el = $('#' + id, view); if (el) el.textContent = text; };
    const over = c.variance < 0;
    const burnPct = Math.round(c.burn * 100);
    const hero = $('#hero', view);
    if (hero) { hero.classList.toggle('bad', over); hero.classList.toggle('good', !over); }
    set('heroLabel', c.usingCOs ? 'Working budget' : 'Hard cost estimate');
    set('heroWorking', money(c.working));
    set('heroActual', money(c.actual));
    set('heroVarLabel', over ? 'Over by' : 'Remaining');
    set('heroVar', money(Math.abs(c.variance)));
    set('heroBurn', burnPct + '% committed' + (c.held > 0 ? ' · ' + money(c.held) + ' held' : ''));
    const bar = $('#heroBar', view);
    if (bar) bar.style.width = Math.min(100, burnPct) + '%';
    renderTop();
  }

  function refreshAdjNumbers(view, p) {
    const c = calc(p);
    c.adjusters.forEach(function (a) {
      const row = $('[data-adj="' + a.id + '"]', view);
      if (row) $('.adj-amt', row).textContent = money(a.amount);
    });
    const g1 = $('#sGrand', view); if (g1) g1.textContent = money(c.grand);
    const g2 = $('#sGrandAct', view); if (g2) g2.textContent = money(c.grandAtActual);
    refreshHero(view, c);
  }

  function refreshCONumbers(view, p) {
    const c = calc(p);
    c.changeOrders.forEach(function (x) {
      const row = $('[data-co="' + x.co.id + '"]', view);
      if (!row) return;
      $('.co-amt', row).textContent = money(x.spendable);
      const sp = $('[data-f="spendable"]', row);
      if (sp) sp.placeholder = round2(num(x.co.gross) * (1 - num(x.co.retain)));
    });
    const a1 = $('#sAwarded', view); if (a1) a1.textContent = money(c.awarded);
    const a2 = $('#sSpendable', view); if (a2) a2.textContent = money(c.spendable);
    refreshHero(view, c);
  }

  /* ---------- budget -------------------------------------- */

  function renderBudget(view, p) {
    const c = calc(p);
    let h = '<div class="viewhead"><h1>Budget</h1>' +
      '<span class="viewtot">' + money(c.hard) + ' hard &middot; ' + money(c.grand) + ' gross</span></div>';

    h += '<div class="pwbar">' +
      '<label>' + esc(p.settings.pwLabel) + ' rate' +
      '<input class="num" inputmode="decimal" id="pwRate" value="' + round2(num(p.settings.pwRate) * 100) + '">%</label>' +
      '<span class="hint">On flagged lines, in sections where it is switched on. Total ' + money(c.pwTotal) + '</span>' +
      '<label class="chk"><input type="checkbox" id="hideEmpty"' + (DB.hideEmpty ? ' checked' : '') + '> Priced lines only</label>' +
      '</div>';

    c.sections.forEach(function (s) {
      const sec = s.section;
      h += '<section class="sec' + (sec.open ? ' open' : '') + '" data-section="' + sec.id + '">' +
        '<button class="sechead" data-toggle="' + sec.id + '">' +
          '<span class="seccode">' + esc(sec.code) + '</span>' +
          '<span class="secname">' + esc(sec.name) + '</span>' +
          '<span class="secnums"><b>' + money(s.estimate) + '</b>' +
            '<i class="' + (s.variance < 0 ? 'neg' : 'pos') + '">' + money(s.actual) + ' act</i></span>' +
          '<span class="chev">' + (sec.open ? '&minus;' : '+') + '</span>' +
        '</button>';

      if (sec.open) {
        h += '<div class="secbody">';
        h += '<div class="secopts">' +
          '<label class="chk"><input type="checkbox" data-secpw="' + sec.id + '"' + (sec.pw ? ' checked' : '') + '> ' + esc(p.settings.pwLabel) + ' on this section</label>' +
          '<button class="mini" data-rename="' + sec.id + '">Rename</button>' +
          '<button class="mini" data-delsec="' + sec.id + '">Delete</button>' +
          '</div>';

        h += '<div class="linehead"><span>Code / description</span><span>Qty</span><span>Units</span><span>Rate</span><span>Total</span></div>';

        /* A full chart of accounts is mostly empty on any one job, so the
           unpriced rows can be folded away without deleting them. */
        const visible = DB.hideEmpty ? sec.lines.filter(function (l) { return lineTotal(l) !== 0; }) : sec.lines;
        const hidden = sec.lines.length - visible.length;
        if (DB.hideEmpty && !visible.length) {
          h += '<p class="empty">Nothing priced in this section yet.</p>';
        }

        visible.forEach(function (l) {
          const t = lineTotal(l);
          h += '<div class="line' + (t === 0 ? ' zero' : '') + '" data-line="' + l.id + '">' +
            '<div class="line-a">' +
              '<input class="l-code" value="' + esc(l.code) + '" data-f="code" aria-label="Account code">' +
              '<input class="l-desc" value="' + esc(l.desc) + '" data-f="desc" placeholder="Description" aria-label="Description">' +
              '<b class="l-total" data-total="' + l.id + '">' + money(t) + '</b>' +
              '<button class="del" data-delline="' + l.id + '" aria-label="Delete line">&times;</button>' +
            '</div>' +
            '<div class="line-b">' +
              '<input class="num" inputmode="decimal" data-f="qty" value="' + (blank(l.qty) ? '' : l.qty) + '" placeholder="1" aria-label="Quantity">' +
              '<span class="x">&times;</span>' +
              '<input class="num" inputmode="decimal" data-f="units" value="' + (blank(l.units) ? '' : l.units) + '" placeholder="1" aria-label="Units">' +
              '<select data-f="unit" aria-label="Unit type">' + unitOptions(l.unit) + '</select>' +
              '<span class="at">@</span>' +
              '<input class="num" inputmode="decimal" data-f="rate" value="' + (blank(l.rate) ? '' : l.rate) + '" placeholder="0" aria-label="Rate">' +
              '<label class="pwchk" title="Carries ' + esc(p.settings.pwLabel) + '"><input type="checkbox" data-f="pw"' + (l.pw ? ' checked' : '') + '><span>' + esc(p.settings.pwLabel) + '</span></label>' +
            '</div>' +
            '</div>';
        });

        h += '<div class="secfoot">' +
          '<button class="mini" data-addline="' + sec.id + '">+ Line</button>' +
          (hidden ? '<span class="hidcount">' + hidden + ' unpriced hidden</span>' : '') +
          '<span class="secsub">Lines ' + money(s.estimateBase) +
            (s.pw > 0 ? ' &middot; ' + esc(p.settings.pwLabel) + ' ' + money(s.pw) : '') +
            ' &middot; <b>' + money(s.estimate) + '</b></span>' +
          '</div>';
        h += '</div>';
      }
      h += '</section>';
    });

    h += '<div class="secadd"><button class="btn small" id="addSection">+ Section</button></div>';

    h += '<section class="card totals">' +
      '<div class="grandrow"><span>HARD COST</span><b id="tHard">' + money(c.hard) + '</b></div>' +
      c.adjusters.map(function (a) {
        return '<div class="grandrow sub"><span>' + esc(a.label) +
          (a.mode === 'percent' ? ' (' + pct(a.rate) + ' of ' + (a.base === 'hard' ? 'hard' : 'running') + ')' : '') +
          '</span><b>' + money(a.amount) + '</b></div>';
      }).join('') +
      '<div class="grandrow big"><span>GRAND TOTAL</span><b id="tGrand">' + money(c.grand) + '</b></div>' +
      '</section>';

    view.innerHTML = h;
    wireBudget(view, p);
  }

  function unitOptions(sel) {
    return UNIT_TYPES.map(function (u) {
      return '<option value="' + u + '"' + (u === sel ? ' selected' : '') + '>' + u + '</option>';
    }).join('');
  }

  function wireBudget(view, p) {
    $('#pwRate').addEventListener('input', function () {
      p.settings.pwRate = num(this.value) / 100;
      save(); refreshBudgetNumbers(view, p);
    });

    $('#hideEmpty').addEventListener('change', function () {
      DB.hideEmpty = this.checked;
      save(); renderBudget(view, p);
    });

    $$('[data-toggle]', view).forEach(function (b) {
      b.addEventListener('click', function () {
        const sec = p.sections.find(function (s) { return s.id === b.dataset.toggle; });
        sec.open = !sec.open;
        save(); renderBudget(view, p);
      });
    });

    $$('[data-secpw]', view).forEach(function (cb) {
      cb.addEventListener('change', function () {
        const sec = p.sections.find(function (s) { return s.id === cb.dataset.secpw; });
        sec.pw = cb.checked;
        save(); refreshBudgetNumbers(view, p);
      });
    });

    $$('[data-line]', view).forEach(function (row) {
      const line = findLine(p, row.dataset.line);
      $$('[data-f]', row).forEach(function (input) {
        const evt = input.tagName === 'SELECT' || input.type === 'checkbox' ? 'change' : 'input';
        input.addEventListener(evt, function () {
          const f = input.dataset.f;
          if (f === 'pw') line.pw = input.checked;
          else if (f === 'qty' || f === 'units' || f === 'rate') line[f] = input.value.trim() === '' ? '' : num(input.value);
          else line[f] = input.value;
          save();
          refreshBudgetNumbers(view, p);
        });
      });
    });

    $$('[data-delline]', view).forEach(function (b) {
      b.addEventListener('click', function () {
        const id = b.dataset.delline;
        p.sections.forEach(function (s) {
          s.lines = s.lines.filter(function (l) { return l.id !== id; });
        });
        save(); renderBudget(view, p);
      });
    });

    $$('[data-addline]', view).forEach(function (b) {
      b.addEventListener('click', function () {
        const sec = p.sections.find(function (s) { return s.id === b.dataset.addline; });
        const last = sec.lines[sec.lines.length - 1];
        const nextCode = last && /^\d+$/.test(last.code) ? String(num(last.code) + 1) : '';
        sec.lines.push({ id: uid(), code: nextCode, desc: '', qty: '', units: '', unit: 'days', rate: '', pw: sec.pw });
        /* a brand new line prices at zero, so it would hide the moment it appeared */
        DB.hideEmpty = false;
        save(); renderBudget(view, p);
        const rows = $$('[data-line]', view);
        const el = rows[rows.length - 1];
        if (el) { el.scrollIntoView({ block: 'center' }); $('.l-desc', el).focus(); }
      });
    });

    $$('[data-rename]', view).forEach(function (b) {
      b.addEventListener('click', function () {
        const sec = p.sections.find(function (s) { return s.id === b.dataset.rename; });
        sheet('Rename section',
          field('Code', 'code', sec.code) + field('Name', 'name', sec.name),
          function (vals) {
            sec.code = vals.code || sec.code;
            sec.name = vals.name || sec.name;
            save(); renderBudget(view, p); renderTop();
          });
      });
    });

    $$('[data-delsec]', view).forEach(function (b) {
      b.addEventListener('click', function () {
        const id = b.dataset.delsec;
        const sec = p.sections.find(function (s) { return s.id === id; });
        const n = p.actuals.filter(function (a) { return a.sectionId === id; }).length;
        if (!confirm('Delete section ' + sec.code + '? ' + (n ? n + ' actual entries go with it.' : 'It has no actuals.'))) return;
        p.sections = p.sections.filter(function (s) { return s.id !== id; });
        p.actuals = p.actuals.filter(function (a) { return a.sectionId !== id; });
        save(); renderBudget(view, p); renderTop();
      });
    });

    $('#addSection').addEventListener('click', function () {
      const codes = p.sections.map(function (s) { return s.code; });
      const next = 'ABCDEFGHIJKLMNOP'.split('').find(function (ch) { return codes.indexOf(ch) === -1; }) || String(p.sections.length + 1);
      p.sections.push({ id: uid(), code: next, name: 'NEW SECTION', pw: false, open: true, lines: [] });
      save(); renderBudget(view, p);
    });
  }

  function findLine(p, id) {
    for (let i = 0; i < p.sections.length; i++) {
      const l = p.sections[i].lines.find(function (x) { return x.id === id; });
      if (l) return l;
    }
    return null;
  }

  function refreshBudgetNumbers(view, p) {
    const c = calc(p);
    p.sections.forEach(function (sec) {
      sec.lines.forEach(function (l) {
        const el = $('[data-total="' + l.id + '"]', view);
        if (el) {
          const t = lineTotal(l);
          el.textContent = money(t);
          const row = el.closest('.line');
          if (row) row.classList.toggle('zero', t === 0);
        }
      });
    });
    c.sections.forEach(function (s) {
      const head = $('[data-section="' + s.section.id + '"] .secnums', view);
      if (head) {
        head.innerHTML = '<b>' + money(s.estimate) + '</b><i class="' + (s.variance < 0 ? 'neg' : 'pos') + '">' + money(s.actual) + ' act</i>';
      }
      const foot = $('[data-section="' + s.section.id + '"] .secsub', view);
      if (foot) {
        foot.innerHTML = 'Lines ' + money(s.estimateBase) +
          (s.pw > 0 ? ' &middot; ' + esc(p.settings.pwLabel) + ' ' + money(s.pw) : '') +
          ' &middot; <b>' + money(s.estimate) + '</b>';
      }
    });
    const th = $('#tHard', view); if (th) th.textContent = money(c.hard);
    const tg = $('#tGrand', view); if (tg) tg.textContent = money(c.grand);
    const vt = $('.viewtot', view);
    if (vt) vt.innerHTML = money(c.hard) + ' hard &middot; ' + money(c.grand) + ' gross';
    renderTop();
  }

  /* ---------- actuals ------------------------------------- */

  let actualFilter = 'all';
  let actualQuery = '';

  function renderActuals(view, p) {
    /* the filter can outlive its section, or the job it came from */
    if (actualFilter !== 'all' && !p.sections.some(function (s) { return s.id === actualFilter; })) {
      actualFilter = 'all';
    }
    const c = calc(p);
    let h = '<div class="viewhead"><h1>Actuals</h1>' +
      '<span class="viewtot">' + money(c.actual, true) + '</span></div>';

    h += '<div class="filterbar">' +
      '<div class="chips"><button class="chip' + (actualFilter === 'all' ? ' on' : '') + '" data-filter="all">ALL</button>' +
      p.sections.map(function (s) {
        const n = p.actuals.filter(function (a) { return a.sectionId === s.id; }).length;
        return '<button class="chip' + (actualFilter === s.id ? ' on' : '') + '" data-filter="' + s.id + '">' +
          esc(s.code) + (n ? ' <i>' + n + '</i>' : '') + '</button>';
      }).join('') + '</div>' +
      '<input class="search" id="actualSearch" type="search" placeholder="Vendor, code, invoice" value="' + esc(actualQuery) + '">' +
      '</div>';

    const q = actualQuery.trim().toLowerCase();
    const shown = p.actuals.filter(function (a) {
      if (actualFilter !== 'all' && a.sectionId !== actualFilter) return false;
      if (!q) return true;
      return (a.vendor + ' ' + a.desc + ' ' + a.code + ' ' + (a.invoice || '') + ' ' + (a.date || ''))
        .toLowerCase().indexOf(q) > -1;
    });

    if (!p.actuals.length) {
      h += '<p class="empty pad">No costs logged yet. Tap + to add the first one.</p>';
    } else if (!shown.length) {
      h += '<p class="empty pad">Nothing matches.</p>';
    }

    p.sections.forEach(function (sec) {
      const rows = shown.filter(function (a) { return a.sectionId === sec.id; });
      if (!rows.length) return;
      const s = c.sections.find(function (x) { return x.section.id === sec.id; });
      h += '<section class="agroup">' +
        '<div class="ahead"><span><b>' + esc(sec.code) + '</b> ' + esc(sec.name) + '</span>' +
        '<span class="' + (s.variance < 0 ? 'neg' : 'pos') + '">' + money(s.actual) + ' / ' + money(s.estimate) + '</span></div>';
      rows.forEach(function (a) {
        const t = actualTotal(a, p);
        const held = a.include === false;
        h += '<button class="arow' + (held ? ' held' : '') + '" data-actual="' + a.id + '">' +
          '<span class="a-main">' +
            '<b>' + esc(a.vendor || a.desc || 'Cost') + '</b>' +
            '<i>' + [a.code, a.desc, a.date].filter(Boolean).map(esc).join(' &middot; ') + '</i>' +
          '</span>' +
          '<span class="a-side">' +
            '<b>' + money(t, true) + '</b>' +
            '<i class="st st-' + esc(a.status) + '">' + (held ? 'HELD' : esc(a.status)) + '</i>' +
          '</span>' +
          '</button>';
      });
      h += '</section>';
    });

    h += '<div class="spacer"></div>';
    view.innerHTML = h;

    $$('[data-filter]', view).forEach(function (b) {
      b.addEventListener('click', function () { actualFilter = b.dataset.filter; renderActuals(view, p); });
    });
    const search = $('#actualSearch', view);
    search.addEventListener('input', function () {
      actualQuery = this.value;
      const at = this.selectionStart;
      renderActuals(view, p);
      const s2 = $('#actualSearch');
      s2.focus(); s2.setSelectionRange(at, at);
    });
    $$('[data-actual]', view).forEach(function (b) {
      b.addEventListener('click', function () { actualSheet(p, b.dataset.actual); });
    });

  }

  /* ---------- job details --------------------------------- */

  const INFO_FIELDS = [
    ['Job name', '_name'],
    ['Client', 'client'], ['Agency', 'agency'],
    ['Contact', 'contact'], ['Email', 'email'],
    ['Production company', 'productionCompany'],
    ['Address', 'address'], ['City', 'city'], ['Phone', 'phone'],
    ['Job number', 'jobNumber'], ['Product', 'product'], ['Title', 'title'],
    ['Bid version', 'bidVersion'], ['Bid date', 'date'],
    ['Start date', 'startDate'], ['Delivery date', 'deliveryDate'],
    ['Deliverables', 'deliverables'], ['Versions', 'versions'],
    ['Aspect ratio', 'aspect'], ['Frame rate', 'frameRate'],
    ['Delivery format', 'format'], ['Schedule', 'schedule']
  ];

  function renderJob(view, p) {
    let h = '<div class="viewhead"><h1>Job details</h1></div>';

    h += '<section class="card"><div class="fields">';
    INFO_FIELDS.forEach(function (f) {
      const val = f[1] === '_name' ? p.name : (p.info[f[1]] || '');
      h += '<label class="field"><span>' + esc(f[0]) + '</span>' +
        '<input data-info="' + f[1] + '" value="' + esc(val) + '"></label>';
    });
    h += '</div>' +
      '<label class="field wide"><span>Notes</span>' +
      '<textarea data-info="notes" rows="3">' + esc(p.info.notes || '') + '</textarea></label>' +
      '</section>';

    h += '<section class="card"><h2>Settings</h2>' +
      '<div class="fields">' +
      '<label class="field"><span>Fringe label</span><input data-set="pwLabel" value="' + esc(p.settings.pwLabel) + '"></label>' +
      '<label class="field"><span>Fringe rate %</span><input class="num" inputmode="decimal" data-set="pwRate" value="' + round2(num(p.settings.pwRate) * 100) + '"></label>' +
      '</div>' +
      '<p class="hint">The fringe rate covers employer payroll tax, pension and welfare on non-incorporated payees. The sample job ran at 15.97%.</p>' +
      '</section>';

    h += '<section class="card"><h2>Move this job</h2>' +
      '<div class="wbtns">' +
        '<button class="btn small" id="expJson">Export JSON</button>' +
        '<button class="btn small" id="expCsv">Export CSV</button>' +
        '<button class="btn small" id="impJson">Import JSON</button>' +
        '<button class="btn small" id="printIt">Print / PDF</button>' +
      '</div>' +
      '<input type="file" id="fileIn" accept="application/json,.json" hidden>' +
      '</section>';

    h += '<section class="card"><h2>Jobs</h2><div class="projlist">';
    DB.projects.forEach(function (x) {
      const cx = calc(x);
      h += '<button class="projrow' + (x.id === p.id ? ' on' : '') + '" data-open="' + x.id + '">' +
        '<span><b>' + esc(x.name) + '</b><i>' + esc(TEMPLATES[x.template] ? TEMPLATES[x.template].label : x.template) +
        ' &middot; ' + money(cx.actual) + ' of ' + money(cx.working) + '</i></span>' +
        '<span class="' + (cx.variance < 0 ? 'neg' : 'pos') + '">' + money(cx.variance) + '</span>' +
        '</button>';
    });
    h += '</div><div class="wbtns">' +
      '<button class="btn small" id="dupJob">Duplicate</button>' +
      '<button class="btn small" id="newJob">New job</button>' +
      '<button class="btn small danger" id="delJob">Delete this job</button>' +
      '</div></section>';

    h += '<p class="fine pad">Budget Actual keeps everything in this browser\'s storage. Clearing site data erases it, so export a JSON copy of anything you care about.</p>';

    view.innerHTML = h;

    $$('[data-info]', view).forEach(function (input) {
      input.addEventListener('input', function () {
        if (input.dataset.info === '_name') { p.name = input.value; renderTop(); }
        else p.info[input.dataset.info] = input.value;
        save();
      });
    });
    $$('[data-set]', view).forEach(function (input) {
      input.addEventListener('input', function () {
        const f = input.dataset.set;
        p.settings[f] = f === 'pwRate' ? num(input.value) / 100 : input.value;
        save(); renderTop();
      });
    });

    $('#expJson').addEventListener('click', function () { exportJSON(p); });
    $('#expCsv').addEventListener('click', function () { exportCSV(p); });
    $('#printIt').addEventListener('click', function () { window.print(); });
    $('#impJson').addEventListener('click', function () { $('#fileIn').click(); });
    $('#fileIn').addEventListener('change', function () {
      importJSON(this.files[0]);
      this.value = '';   /* so picking the same file twice still fires */
    });

    $$('[data-open]', view).forEach(function (b) {
      b.addEventListener('click', function () { DB.activeId = b.dataset.open; save(); setTab('summary'); });
    });
    $('#newJob').addEventListener('click', projectSheet);
    $('#dupJob').addEventListener('click', function () {
      const copy = JSON.parse(JSON.stringify(p));
      copy.id = uid();
      copy.name = p.name + ' copy';
      copy.createdAt = Date.now();
      reid(copy);
      DB.projects.push(copy);
      DB.activeId = copy.id;
      save(); setTab('summary'); toast('Duplicated');
    });
    $('#delJob').addEventListener('click', function () {
      if (!confirm('Delete "' + p.name + '" for good?')) return;
      DB.projects = DB.projects.filter(function (x) { return x.id !== p.id; });
      DB.activeId = DB.projects.length ? DB.projects[0].id : null;
      save(); setTab('summary');
    });
  }

  /* Fresh ids throughout a copied project, keeping actual/section links. */
  function reid(p) {
    const map = {};
    p.sections.forEach(function (s) {
      const old = s.id; s.id = uid(); map[old] = s.id;
      s.lines.forEach(function (l) { l.id = uid(); });
    });
    p.adjusters.forEach(function (a) { a.id = uid(); });
    (p.changeOrders || []).forEach(function (c) { c.id = uid(); });
    p.actuals.forEach(function (a) { a.id = uid(); a.sectionId = map[a.sectionId] || a.sectionId; });
    if (p.bidSnapshot && p.bidSnapshot.sections) {
      const s2 = {};
      Object.keys(p.bidSnapshot.sections).forEach(function (k) {
        s2[map[k] || k] = p.bidSnapshot.sections[k];
      });
      p.bidSnapshot.sections = s2;
    }
  }

  /* ---------- bottom sheet -------------------------------- */

  function field(label, name, value, opts) {
    opts = opts || {};
    const cls = opts.num ? ' class="num"' : '';
    const mode = opts.num ? ' inputmode="decimal"' : '';
    return '<label class="field' + (opts.wide ? ' wide' : '') + '"><span>' + esc(label) + '</span>' +
      '<input' + cls + mode + ' name="' + name + '" value="' + esc(value === null || value === undefined ? '' : value) + '"' +
      (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : '') + '></label>';
  }

  function selectField(label, name, value, options) {
    return '<label class="field"><span>' + esc(label) + '</span><select name="' + name + '">' +
      options.map(function (o) {
        const v = Array.isArray(o) ? o[0] : o;
        const t = Array.isArray(o) ? o[1] : o;
        return '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(t) + '</option>';
      }).join('') + '</select></label>';
  }

  function sheet(title, bodyHTML, onSave, extraHTML) {
    const el = $('#sheet');
    el.innerHTML =
      '<div class="sheet-scrim"></div>' +
      '<form class="sheet-panel">' +
        '<div class="sheet-head"><button type="button" class="sheet-x">Cancel</button>' +
        '<h2>' + esc(title) + '</h2>' +
        '<button type="submit" class="sheet-ok">Save</button></div>' +
        '<div class="sheet-body">' + bodyHTML + '</div>' +
        (extraHTML || '') +
      '</form>';
    el.hidden = false;
    document.body.classList.add('sheeting');

    const close = function () {
      el.hidden = true;
      el.innerHTML = '';
      document.body.classList.remove('sheeting');
    };
    $('.sheet-scrim', el).addEventListener('click', close);
    $('.sheet-x', el).addEventListener('click', close);
    $('.sheet-panel', el).addEventListener('submit', function (e) {
      e.preventDefault();
      const vals = {};
      $$('[name]', el).forEach(function (i) {
        vals[i.name] = i.type === 'checkbox' ? i.checked : i.value;
      });
      close();
      onSave(vals);
    });
    return { close: close, el: el };
  }

  function projectSheet() {
    let body = '<div class="projlist sheetlist">';
    DB.projects.forEach(function (x) {
      body += '<button type="button" class="projrow' + (x.id === DB.activeId ? ' on' : '') + '" data-pick="' + x.id + '">' +
        '<span><b>' + esc(x.name) + '</b><i>' + esc(x.info.client || '') + '</i></span></button>';
    });
    body += '</div><div class="wbtns">' +
      '<button type="button" class="btn small" data-tpl="film">+ Film</button>' +
      '<button type="button" class="btn small" data-tpl="experiential">+ Experiential</button>' +
      '<button type="button" class="btn small" data-tpl="blank">+ Blank</button>' +
      '<button type="button" class="btn small ghost" data-tpl="sample">+ Sample</button>' +
      '</div>';
    const s = sheet('Jobs', body, function () {});
    $$('[data-pick]', s.el).forEach(function (b) {
      b.addEventListener('click', function () {
        DB.activeId = b.dataset.pick; save(); s.close(); setTab('summary');
      });
    });
    $$('[data-tpl]', s.el).forEach(function (b) {
      b.addEventListener('click', function () {
        s.close();
        if (b.dataset.tpl === 'sample') {
          const p = buildSample();
          DB.projects.push(p); DB.activeId = p.id; save(); setTab('summary');
        } else {
          createProject(b.dataset.tpl);
        }
      });
    });
  }

  function actualSheet(p, id) {
    const isNew = !id;
    const a = isNew
      ? { id: uid(), sectionId: p.sections[0] ? p.sections[0].id : '', code: '', date: today(),
          vendor: '', desc: '', qty: 1, unit: 'days', rate: '', invoice: '',
          inc: false, fringe: p.settings.pwRate, override: null, status: 'pending', include: true, note: '' }
      : p.actuals.find(function (x) { return x.id === id; });
    if (!a) return;

    const sectionOpts = p.sections.map(function (s) { return [s.id, s.code + '  ' + s.name]; });
    /* every account in the job, so a cost can be filed against any code */
    const codeList = 'all-account-codes';

    let body =
      '<div class="fields">' +
        selectField('Section', 'sectionId', a.sectionId, sectionOpts) +
        '<label class="field"><span>Account code</span>' +
          '<input name="code" list="' + codeList + '" value="' + esc(a.code) + '"></label>' +
        field('Date or range', 'date', a.date) +
        field('Vendor / artist', 'vendor', a.vendor, { wide: true }) +
        field('Description', 'desc', a.desc, { wide: true }) +
        field('Qty', 'qty', a.qty, { num: true }) +
        selectField('Unit', 'unit', a.unit, UNIT_TYPES) +
        field('Rate', 'rate', a.rate, { num: true }) +
        field('Invoice #', 'invoice', a.invoice) +
        selectField('Status', 'status', a.status, [['pending', 'pending'], ['invoiced', 'invoiced'], ['paid', 'paid']]) +
        field('Fringe %', 'fringe', round2(num(blank(a.fringe) ? p.settings.pwRate : a.fringe) * 100), { num: true }) +
      '</div>' +
      '<label class="chk"><input type="checkbox" name="inc"' + (a.inc ? ' checked' : '') + '> Incorporated payee, no fringe</label>' +
      '<label class="chk"><input type="checkbox" name="include"' + (a.include !== false ? ' checked' : '') + '> Count toward the actual</label>' +
      '<div class="fields">' +
        field('Override total', 'override', blank(a.override) ? '' : a.override, { num: true, placeholder: 'computed' }) +
      '</div>' +
      '<label class="field wide"><span>Note</span><textarea name="note" rows="2">' + esc(a.note || '') + '</textarea></label>' +
      '<datalist id="' + codeList + '">' +
        p.sections.reduce(function (acc, s) {
          return acc.concat(s.lines.map(function (l) {
            return '<option value="' + esc(l.code) + '">' + esc(s.code + ' ' + l.desc) + '</option>';
          }));
        }, []).join('') +
      '</datalist>';

    const extra = '<div class="sheet-foot"><span class="live" id="liveTotal">' + money(actualTotal(a, p), true) + '</span>' +
      (isNew ? '' : '<button type="button" class="btn small danger" id="delActual">Delete</button>') + '</div>';

    const s = sheet(isNew ? 'Add a cost' : 'Edit cost', body, function (v) {
      a.sectionId = v.sectionId;
      a.code = v.code;
      a.date = v.date;
      a.vendor = v.vendor;
      a.desc = v.desc;
      a.qty = num(v.qty);
      a.unit = v.unit;
      a.rate = num(v.rate);
      a.invoice = v.invoice;
      a.status = v.status;
      a.inc = !!v.inc;
      a.include = !!v.include;
      a.fringe = num(v.fringe) / 100;
      a.override = blank(String(v.override).trim()) ? null : num(v.override);
      a.note = v.note;
      if (isNew) p.actuals.push(a);
      save();
      render();
      toast(isNew ? 'Cost added' : 'Saved');
    }, extra);

    /* live total while typing */
    const recalc = function () {
      const g = function (n) { const el = $('[name="' + n + '"]', s.el); return el ? el.value : ''; };
      const inc = $('[name="inc"]', s.el).checked;
      const ov = String(g('override')).trim();
      let t;
      if (ov !== '') t = num(ov);
      else {
        const base = num(g('qty')) * num(g('rate'));
        t = base + (inc ? 0 : base * num(g('fringe')) / 100);
      }
      $('#liveTotal', s.el).textContent = money(round2(t), true);
    };
    $$('[name]', s.el).forEach(function (i) {
      i.addEventListener('input', recalc);
      i.addEventListener('change', recalc);
    });
    recalc();

    const del = $('#delActual', s.el);
    if (del) del.addEventListener('click', function () {
      p.actuals = p.actuals.filter(function (x) { return x.id !== a.id; });
      save(); s.close(); render(); toast('Deleted');
    });
  }

  /* ---------- import / export ----------------------------- */

  function download(name, text, type) {
    const blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'job';

  function exportJSON(p) {
    download(slug(p.name) + '-budget.json', JSON.stringify(p, null, 2), 'application/json');
    toast('JSON exported');
  }

  function csvCell(v) {
    const s = String(v === null || v === undefined ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  const csvRow = (arr) => arr.map(csvCell).join(',');

  function exportCSV(p) {
    const c = calc(p);
    const out = [];
    out.push(csvRow([p.name, p.info.client, p.info.jobNumber, 'bid ' + p.info.bidVersion, p.info.date]));
    out.push('');
    out.push(csvRow(['ESTIMATE']));
    out.push(csvRow(['Section', 'Section name', 'Code', 'Description', 'Qty', 'Units', 'Unit', 'Rate', 'Fringe', 'Total']));
    p.sections.forEach(function (s) {
      s.lines.forEach(function (l) {
        out.push(csvRow([s.code, s.name, l.code, l.desc,
          blank(l.qty) ? '' : l.qty, blank(l.units) ? '' : l.units, l.unit,
          blank(l.rate) ? '' : l.rate, l.pw ? 'y' : 'n', lineTotal(l)]));
      });
      const s2 = c.sections.find(function (x) { return x.section.id === s.id; });
      out.push(csvRow([s.code, 'SUBTOTAL ' + s.code, '', '', '', '', '', '', s2.pw, s2.estimate]));
    });
    out.push(csvRow(['', 'HARD COST', '', '', '', '', '', '', '', c.hard]));
    c.adjusters.forEach(function (a) {
      out.push(csvRow(['', a.label, a.mode === 'percent' ? pct(a.rate) + ' of ' + a.base : 'flat',
        '', '', '', '', '', '', a.amount]));
    });
    out.push(csvRow(['', 'GRAND TOTAL', '', '', '', '', '', '', '', c.grand]));

    out.push('');
    out.push(csvRow(['ACTUALS']));
    out.push(csvRow(['Section', 'Code', 'Date', 'Vendor', 'Description', 'Qty', 'Unit', 'Rate',
      'Incorporated', 'Fringe %', 'Override', 'Status', 'Counted', 'Total']));
    p.actuals.forEach(function (a) {
      const s = p.sections.find(function (x) { return x.id === a.sectionId; });
      out.push(csvRow([s ? s.code : '', a.code, a.date, a.vendor, a.desc, a.qty, a.unit, a.rate,
        a.inc ? 'y' : 'n', round2(num(blank(a.fringe) ? p.settings.pwRate : a.fringe) * 100),
        blank(a.override) ? '' : a.override, a.status, a.include === false ? 'n' : 'y',
        actualTotal(a, p)]));
    });
    out.push(csvRow(['', 'ACTUAL TO DATE', '', '', '', '', '', '', '', '', '', '', '', c.actual]));
    out.push(csvRow(['', 'WORKING BUDGET', '', '', '', '', '', '', '', '', '', '', '', c.working]));
    out.push(csvRow(['', 'VARIANCE', '', '', '', '', '', '', '', '', '', '', '', c.variance]));

    download(slug(p.name) + '-actual.csv', out.join('\n'), 'text/csv;charset=utf-8');
    toast('CSV exported');
  }

  function importJSON(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = function () {
      try {
        const p = JSON.parse(r.result);
        if (!p || !Array.isArray(p.sections)) throw new Error('Not a Budget Actual export');
        p.id = uid();
        reid(p);
        p.name = (p.name || 'Imported job');
        if (!p.settings) p.settings = { currency: 'USD', pwRate: 0, pwLabel: 'P&W' };
        if (!p.changeOrders) p.changeOrders = [];
        if (!p.actuals) p.actuals = [];
        if (!p.adjusters) p.adjusters = [];
        if (!TEMPLATES[p.template]) p.template = 'blank';
        DB.projects.push(p);
        DB.activeId = p.id;
        save(); setTab('summary');
        toast('Imported ' + p.name);
      } catch (e) {
        toast('That file did not import: ' + e.message);
      }
    };
    r.readAsText(file);
  }

  /* ---------- boot ---------------------------------------- */

  function init() {
    load();
    if (!DB.tab) DB.tab = 'summary';

    $('#tabs').addEventListener('click', function (e) {
      const b = e.target.closest('button[data-tab]');
      if (b) setTab(b.dataset.tab);
    });

    $('#fab').addEventListener('click', function () {
      const p = active();
      if (p) actualSheet(p, null);
    });

    render();

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
