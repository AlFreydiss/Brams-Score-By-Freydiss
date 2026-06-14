// Vérifie l'anti-triche serveur de Brams Phone (REST direct, anon key).
// Usage: node scripts/verify_gartic_rls.mjs  (lit .env.local)
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
const rpc = (fn, body) => fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: 'POST', headers: H, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
const get = (q) => fetch(`${URL_}/rest/v1/${q}`, { headers: H }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

const code = 'T' + Math.random().toString(36).slice(2, 5).toUpperCase();
const A = 'verif_host_' + Date.now(), B = 'verif_p2_' + Date.now();

const created = await rpc('gartic_create', { p_code: code, p_user: A, p_name: 'Host', p_avatar: null });
ok(created.json?.secret_token, 'gartic_create renvoie un secret_token');
const tokA = created.json?.secret_token;

const joined = await rpc('gartic_join', { p_code: code, p_user: B, p_name: 'P2', p_avatar: null });
ok(joined.json?.secret_token && joined.json.secret_token !== tokA, 'gartic_join renvoie un token distinct');
const tokB = joined.json?.secret_token;

const state = await rpc('gartic_room_state', { p_code: code });
const players = state.json?.players || [];
ok(players.length >= 2, 'room_state liste les joueurs');
ok(players.every((p) => !('secret_token' in p)), 'room_state ne fuite PAS secret_token');

await rpc('gartic_start', { p_code: code, p_token: tokA, p_settings: { rounds: 2, phaseDurations: { writing: 60, drawing: 60, describing: 60 } } });
await rpc('gartic_submit', { p_code: code, p_token: tokA, p_content: 'phrase A' });
await rpc('gartic_submit', { p_code: code, p_token: tokB, p_content: 'phrase B' });

const direct = await get(`gartic_pages?select=*&limit=1`);
ok(direct.status === 200 && Array.isArray(direct.json) && direct.json.length === 0, 'SELECT direct gartic_pages = vide malgré pages existantes (RLS deny)');

const nonHostAdv = await rpc('gartic_advance', { p_code: code, p_token: tokB });
ok(nonHostAdv.json?.error === 'unauthorized', 'non-host ne peut pas advance');

const allEarly = await rpc('gartic_all_pages', { p_code: code });
ok(allEarly.json?.error === 'not_reveal', 'gartic_all_pages refusé hors reveal');

const badTok = await rpc('gartic_submit', { p_code: code, p_token: '00000000-0000-0000-0000-000000000000', p_content: 'x' });
ok(badTok.json?.error === 'unauthorized', 'gartic_submit avec mauvais token = unauthorized');

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
