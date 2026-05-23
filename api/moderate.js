// api/moderate.js — Modération wiki/théories côté serveur
// Utilise SUPABASE_SERVICE_ROLE_KEY pour bypasser le RLS Supabase.
// Sans cette variable, les updates peuvent être bloqués silencieusement par RLS.

import { requireStaff } from './_staff.js'

const SUPABASE_URL = 'https://zeqetrmulqndxugfbojd.supabase.co'

const ALLOWED_TABLES   = ['wiki_pages', 'theories']
const ALLOWED_STATUSES = ['published', 'rejected', 'deleted', 'pending']

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return }

  // ── 1. Vérifier JWT + droits staff (côté serveur, non manipulable) ──────────
  const auth = await requireStaff(req, res)
  if (!auth) return  // requireStaff a déjà envoyé la réponse d'erreur

  const { discordId, token } = auth

  // ── 2. Valider le body ────────────────────────────────────────────────────────
  const { table, id, status, reason } = req.body || {}

  if (!ALLOWED_TABLES.includes(table)) {
    res.status(400).json({ error: `Table invalide : ${table}` }); return
  }
  if (!ALLOWED_STATUSES.includes(status)) {
    res.status(400).json({ error: `Statut invalide : ${status}` }); return
  }
  if (!id) {
    res.status(400).json({ error: 'ID manquant' }); return
  }

  // ── 3. Update DB ─────────────────────────────────────────────────────────────
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anon = process.env.SUPABASE_ANON_KEY
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcWV0cm11bHFuZHh1Z2Zib2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNzUxNzksImV4cCI6MjA5MTk1MTE3OX0.HQbMRJnT_FAFfA8kYi-DYgjOuPnGpQU5zkeRAGb8Qso'
  const apiKey     = serviceKey || anon
  const authBearer = serviceKey || token

  const patchBody = {
    status,
    moderated_by: discordId,
    moderated_at: new Date().toISOString(),
    ...(reason ? { moderation_reason: reason } : {}),
  }

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
          'Authorization': `Bearer ${authBearer}`,
          // return=representation : retourne les rows modifiées
          // Sans ça, Supabase retourne 200 OK même si RLS bloque silencieusement (0 rows)
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(patchBody),
      }
    )

    if (!r.ok) {
      const txt = await r.text()

      // Si erreur 400 à cause de colonnes manquantes (moderated_by/moderated_at),
      // on retry avec seulement le status — rétrocompatibilité si migration pas encore faite
      if (r.status === 400 && (txt.includes('moderated_by') || txt.includes('moderated_at') || txt.includes('moderation_reason'))) {
        const r2 = await fetch(
          `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': apiKey,
              'Authorization': `Bearer ${authBearer}`,
              'Prefer': 'return=representation',
            },
            body: JSON.stringify({ status }),
          }
        )
        if (!r2.ok) {
          const txt2 = await r2.text()
          res.status(500).json({ error: `Echec DB (${r2.status}): ${txt2}` })
          return
        }
        const rows2 = await r2.json()
        if (!Array.isArray(rows2) || rows2.length === 0) {
          const hint = !serviceKey
            ? ' — Configure SUPABASE_SERVICE_ROLE_KEY dans Vercel pour bypasser le RLS'
            : ''
          res.status(500).json({ error: `Contenu introuvable ou bloqué par RLS${hint}`, id, table })
          return
        }
        res.json({ success: true, table, id, status, moderated_by: discordId, rows: rows2.length })
        return
      }

      res.status(500).json({ error: `Echec DB (${r.status}): ${txt}` })
      return
    }

    const rows = await r.json()

    // CRITIQUE : si 0 rows retournées, l'update a été bloqué silencieusement par RLS
    if (!Array.isArray(rows) || rows.length === 0) {
      const hint = !serviceKey
        ? ' Configure SUPABASE_SERVICE_ROLE_KEY dans Vercel pour bypasser le RLS.'
        : ''
      res.status(500).json({
        error: `Modération échouée : aucune ligne modifiée. L'ID est peut-être incorrect ou le RLS bloque.${hint}`,
        id,
        table,
        rls_hint: !serviceKey,
      })
      return
    }

    if (!serviceKey) {
      console.warn('[moderate] SUPABASE_SERVICE_ROLE_KEY non configuré — update peut être bloqué par RLS. Configurer dans Vercel env vars.')
    }

    res.json({ success: true, table, id, status, moderated_by: discordId, rows: rows.length })
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Erreur serveur' })
  }
}
