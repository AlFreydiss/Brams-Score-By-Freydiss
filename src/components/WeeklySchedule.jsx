const DAYS = [
  { day: 'Lun', name: 'UNDERCOVER',   rank: 'Yonkou',      people: 10, time: '22h30', tag: 'Très select', tagColor: '#e0524a', stream: false },
  { day: 'Mar', name: 'QUITTE LA VOC', rank: 'Pirate',     people: 50, time: '22h30', tag: null,          tagColor: null,      stream: false },
  { day: 'Mer', name: 'PASSE OU PAS', rank: 'Hichiboukai', people: 15, time: '22h30', tag: null,          tagColor: null,      stream: false },
  { day: 'Jeu', name: 'QUITTE LA VOC', rank: 'Pirate',     people: 50, time: '22h30', tag: null,          tagColor: null,      stream: false },
  { day: 'Ven', name: 'ALPHABETS',    rank: 'Hichiboukai', people: 15, time: '22h30', tag: null,          tagColor: null,      stream: false },
  { day: 'Sam', name: 'QUITTE LA VOC', rank: 'Pirate',     people: 50, time: '22h30', tag: 'STREAM',      tagColor: '#9147ff', stream: true  },
  { day: 'Dim', name: 'QUITTE LA VOC', rank: 'Pirate',     people: 50, time: '22h30', tag: null,          tagColor: null,      stream: false },
]

const RANK_COLORS = {
  Yonkou:      '#e0524a',
  Hichiboukai: '#a29bfe',
  Pirate:      '#74b9ff',
}

const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

export default function WeeklySchedule() {
  return (
    <div style={{
      background: 'rgba(14,14,16,0.72)',
      backdropFilter: 'blur(18px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(224,82,74,0.08)',
      }}>
        <span style={{ fontSize: 16 }}>📅</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Programme de la semaine</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>22h30 chaque soir</span>
      </div>

      <div style={{ padding: '8px 0' }}>
        {DAYS.map((d, i) => {
          const isToday = i === TODAY_IDX
          const rankColor = RANK_COLORS[d.rank] || '#aaa'
          return (
            <div key={d.day} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 14px',
              background: isToday ? 'rgba(224,82,74,0.08)' : 'transparent',
              borderLeft: isToday ? '3px solid var(--accent)' : '3px solid transparent',
              transition: 'background .15s',
            }}>
              <div style={{
                width: 34, fontSize: 11, fontWeight: isToday ? 800 : 500,
                color: isToday ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                flexShrink: 0,
              }}>{d.day}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isToday ? '#fff' : 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>
                    {d.name}
                  </span>
                  {d.tag && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '.04em',
                      color: d.tagColor, background: `${d.tagColor}22`,
                      borderRadius: 4, padding: '1px 5px',
                      border: `1px solid ${d.tagColor}44`,
                      whiteSpace: 'nowrap',
                    }}>{d.tag}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: rankColor, fontWeight: 600 }}>{d.rank}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>·</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{d.people} personnes</span>
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                {d.time}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
