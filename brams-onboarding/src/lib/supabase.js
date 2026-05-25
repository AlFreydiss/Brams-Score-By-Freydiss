import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn(
    '[brams] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant. Crée un .env local et ajoute-les dans Netlify (Site settings → Environment variables).'
  )
}

export const supabase = createClient(url || 'http://localhost', key || 'anon')

export async function validateToken(token) {
  const { data, error } = await supabase.rpc('validate_token', { p_token: token })
  if (error) return { valid: false, error: 'rpc_error' }
  return data
}

export async function submitOnboarding(token, answers) {
  const { data, error } = await supabase.rpc('submit_onboarding', {
    p_token: token,
    p_answers: answers
  })
  if (error) return { ok: false, error: 'rpc_error' }
  return data
}
