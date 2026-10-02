// État factice de Guess Who pour la page de démo (DEV) : même forme que le
// retour de useGuessWhoRoom, aucun appel réseau, actions qui répondent { ok }.
export const DEMO_PHASES = ['lobby', 'gages', 'listen', 'record', 'vote', 'result', 'gage', 'end']

const NAMES = ['Feydi', 'Brams', 'Berat', 'Yoonae', 'Mowgli']
const avatar = (n) => `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(n)}`
const ok = async () => ({ ok: true })

function players(phase) {
  return NAMES.map((name, i) => ({
    user_id: `u${i + 1}`, display_name: name, avatar_url: avatar(name), seat: i,
    is_host: i === 0, connected: true, lives: phase === 'result' && i === 3 ? 1 : i === 4 ? 1 : 2,
    total_votes: [5, 3, 2, 1, 0][i], ready: phase === 'end' && i < 2, has_gage: phase !== 'gages' || i < 3,
    lives_lost: [0, 1, 1, 2, 1][i],
  }))
}

const CLIP = { id: 'demo', title: 'Extension du territoire', anime: 'Jujutsu Kaisen', lang: 'ja', kind: 'technique', url: '', duration: 2.5 }

export function demoG(phase) {
  const ps = players(phase)
  const ends = new Date(Date.now() + 20000).toISOString()
  const room = {
    code: 'DEMO', phase, round: 3, status: phase === 'end' ? 'ended' : 'playing', clip: CLIP, tied: [],
    settings: { lives: 2, speed: 'normal', sounds: 'all', rounds: 0 },
    phase_ends_at: phase === 'lobby' || phase === 'end' ? null : ends, phase_secs: 25,
    last_result: {
      round: 3, stage: 'vote', losers: ['u4'],
      scores: { u1: 2, u2: 1, u3: 1, u4: 0, u5: 0 },
      votes: [{ voter: 'u2', target: 'u1', stage: 'vote' }, { voter: 'u3', target: 'u1', stage: 'vote' }, { voter: 'u4', target: 'u2', stage: 'vote' }, { voter: 'u1', target: 'u3', stage: 'vote' }],
    },
    gage_result: [{ user_id: 'u4', name: 'Yoonae', gage: "Chanter l'opening de One Piece en entier" }],
    gage_pool: ["Chanter l'opening de One Piece en entier", 'Imiter Gojo pendant 1 minute', 'Parler en japonais au prochain tour', 'Faire 10 pompes en criant « Bankai »'],
  }
  const takes = ps.slice(0, 4).map((p, i) => ({ user_id: p.user_id, audio_url: '', duration: 2.2 + i * 0.4 }))
  const stats = {
    rounds: [1, 2, 3],
    players: ps.map((p) => ({ user_id: p.user_id, display_name: p.display_name, total_votes: p.total_votes, lives_lost: p.lives_lost, wins: [2, 1, 0, 0, 0][p.seat] })),
    awards: {
      best_take: { round: 2, user_id: 'u1', votes: 4, audio_url: 'https://r2.test/demo.webm', clip: { title: 'Bankai ! Tensa Zangetsu' } },
      most_voted: 'u1', most_wins: 'u1', untouchable: 'u1',
    },
  }
  return {
    status: 'ready', error: null, spectator: false, reason: null,
    room, players: ps, me: ps[0], isHost: true,
    prog: { took: ['u1', 'u2'], voted: ['u2', 'u3'], gaged: ['u1', 'u2', 'u3'] },
    takes: ['vote', 'revote', 'result', 'gage'].includes(phase) ? takes : [],
    notice: null, highlights: [], clearNotice() {},
    remaining: phase === 'lobby' || phase === 'end' ? null : 18, total: 25, maxLives: 2,
    refresh: ok,
    act: { start: ok, gage: ok, take: ok, vote: ok, skip: ok, ready: ok, rejoin: ok },
    connection: 'ok', live: true, late: false, stats: phase === 'end' || phase === 'result' ? stats : null,
    roundsMax: 0, isLastRound: false, serverNow: Date.now(),
    myVote: null, myGage: phase === 'gages' ? null : 'Imiter Gojo pendant 1 minute', myTake: false,
  }
}
