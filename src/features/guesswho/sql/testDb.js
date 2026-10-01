// Base Postgres en mémoire (PGlite) pour tester la migration Guess Who sans
// Supabase. On simule ce que Supabase fournit : rôles anon/authenticated et
// publication realtime.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const MIGRATION = new URL('../../../../supabase/migrations/20261001_guess_who.sql', import.meta.url)

export async function freshDb() {
  const db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated;
    create publication supabase_realtime;
  `)
  await db.exec(readFileSync(MIGRATION, 'utf8'))
  return db
}

// Appelle une fonction SQL avec des paramètres positionnels, renvoie son résultat.
export async function call(db, fn, ...args) {
  const ph = args.map((_, i) => `$${i + 1}`).join(', ')
  const { rows } = await db.query(`select ${fn}(${ph}) as r`, args)
  return rows[0].r
}

// Salon de n joueurs ; le joueur 0 est l'hôte.
export async function setupRoom(db, n, code = 'ABCD') {
  const host = await call(db, 'guesswho_create', code, 'u0', 'Joueur 0', null)
  const players = [{ user: 'u0', token: host.secret_token }]
  for (let i = 1; i < n; i++) {
    const j = await call(db, 'guesswho_join', code, `u${i}`, `Joueur ${i}`, null, null)
    players.push({ user: `u${i}`, token: j.secret_token })
  }
  return { code, players }
}

// Fait comme si l'échéance de la phase était dépassée de `sec` secondes.
export async function expirePhase(db, code, sec = 1) {
  await db.query(`update guesswho_rooms set phase_ends_at = now() - make_interval(secs => $2) where code = $1`, [code, sec])
}

export async function seedClips(db, n = 5) {
  for (let i = 0; i < n; i++) {
    await db.query(
      `insert into guesswho_clips(id, title, anime, lang, kind, url, duration, enabled)
       values ($1, $2, 'Test', 'fr', 'technique', $3, 3, true)`,
      [`clip${i}`, `Son ${i}`, `https://r2.test/guesswho/clips/clip${i}.mp3`],
    )
  }
}
