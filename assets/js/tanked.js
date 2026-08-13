/* Tanked interactive demo — creative-tech/tanked.html only.
   Fetches the anonymized static snapshot and renders three panels:
   sortable SGP valuations, a team-picker roster browser, and offer-
   grade cards. Vanilla JS, no dependencies, no build step. */
(function () {
  "use strict";

  var DATA_URL = "../assets/data/tanked-demo.json";

  function fmtMoney(n) {
    if (n === null || n === undefined) return "–";
    return (n < 0 ? "-$" : "$") + Math.abs(Math.round(n));
  }

  function fmtDelta(n) {
    if (n === null || n === undefined) return "–";
    return (n > 0 ? "+" : "") + Math.round(n);
  }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") e.className = attrs[k];
        else if (k === "text") e.textContent = attrs[k];
        else e.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }

  function renderValuations(rows) {
    var tbody = document.querySelector("#tanked-valuations-table tbody");
    tbody.innerHTML = "";
    rows.forEach(function (v) {
      tbody.appendChild(el("tr", null, [
        el("td", { text: v.name }),
        el("td", { text: (v.positions || []).slice(0, 3).join("/") }),
        el("td", { class: "num", text: v.sgp.toFixed(1) }),
        el("td", { class: "num", text: fmtMoney(v.dollars) }),
      ]));
    });
  }

  function renderRoster(entries) {
    var tbody = document.querySelector("#tanked-roster-table tbody");
    tbody.innerHTML = "";
    entries.forEach(function (e) {
      tbody.appendChild(el("tr", null, [
        el("td", { text: e.name }),
        el("td", { text: (e.positions || []).slice(0, 3).join("/") }),
        el("td", { text: e.active ? "Y" : "–" }),
        el("td", { class: "num", text: fmtMoney(e.dollars) }),
        el("td", { text: e.source || "–" }),
        el("td", { class: "num", text: e.cost !== null && e.cost !== undefined ? "$" + e.cost : "–" }),
        el("td", { class: "num", text: e.contract_yr || "–" }),
        el("td", { class: "num" + (e.surplus_now < 0 ? " neg" : ""), text: fmtDelta(e.surplus_now) }),
        el("td", { class: "num" + (e.surplus_next < 0 ? " neg" : ""), text: fmtDelta(e.surplus_next) }),
      ]));
    });
  }

  function renderOffers(offers) {
    var wrap = document.getElementById("tanked-offer-cards");
    wrap.innerHTML = "";
    offers.forEach(function (o) {
      var grade = el("div", { class: "tanked-offer-grade", text: o.grade || "?" });
      var meta = "Roto " + fmtDelta(o.roto_delta) + " pts · keeper surplus next yr " +
                 fmtDelta(o.surplus_next_delta) + " · " + o.partner + " (" +
                 (o.accept_likelihood || "unknown").toLowerCase() + " to accept)";
      wrap.appendChild(el("div", { class: "tanked-offer-card" }, [
        grade,
        el("div", { class: "tanked-offer-body" }, [
          el("p", { class: "tanked-offer-label", text: o.label }),
          el("p", { class: "tanked-offer-meta", text: meta }),
        ]),
      ]));
    });
  }

  function renderEngineeringNote(note) {
    if (!note) return;
    var titleEl = document.getElementById("tanked-note-title");
    var bodyEl = document.getElementById("tanked-note-body");
    if (titleEl) titleEl.textContent = note.title;
    if (bodyEl) bodyEl.textContent = note.body;
    var row = document.getElementById("tanked-note-stats");
    if (row && note.before && note.after) {
      row.innerHTML = "";
      [
        ["Player value, before", fmtMoney(note.before.player_value_dollars)],
        ["Player value, after", fmtMoney(note.after.player_value_dollars)],
        ["Trade surplus, before", fmtMoney(note.before.trade_surplus_next_yr)],
        ["Trade surplus, after", fmtMoney(note.after.trade_surplus_next_yr)],
      ].forEach(function (pair) {
        row.appendChild(el("div", { class: "tanked-stat" }, [
          el("div", { class: "label", text: pair[0] }),
          el("div", { class: "value", text: pair[1] }),
        ]));
      });
    }
  }

  function wireSort(tableId, defaultKey, rows, render) {
    var table = document.getElementById(tableId);
    var state = { key: defaultKey, asc: false };

    function apply() {
      var sorted = rows.slice().sort(function (a, b) {
        var av = a[state.key], bv = b[state.key];
        if (typeof av === "string" || typeof bv === "string") {
          av = av || ""; bv = bv || "";
          return state.asc ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        av = av || 0; bv = bv || 0;
        return state.asc ? av - bv : bv - av;
      });
      render(sorted);
      table.querySelectorAll("th[data-key]").forEach(function (th) {
        var active = th.dataset.key === state.key;
        th.classList.toggle("sorted", active);
        th.classList.toggle("asc", active && state.asc);
      });
    }

    table.querySelectorAll("th[data-key]").forEach(function (th) {
      th.addEventListener("click", function () {
        if (state.key === th.dataset.key) state.asc = !state.asc;
        else { state.key = th.dataset.key; state.asc = false; }
        apply();
      });
    });
    apply();
  }

  fetch(DATA_URL)
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      wireSort("tanked-valuations-table", "dollars", data.valuations || [], renderValuations);

      var select = document.getElementById("tanked-team-select");
      var teamNames = Object.keys(data.rosters || {});
      teamNames.forEach(function (name) {
        select.appendChild(el("option", { value: name, text: name }));
      });
      select.value = teamNames.indexOf("Your Team") >= 0 ? "Your Team" : teamNames[0];
      function showTeam() { renderRoster((data.rosters || {})[select.value] || []); }
      select.addEventListener("change", showTeam);
      showTeam();

      renderOffers(data.graded_offers || []);
      renderEngineeringNote(data.engineering_note);
    })
    .catch(function (err) {
      var demo = document.querySelector(".tanked-demo");
      if (demo) {
        demo.innerHTML = "";
        demo.appendChild(el("p", {
          class: "tanked-panel-note",
          text: "Demo data did not load. Check the browser console for details.",
        }));
      }
      console.error("Tanked demo data failed to load:", err);
    });
})();
