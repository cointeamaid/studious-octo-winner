/* Cat Companion — a small virtual pet.
 * - Adopt one of the roster cats (from cats.json).
 * - Stats (hunger, energy, happiness, bond) drift over real time.
 * - Care actions change the stats; each cat reacts with its own personality.
 * - Everything persists per-cat in localStorage.
 */

const SAVE_PREFIX = "cat-companion:";
const LAST_CAT_KEY = "cat-companion:last";

let cats = [];
let cat = null;      // the selected cat definition
let state = null;    // { hunger, energy, happy, bond, sleeping, lastTick }
let tickTimer = null;

/* ---------- stat drift (per real minute) ---------- */
const DECAY = { hunger: 0.8, energy: 0.5, happy: 0.6 };

/* ---------- actions ---------- */
const ACTIONS = {
  feed:  { hunger: +28, happy: +3,  energy: +2 },
  treat: { happy: +12, bond: +3, hunger: +6 },
  pet:   { happy: +7,  bond: +4 },
  play:  { happy: +13, bond: +5, energy: -16, hunger: -9 },
  brush: { happy: +8,  bond: +3, energy: +1 },
  nap:   { energy: +35, happy: +2 },
  talk:  { bond: +1 },
};

init();

async function init() {
  cats = await loadCats();
  renderAdoptGrid();
  const last = localStorage.getItem(LAST_CAT_KEY);
  if (last && cats.some((c) => c.id === last)) adopt(last);

  document.getElementById("switch-btn").addEventListener("click", showAdoption);
  document.querySelectorAll(".actions button").forEach((btn) =>
    btn.addEventListener("click", () => doAction(btn.dataset.action))
  );
}

async function loadCats() {
  try {
    const res = await fetch("cats.json");
    if (!res.ok) throw new Error("bad response");
    return await res.json();
  } catch {
    return [
      { id: "pancakes", name: "Mr. Pancakes", color: "orange tabby", personality: "friendly",
        palette: { fur: "#e8913f", patch: "#c56a1e", belly: "#f6d5a8", eye: "#4b8b3b" }, tabby: true },
    ];
  }
}

/* ================= screens ================= */

function renderAdoptGrid() {
  const grid = document.getElementById("adopt-grid");
  grid.innerHTML = "";
  cats.forEach((c) => {
    const card = document.createElement("div");
    card.className = "adopt-card";
    card.innerHTML = `
      ${buildCatSVG(c, "content", 120)}
      <h3>${c.name}</h3>
      <div class="breed">${c.color}</div>
      <span class="tag">${personalityLabel(c.personality)}</span>
      <p class="bio">${c.bio || ""}</p>`;
    card.addEventListener("click", () => adopt(c.id));
    grid.appendChild(card);
  });
}

function showAdoption() {
  stopTicking();
  document.getElementById("care-screen").hidden = true;
  document.getElementById("adopt-screen").hidden = false;
}

function adopt(id) {
  cat = cats.find((c) => c.id === id);
  state = loadState(id);
  applyOfflineDrift();
  localStorage.setItem(LAST_CAT_KEY, id);

  document.getElementById("adopt-screen").hidden = true;
  document.getElementById("care-screen").hidden = false;
  document.getElementById("cat-name").textContent = cat.name;

  render();
  startTicking();
  say(greeting());
}

/* ================= state ================= */

function freshState() {
  return { hunger: 70, energy: 70, happy: 60, bond: 5, sleeping: false, lastTick: Date.now() };
}

function loadState(id) {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + id);
    if (!raw) return freshState();
    const s = JSON.parse(raw);
    return { ...freshState(), ...s };
  } catch {
    return freshState();
  }
}

function saveState() {
  state.lastTick = Date.now();
  localStorage.setItem(SAVE_PREFIX + cat.id, JSON.stringify(state));
}

function clamp(n) { return Math.max(0, Math.min(100, n)); }

function applyOfflineDrift() {
  const minutes = (Date.now() - (state.lastTick || Date.now())) / 60000;
  if (minutes <= 0) return;
  driftBy(minutes);
}

function driftBy(minutes) {
  state.hunger = clamp(state.hunger - DECAY.hunger * minutes);
  state.happy = clamp(state.happy - DECAY.happy * minutes);
  // Napping regenerates energy instead of draining it.
  const energyRate = state.sleeping ? -2.2 : DECAY.energy; // negative = gain
  state.energy = clamp(state.energy - energyRate * minutes);
  // A very hungry cat loses extra happiness.
  if (state.hunger < 20) state.happy = clamp(state.happy - 0.4 * minutes);
  // Wake up once rested.
  if (state.sleeping && state.energy >= 95) state.sleeping = false;
}

/* ================= ticking ================= */

function startTicking() {
  stopTicking();
  tickTimer = setInterval(() => {
    driftBy(4 / 60); // 4 seconds' worth
    saveState();
    render();
  }, 4000);
}
function stopTicking() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
}

/* ================= actions ================= */

function doAction(action) {
  if (!cat || !state) return;

  // Special-case guards with personality flavor.
  if (action === "feed" && state.hunger > 92) return say(line("full"));
  if (action === "play" && state.energy < 18) return say(line("tootired"));
  if (action === "treat" && cat.personality === "diva" && state.happy < 35)
    return say(line("refuse"));

  if (action === "nap") {
    state.sleeping = true;
  } else if (state.sleeping) {
    state.sleeping = false; // any other interaction wakes the cat
  }

  const effect = ACTIONS[action] || {};
  if (effect.hunger) state.hunger = clamp(state.hunger + effect.hunger);
  if (effect.energy) state.energy = clamp(state.energy + effect.energy);
  if (effect.happy) state.happy = clamp(state.happy + effect.happy);
  if (effect.bond) state.bond = clamp(state.bond + effect.bond);

  saveState();
  render();
  bounce();
  playFx(action);
  say(line(action));
}

/* ================= mood ================= */

function moodOf() {
  if (state.sleeping || state.energy < 20) return "sleepy";
  if (state.hunger < 25) return "hungry";
  if (state.happy < 32) return "grumpy";
  if (state.happy >= 72) return "happy";
  return "content";
}

/* ================= render ================= */

function render() {
  const mood = moodOf();
  document.getElementById("cat-mood").textContent = mood;
  document.getElementById("cat-art").innerHTML = buildCatSVG(cat, mood, 200);

  setBar("hunger", state.hunger, "v-hunger", "b-hunger");
  setBar("energy", state.energy, "v-energy", "b-energy");
  setBar("happy", state.happy, "v-happy", "b-happy");
  setBar("bond", state.bond, "v-bond", "b-bond", true);
  document.getElementById("bond-tier").textContent = bondTier(state.bond);
}

function setBar(_key, value, valId, barId, isBond) {
  const v = Math.round(value);
  document.getElementById(valId).textContent = v;
  const bar = document.getElementById(barId);
  bar.style.width = v + "%";
  if (!isBond) bar.classList.toggle("low", v < 25);
}

/* ================= speech + effects ================= */

let speechTimer = null;
function say(text) {
  if (!text) return;
  const el = document.getElementById("speech");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => (el.hidden = true), 3200);
}

function bounce() {
  const art = document.getElementById("cat-art");
  art.classList.remove("bounce");
  void art.offsetWidth; // restart animation
  art.classList.add("bounce");
}

const FX_ICON = {
  pet: "💛", treat: "🐟", feed: "🍗", play: "🧶",
  brush: "✨", nap: "💤", talk: "💬",
};
function playFx(action) {
  const icon = FX_ICON[action];
  if (!icon) return;
  const fx = document.getElementById("fx");
  for (let i = 0; i < 3; i++) {
    const s = document.createElement("span");
    s.className = "float";
    s.textContent = icon;
    s.style.left = 30 + Math.random() * 40 + "%";
    s.style.animationDelay = i * 0.12 + "s";
    fx.appendChild(s);
    setTimeout(() => s.remove(), 1600);
  }
}

/* ================= personality lines ================= */

function personalityLabel(p) {
  return {
    friendly: "friendly & reliable",
    judgmental: "dry & judgmental",
    mysterious: "cryptic & elusive",
    diva: "high-maintenance",
  }[p] || p;
}

function bondTier(b) {
  if (b < 20) return "(wary)";
  if (b < 40) return "(warming up)";
  if (b < 60) return "(friendly)";
  if (b < 80) return "(attached)";
  return "(inseparable)";
}

const LINES = {
  friendly: {
    greeting: ["Oh good, you're here! Right on schedule.", "*trots over happily*"],
    feed: ["Breakfast! You're the best.", "*happy chirp* thank you!"],
    treat: ["A treat?! For me?", "*gentle head-boop of gratitude*"],
    pet: ["*leans all the way into your hand*", "Purrrrr."],
    play: ["*pounces with pure joy*", "Again! Again!"],
    brush: ["*melts into the brush*", "So fancy. Thank you."],
    nap: ["*curls up in a warm loaf* zzz...", "A nap sounds perfect."],
    talk: ["I saved you the sunny spot by the window.", "Best part of my morning is you."],
    full: ["I'm stuffed, honestly. Maybe later!", "*pats full belly*"],
    tootired: ["*yawns* I'd love to but I'm wiped.", "Five more minutes of rest first?"],
  },
  judgmental: {
    greeting: ["You're late. I noted it.", "*stares* ...Fine. You may sit."],
    feed: ["Adequate. Barely.", "This will be reflected in the quarterly review."],
    treat: ["Acceptable tribute.", "*accepts, judges portion size*"],
    pet: ["You may continue. Briefly.", "*permits exactly three pets*"],
    play: ["I'll allow it. For data-gathering purposes.", "*bats string with clinical precision*"],
    brush: ["My coat was already immaculate, but proceed.", "Hm. You missed a spot."],
    nap: ["I require rest to continue auditing you.", "*closes eyes, still watching somehow*"],
    talk: ["Your spending habits concern me.", "I've drafted some notes on your life choices."],
    full: ["I've eaten. The books are balanced.", "Overfeeding is fiscally irresponsible."],
    tootired: ["Energy reserves: insufficient. Denied.", "*declines, cites fatigue*"],
    refuse: ["This does not meet my standards.", "*pushes bowl away, unimpressed*"],
  },
  mysterious: {
    greeting: ["...You saw me. Interesting.", "*materializes from the shadows*"],
    feed: ["I will accept this offering.", "*eats without breaking eye contact*"],
    treat: ["A gift. I will remember this.", "*takes treat, vanishes briefly, returns*"],
    pet: ["*allows contact... for reasons unknown*", "You feel that? That's fate."],
    play: ["*chases something only it can see*", "The string knows things."],
    brush: ["*shivers with ancient satisfaction*", "You groom the void, and it purrs back."],
    nap: ["I retreat to the dream-realm.", "*folds into a shadow and is gone*"],
    talk: ["I appeared exactly once. This is the second time.", "Ask me no questions of the porch."],
    full: ["I hunger for nothing you understand.", "*declines, cryptically*"],
    tootired: ["My essence is depleted.", "*fades slightly at the edges*"],
  },
  diva: {
    greeting: ["Finally. Do you know who I am?", "*flicks tail* You may approach."],
    feed: ["*sniffs* ...I suppose this will do.", "The presentation could be better, but fine."],
    treat: ["Now THIS is more like it.", "*accepts treat like it's owed*"],
    pet: ["*accepts adoration as her birthright*", "Gently! I'm delicate."],
    play: ["*chases toy elegantly, never breaking a sweat*", "I'm only playing because I chose to."],
    brush: ["Yes. Make me even more magnificent.", "*poses mid-brush*"],
    nap: ["I'm retiring to my chambers.", "*curls up on the finest cushion available*"],
    talk: ["I require the food arranged just so. Again.", "My cushion is two degrees too cool."],
    full: ["I couldn't POSSIBLY eat another bite.", "*turns nose up at full bowl*"],
    tootired: ["A lady does not exert herself when tired.", "*reclines dramatically*"],
    refuse: ["Absolutely not. I'm not in the mood.", "*pushes bowl away with one royal paw*"],
  },
};

function line(kind) {
  const set = LINES[cat.personality] || LINES.friendly;
  const arr = set[kind] || LINES.friendly[kind] || [];
  if (arr.length === 0) return "";
  return arr[Math.floor(Math.random() * arr.length)];
}

function greeting() { return line("greeting"); }

/* ================= the cat artwork (SVG) ================= */

function buildCatSVG(c, mood, size) {
  const p = c.palette || { fur: "#e8913f", patch: "#c56a1e", belly: "#f6d5a8", eye: "#4b8b3b" };
  const inner = "#d98b8b"; // inner ear / nose pink
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 200 210" xmlns="http://www.w3.org/2000/svg">
    <!-- tail -->
    <path d="M150 170 q46 -4 40 -50 q-4 -20 -24 -18 q14 6 12 26 q-2 30 -34 30 z" fill="${p.fur}"/>
    <!-- body -->
    <ellipse cx="100" cy="158" rx="54" ry="44" fill="${p.fur}"/>
    <ellipse cx="100" cy="172" rx="30" ry="26" fill="${p.belly}"/>
    <!-- front paws -->
    <ellipse cx="82" cy="196" rx="13" ry="9" fill="${p.belly}"/>
    <ellipse cx="118" cy="196" rx="13" ry="9" fill="${p.belly}"/>
    <!-- ears -->
    <path d="M58 62 L70 24 L92 58 Z" fill="${p.fur}"/>
    <path d="M142 62 L130 24 L108 58 Z" fill="${p.fur}"/>
    <path d="M64 58 L72 36 L84 56 Z" fill="${inner}"/>
    <path d="M136 58 L128 36 L116 56 Z" fill="${inner}"/>
    <!-- head -->
    <ellipse cx="100" cy="92" rx="50" ry="44" fill="${p.fur}"/>
    ${c.calico ? calicoPatches(p) : ""}
    ${c.tabby ? tabbyStripes(p) : ""}
    <!-- cheeks -->
    <circle cx="72" cy="104" r="9" fill="${p.belly}" opacity="0.5"/>
    <circle cx="128" cy="104" r="9" fill="${p.belly}" opacity="0.5"/>
    <!-- eyes + mouth by mood -->
    ${eyesFor(mood, p.eye)}
    <!-- nose -->
    <path d="M94 100 L106 100 L100 108 Z" fill="${inner}"/>
    ${mouthFor(mood)}
    <!-- whiskers -->
    <g stroke="#00000055" stroke-width="1.5" stroke-linecap="round">
      <line x1="64" y1="104" x2="36" y2="98"/>
      <line x1="64" y1="110" x2="36" y2="112"/>
      <line x1="136" y1="104" x2="164" y2="98"/>
      <line x1="136" y1="110" x2="164" y2="112"/>
    </g>
  </svg>`;
}

function tabbyStripes(p) {
  return `
    <g fill="none" stroke="${p.patch}" stroke-width="4" stroke-linecap="round">
      <path d="M100 52 L100 66"/>
      <path d="M88 54 L92 68"/>
      <path d="M112 54 L108 68"/>
    </g>
    <g stroke="${p.patch}" stroke-width="4" stroke-linecap="round">
      <line x1="150" y1="150" x2="140" y2="152"/>
      <line x1="150" y1="164" x2="140" y2="165"/>
    </g>`;
}

function calicoPatches(p) {
  return `
    <path d="M60 70 q-8 20 4 40 q-14 -8 -16 -28 q-1 -14 12 -12 z" fill="${p.patch}"/>
    <ellipse cx="120" cy="70" rx="20" ry="16" fill="#3a3038"/>
    <ellipse cx="126" cy="168" rx="18" ry="16" fill="${p.patch}"/>`;
}

function eyesFor(mood, eye) {
  const L = 78, R = 122, y = 90;
  if (mood === "happy") {
    return `<g fill="none" stroke="#1a1712" stroke-width="4" stroke-linecap="round">
      <path d="M${L - 9} ${y + 2} q9 -12 18 0"/>
      <path d="M${R - 9} ${y + 2} q9 -12 18 0"/>
    </g>`;
  }
  if (mood === "sleepy") {
    return `<g fill="none" stroke="#1a1712" stroke-width="4" stroke-linecap="round">
      <path d="M${L - 9} ${y} q9 8 18 0"/>
      <path d="M${R - 9} ${y} q9 8 18 0"/>
    </g>`;
  }
  if (mood === "grumpy") {
    return `
    <g fill="${eye}"><ellipse cx="${L}" cy="${y + 2}" rx="8" ry="5"/><ellipse cx="${R}" cy="${y + 2}" rx="8" ry="5"/></g>
    <g fill="#1a1712"><ellipse cx="${L}" cy="${y + 2}" rx="3" ry="4"/><ellipse cx="${R}" cy="${y + 2}" rx="3" ry="4"/></g>
    <g stroke="#1a1712" stroke-width="4" stroke-linecap="round">
      <line x1="${L - 11}" y1="${y - 10}" x2="${L + 9}" y2="${y - 3}"/>
      <line x1="${R + 11}" y1="${y - 10}" x2="${R - 9}" y2="${y - 3}"/>
    </g>`;
  }
  // hungry = wide pleading; content = normal
  const rx = mood === "hungry" ? 9 : 8;
  const ry = mood === "hungry" ? 13 : 11;
  const pr = mood === "hungry" ? 5 : 3.5;
  return `
    <g fill="${eye}"><ellipse cx="${L}" cy="${y}" rx="${rx}" ry="${ry}"/><ellipse cx="${R}" cy="${y}" rx="${rx}" ry="${ry}"/></g>
    <g fill="#15130f"><ellipse cx="${L}" cy="${y}" rx="${pr}" ry="${ry - 2}"/><ellipse cx="${R}" cy="${y}" rx="${pr}" ry="${ry - 2}"/></g>
    <g fill="#ffffff"><circle cx="${L - 2}" cy="${y - 4}" r="1.8"/><circle cx="${R - 2}" cy="${y - 4}" r="1.8"/></g>`;
}

function mouthFor(mood) {
  if (mood === "happy") {
    return `<path d="M86 108 q14 16 28 0" fill="#a0554f" stroke="#1a1712" stroke-width="2"/>
            <ellipse cx="100" cy="116" rx="6" ry="4" fill="#d98b8b"/>`;
  }
  if (mood === "hungry") {
    return `<ellipse cx="100" cy="114" rx="6" ry="5" fill="#a0554f"/>`;
  }
  if (mood === "sleepy") {
    return `<path d="M94 111 q6 3 12 0" fill="none" stroke="#1a1712" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  if (mood === "grumpy") {
    return `<path d="M88 114 q12 -6 24 0" fill="none" stroke="#1a1712" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  // content: classic cat "w" mouth
  return `<g fill="none" stroke="#1a1712" stroke-width="2.5" stroke-linecap="round">
    <path d="M100 108 q-7 8 -14 3"/>
    <path d="M100 108 q7 8 14 3"/>
  </g>`;
}
