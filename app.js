// Porch Cats — a small client-side tracker for neighborhood strays.
// Data persists in the browser via localStorage. No server, no backend.

const STORAGE_KEY = "porch-cats-sightings";

let cats = [];
let sightings = loadSightings();

const els = {
  catSelect: document.getElementById("cat-select"),
  form: document.getElementById("sighting-form"),
  time: document.getElementById("time-input"),
  mood: document.getElementById("mood-input"),
  notes: document.getElementById("notes-input"),
  leaderboard: document.getElementById("leaderboard"),
  list: document.getElementById("sightings-list"),
  reset: document.getElementById("reset-btn"),
};

init();

async function init() {
  cats = await fetchCats();
  populateCatSelect();
  els.time.value = new Date().toTimeString().slice(0, 5);
  render();

  els.form.addEventListener("submit", onAddSighting);
  els.reset.addEventListener("click", onReset);
}

async function fetchCats() {
  try {
    const res = await fetch("cats.json");
    if (!res.ok) throw new Error("bad response");
    return await res.json();
  } catch (e) {
    // Fallback so the app still works when opened as a local file.
    return [
      { id: "pancakes", name: "Mr. Pancakes", color: "orange tabby", bio: "" },
      { id: "accountant", name: "The Accountant", color: "gray shorthair", bio: "" },
    ];
  }
}

function populateCatSelect() {
  els.catSelect.innerHTML = cats
    .map((c) => `<option value="${c.id}">${c.name} (${c.color})</option>`)
    .join("");
}

function onAddSighting(e) {
  e.preventDefault();
  const catId = els.catSelect.value;
  sightings.unshift({
    catId,
    time: els.time.value,
    mood: els.mood.value,
    notes: els.notes.value.trim(),
    loggedAt: Date.now(),
  });
  saveSightings();
  els.notes.value = "";
  render();
}

function onReset() {
  if (!confirm("Clear the whole sighting log?")) return;
  sightings = [];
  saveSightings();
  render();
}

function catName(id) {
  const c = cats.find((c) => c.id === id);
  return c ? c.name : "Unknown cat";
}

function render() {
  renderLeaderboard();
  renderSightings();
}

function renderLeaderboard() {
  const counts = {};
  for (const s of sightings) counts[s.catId] = (counts[s.catId] || 0) + 1;

  const ranked = cats
    .map((c) => ({ name: c.name, count: counts[c.id] || 0 }))
    .sort((a, b) => b.count - a.count);

  els.leaderboard.innerHTML = ranked
    .map(
      (r) =>
        `<li>${r.name} — <span class="count">${r.count}</span> ${
          r.count === 1 ? "visit" : "visits"
        }</li>`
    )
    .join("");
}

function renderSightings() {
  if (sightings.length === 0) {
    els.list.innerHTML = `<li class="when">No sightings logged yet. The cats are lying low.</li>`;
    return;
  }
  els.list.innerHTML = sightings
    .slice(0, 25)
    .map(
      (s) => `
      <li>
        <strong>${catName(s.catId)}</strong>
        <span class="when">at ${s.time}</span>
        <span class="pill">${s.mood}</span>
        ${s.notes ? `<div class="when">${escapeHtml(s.notes)}</div>` : ""}
      </li>`
    )
    .join("");
}

function loadSightings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveSightings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sightings));
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}
