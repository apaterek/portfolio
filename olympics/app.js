/* LA28 Family Vote — no backend. Votes are ranked on-device, saved to
   localStorage, and submitted by opening a pre-filled email to the organizer.
   Everything you may want to customize lives in CONFIG below. */

/* ============================ CONFIG ============================ */

// Where submitted ballots are emailed. Change to whoever collects the votes.
const ORGANIZER_EMAIL = "ubermacintosh@gmail.com";

// The family roster. Add / edit names here — each name is one claimable ID.
// A voter can also pick "Someone else…" and type a name if they are not listed.
const FAMILY_MEMBERS = [
  "Austin",
  "Family member 2",
  "Family member 3",
  "Family member 4",
  "Family member 5",
  "Family member 6",
];

// The six ticketed sessions, transcribed from LA28_Family_Tickets.xlsx and
// verified against the published LA28 competition schedule.
//   - Football date resolved: "Mon 7th" -> Mon Jul 24, 2028 (men's semifinal, Rose Bowl).
//   - Water polo confirmed Thu Jul 20, 2028 (quarterfinals, Long Beach); start time not yet published.
const EVENTS = [
  { id: "fencing",   sport: "Fencing",           round: "Mixed — Quarterfinals", venue: "LA Convention Center", day: "Saturday", date: "Jul 15, 2028", time: "9:00 AM" },
  { id: "football",  sport: "Football (Soccer)", round: "Men's — Semifinal",     venue: "Rose Bowl, Pasadena",  day: "Monday",   date: "Jul 24, 2028", time: "8:30 PM" },
  { id: "swimming",  sport: "Swimming",          round: "Mixed — Preliminaries", venue: "Inglewood",            day: "Saturday", date: "Jul 29, 2028", time: "9:30 AM" },
  { id: "waterpolo", sport: "Water Polo",        round: "Quarterfinals",         venue: "Long Beach",           day: "Thursday", date: "Jul 20, 2028", time: "TBD" },
  { id: "lacrosse",  sport: "Lacrosse",          round: "Men's — Final",         venue: "Exposition Park, LA",  day: "Saturday", date: "Jul 29, 2028", time: "1:30 PM" },
  { id: "baseball",  sport: "Baseball",          round: "Men's — Play-In",       venue: "Dodger Stadium",       day: "Monday",   date: "Jul 17, 2028", time: "7:00 PM" },
];

const STORAGE_PREFIX = "la28-ballot:";

/* ============================ STATE ============================ */

let voterName = "";
let order = EVENTS.map(e => e.id); // working rank order, index 0 = rank 1

/* ============================ ELEMENTS ============================ */

const $ = sel => document.querySelector(sel);
const voterSel   = $("#voter");
const voterOther = $("#voter-other");
const alreadyEl  = $("#already");
const stepRank   = $("#step-rank");
const stepSubmit = $("#step-submit");
const ballotEl   = $("#ballot");
const submitBtn  = $("#submit");
const copyBtn    = $("#copy");
const resetBtn   = $("#reset");
const statusEl   = $("#status");

/* ============================ STEP 1: identity ============================ */

function initRoster() {
  FAMILY_MEMBERS.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    voterSel.appendChild(opt);
  });
  const other = document.createElement("option");
  other.value = "__other__";
  other.textContent = "Someone else…";
  voterSel.appendChild(other);
}

function currentName() {
  if (voterSel.value === "__other__") return voterOther.value.trim();
  return voterSel.value === "" ? "" : voterSel.value;
}

function onVoterChange() {
  const isOther = voterSel.value === "__other__";
  voterOther.hidden = !isOther;
  if (isOther) voterOther.focus();
  updateVoter();
}

function updateVoter() {
  voterName = currentName();
  const active = voterName.length > 0;
  setStepEnabled(stepRank, active);
  setStepEnabled(stepSubmit, active);
  submitBtn.disabled = !active;
  copyBtn.disabled = !active;

  if (active) loadSavedBallot();
  else alreadyEl.hidden = true;
}

function setStepEnabled(section, enabled) {
  section.setAttribute("aria-disabled", enabled ? "false" : "true");
}

/* ============================ STEP 2: ranking ============================ */

function renderBallot() {
  ballotEl.innerHTML = "";
  order.forEach((eventId, idx) => {
    const ev = EVENTS.find(e => e.id === eventId);
    const li = document.createElement("li");
    li.className = "event";
    li.draggable = true;
    li.dataset.id = ev.id;

    const timeClass = ev.time === "TBD" ? "tbd" : "";
    li.innerHTML = `
      <div class="rank" aria-hidden="true">${idx + 1}</div>
      <div class="event-body">
        <div class="event-sport">${ev.sport} <span class="event-round">· ${ev.round}</span></div>
        <div class="event-meta">
          <span>${ev.day}, ${ev.date}</span>
          <span class="${timeClass}">${ev.time}</span>
          <span>${ev.venue}</span>
        </div>
      </div>
      <div class="rank-controls">
        <button type="button" class="rank-btn up"   aria-label="Move ${ev.sport} up"   ${idx === 0 ? "disabled" : ""}>▲</button>
        <button type="button" class="rank-btn down" aria-label="Move ${ev.sport} down" ${idx === order.length - 1 ? "disabled" : ""}>▼</button>
      </div>`;

    li.querySelector(".up").addEventListener("click", () => move(idx, idx - 1));
    li.querySelector(".down").addEventListener("click", () => move(idx, idx + 1));
    addDragHandlers(li);
    ballotEl.appendChild(li);
  });
}

function move(from, to) {
  if (to < 0 || to >= order.length) return;
  const [item] = order.splice(from, 1);
  order.splice(to, 0, item);
  renderBallot();
  statusEl.textContent = "";
  statusEl.className = "status";
}

/* --- drag and drop --- */
let dragId = null;

function addDragHandlers(li) {
  li.addEventListener("dragstart", e => {
    dragId = li.dataset.id;
    li.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  li.addEventListener("dragend", () => {
    li.classList.remove("dragging");
    document.querySelectorAll(".event").forEach(n => n.classList.remove("drop-target"));
    dragId = null;
  });
  li.addEventListener("dragover", e => {
    e.preventDefault();
    if (li.dataset.id !== dragId) li.classList.add("drop-target");
  });
  li.addEventListener("dragleave", () => li.classList.remove("drop-target"));
  li.addEventListener("drop", e => {
    e.preventDefault();
    if (!dragId || li.dataset.id === dragId) return;
    const from = order.indexOf(dragId);
    const to = order.indexOf(li.dataset.id);
    move(from, to);
  });
}

/* ============================ STEP 3: save + submit ============================ */

function ballotText() {
  const lines = order.map((id, i) => {
    const ev = EVENTS.find(e => e.id === id);
    return `${i + 1}. ${ev.sport} — ${ev.round} (${ev.day}, ${ev.date}, ${ev.venue})`;
  });
  return `LA28 Family Vote\nVoter: ${voterName}\n\nRanking (1 = most wanted, 6 = least):\n${lines.join("\n")}`;
}

function saveBallot() {
  try {
    localStorage.setItem(STORAGE_PREFIX + voterName, JSON.stringify({
      order,
      savedAt: new Date().toISOString(),
    }));
  } catch (_) { /* private mode / storage full — non-fatal */ }
}

function loadSavedBallot() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + voterName)); }
  catch (_) { saved = null; }

  if (saved && Array.isArray(saved.order) && saved.order.length === EVENTS.length) {
    order = saved.order.slice();
    const when = saved.savedAt ? new Date(saved.savedAt).toLocaleDateString() : "earlier";
    alreadyEl.hidden = false;
    alreadyEl.textContent = `You saved a ballot on ${when}. It is loaded below — reorder and re-send to update it.`;
  } else {
    order = EVENTS.map(e => e.id);
    alreadyEl.hidden = true;
  }
  renderBallot();
}

function submitBallot() {
  if (!voterName) return;
  saveBallot();
  const subject = `LA28 Family Vote — ${voterName}`;
  const mailto = `mailto:${encodeURIComponent(ORGANIZER_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(ballotText())}`;
  window.location.href = mailto;
  statusEl.textContent = "Ballot saved. Your email app should be opening — send the message to finish. If nothing opened, use “Copy my ballot”.";
  statusEl.className = "status ok";
}

async function copyBallot() {
  saveBallot();
  const text = ballotText();
  try {
    await navigator.clipboard.writeText(text);
    statusEl.textContent = "Ballot copied. Paste it into a text or email to the organizer.";
    statusEl.className = "status ok";
  } catch (_) {
    // Fallback: select in a temporary textarea.
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (_) {}
    document.body.removeChild(ta);
    statusEl.textContent = "Ballot copied. Paste it into a text or email to the organizer.";
    statusEl.className = "status ok";
  }
}

function resetBallot() {
  order = EVENTS.map(e => e.id);
  renderBallot();
  statusEl.textContent = "Order reset.";
  statusEl.className = "status";
}

/* ============================ INIT ============================ */

initRoster();
renderBallot();
voterSel.addEventListener("change", onVoterChange);
voterOther.addEventListener("input", updateVoter);
submitBtn.addEventListener("click", submitBallot);
copyBtn.addEventListener("click", copyBallot);
resetBtn.addEventListener("click", resetBallot);
