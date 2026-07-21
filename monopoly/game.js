/* ═══════════════════════════════════════════════════════
   BRAMSOPOLY — moteur de jeu
   Monopoly complet : dés, loyers, avant-postes, cartes,
   prison de Carton, Bourreau Freydiss, bots, faillites.
   ═══════════════════════════════════════════════════════ */

'use strict';

/* ─────────── PLATEAU ─────────── */

const SET_COLORS = {
  brown: 'var(--set-brown)',
  lightblue: 'var(--set-lightblue)',
  pink: 'var(--set-pink)',
  orange: 'var(--set-orange)',
  red: 'var(--set-red)',
  yellow: 'var(--set-yellow)',
  green: 'var(--set-green)',
  darkblue: 'var(--set-darkblue)',
};

const BOARD = [
  { t: 'go', icon: '🧭', name: 'GRAND LINE', sub: 'Départ · touche 200M ₿' },
  { t: 'prop', icon: '🏡', name: 'Village de Fuchsia', set: 'brown', price: 60, house: 50, rent: [2, 10, 30, 90, 160, 250] },
  { t: 'chest', icon: '🧰', name: "Coffre de l'Équipage" },
  { t: 'prop', icon: '🌋', name: "Île d'Ayzeni", set: 'brown', price: 60, house: 50, rent: [4, 20, 60, 180, 320, 450] },
  { t: 'tax', icon: '💸', name: 'Impôt du Gouvernement Mondial', amount: 200 },
  { t: 'station', icon: '🏴‍☠️', name: 'Rang Pirate', price: 200 },
  { t: 'prop', icon: '🌺', name: 'Baie de VINN', set: 'lightblue', price: 100, house: 50, rent: [6, 30, 90, 270, 400, 550] },
  { t: 'chance', icon: '😈', name: 'Fruit du Démon' },
  { t: 'prop', icon: '🎤', name: 'Arène du Blind Test', set: 'lightblue', price: 100, house: 50, rent: [6, 30, 90, 270, 400, 550] },
  { t: 'prop', icon: '🔭', name: 'Village de Syrup', set: 'lightblue', price: 120, house: 50, rent: [8, 40, 100, 300, 450, 600] },
  { t: 'jail', icon: '⛓️', name: 'CELLULE DE CARTON', sub: 'Simple visite… ou pas' },
  { t: 'prop', icon: '🏟️', name: 'Quartier du Tournoi', set: 'pink', price: 140, house: 100, rent: [10, 50, 150, 450, 625, 750] },
  { t: 'util', icon: '🎙️', name: 'Salon Vocal', price: 150 },
  { t: 'prop', icon: '🎭', name: "Ruelle de l'Undercover", set: 'pink', price: 140, house: 100, rent: [10, 50, 150, 450, 625, 750] },
  { t: 'prop', icon: '🛒', name: 'Berry Shop', set: 'pink', price: 160, house: 100, rent: [12, 60, 180, 500, 700, 900] },
  { t: 'station', icon: '🗡️', name: 'Rang Shichibukai', price: 200 },
  { t: 'prop', icon: '🚰', name: 'Water Seven', set: 'orange', price: 180, house: 100, rent: [14, 70, 200, 550, 750, 950] },
  { t: 'chest', icon: '🧰', name: "Coffre de l'Équipage" },
  { t: 'prop', icon: '🌹', name: 'Dressrosa', set: 'orange', price: 180, house: 100, rent: [14, 70, 200, 550, 750, 950] },
  { t: 'prop', icon: '⚓', name: 'Marineford', set: 'orange', price: 200, house: 100, rent: [16, 80, 220, 600, 800, 1000] },
  { t: 'park', icon: '🛳️', name: 'THOUSAND SUNNY', sub: 'Escale libre' },
  { t: 'prop', icon: '🤴', name: 'Palais du Prince Charles', set: 'red', price: 220, house: 150, rent: [18, 90, 250, 700, 875, 1050] },
  { t: 'chance', icon: '😈', name: 'Fruit du Démon' },
  { t: 'prop', icon: '☁️', name: 'Skypiea', set: 'red', price: 220, house: 150, rent: [18, 90, 250, 700, 875, 1050] },
  { t: 'prop', icon: '🏜️', name: 'Alabasta', set: 'red', price: 240, house: 150, rent: [20, 100, 300, 750, 925, 1100] },
  { t: 'station', icon: '⭐', name: 'Rang Amiral', price: 200 },
  { t: 'prop', icon: '🐘', name: 'Zou', set: 'yellow', price: 260, house: 150, rent: [22, 110, 330, 800, 975, 1150] },
  { t: 'prop', icon: '🌸', name: 'Pays de Wano', set: 'yellow', price: 260, house: 150, rent: [22, 110, 330, 800, 975, 1150] },
  { t: 'util', icon: '🤖', name: 'Chat IA du Bot', price: 150 },
  { t: 'prop', icon: '🍰', name: 'Whole Cake Island', set: 'yellow', price: 280, house: 150, rent: [24, 120, 360, 850, 1025, 1200] },
  { t: 'gojail', icon: '🪓', name: 'LE BOURREAU FREYDISS', sub: 'Va au cachot !' },
  { t: 'prop', icon: '🏝️', name: 'Laugh Tale', set: 'green', price: 300, house: 200, rent: [26, 130, 390, 900, 1100, 1275] },
  { t: 'prop', icon: '🗻', name: 'Elbaf', set: 'green', price: 300, house: 200, rent: [26, 130, 390, 900, 1100, 1275] },
  { t: 'chest', icon: '🧰', name: "Coffre de l'Équipage" },
  { t: 'prop', icon: '👑', name: 'Château de la Reine Amel', set: 'green', price: 320, house: 200, rent: [28, 150, 450, 1000, 1200, 1400] },
  { t: 'station', icon: '👹', name: 'Rang Yonkou', price: 200 },
  { t: 'chance', icon: '😈', name: 'Fruit du Démon' },
  { t: 'prop', icon: '🎬', name: 'Studio de Brams', set: 'darkblue', price: 350, house: 200, rent: [35, 175, 500, 1100, 1300, 1500] },
  { t: 'tax', icon: '🐉', name: 'Taxe des Dragons Célestes', amount: 100 },
  { t: 'prop', icon: '🏆', name: 'Trône de Brams', set: 'darkblue', price: 400, house: 200, rent: [50, 200, 600, 1400, 1700, 2000] },
];

const JAIL_POS = 10;
const GO_BONUS = 200;
const JAIL_FINE = 50;

/* ─────────── CARTES ─────────── */

const CHANCE_CARDS = [
  { text: '⚔️ FREYDISS LE BOURREAU te condamne ! Direction la cellule de Carton, sans passer par la case Départ.', fx: g => sendToJail(g.cur()) },
  { text: '🏴‍☠️ Le vent est favorable — avance jusqu’au DÉPART et touche 200M ₿.', fx: g => moveDirect(g.cur(), 0) },
  { text: '👑 La Reine Amel t’invite à son château. Avance jusqu’à sa case.', fx: g => moveDirect(g.cur(), 34) },
  { text: '🤴 Le Prince Charles organise un bal en ton honneur — chaque pirate te paie 25M ₿.', fx: g => collectFromAll(g.cur(), 25) },
  { text: '🤖 Brams Score te hype dans le chat — +50M ₿.', fx: g => gain(g.cur(), 50) },
  { text: '🎤 Victoire écrasante au Blind Test ! +100M ₿.', fx: g => gain(g.cur(), 100) },
  { text: '🌊 Tempête sur Grand Line — recule de 3 cases.', fx: g => moveBack(g.cur(), 3) },
  { text: '🗝️ Carte « Évasion du cachot » — garde-la précieusement.', fx: g => { g.cur().jailCards++; } },
  { text: '💸 Amende du Gouvernement Mondial pour piraterie — paie 50M ₿.', fx: g => pay(g.cur(), 50, null) },
  { text: '🎬 Brams monte ton clip, c’est propre — +75M ₿.', fx: g => gain(g.cur(), 75) },
  { text: '🎭 Ayzeni te démasque à l’Undercover — paie 25M ₿.', fx: g => pay(g.cur(), 25, null) },
  { text: '⚓ Avance jusqu’au prochain Rang (gare).', fx: g => moveNextStation(g.cur()) },
];

const CHEST_CARDS = [
  { text: '💰 Trésor enfoui déterré sur la plage ! +200M ₿.', fx: g => gain(g.cur(), 200) },
  { text: '🏥 Frais de médecin après un duel — paie 50M ₿.', fx: g => pay(g.cur(), 50, null) },
  { text: '🎉 C’est ton anniversaire — chaque pirate te paie 20M ₿.', fx: g => collectFromAll(g.cur(), 20) },
  { text: '📦 Le Berry Shop te rembourse un achat — +45M ₿.', fx: g => gain(g.cur(), 45) },
  { text: '⚖️ Erreur du Gouvernement Mondial en ta faveur — +100M ₿.', fx: g => gain(g.cur(), 100) },
  { text: '🛠️ Réparations du navire — 25M ₿ par avant-poste, 100M ₿ par forteresse.', fx: g => payRepairs(g.cur()) },
  { text: '🗝️ Carte « Évasion du cachot » — garde-la.', fx: g => { g.cur().jailCards++; } },
  { text: '🏴‍☠️ Prime touchée sur un pirate ennemi — +50M ₿.', fx: g => gain(g.cur(), 50) },
  { text: '🎣 Grosse pêche revendue au marché — +30M ₿.', fx: g => gain(g.cur(), 30) },
  { text: '💀 Le Bourreau Freydiss prélève sa dîme — paie 75M ₿.', fx: g => pay(g.cur(), 75, null) },
  { text: '🚔 La Marine te rattrape — retourne à la cellule de Carton !', fx: g => sendToJail(g.cur()) },
  { text: '🎁 Cadeau de l’équipage — +10M ₿.', fx: g => gain(g.cur(), 10) },
];

/* ─────────── AUDIO (synthé) ─────────── */

let audioCtx = null;
let muted = false;

function ac() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(freq, dur, type = 'sine', vol = 0.12, delay = 0) {
  if (muted) return;
  try {
    const ctx = ac();
    const o = ctx.createOscillator();
    const gn = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    gn.gain.setValueAtTime(0, ctx.currentTime + delay);
    gn.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
    o.connect(gn).connect(ctx.destination);
    o.start(ctx.currentTime + delay);
    o.stop(ctx.currentTime + delay + dur + 0.05);
  } catch (e) { /* audio indisponible */ }
}

const SFX = {
  tick: () => tone(880, 0.05, 'square', 0.05),
  dice: () => { tone(220, 0.08, 'square', 0.08); tone(330, 0.08, 'square', 0.08, 0.07); tone(440, 0.1, 'square', 0.08, 0.14); },
  cash: () => { tone(1046, 0.09, 'triangle', 0.14); tone(1318, 0.12, 'triangle', 0.14, 0.08); },
  pay: () => { tone(392, 0.12, 'sawtooth', 0.07); tone(261, 0.16, 'sawtooth', 0.07, 0.1); },
  card: () => { tone(660, 0.07, 'triangle', 0.1); tone(990, 0.09, 'triangle', 0.1, 0.06); },
  jail: () => { tone(110, 0.4, 'sawtooth', 0.16); tone(82, 0.5, 'sawtooth', 0.16, 0.15); },
  build: () => { tone(523, 0.07, 'square', 0.09); tone(659, 0.07, 'square', 0.09, 0.06); tone(784, 0.1, 'square', 0.09, 0.12); },
  doom: () => { tone(98, 0.7, 'sawtooth', 0.2); tone(103, 0.7, 'sawtooth', 0.14, 0.02); tone(65, 0.9, 'sawtooth', 0.18, 0.3); },
  win: () => [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.14)),
};

/* ─────────── ÉTAT ─────────── */

const TOKENS = ['👒', '⚔️', '⚓', '🍖'];
const PCOLORS = ['#BFA46A', '#6fa8b8', '#a8433f', '#7d9c6a'];

const G = {
  players: [],
  turn: 0,
  phase: 'idle',       // idle | rolling | moving | action | over
  doubles: 0,
  lastRoll: [1, 1],
  chanceDeck: [],
  chestDeck: [],
  cur() { return this.players[this.turn]; },
};
window.G = G;

function makePlayer(i, name, isBot) {
  return {
    i, name, isBot,
    token: TOKENS[i],
    color: PCOLORS[i],
    cash: 1500,
    pos: 0,
    props: [],          // indices de cases possédées
    houses: {},         // idx -> 0..5 (5 = forteresse)
    inJail: false,
    jailTurns: 0,
    jailCards: 0,
    dead: false,
  };
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const fmt = n => `${n.toLocaleString('fr-FR')}M ₿`;
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

/* ─────────── SETUP ─────────── */

const $ = id => document.getElementById(id);
let setupCount = 3;

function renderSetup() {
  const wrap = $('setup-players');
  const prev = [...wrap.querySelectorAll('.setup-row')].map(r => ({
    name: r.querySelector('input').value,
    bot: r.querySelector('.human-toggle').classList.contains('bot'),
  }));
  wrap.innerHTML = '';
  for (let i = 0; i < setupCount; i++) {
    const row = document.createElement('div');
    row.className = 'setup-row';
    const wasBot = prev[i] ? prev[i].bot : i > 0;
    const name = prev[i] && prev[i].name ? prev[i].name : (i === 0 ? 'Capitaine' : (wasBot ? `Bot ${i}` : `Pirate ${i + 1}`));
    row.innerHTML = `
      <span class="tok">${TOKENS[i]}</span>
      <input maxlength="14" value="${name.replace(/"/g, '&quot;')}">
      <button class="human-toggle ${wasBot ? 'bot' : ''}">${wasBot ? '🤖 BOT' : '🧑 HUMAIN'}</button>`;
    row.querySelector('.human-toggle').onclick = e => {
      const b = e.currentTarget;
      b.classList.toggle('bot');
      b.textContent = b.classList.contains('bot') ? '🤖 BOT' : '🧑 HUMAIN';
    };
    wrap.appendChild(row);
  }
}

document.querySelectorAll('.count-btn').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('.count-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    setupCount = +b.dataset.n;
    renderSetup();
  };
});

$('start-btn').onclick = () => {
  ac();
  const rows = [...document.querySelectorAll('.setup-row')];
  G.players = rows.map((r, i) => makePlayer(
    i,
    r.querySelector('input').value.trim() || `Pirate ${i + 1}`,
    r.querySelector('.human-toggle').classList.contains('bot')
  ));
  G.chanceDeck = shuffle(CHANCE_CARDS);
  G.chestDeck = shuffle(CHEST_CARDS);
  $('setup-screen').hidden = true;
  $('setup-screen').style.display = 'none';
  $('game-root').hidden = false;
  buildBoard();
  renderPlayers();
  placeAllTokens(false);
  log(`⚓ La partie commence ! ${G.players.map(p => p.token + ' ' + p.name).join(' · ')}`, null, true);
  startTurn();
};

renderSetup();

$('mute-btn').onclick = () => {
  muted = !muted;
  $('mute-btn').textContent = muted ? '🔇' : '🔊';
};

/* ─────────── PLATEAU (rendu) ─────────── */

function gridPos(i) {
  if (i === 0) return [11, 11];
  if (i < 10) return [11, 11 - i];
  if (i === 10) return [11, 1];
  if (i < 20) return [21 - i, 1];
  if (i === 20) return [1, 1];
  if (i < 30) return [1, i - 19];
  if (i === 30) return [1, 11];
  return [i - 29, 11];
}

function sideClass(i) {
  if (i % 10 === 0) return 'corner';
  if (i < 10) return 'side-bottom';
  if (i < 20) return 'side-left';
  if (i < 30) return 'side-top';
  return 'side-right';
}

function buildBoard() {
  const board = $('board');
  BOARD.forEach((c, i) => {
    const el = document.createElement('div');
    const side = sideClass(i);
    el.className = `cell ${side} ${c.t === 'gojail' ? 'gojail' : ''} ${side === 'corner' ? 'corner' : ''}`;
    el.dataset.i = i;
    const [r, col] = gridPos(i);
    el.style.gridArea = `${r} / ${col}`;
    if (c.set) el.style.setProperty('--band', SET_COLORS[c.set]);
    let inner = '';
    if (c.set) inner += `<span class="band"></span>`;
    inner += `<span class="houses" data-h=""></span>`;
    inner += `<span class="icon">${c.icon}</span>`;
    inner += `<span class="name">${c.name}</span>`;
    if (c.price) inner += `<span class="price">${fmt(c.price)}</span>`;
    else if (c.amount) inner += `<span class="price">−${fmt(c.amount)}</span>`;
    else if (c.sub) inner += `<span class="price">${c.sub}</span>`;
    el.innerHTML = inner;
    el.onclick = () => showDeed(i);
    board.appendChild(el);
  });
  window.addEventListener('resize', () => placeAllTokens(false));
}

function cellEl(i) { return document.querySelector(`.cell[data-i="${i}"]`); }

function refreshCellOwners() {
  BOARD.forEach((c, i) => {
    const el = cellEl(i);
    if (!el) return;
    const old = el.querySelector('.owner-tag');
    if (old) old.remove();
    const owner = ownerOf(i);
    if (owner) {
      const tag = document.createElement('span');
      tag.className = 'owner-tag';
      tag.style.background = owner.color;
      tag.style.color = owner.color;
      el.appendChild(tag);
    }
    const h = el.querySelector('.houses');
    if (h && owner && c.t === 'prop') {
      const n = owner.houses[i] || 0;
      h.textContent = n === 5 ? '🏰' : '🏠'.repeat(n);
    } else if (h) h.textContent = '';
  });
}

/* ─────────── PIONS ─────────── */

function tokenXY(pos, pIdx) {
  const el = cellEl(pos);
  const wrap = $('board').getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const alive = G.players.filter(p => !p.dead && p.pos === pos);
  const k = Math.max(0, alive.findIndex(p => p.i === pIdx));
  const n = Math.max(1, alive.length);
  const ang = (k / n) * Math.PI * 2 - Math.PI / 2;
  const rad = n > 1 ? Math.min(r.width, r.height) * 0.18 : 0;
  return {
    x: r.left - wrap.left + r.width / 2 + Math.cos(ang) * rad,
    y: r.top - wrap.top + r.height / 2 + Math.sin(ang) * rad,
  };
}

function placeAllTokens(animate = true) {
  const layer = $('tokens-layer');
  G.players.forEach(p => {
    let t = layer.querySelector(`.token[data-p="${p.i}"]`);
    if (!t) {
      t = document.createElement('div');
      t.className = 'token';
      t.dataset.p = p.i;
      t.textContent = p.token;
      layer.appendChild(t);
    }
    if (p.dead) { t.classList.add('dead'); return; }
    const { x, y } = tokenXY(p.pos, p.i);
    if (!animate) t.style.transition = 'none';
    t.style.left = x + 'px';
    t.style.top = y + 'px';
    if (!animate) requestAnimationFrame(() => { t.style.transition = ''; });
  });
}

/* ─────────── LOG + UI ─────────── */

function log(msg, player = null, important = false) {
  const e = document.createElement('div');
  e.className = 'log-entry' + (important ? ' important' : '');
  if (player) e.style.setProperty('--lc', player.color);
  e.textContent = msg;
  const l = $('log');
  l.prepend(e);
  while (l.children.length > 60) l.lastChild.remove();
}

function renderPlayers() {
  const panel = $('players-panel');
  panel.innerHTML = '';
  G.players.forEach(p => {
    const card = document.createElement('div');
    card.className = 'player-card' + (p.i === G.turn && !p.dead ? ' current' : '') + (p.dead ? ' dead' : '');
    card.style.setProperty('--pc', p.color);
    const badges = [];
    if (p.inJail) badges.push('⛓️ au cachot');
    if (p.jailCards) badges.push(`🗝️ ×${p.jailCards}`);
    if (p.isBot) badges.push('🤖');
    const chips = p.props.map(idx => {
      const c = BOARD[idx];
      const cls = c.t === 'station' ? 'st' : c.t === 'util' ? 'ut' : '';
      const bg = c.set ? `style="--chip:${SET_COLORS[c.set]}"` : '';
      return `<span class="prop-chip ${cls}" ${bg} data-deed="${idx}" title="${c.name}"></span>`;
    }).join('');
    card.innerHTML = `
      <div class="pc-top">
        <span class="pc-tok">${p.token}</span>
        <span class="pc-name">${esc(p.name)}</span>
        <span class="pc-cash" data-cash="${p.i}">${p.dead ? '☠️' : fmt(p.cash)}</span>
      </div>
      <div class="pc-props">${chips}</div>
      ${badges.length ? `<div class="pc-badges">${badges.join(' · ')}</div>` : ''}`;
    panel.appendChild(card);
  });
  panel.querySelectorAll('[data-deed]').forEach(ch => {
    ch.onclick = () => showDeed(+ch.dataset.deed);
  });
  refreshCellOwners();
}

function flashCash(p, up) {
  const el = document.querySelector(`[data-cash="${p.i}"]`);
  if (!el) return;
  el.classList.remove('flash-up', 'flash-down');
  void el.offsetWidth;
  el.classList.add(up ? 'flash-up' : 'flash-down');
}

function setBanner(msg) { $('turn-banner').textContent = msg; }

function setActions(list) {
  const zone = $('action-zone');
  zone.innerHTML = '';
  list.forEach(a => {
    const b = document.createElement('button');
    b.className = 'act-btn' + (a.style ? ' ' + a.style : '');
    b.textContent = a.label;
    if (a.disabled) b.disabled = true;
    b.onclick = () => { zone.innerHTML = ''; a.fn(); };
    zone.appendChild(b);
  });
}

function showCard(kind, text) {
  const d = $('card-display');
  d.hidden = false;
  d.className = 'card-display' + (kind === 'chest' ? ' chest' : '');
  d.innerHTML = `<div class="card-tag">${kind === 'chest' ? "🧰 Coffre de l'Équipage" : '😈 Fruit du Démon'}</div>${text}`;
  SFX.card();
}

function hideCard() { $('card-display').hidden = true; }

/* ─────────── ARGENT ─────────── */

function gain(p, amount) {
  p.cash += amount;
  log(`💰 ${p.name} touche ${fmt(amount)}.`, p);
  SFX.cash();
  renderPlayers();
  flashCash(p, true);
}

// pay : to = joueur créditeur ou null (banque). Gère la faillite.
function pay(p, amount, to) {
  liquidateIfNeeded(p, amount);
  if (p.cash < amount) { bankrupt(p, to); return false; }
  p.cash -= amount;
  if (to) {
    to.cash += amount;
    log(`💸 ${p.name} paie ${fmt(amount)} à ${to.name}.`, p);
  } else {
    log(`💸 ${p.name} paie ${fmt(amount)} à la banque.`, p);
  }
  SFX.pay();
  renderPlayers();
  flashCash(p, false);
  if (to) flashCash(to, true);
  return true;
}

function collectFromAll(p, amount) {
  G.players.forEach(o => {
    if (o !== p && !o.dead) {
      liquidateIfNeeded(o, amount);
      if (o.cash < amount) { bankrupt(o, p); return; }
      o.cash -= amount;
      p.cash += amount;
    }
  });
  log(`🎉 ${p.name} collecte ${fmt(amount)} auprès de chaque pirate.`, p);
  SFX.cash();
  renderPlayers();
}

function payRepairs(p) {
  let total = 0;
  Object.values(p.houses).forEach(n => { total += n === 5 ? 100 : n * 25; });
  if (total > 0) pay(p, total, null);
  else log(`🛠️ ${p.name} n'a rien à réparer.`, p);
}

// vend automatiquement des bâtiments (à moitié prix) pour couvrir une dette
function liquidateIfNeeded(p, amount) {
  while (p.cash < amount) {
    const built = Object.keys(p.houses).filter(i => p.houses[i] > 0);
    if (!built.length) break;
    built.sort((a, b) => BOARD[b].house - BOARD[a].house);
    const idx = built[0];
    p.houses[idx]--;
    p.cash += Math.floor(BOARD[idx].house / 2);
    log(`🔨 ${p.name} vend un bâtiment sur ${BOARD[idx].name} pour éponger ses dettes.`, p);
  }
}

function bankrupt(p, creditor) {
  p.dead = true;
  if (creditor && !creditor.dead) {
    creditor.cash += Math.max(0, p.cash);
    p.props.forEach(i => { creditor.props.push(i); creditor.houses[i] = p.houses[i] || 0; });
    log(`☠️ ${p.name} fait FAILLITE ! Tout son butin revient à ${creditor.name}.`, p, true);
  } else {
    log(`☠️ ${p.name} fait FAILLITE ! Ses terres retournent à la banque.`, p, true);
  }
  p.cash = 0;
  p.props = [];
  p.houses = {};
  SFX.doom();
  renderPlayers();
  placeAllTokens();
  checkVictory();
}

function checkVictory() {
  const alive = G.players.filter(p => !p.dead);
  if (alive.length === 1) {
    G.phase = 'over';
    const w = alive[0];
    log(`👑 ${w.name} remporte la partie avec ${fmt(w.cash)} !`, w, true);
    setTimeout(() => showVictory(w), 900);
    return true;
  }
  return false;
}

/* ─────────── PROPRIÉTÉS ─────────── */

function ownerOf(i) {
  return G.players.find(p => !p.dead && p.props.includes(i)) || null;
}

function ownsFullSet(p, set) {
  const all = BOARD.map((c, i) => (c.set === set ? i : -1)).filter(i => i >= 0);
  return all.every(i => p.props.includes(i));
}

function rentOf(i, diceSum) {
  const c = BOARD[i];
  const o = ownerOf(i);
  if (!o) return 0;
  if (c.t === 'station') {
    const n = o.props.filter(j => BOARD[j].t === 'station').length;
    return [0, 25, 50, 100, 200][n];
  }
  if (c.t === 'util') {
    const n = o.props.filter(j => BOARD[j].t === 'util').length;
    return diceSum * (n === 2 ? 10 : 4);
  }
  const h = o.houses[i] || 0;
  if (h > 0) return c.rent[h];
  return ownsFullSet(o, c.set) ? c.rent[0] * 2 : c.rent[0];
}

/* ─────────── TOUR DE JEU ─────────── */

function startTurn() {
  if (G.phase === 'over') return;
  const p = G.cur();
  if (p.dead) { nextTurn(); return; }
  G.phase = 'idle';
  renderPlayers();
  hideCard();
  setBanner(`${p.token} Au tour de ${p.name}`);

  if (p.inJail) return jailTurn(p);

  if (p.isBot) {
    setActions([]);
    setTimeout(() => rollDice(), 900);
  } else {
    setActions([
      { label: '🎲 Lancer les dés', style: 'primary', fn: rollDice },
      { label: '🏗️ Gérer', fn: () => openManage(p) },
    ]);
  }
}

function jailTurn(p) {
  setBanner(`⛓️ ${p.name} est au cachot avec Carton (tour ${p.jailTurns + 1}/3)`);
  const opts = [];
  opts.push({ label: '🎲 Tenter un double', style: 'primary', fn: () => rollDice(true) });
  if (p.jailCards > 0) opts.push({ label: '🗝️ Utiliser la carte Évasion', fn: () => { p.jailCards--; freeFromJail(p, 'sa carte Évasion'); } });
  if (p.cash >= JAIL_FINE) opts.push({ label: `💸 Payer la caution (${fmt(JAIL_FINE)})`, fn: () => { pay(p, JAIL_FINE, null); freeFromJail(p, 'la caution'); } });

  if (p.isBot) {
    setActions([]);
    setTimeout(() => {
      if (p.jailCards > 0) { p.jailCards--; freeFromJail(p, 'sa carte Évasion'); }
      else if (p.cash >= 200) { pay(p, JAIL_FINE, null); freeFromJail(p, 'la caution'); }
      else rollDice(true);
    }, 900);
  } else {
    setActions(opts);
  }
}

function freeFromJail(p, how) {
  p.inJail = false;
  p.jailTurns = 0;
  log(`🔓 ${p.name} s'évade du cachot grâce à ${how}. Carton le regarde partir…`, p);
  renderPlayers();
  if (p.isBot) setTimeout(() => rollDice(), 700);
  else setActions([{ label: '🎲 Lancer les dés', style: 'primary', fn: rollDice }]);
}

function rollDice(fromJail = false) {
  if (G.phase === 'rolling' || G.phase === 'moving') return;
  G.phase = 'rolling';
  const p = G.cur();
  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  G.lastRoll = [d1, d2];
  SFX.dice();

  const e1 = $('die1'), e2 = $('die2');
  [e1, e2].forEach(e => {
    e.classList.remove('rolling');
    void e.offsetWidth;
    e.classList.add('rolling');
    if (e.children.length < 9) e.innerHTML = '<span class="pip"></span>'.repeat(9);
  });
  let flick = 0;
  const iv = setInterval(() => {
    e1.dataset.v = 1 + Math.floor(Math.random() * 6);
    e2.dataset.v = 1 + Math.floor(Math.random() * 6);
    if (++flick >= 6) {
      clearInterval(iv);
      e1.dataset.v = d1;
      e2.dataset.v = d2;
      resolveRoll(p, d1, d2, fromJail);
    }
  }, 90);
}

function resolveRoll(p, d1, d2, fromJail) {
  const isDouble = d1 === d2;
  setBanner(`${p.token} ${p.name} lance ${d1} + ${d2}${isDouble ? ' — DOUBLE !' : ''}`);

  if (fromJail) {
    if (isDouble) {
      p.inJail = false; p.jailTurns = 0;
      log(`🎲 DOUBLE ! ${p.name} force la porte du cachot !`, p, true);
      G.doubles = 0;
      moveSteps(p, d1 + d2);
    } else {
      p.jailTurns++;
      if (p.jailTurns >= 3) {
        log(`⛓️ 3 échecs — ${p.name} paie la caution de force et sort.`, p);
        if (!pay(p, JAIL_FINE, null)) return;
        p.inJail = false; p.jailTurns = 0;
        moveSteps(p, d1 + d2);
      } else {
        log(`🎲 Raté… ${p.name} reste au cachot avec Carton.`, p);
        endTurn();
      }
    }
    return;
  }

  if (isDouble) {
    G.doubles++;
    if (G.doubles >= 3) {
      log(`🚨 3 doubles d'affilée ! Le Bourreau Freydiss ne laisse rien passer…`, p, true);
      executioner(p);
      return;
    }
  } else {
    G.doubles = 0;
  }
  moveSteps(p, d1 + d2);
}

function moveSteps(p, steps) {
  G.phase = 'moving';
  let left = steps;
  const step = () => {
    if (G.phase === 'over') return;
    p.pos = (p.pos + 1) % 40;
    if (p.pos === 0) {
      p.cash += GO_BONUS;
      log(`🧭 ${p.name} passe par la case Départ — +${fmt(GO_BONUS)} !`, p);
      SFX.cash();
      renderPlayers();
    }
    const t = document.querySelector(`.token[data-p="${p.i}"]`);
    if (t) { t.classList.remove('hop'); void t.offsetWidth; t.classList.add('hop'); }
    placeAllTokens();
    SFX.tick();
    if (--left > 0) setTimeout(step, 150);
    else setTimeout(() => land(p), 220);
  };
  setTimeout(step, 160);
}

function moveDirect(p, dest) {
  if (dest === 0 || dest < p.pos) {
    p.cash += GO_BONUS;
    log(`🧭 ${p.name} passe par la case Départ — +${fmt(GO_BONUS)} !`, p);
  }
  p.pos = dest;
  placeAllTokens();
  renderPlayers();
  setTimeout(() => land(p, true), 500);
}

function moveBack(p, n) {
  p.pos = (p.pos - n + 40) % 40;
  placeAllTokens();
  setTimeout(() => land(p, true), 500);
}

function moveNextStation(p) {
  let d = p.pos;
  do { d = (d + 1) % 40; } while (BOARD[d].t !== 'station');
  moveDirect(p, d);
}

/* ─────────── AMBIANCE ─────────── */

const FLAVOR = {
  3: ["🎭 Ayzeni t'observe depuis la falaise, un rôle secret en tête…"],
  6: ["🌺 VINN t'accueille : « Touche à rien, tout ici appartient au grand Al Freydiss. »",
      "🌺 VINN astique le trône portatif d'Al Freydiss. Elle ne te calcule même pas."],
  10: ["⛓️ Carton, derrière les barreaux : « J'suis innocent, j'te jure. »",
       "⛓️ Carton grave un 47e bâton sur le mur de sa cellule.",
       "⛓️ Carton demande des nouvelles de son avocat. Personne n'a jamais vu son avocat."],
  21: ["🤴 Le Prince Charles te toise depuis son balcon doré.",
       "🤴 Charles ajuste sa couronne : « Ici, on s'incline. »"],
  34: ["👑 La Reine Amel ne reçoit que sur rendez-vous.",
       "👑 Un garde murmure : « Sa Majesté Amel a un château. Toi, non. »"],
  37: ["🎬 Brams est en plein montage. Silence sur le plateau."],
  39: ["🏆 Le Trône de Brams brille de mille feux."],
};

function flavor(pos) {
  const fl = FLAVOR[pos];
  if (fl && Math.random() < 0.55) log(fl[Math.floor(Math.random() * fl.length)]);
}

/* ─────────── ATTERRISSAGE ─────────── */

function land(p, fromCard = false) {
  if (p.dead || G.phase === 'over') return;
  G.phase = 'action';
  const c = BOARD[p.pos];
  const el = cellEl(p.pos);
  if (el) { el.classList.remove('landed'); void el.offsetWidth; el.classList.add('landed'); }
  flavor(p.pos);

  switch (c.t) {
    case 'go':
      log(`🧭 ${p.name} se pose sur la case Départ.`, p);
      endTurn();
      break;

    case 'park':
      log(`🛳️ ${p.name} fait escale sur le Thousand Sunny. Repos bien mérité.`, p);
      endTurn();
      break;

    case 'jail':
      log(`⛓️ ${p.name} rend une petite visite à Carton dans sa cellule. 👋`, p);
      endTurn();
      break;

    case 'gojail':
      executioner(p);
      break;

    case 'tax':
      log(`${c.icon} ${c.name} — ${p.name} doit ${fmt(c.amount)}.`, p);
      if (pay(p, c.amount, null)) endTurn();
      else endTurn();
      break;

    case 'chance':
      drawCard('chance', p);
      break;

    case 'chest':
      drawCard('chest', p);
      break;

    case 'prop':
    case 'station':
    case 'util':
      landProperty(p, c, fromCard);
      break;
  }
}

function landProperty(p, c, fromCard) {
  const owner = ownerOf(p.pos);
  if (!owner) {
    if (p.isBot) {
      const buffer = 120 + Math.floor(Math.random() * 120);
      if (p.cash >= c.price + buffer) buyProperty(p, p.pos);
      else log(`🤖 ${p.name} passe son tour sur ${c.name}.`, p);
      endTurn();
    } else {
      setBanner(`${c.icon} ${c.name} est libre — ${fmt(c.price)}`);
      setActions([
        { label: `💰 Acheter (${fmt(c.price)})`, style: 'primary', disabled: p.cash < c.price, fn: () => { buyProperty(p, p.pos); endTurn(); } },
        { label: 'Passer', fn: endTurn },
      ]);
    }
    return;
  }
  if (owner === p) {
    log(`${c.icon} ${p.name} se repose sur ses terres (${c.name}).`, p);
    endTurn();
    return;
  }
  const rent = rentOf(p.pos, G.lastRoll[0] + G.lastRoll[1]);
  log(`${c.icon} ${c.name} appartient à ${owner.name} — loyer : ${fmt(rent)}.`, p);
  pay(p, rent, owner);
  endTurn();
}

function buyProperty(p, i) {
  const c = BOARD[i];
  p.cash -= c.price;
  p.props.push(i);
  p.houses[i] = p.houses[i] || 0;
  log(`📜 ${p.name} achète ${c.name} pour ${fmt(c.price)} !`, p, true);
  SFX.cash();
  renderPlayers();
  flashCash(p, false);
}

function drawCard(kind, p) {
  const deck = kind === 'chance' ? G.chanceDeck : G.chestDeck;
  const card = deck.shift();
  deck.push(card);
  showCard(kind, card.text);
  log(`${kind === 'chance' ? '😈' : '🧰'} ${p.name} pioche : ${card.text}`, p);
  setTimeout(() => {
    card.fx(G);
    // les effets de déplacement enchaînent eux-mêmes ; les autres terminent le tour
    const moving = ['moveDirect', 'moveBack', 'moveNextStation'];
    if (!card._moves) {
      const src = card.fx.toString();
      card._moves = moving.some(m => src.includes(m)) || src.includes('sendToJail');
      card._isMove = moving.some(m => src.includes(m));
    }
    if (!card._moves) setTimeout(endTurn, 600);
  }, 1400);
}

/* ─────────── BOURREAU / PRISON ─────────── */

function executioner(p) {
  SFX.doom();
  const root = $('game-root');
  root.classList.remove('shake');
  void root.offsetWidth;
  root.classList.add('shake');
  const ov = $('executioner-overlay');
  ov.hidden = false;
  // relance les animations
  ov.querySelectorAll('.exec-axe, .exec-title, .exec-sub').forEach(e => {
    e.style.animation = 'none';
    void e.offsetWidth;
    e.style.animation = '';
  });
  setTimeout(() => {
    ov.hidden = true;
    sendToJail(p);
  }, 2100);
}

function sendToJail(p) {
  p.pos = JAIL_POS;
  p.inJail = true;
  p.jailTurns = 0;
  G.doubles = 0;
  log(`🪓 ${p.name} est jeté au cachot ! Carton lui fait une place. ⛓️`, p, true);
  SFX.jail();
  placeAllTokens();
  renderPlayers();
  setTimeout(endTurn, 700);
}

/* ─────────── FIN DE TOUR ─────────── */

function endTurn() {
  if (G.phase === 'over') return;
  const p = G.cur();
  hideCard();
  if (checkVictory()) return;

  if (G.doubles > 0 && !p.dead && !p.inJail) {
    log(`🎲 Double ! ${p.name} rejoue.`, p);
    if (p.isBot) { G.phase = 'idle'; setTimeout(() => rollDice(), 900); }
    else {
      G.phase = 'idle';
      setActions([
        { label: '🎲 Relancer (double !)', style: 'primary', fn: rollDice },
        { label: '🏗️ Gérer', fn: () => openManage(p) },
      ]);
    }
    return;
  }
  nextTurn();
}

function nextTurn() {
  G.doubles = 0;
  let n = 0;
  do {
    G.turn = (G.turn + 1) % G.players.length;
    n++;
  } while (G.cur().dead && n < 8);
  setTimeout(startTurn, 500);
}

/* ─────────── GESTION (avant-postes) ─────────── */

function openManage(p) {
  const ov = $('manage-overlay');
  ov.hidden = false;
  renderManage(p);
}

function renderManage(p) {
  const list = $('manage-list');
  list.innerHTML = '';
  const buildable = p.props.filter(i => BOARD[i].t === 'prop');
  if (!buildable.length) {
    list.innerHTML = `<div style="text-align:center;color:var(--ink-dim);font-style:italic;padding:20px">
      Aucune terre à bâtir pour l'instant, capitaine. 🏴‍☠️</div>`;
    return;
  }
  buildable.sort((a, b) => a - b).forEach(i => {
    const c = BOARD[i];
    const full = ownsFullSet(p, c.set);
    const h = p.houses[i] || 0;
    const row = document.createElement('div');
    row.className = 'manage-row';
    const label = h === 5 ? '🏰 Forteresse' : h > 0 ? '🏠'.repeat(h) : (full ? 'terrain nu' : 'set incomplet');
    row.innerHTML = `
      <span class="sw" style="background:${SET_COLORS[c.set]}"></span>
      <span>${c.name}<br><span class="mono">${label} · loyer actuel ${fmt(rentOf2(p, i))}</span></span>
      <button class="mini-btn" data-a="build" ${(!full || h >= 5 || p.cash < c.house) ? 'disabled' : ''}>+ ${fmt(c.house)}</button>
      <button class="mini-btn" data-a="sell" ${h <= 0 ? 'disabled' : ''}>− vendre</button>`;
    row.querySelector('[data-a="build"]').onclick = () => {
      if (p.cash < c.house) return;
      p.cash -= c.house;
      p.houses[i] = h + 1;
      log(`🏗️ ${p.name} bâtit ${p.houses[i] === 5 ? 'une FORTERESSE' : 'un avant-poste'} sur ${c.name} !`, p);
      SFX.build();
      renderPlayers();
      renderManage(p);
    };
    row.querySelector('[data-a="sell"]').onclick = () => {
      p.houses[i] = h - 1;
      p.cash += Math.floor(c.house / 2);
      log(`🔨 ${p.name} démonte un bâtiment sur ${c.name} (+${fmt(Math.floor(c.house / 2))}).`, p);
      renderPlayers();
      renderManage(p);
    };
    list.appendChild(row);
  });
}

// loyer théorique pour l'écran de gestion (sans dés)
function rentOf2(p, i) {
  const c = BOARD[i];
  const h = p.houses[i] || 0;
  if (h > 0) return c.rent[h];
  return ownsFullSet(p, c.set) ? c.rent[0] * 2 : c.rent[0];
}

$('manage-close').onclick = () => { $('manage-overlay').hidden = true; };
$('manage-overlay').onclick = e => { if (e.target === $('manage-overlay')) $('manage-overlay').hidden = true; };

/* ─────────── BOTS : construction auto ─────────── */

function botBuild(p) {
  if (!p.isBot || p.dead) return;
  let guard = 0;
  while (p.cash > 450 && guard++ < 10) {
    const targets = p.props.filter(i =>
      BOARD[i].t === 'prop' &&
      ownsFullSet(p, BOARD[i].set) &&
      (p.houses[i] || 0) < 5 &&
      p.cash - BOARD[i].house > 350
    );
    if (!targets.length) break;
    targets.sort((a, b) => (p.houses[a] || 0) - (p.houses[b] || 0) || BOARD[a].house - BOARD[b].house);
    const i = targets[0];
    p.cash -= BOARD[i].house;
    p.houses[i] = (p.houses[i] || 0) + 1;
    log(`🤖🏗️ ${p.name} bâtit sur ${BOARD[i].name}.`, p);
    SFX.build();
  }
  renderPlayers();
}

// hook : les bots construisent en début de tour
const _origStartTurn = startTurn;
startTurn = function () {
  const p = G.cur && G.cur();
  if (p && p.isBot && !p.dead && !p.inJail) botBuild(p);
  _origStartTurn();
};

/* ─────────── TITRE DE PROPRIÉTÉ (deed) ─────────── */

function showDeed(i) {
  const c = BOARD[i];
  const ov = $('deed-overlay');
  const card = $('deed-card');
  const owner = ownerOf(i);

  let bandBg = 'linear-gradient(180deg,#d8c795,#BFA46A)';
  if (c.set) bandBg = SET_COLORS[c.set];

  let body = '';
  if (c.t === 'prop') {
    const names = ['Loyer terrain nu', '1 avant-poste 🏠', '2 avant-postes', '3 avant-postes', '4 avant-postes', 'Forteresse 🏰'];
    body = c.rent.map((r, k) => `<div class="deed-row"><span>${names[k]}</span><b>${fmt(r)}</b></div>`).join('');
    body += `<div class="deed-row"><span>Set complet nu</span><b>loyer ×2</b></div>`;
    body += `<div class="deed-row"><span>Prix du bâtiment</span><b>${fmt(c.house)}</b></div>`;
    body += `<div class="deed-row"><span>Prix d'achat</span><b>${fmt(c.price)}</b></div>`;
  } else if (c.t === 'station') {
    body = [1, 2, 3, 4].map(n =>
      `<div class="deed-row"><span>${n} Rang${n > 1 ? 's' : ''} possédé${n > 1 ? 's' : ''}</span><b>${fmt([25, 50, 100, 200][n - 1])}</b></div>`).join('');
    body += `<div class="deed-row"><span>Prix d'achat</span><b>${fmt(c.price)}</b></div>`;
  } else if (c.t === 'util') {
    body = `<div class="deed-row"><span>1 service possédé</span><b>4 × les dés</b></div>
            <div class="deed-row"><span>2 services possédés</span><b>10 × les dés</b></div>
            <div class="deed-row"><span>Prix d'achat</span><b>${fmt(c.price)}</b></div>`;
  } else if (c.t === 'tax') {
    body = `<div class="deed-row"><span>Montant dû</span><b>${fmt(c.amount)}</b></div>`;
  } else if (c.t === 'gojail') {
    body = `<div style="text-align:center;padding:8px;font-style:italic">
      Le Bourreau Freydiss ⚔️ ne négocie pas.<br>Quiconque s'arrête ici finit au cachot de Carton.</div>`;
  } else if (c.t === 'jail') {
    body = `<div style="text-align:center;padding:8px;font-style:italic">
      Carton purge sa peine ici depuis toujours.<br>Caution : ${fmt(JAIL_FINE)} · 3 tours max.</div>`;
  } else {
    body = `<div style="text-align:center;padding:8px;font-style:italic">${c.sub || ''}</div>`;
  }

  card.innerHTML = `
    <div class="deed-band" style="background:${bandBg}">${c.icon} ${c.name}</div>
    <div class="deed-body">${body}
      <div class="deed-owner">${owner ? `Propriété de ${owner.token} ${esc(owner.name)}` : (c.price ? 'Sans propriétaire' : '')}</div>
    </div>`;
  ov.hidden = false;
}

$('deed-overlay').onclick = () => { $('deed-overlay').hidden = true; };

/* ─────────── VICTOIRE + CONFETTIS ─────────── */

function showVictory(w) {
  $('win-title').textContent = `${w.token} ${w.name}`;
  const sub = document.querySelector('.win-sub');
  if (sub) sub.textContent = `Roi des Pirates du serveur · ${fmt(w.cash)} · ${w.props.length} territoire${w.props.length > 1 ? 's' : ''}`;
  $('win-overlay').hidden = false;
  SFX.win();
  confetti();
}

/* ─────────── CLAVIER ─────────── */

document.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    const b = document.querySelector('.act-btn.primary');
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  }
  if (e.key === 'm' || e.key === 'M') $('mute-btn').click();
});

function confetti() {
  const cv = $('confetti-canvas');
  const ctx = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight;
  const cols = ['#BFA46A', '#e9d9ac', '#a8433f', '#6fa8b8', '#e8e2d4'];
  const parts = Array.from({ length: 160 }, () => ({
    x: Math.random() * cv.width,
    y: -20 - Math.random() * cv.height,
    w: 6 + Math.random() * 6,
    h: 4 + Math.random() * 8,
    vy: 2 + Math.random() * 3.5,
    vx: -1.5 + Math.random() * 3,
    rot: Math.random() * Math.PI,
    vr: -0.1 + Math.random() * 0.2,
    c: cols[Math.floor(Math.random() * cols.length)],
  }));
  let frames = 0;
  (function loop() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.y > cv.height + 20) { p.y = -20; p.x = Math.random() * cv.width; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (++frames < 60 * 12) requestAnimationFrame(loop);
  })();
}
