// src/lib/analytics.js — Brams Community Tracking
// Exporte : useAnalytics() | setAnalyticsUser() | track()
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from './supabase.js';

const SESSION_KEY = 'bc_sid';
const HEARTBEAT_MS = 45_000; // ping toutes les 45s → "en ligne" = last_seen < 2min

let _user = null; // { user_id, username } une fois connecté

// ---------- session ID stable par onglet ----------
function sid() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(SESSION_KEY, id); }
  return id;
}

function device() {
  return /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}

// ---------- API publique ----------

/**
 * Appelle après le login Discord token :
 * setAnalyticsUser({ user_id: '12345', username: 'Freydiss' })
 */
export function setAnalyticsUser(user) {
  _user = user || null;
  // upsert (pas update) : l'auth seedée depuis le localStorage peut arriver AVANT
  // le premier upsertSession du hook → un update raterait la ligne et le membre
  // resterait "Visiteur" toute la session.
  if (_user) upsertSession();
}

/**
 * Event custom n'importe où dans le site.
 * track('anime_view',     { title: 'One Piece', episode: 1122 })
 * track('boutique_view',  { item: 'Cursor Yonkou', rarity: 'RARE' })
 * track('soutien_click')
 * track('embarquer_click')
 */
export async function track(eventType, metadata = {}, page = window.location.pathname) {
  try {
    await supabase.from('analytics_events').insert({
      session_id: sid(),
      user_id: _user?.user_id ?? null,
      event_type: eventType,
      page,
      metadata,
    });
  } catch (e) { console.debug('[analytics]', e); }
}

// ---------- interne ----------
async function upsertSession() {
  try {
    await supabase.from('analytics_sessions').upsert({
      session_id: sid(),
      user_id: _user?.user_id ?? null,
      username: _user?.username ?? null,
      device: device(),
      user_agent: navigator.userAgent.slice(0, 250),
      referrer: document.referrer ? (() => { try { return new URL(document.referrer).hostname; } catch { return null; } })() : null,
      current_page: window.location.pathname,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'session_id' });
  } catch (e) { console.debug('[analytics]', e); }
}

async function beat(page) {
  try {
    await supabase.from('analytics_sessions')
      .update({ last_seen: new Date().toISOString(), current_page: page })
      .eq('session_id', sid());
  } catch (e) { console.debug('[analytics]', e); }
}

// ---------- hook — monter UNE FOIS dans <App> (inside Router) ----------
export function useAnalytics() {
  const location = useLocation();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    upsertSession();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') beat(window.location.pathname);
    }, HEARTBEAT_MS);
    const onVis = () => { if (document.visibilityState === 'visible') beat(window.location.pathname); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  useEffect(() => {
    // pageview automatique à chaque changement de route
    track('pageview', {}, location.pathname);
    beat(location.pathname);
  }, [location.pathname]);
}
