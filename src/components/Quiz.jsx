import { useState, useEffect, useRef, useCallback } from 'react'

const QUESTIONS = [
  { q: 'Quel est le vrai nom du fruit de Luffy ?', choices: ['Gomu Gomu no Mi', 'Hito Hito no Mi, Model: Nika', 'Mera Mera no Mi', 'Gum Gum no Mi'], answer: 1 },
  { q: 'Combien de membres compte l\'équipage de Barbe Blanche au pic de sa puissance ?', choices: ['16', '23', '1600', '\'des centaines\''], answer: 2 },
  { q: 'Quel est le vrai nom de l\'île du début de l\'aventure de Luffy ?', choices: ['Fuschia Village', 'Loguetown', 'Dawn Island', 'East Blue'], answer: 2 },
  { q: 'Qui a mangé le Ope Ope no Mi avant Trafalgar Law ?', choices: ['Rosinante', 'Doflamingo', 'Corazon', 'Le Dr Vegapunk'], answer: 0 },
  { q: 'Quelle technique permet à Zoro de couper l\'acier ?', choices: ['Oni Giri', 'Shishi Sonson', '108 Pound Cannon', 'Santoryu Ogi: Sanzen Sekai'], answer: 1 },
  { q: 'Quel est le rang le plus élevé dans la Marine ?', choices: ['Amiral', 'Vice-Amiral', 'Amiral en Chef', 'Commodore'], answer: 2 },
  { q: 'Qui est le premier Shichibukai présenté dans l\'anime ?', choices: ['Dracule Mihawk', 'Crocodile', 'Jinbe', 'Boa Hancock'], answer: 1 },
  { q: 'Quelle est la prime de Luffy au début de l\'arc Dressrosa ?', choices: ['300 millions', '400 millions', '500 millions', '600 millions'], answer: 1 },
  { q: 'Quel fruit a mangé Big Mom ?', choices: ['Soru Soru no Mi', 'Mira Mira no Mi', 'Numa Numa no Mi', 'Horo Horo no Mi'], answer: 0 },
  { q: 'Quelle île est surnommée "La Ville du Début et de la Fin" ?', choices: ['Marineford', 'Loguetown', 'Water Seven', 'Raftel'], answer: 1 },
]

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function getRandomQuestions(n = 5) {
  return shuffle(QUESTIONS).slice(0, n)
}

export default function Quiz() {
  const [questions] = useState(() => getRandomQuestions(5))
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [timeLeft, setTimeLeft] = useState(15)
  const [answers, setAnswers] = useState([])
  const [started, setStarted] = useState(false)
  const timerRef = useRef(null)

  const next = useCallback((sel) => {
    clearInterval(timerRef.current)
    const q = questions[current]
    const correct = sel === q.answer
    const newScore = correct ? score + 1 : score
    const newAnswers = [...answers, { selected: sel, correct }]
    setSelected(sel)
    setScore(newScore)
    setAnswers(newAnswers)

    setTimeout(() => {
      if (current + 1 >= questions.length) {
        setDone(true)
      } else {
        setCurrent(c => c + 1)
        setSelected(null)
        setTimeLeft(15)
      }
    }, 800)
  }, [current, questions, score, answers])

  useEffect(() => {
    if (!started || done || selected !== null) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { next(null); return 15 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [started, current, done, selected, next])

  const share = () => {
    const text = `J'ai eu ${score}/5 au Quiz One Piece sur Brams Community ! 🏴‍☠️ Rejoins le serveur sur discord.gg/v3Ddhtbz`
    navigator.clipboard?.writeText(text)
    alert('Score copié ! Partage-le sur Discord 🏴‍☠️')
  }

  const restart = () => {
    setDone(false)
    setCurrent(0)
    setSelected(null)
    setScore(0)
    setAnswers([])
    setTimeLeft(15)
    setStarted(false)
  }

  const q = questions[current]

  const medal = score === 5 ? '🥇' : score >= 3 ? '🥈' : '🥉'
  const comment = score === 5 ? 'Nakama parfait ! T\'es au niveau du Roi des Pirates !' : score >= 3 ? 'Bon pirate ! Continue sur le Grand Line !' : 'Continue de regarder One Piece, marinero !'

  return (
    <section id="quiz" style={{ padding: '110px 0', position: 'relative' }}>
      <div style={{ position: 'absolute', right: '5%', top: '20%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(253,203,110,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="label">🧠 Culture One Piece</div>
          <h2 className="h2" style={{ textAlign: 'center' }}>Quiz Nakama</h2>
          <p className="sub" style={{ textAlign: 'center', margin: '0 auto' }}>5 questions, 15 secondes chacune. Prouve que t'es digne du Grand Line.</p>
        </div>

        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {!started ? (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20,
              padding: '48px 40px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 72, marginBottom: 24 }}>🏴‍☠️</div>
              <h3 style={{ fontFamily: 'var(--pirate)', fontSize: 28, color: '#fff', marginBottom: 12 }}>Prêt pour le défi ?</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
                5 questions aléatoires sur One Piece.<br/>
                15 secondes par question. Bonne chance, nakama !
              </p>
              <button onClick={() => setStarted(true)} className="btn btn-primary" style={{ fontSize: 16, padding: '14px 40px' }}>
                ⚔️ Commencer
              </button>
            </div>
          ) : done ? (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20,
              padding: '48px 40px', textAlign: 'center',
              animation: 'scaleIn 0.3s ease-out',
            }}>
              <div style={{ fontSize: 80, marginBottom: 16 }}>{medal}</div>
              <h3 style={{ fontFamily: 'var(--pirate)', fontSize: 32, color: '#fff', marginBottom: 8 }}>
                {score} / 5
              </h3>
              <p style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>{comment}</p>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '32px 0', flexWrap: 'wrap' }}>
                {answers.map((a, i) => (
                  <div key={i} style={{
                    width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: a.correct ? 'rgba(52,211,153,0.2)' : a.selected === null ? 'rgba(124,127,138,0.2)' : 'rgba(224,82,74,0.2)',
                    border: `1px solid ${a.correct ? '#34d399' : a.selected === null ? '#7c7f8a' : '#e0524a'}`,
                    fontSize: 16,
                  }}>
                    {a.correct ? '✅' : a.selected === null ? '⏱️' : '❌'}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={share} className="btn btn-ghost" style={{ fontSize: 14 }}>📤 Partager le score</button>
                <button onClick={restart} className="btn btn-primary" style={{ fontSize: 14 }}>🔄 Rejouer</button>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20,
              padding: '36px 32px',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                  Question {current + 1} / {questions.length}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', border: `3px solid ${timeLeft <= 5 ? '#e0524a' : '#34d399'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700, color: timeLeft <= 5 ? '#e0524a' : '#34d399',
                    transition: 'border-color 0.3s, color 0.3s',
                    animation: timeLeft <= 5 ? 'pulse 0.5s infinite' : 'none',
                  }}>
                    {timeLeft}
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 28, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: `linear-gradient(90deg, var(--accent), #fdcb6e)`,
                  width: `${((current + 1) / questions.length) * 100}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>

              <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.5, marginBottom: 28 }}>{q.q}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {q.choices.map((choice, i) => {
                  let bg = 'var(--card2)'
                  let border = 'rgba(255,255,255,0.08)'
                  let color = 'rgba(255,255,255,0.85)'
                  if (selected !== null) {
                    if (i === q.answer) { bg = 'rgba(52,211,153,0.15)'; border = '#34d399'; color = '#34d399' }
                    else if (i === selected && selected !== q.answer) { bg = 'rgba(224,82,74,0.15)'; border = '#e0524a'; color = '#e0524a' }
                  }
                  return (
                    <button key={i} onClick={() => selected === null && next(i)} style={{
                      background: bg, border: `1px solid ${border}`, borderRadius: 12,
                      padding: '14px 18px', cursor: selected ? 'default' : 'pointer',
                      textAlign: 'left', fontSize: 14, color,
                      fontFamily: 'var(--body)', fontWeight: 500,
                      transition: 'all 0.2s',
                    }}
                      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}
                      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                    >
                      <span style={{ opacity: 0.5, marginRight: 10, fontWeight: 700 }}>{String.fromCharCode(65 + i)}.</span>
                      {choice}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
