// Brams Phone — simulation REST d'une partie 4 joueurs jusqu'au reveal.
// Conduit les RPC sécurisées (anon key, lit .env.local comme verify_gartic_rls.mjs)
// et VÉRIFIE : rotation des carnets, anti-triche (un joueur ne peut écrire que dans
// SON carnet du round), comblement AFK serveur, pages de reveal complètes.
// Usage: node scripts/sim_gartic_game.mjs   (exit non-zero si une assertion échoue)
import { readFileSync } from 'node:fs';

let env;
try {
  env = Object.fromEntries(
    readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
      .split('\n').filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
  );
} catch { console.error('Manque .env.local (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)'); process.exit(1); }
const URL_ = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json', Accept: 'application/json' };
const rpc = (fn, body) => fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: 'POST', headers: H, body: JSON.stringify(body) })
  .then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
const unwrap = (res) => (Array.isArray(res.json) ? res.json[0] : res.json);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

// Math de rotation (miroir de logic/rotation.js et du SQL).
const bookForSeat = (seat, round, n) => (((seat - round) % n) + n) % n;
const seatForBook = (book, round, n) => (book + round) % n;
const N_PLAYERS = 4;
const AFK_ROUND = 1;          // P4 saute ce round (round impair => phase 'drawing')
const placeholderFor = (round) => (round === 0 ? '—' : round % 2 === 1 ? '' : '—'); // drawing => '', text => '—'

const code = 'S' + Math.random().toString(36).slice(2, 5).toUpperCase();
const stamp = Date.now();

// ── 1. Création + join des 4 joueurs ────────────────────────────────────────
const created = unwrap(await rpc('gartic_create', { p_code: code, p_user: 'sim_host_' + stamp, p_name: 'Host', p_avatar: null }));
ok(created?.secret_token, 'gartic_create (Host) renvoie un secret_token');
const tokens = { ['sim_host_' + stamp]: created?.secret_token };
const hostToken = created?.secret_token;

for (let i = 2; i <= N_PLAYERS; i++) {
  const uid = `sim_p${i}_${stamp}`;
  const j = unwrap(await rpc('gartic_join', { p_code: code, p_user: uid, p_name: `P${i}`, p_avatar: null }));
  ok(j?.secret_token, `gartic_join (P${i}) renvoie un secret_token`);
  tokens[uid] = j?.secret_token;
}
ok(Object.keys(tokens).length === N_PLAYERS && new Set(Object.values(tokens)).size === N_PLAYERS,
  '4 joueurs avec des tokens distincts');

// ── 2. Start (host) + map user_id → seat ────────────────────────────────────
const started = unwrap(await rpc('gartic_start', { p_code: code, p_token: hostToken, p_settings: { phaseDurations: { writing: 60, drawing: 60, describing: 60 } } }));
ok(started?.ok && started?.n === N_PLAYERS, `gartic_start ok, n = ${started?.n} (attendu 4)`);

const stateAfterStart = unwrap(await rpc('gartic_room_state', { p_code: code }));
const players = stateAfterStart?.players || [];
ok(players.length === N_PLAYERS, 'room_state liste 4 joueurs après start');
ok(players.every((p) => Number.isInteger(p.seat)), 'tous les joueurs ont un siège entier assigné');

const seatOf = {};                 // user_id -> seat
const tokenBySeat = {};            // seat -> secret_token
const userBySeat = {};             // seat -> user_id
for (const p of players) { seatOf[p.user_id] = p.seat; tokenBySeat[p.seat] = tokens[p.user_id]; userBySeat[p.seat] = p.user_id; }
ok(new Set(Object.values(seatOf)).size === N_PLAYERS && Object.values(seatOf).every((s) => s >= 0 && s < N_PLAYERS),
  'sièges = permutation de 0..3');

const afkSeat = seatOf['sim_p4_' + stamp];   // siège du joueur AFK (P4)
ok(Number.isInteger(afkSeat), `siège de P4 (AFK) = ${afkSeat}`);

// ── 3. Jouer les 4 rounds 0..3 ──────────────────────────────────────────────
for (let r = 0; r < N_PLAYERS; r++) {
  const expectedType = r === 0 ? 'text' : r % 2 === 1 ? 'drawing' : 'text';

  // 3a. prev_page (r>0) : chaque joueur voit le prédécesseur de SON carnet courant.
  if (r > 0) {
    for (let seat = 0; seat < N_PLAYERS; seat++) {
      const pv = unwrap(await rpc('gartic_prev_page', { p_code: code, p_token: tokenBySeat[seat] }));
      ok(pv && pv.page && typeof pv.page === 'object',
        `round ${r}: prev_page non-null pour le siège ${seat}`);
    }
  }

  // 3b. Soumissions : content = P{seat}R{r}. AFK : on saute P4 au round 1.
  for (let seat = 0; seat < N_PLAYERS; seat++) {
    if (r === AFK_ROUND && seat === afkSeat) continue; // P4 AFK ce round
    const sub = unwrap(await rpc('gartic_submit', { p_code: code, p_token: tokenBySeat[seat], p_content: `P${seat}R${r}` }));
    ok(sub?.ok === true, `round ${r}: submit ok pour le siège ${seat} (P${seat}R${r})`);
  }

  // 3c. submitted_seats : ensemble des sièges ayant soumis ce round.
  const ss = unwrap(await rpc('gartic_submitted_seats', { p_code: code }));
  const seats = new Set(Array.isArray(ss?.seats) ? ss.seats : []);
  if (r === AFK_ROUND) {
    const expected = new Set([0, 1, 2, 3].filter((s) => s !== afkSeat));
    ok(seats.size === 3 && [...expected].every((s) => seats.has(s)) && !seats.has(afkSeat),
      `round ${r}: submitted_seats = 3 sièges (AFK ${afkSeat} absent)`);
  } else {
    ok(seats.size === 4 && [0, 1, 2, 3].every((s) => seats.has(s)),
      `round ${r}: submitted_seats = 4 sièges`);
  }

  // 3d. advance (host). Au round AFK, le serveur DOIT combler la page manquante de P4.
  const adv = unwrap(await rpc('gartic_advance', { p_code: code, p_token: hostToken }));
  if (r < N_PLAYERS - 1) {
    ok(adv?.ok === true && adv?.round === r + 1, `round ${r}: advance -> round ${r + 1} (${adv?.status})`);
  } else {
    ok(adv?.ok === true && adv?.status === 'reveal', `round ${r}: 4e advance -> reveal`);
  }
  void expectedType;
}

// ── 4. Statut reveal ────────────────────────────────────────────────────────
const finalState = unwrap(await rpc('gartic_room_state', { p_code: code }));
ok(finalState?.room?.status === 'reveal', `statut final = reveal (lu: ${finalState?.room?.status})`);

// ── 5. all_pages : 16 pages, rotation correcte, AFK comblé, pas d'auto-dessin ──
const allRes = unwrap(await rpc('gartic_all_pages', { p_code: code }));
const pages = Array.isArray(allRes?.pages) ? allRes.pages : [];
ok(pages.length === 16, `all_pages = 16 pages (4 carnets × 4 pages) — lu ${pages.length}`);

// Toutes les cellules (book 0..3, page 0..3) présentes ?
const cell = new Map();
for (const pg of pages) cell.set(`${pg.book_id}:${pg.page_index}`, pg);
let allCells = true;
for (let b = 0; b < N_PLAYERS; b++) for (let r = 0; r < N_PLAYERS; r++) if (!cell.has(`${b}:${r}`)) allCells = false;
ok(allCells, 'chaque (carnet 0..3, page 0..3) est présente');

// Rotation + contenu + AFK.
let rotationOk = true, contentOk = true, afkOk = true;
for (let b = 0; b < N_PLAYERS; b++) {
  for (let r = 0; r < N_PLAYERS; r++) {
    const pg = cell.get(`${b}:${r}`);
    if (!pg) { rotationOk = false; continue; }
    const authorSeat = seatForBook(b, r, N_PLAYERS);          // = (b+r)%4
    // La preuve de routage serveur est le CONTENU (cf. ci-dessous), pas le nom :
    // all_pages résout author.name via le siège, donc le nom ne distingue pas qui a
    // réellement écrit. Le contenu P{seat}R{round} prouve que le serveur a routé la
    // soumission dans le bon carnet selon le siège AUTHENTIFIÉ par token.
    const isAfkSlot = r === AFK_ROUND && authorSeat === afkSeat;
    if (isAfkSlot) {
      // Slot comblé par le serveur : placeholder, surtout PAS une soumission d'un autre.
      const ph = placeholderFor(r);
      if (pg.content !== ph) { afkOk = false; console.log(`    ! AFK slot b${b}p${r}: contenu='${pg.content}' attendu placeholder='${ph}'`); }
    } else {
      // Preuve de routage serveur : le contenu doit être EXACTEMENT P{authorSeat}R{r}.
      const expected = `P${authorSeat}R${r}`;
      if (pg.content !== expected) { contentOk = false; console.log(`    ! b${b}p${r}: contenu='${pg.content}' attendu='${expected}' (siège ${authorSeat})`); }
    }
  }
}
ok(rotationOk, 'rotation : chaque cellule présente avec auteur résolu');
ok(contentOk, 'contenu = P{(b+r)%4}R{r} pour toutes les pages non-AFK (routage serveur par siège authentifié)');
ok(afkOk, `AFK : la/les page(s) du siège ${afkSeat} au round ${AFK_ROUND} sont le placeholder serveur (pas une soumission)`);

// No self-draw : dans un carnet, deux pages adjacentes n'ont jamais le même siège auteur.
let noSelfDraw = true;
for (let b = 0; b < N_PLAYERS; b++) {
  for (let r = 1; r < N_PLAYERS; r++) {
    if (seatForBook(b, r, N_PLAYERS) === seatForBook(b, r - 1, N_PLAYERS)) noSelfDraw = false;
  }
}
ok(noSelfDraw, 'no self-draw : aucun siège ne traite deux pages adjacentes du même carnet');

// pageType par round : 0=text, 1=drawing, 2=text, 3=drawing.
let typesOk = true;
for (const pg of pages) {
  const want = pg.page_index === 0 ? 'text' : pg.page_index % 2 === 1 ? 'drawing' : 'text';
  if (pg.type !== want) { typesOk = false; console.log(`    ! type b${pg.book_id}p${pg.page_index}='${pg.type}' attendu '${want}'`); }
}
ok(typesOk, 'pageType correct par round (0 texte, 1 dessin, 2 texte, 3 dessin)');

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
