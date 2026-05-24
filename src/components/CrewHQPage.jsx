import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext.jsx'
import {
  CREW_ROLES,
  CREW_TABS,
  fallbackDiplomacy,
  fetchCrewDashboard,
  uiCanShow,
} from '../lib/crew/crewQGData.js'
import { formatBounty } from '../lib/crew/bountyFormatter.js'
import './CrewHQPage.css'

const ROLE_ORDER = ['captain', 'vice_captain', 'officer', 'strategist', 'recruiter', 'treasurer', 'diplomat', 'elite', 'member', 'recruit']
const LOG_FILTERS = ['tout', 'membres', 'coffre', 'recrutement', 'diplomatie', 'missions', 'systeme']

function pct(value, target) {
  if (!target) return 0
  return Math.max(0, Math.min(100, Math.round((Number(value || 0) / Number(target)) * 100)))
}

function displayDate(value) {
  if (!value) return 'Non renseigne'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function EmptyState({ title, text, icon = '*' }) {
  return (
    <div className="crew-empty">
      <div className="crew-empty-icon">{icon}</div>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  )
}

function LockedAction({ children, onClick, disabled = false }) {
  return (
    <button className="crew-action" type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}

function StatCard({ label, value, detail, tone = 'gold' }) {
  return (
    <article className={`crew-stat crew-stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function Badge({ children, tone = 'gold' }) {
  return <span className={`crew-badge crew-badge-${tone}`}>{children}</span>
}

function ProgressBar({ value, label }) {
  return (
    <div className="crew-progress-wrap">
      <div className="crew-progress-meta"><span>{label}</span><strong>{value}%</strong></div>
      <div className="crew-progress" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={value}>
        <div style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

const TAB_ACCESS = {
  overview: ['visitor', 'recruit', 'member', 'elite', 'diplomat', 'treasurer', 'recruiter', 'strategist', 'officer', 'vice_captain', 'captain'],
  members: ['visitor', 'recruit', 'member', 'elite', 'diplomat', 'treasurer', 'recruiter', 'strategist', 'officer', 'vice_captain', 'captain'],
  hierarchy: ['visitor', 'recruit', 'member', 'elite', 'diplomat', 'treasurer', 'recruiter', 'strategist', 'officer', 'vice_captain', 'captain'],
  recruitment: ['visitor', 'recruiter', 'officer', 'vice_captain', 'captain'],
  missions: ['recruit', 'member', 'elite', 'diplomat', 'treasurer', 'recruiter', 'strategist', 'officer', 'vice_captain', 'captain'],
  treasury: ['treasurer', 'vice_captain', 'captain'],
  territories: ['visitor', 'recruit', 'member', 'elite', 'diplomat', 'treasurer', 'recruiter', 'strategist', 'officer', 'vice_captain', 'captain'],
  diplomacy: ['diplomat', 'officer', 'vice_captain', 'captain'],
  journal: ['recruit', 'member', 'elite', 'diplomat', 'treasurer', 'recruiter', 'strategist', 'officer', 'vice_captain', 'captain'],
  ranking: ['visitor', 'recruit', 'member', 'elite', 'diplomat', 'treasurer', 'recruiter', 'strategist', 'officer', 'vice_captain', 'captain'],
  settings: ['captain'],
}

function visibleTabsFor(role) {
  return CREW_TABS.filter(([id]) => TAB_ACCESS[id]?.includes(role))
}

function MemberCard({ member, viewerRole, onLockedAction }) {
  const canShowStaff = ['captain', 'vice_captain'].includes(viewerRole)
  return (
    <article className="crew-member-card">
      <div className="crew-wanted-top">
        <span>Wanted</span>
        <Badge tone={member.status === 'active' ? 'green' : 'red'}>{member.status}</Badge>
      </div>
      <div className="crew-member-main">
        <img src={member.avatar_url || `https://cdn.discordapp.com/embed/avatars/${Number(member.user_id) % 5}.png`} alt="" />
        <div>
          <strong>{member.name}</strong>
          <span>{member.custom_title || CREW_ROLES[member.role] || member.role}</span>
        </div>
      </div>
      <div className="crew-member-stats">
        <div><span>Prime</span><strong>{formatBounty(member.bounty || member.contribution)}</strong></div>
        <div><span>Contribution</span><strong>{formatBounty(member.contribution)}</strong></div>
        <div><span>Niveau</span><strong>{member.level}</strong></div>
        <div><span>Entree</span><strong>{displayDate(member.joined_at)}</strong></div>
      </div>
      <div className="crew-chip-row">
        {member.badges?.slice(0, 3).map(badge => <Badge key={badge}>{badge}</Badge>)}
        {member.is_elite && <Badge tone="red">Elite</Badge>}
        {member.probation_until && <Badge tone="red">Probation</Badge>}
      </div>
      <div className="crew-member-actions">
        <a className="crew-action" href={`/u/${member.user_id}`}>Profil</a>
        {canShowStaff && (
          <>
            <LockedAction onClick={() => onLockedAction('promouvoir')}>Promouvoir</LockedAction>
            <LockedAction onClick={() => onLockedAction('exclure')} disabled={member.role === 'captain'}>Exclure</LockedAction>
          </>
        )}
      </div>
    </article>
  )
}

function Hero({ crew, members, viewerRole, onLockedAction }) {
  const captain = members.find(m => m.role === 'captain')?.name || crew.captain_name || 'A nommer'
  const canManage = uiCanShow(viewerRole, 'manage_settings')
  const canInvite = uiCanShow(viewerRole, 'invite')
  return (
    <section className="crew-hero">
      <div className="crew-map-lines" aria-hidden="true" />
      <div className="crew-flag" aria-hidden="true">
        <div className="crew-flag-cloth"><span>{crew.tag || 'BR'}</span></div>
        <div className="crew-flag-pole" />
      </div>
      <div className="crew-hero-copy">
        <span className="crew-kicker">Quartier general d'equipage</span>
        <h1>{crew.name}</h1>
        <p>{crew.motto || crew.description}</p>
        <div className="crew-chip-row">
          <Badge tone={crew.recruitment_open ? 'green' : 'red'}>{crew.recruitment_open ? 'Recrutement ouvert' : 'Recrutement ferme'}</Badge>
          <Badge>Niveau {crew.level}</Badge>
          <Badge>{crew.rank_server}</Badge>
        </div>
      </div>
      <div className="crew-hero-command">
        <div className="crew-command-grid">
          <div><span>Prime totale</span><strong>{formatBounty(crew.total_bounty)}</strong></div>
          <div><span>Membres</span><strong>{members.length}</strong></div>
          <div><span>Capitaine</span><strong>{captain}</strong></div>
          <div><span>Reputation</span><strong>{crew.reputation}/100</strong></div>
        </div>
        <div className="crew-hero-actions">
          {canManage && <LockedAction onClick={() => onLockedAction('gerer')}>Gerer l'equipage</LockedAction>}
          {canInvite && <LockedAction onClick={() => onLockedAction('inviter')}>Inviter</LockedAction>}
          {!canInvite && <LockedAction onClick={() => onLockedAction('candidater')}>Candidater</LockedAction>}
        </div>
      </div>
    </section>
  )
}

function Overview({ data, onLockedAction }) {
  const { crew, members, missions, logs, announcements, territories } = data
  const activeMembers = members.filter(m => m.status === 'active').length
  const topMembers = [...members].sort((a, b) => b.contribution - a.contribution).slice(0, 4)
  return (
    <div className="crew-tab-grid">
      <div className="crew-stats-grid">
        <StatCard label="Puissance" value={`${crew.reputation}/100`} detail="Reputation publique" />
        <StatCard label="Prime totale" value={formatBounty(crew.total_bounty)} detail="Somme des primes" />
        <StatCard label="Membres actifs" value={activeMembers} detail={`${members.length} recenses`} tone="blue" />
        <StatCard label="Serie" value="0" detail="Victoires consecutives" tone="red" />
        <StatCard label="Objectif saison" value={`${pct(crew.xp, crew.xp_target)}%`} detail="Progression XP equipage" />
        <StatCard label="Territoires" value={territories.filter(t => t.status === 'controlled').length} detail="Iles sous bannieres" tone="blue" />
      </div>

      <section className="crew-panel crew-panel-large">
        <div className="crew-panel-head"><span>Progression</span>{uiCanShow(data.viewerRole, 'manage_settings') && <button type="button" onClick={() => onLockedAction('objectif')}>Objectif</button>}</div>
        <ProgressBar value={pct(crew.xp, crew.xp_target)} label={`Niveau ${crew.level} - ${crew.xp}/${crew.xp_target} XP`} />
        <ProgressBar value={crew.reputation} label="Jauge de reputation" />
        <div className="crew-week-goals">
          {missions.slice(0, 3).map(mission => (
            <div key={mission.id}>
              <strong>{mission.title}</strong>
              <span>{mission.reward}</span>
              <ProgressBar value={pct(mission.progress, mission.target)} label={mission.type} />
            </div>
          ))}
        </div>
      </section>

      <section className="crew-panel">
        <div className="crew-panel-head"><span>Conseil du capitaine</span>{uiCanShow(data.viewerRole, 'post_announcement') && <button type="button" onClick={() => onLockedAction('message epingle')}>Modifier</button>}</div>
        {announcements[0] ? (
          <article className="crew-captain-note">
            <Badge tone={announcements[0].priority === 'urgent' ? 'red' : 'gold'}>{announcements[0].pinned ? 'Epingle' : announcements[0].priority}</Badge>
            <h3>{announcements[0].title}</h3>
            <p>{announcements[0].content}</p>
          </article>
        ) : <EmptyState title="Aucune annonce" text="Le capitaine n'a pas encore laisse de consigne." />}
      </section>

      <section className="crew-panel">
        <div className="crew-panel-head"><span>Top contributeurs</span></div>
        {topMembers.length ? topMembers.map((m, index) => (
          <div className="crew-row" key={m.id}><span>#{index + 1} {m.name}</span><strong>{formatBounty(m.contribution)}</strong></div>
        )) : <EmptyState title="Aucun contributeur" text="Le navire attend ses premiers faits d'armes." />}
      </section>

      <section className="crew-panel">
        <div className="crew-panel-head"><span>Journal recent</span></div>
        {logs.slice(0, 5).map(log => <LogEntry key={log.id} log={log} />)}
      </section>
    </div>
  )
}

function Members({ members, viewerRole, onLockedAction }) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('all')
  const [sort, setSort] = useState('contribution')
  const filtered = useMemo(() => {
    return members
      .filter(m => role === 'all' || m.role === role)
      .filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        if (sort === 'bounty') return b.bounty - a.bounty
        if (sort === 'joined') return new Date(b.joined_at || 0) - new Date(a.joined_at || 0)
        if (sort === 'activity') return String(a.status).localeCompare(String(b.status))
        return b.contribution - a.contribution
      })
  }, [members, query, role, sort])
  return (
    <section className="crew-panel crew-panel-full">
      <div className="crew-toolbar">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un pirate..." />
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="all">Tous les roles</option>
          {ROLE_ORDER.map(r => <option key={r} value={r}>{CREW_ROLES[r]}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="contribution">Tri contribution</option>
          <option value="bounty">Tri prime</option>
          <option value="joined">Tri entree</option>
          <option value="activity">Tri activite</option>
        </select>
      </div>
      {filtered.length ? (
        <div className="crew-members-grid">
          {filtered.map(member => <MemberCard key={member.id} member={member} viewerRole={viewerRole} onLockedAction={onLockedAction} />)}
        </div>
      ) : <EmptyState title="Aucun pirate recense" text="Le navire attend son premier equipage." icon="!" />}
    </section>
  )
}

function Hierarchy({ members }) {
  const groups = ROLE_ORDER.map(role => ({ role, members: members.filter(m => m.role === role || (role === 'elite' && m.is_elite)) })).filter(g => g.members.length)
  return (
    <section className="crew-panel crew-panel-full">
      {groups.length ? (
        <div className="crew-hierarchy">
          {groups.map(group => (
            <div className="crew-hierarchy-tier" key={group.role}>
              <h3>{CREW_ROLES[group.role]}</h3>
              <div>
                {group.members.map(m => (
                  <article key={`${group.role}-${m.id}`}>
                    <img src={m.avatar_url || `https://cdn.discordapp.com/embed/avatars/${Number(m.user_id) % 5}.png`} alt="" />
                    <strong>{m.name}</strong>
                    <span>{formatBounty(m.contribution)}</span>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : <EmptyState title="Hierarchie vierge" text="Aucun lien de commandement n'est encore etabli." />}
    </section>
  )
}

function Recruitment({ data, onLockedAction }) {
  const { crew, applications, invites, viewerRole } = data
  const canReview = uiCanShow(viewerRole, 'review_applications')
  const canInvite = uiCanShow(viewerRole, 'invite')
  const canManageRecruitment = uiCanShow(viewerRole, 'manage_recruitment') || uiCanShow(viewerRole, 'manage_settings')
  return (
    <div className="crew-two-col">
      <section className="crew-panel">
        <div className="crew-panel-head"><span>Etat du recrutement</span>{canManageRecruitment && <button type="button" onClick={() => onLockedAction('statut recrutement')}>Configurer</button>}</div>
        <Badge tone={crew.recruitment_open ? 'green' : 'red'}>{crew.recruitment_open ? 'Ouvert' : 'Ferme'}</Badge>
        <p className="crew-muted">{crew.recruitment_message}</p>
        <div className="crew-requirements">
          <span>Conditions minimales</span>
          <ul><li>Activite Discord reguliere</li><li>Respect du reglement</li><li>Motivation lisible</li></ul>
        </div>
        <LockedAction onClick={() => onLockedAction('candidature')}>Ouvrir le formulaire de candidature</LockedAction>
      </section>
      <section className="crew-panel">
        <div className="crew-panel-head"><span>Candidatures</span>{canReview && <button type="button" onClick={() => onLockedAction('review candidature')}>Traiter</button>}</div>
        {applications.map(app => (
          <div className="crew-application" key={app.id}>
            <strong>{app.name || app.user_id}</strong>
            <span>{app.specialty || app.message || 'Aucune specialite renseignee'}</span>
            <div>{app.status !== 'empty' && <><LockedAction onClick={() => onLockedAction('accepter')}>Accepter</LockedAction><LockedAction onClick={() => onLockedAction('refuser')}>Refuser</LockedAction></>}</div>
          </div>
        ))}
      </section>
      <section className="crew-panel crew-panel-full">
        <div className="crew-panel-head"><span>Invitations</span>{canInvite && <button type="button" onClick={() => onLockedAction('inviter')}>Inviter un membre</button>}</div>
        {invites.map(invite => <div className="crew-row" key={invite.id}><span>{invite.name || invite.invited_user_id}</span><strong>{invite.status}</strong></div>)}
      </section>
    </div>
  )
}

function Missions({ missions, viewerRole, onLockedAction }) {
  const canManage = uiCanShow(viewerRole, 'manage_missions')
  return (
    <section className="crew-panel crew-panel-full">
      <div className="crew-panel-head"><span>Missions d'equipage</span>{canManage && <button type="button" onClick={() => onLockedAction('creer mission')}>Creer mission</button>}</div>
      <div className="crew-mission-grid">
        {missions.map(mission => (
          <article className={`crew-mission crew-mission-${mission.status}`} key={mission.id}>
            <Badge>{mission.type}</Badge>
            <h3>{mission.title}</h3>
            <p>{mission.description || mission.reward}</p>
            <ProgressBar value={pct(mission.progress, mission.target)} label={`${mission.progress}/${mission.target}`} />
            <div className="crew-row"><span>Recompense</span><strong>{mission.reward}</strong></div>
            <div className="crew-row"><span>Deadline</span><strong>{displayDate(mission.deadline)}</strong></div>
            <LockedAction onClick={() => onLockedAction('reclamer mission')}>Reclamer</LockedAction>
          </article>
        ))}
      </div>
    </section>
  )
}

function Treasury({ members, viewerRole, onLockedAction }) {
  const top = [...members].sort((a, b) => b.contribution - a.contribution).slice(0, 5)
  const canWithdraw = uiCanShow(viewerRole, 'withdraw_treasury')
  return (
    <div className="crew-two-col">
      <section className="crew-panel crew-treasure">
        <span>Coffre d'equipage</span>
        <strong>0 BERRY</strong>
        <p>Les retraits seront disponibles uniquement via RPC serveur avec confirmation et journal.</p>
        <div className="crew-hero-actions">
          <LockedAction onClick={() => onLockedAction('contribuer coffre')}>Contribuer</LockedAction>
          {canWithdraw && <LockedAction onClick={() => onLockedAction('retirer coffre')}>Retirer</LockedAction>}
        </div>
      </section>
      <section className="crew-panel">
        <div className="crew-panel-head"><span>Top contributeurs</span></div>
        {top.length ? top.map(m => <div className="crew-row" key={m.id}><span>{m.name}</span><strong>{formatBounty(m.contribution)}</strong></div>) : <EmptyState title="Aucune contribution" text="Le coffre attend son premier depot." />}
      </section>
      <section className="crew-panel crew-panel-full">
        <EmptyState title="Historique coffre vide" text="Chaque depot, retrait et recompense sera journalise ici." icon="*" />
      </section>
    </div>
  )
}

function Territories({ territories, viewerRole, onLockedAction }) {
  const canClaim = uiCanShow(viewerRole, 'manage_missions') || viewerRole === 'captain'
  return (
    <section className="crew-panel crew-panel-full">
      <div className="crew-panel-head"><span>Carte maritime</span>{canClaim && <button type="button" onClick={() => onLockedAction('revendiquer territoire')}>Revendiquer</button>}</div>
      <div className="crew-map">
        {territories.map(t => (
          <button key={t.id || t.territory_key} type="button" className={`crew-island crew-island-${t.status}`} style={{ left: `${t.x || 50}%`, top: `${t.y || 50}%` }} title={`${t.name || t.territory_key} - ${t.bonus || ''}`}>
            <span>{t.name || t.territory_key}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function Diplomacy({ diplomacy, viewerRole, onLockedAction }) {
  const canDiplomacy = uiCanShow(viewerRole, 'manage_diplomacy')
  return (
    <section className="crew-panel crew-panel-full">
      <div className="crew-panel-head"><span>Relations diplomatiques</span>{canDiplomacy && <button type="button" onClick={() => onLockedAction('proposer alliance')}>Proposer alliance</button>}</div>
      <div className="crew-diplomacy-grid">
        {(diplomacy.length ? diplomacy : fallbackDiplomacy).map(entry => (
          <article key={entry.id} className="crew-diplomacy-card">
            <Badge tone={entry.type === 'rival' ? 'red' : entry.type === 'ally' ? 'green' : 'gold'}>{entry.type}</Badge>
            <h3>{entry.name || entry.target_crew_id}</h3>
            <p>{entry.note}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function LogEntry({ log }) {
  const description = log.description || log.metadata?.description || `${log.type} enregistre dans le journal`
  const actor = log.actor || log.actor_id || 'Systeme'
  return (
    <article className={`crew-log crew-log-${log.type}`}>
      <span>{log.type}</span>
      <div><strong>{description}</strong><small>{actor} - {displayDate(log.created_at)}</small></div>
    </article>
  )
}

function Journal({ logs }) {
  const [filter, setFilter] = useState('tout')
  const filtered = logs.filter(log => filter === 'tout' || String(log.type).includes(filter))
  return (
    <section className="crew-panel crew-panel-full">
      <div className="crew-filter-row">{LOG_FILTERS.map(f => <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f}</button>)}</div>
      <div className="crew-timeline">
        {filtered.length ? filtered.map(log => <LogEntry key={log.id} log={log} />) : <EmptyState title="Livre de bord vierge" text="Aucun evenement ne correspond a ce filtre." />}
      </div>
    </section>
  )
}

function Ranking({ members }) {
  const ranked = [...members].sort((a, b) => b.contribution - a.contribution)
  return (
    <section className="crew-panel crew-panel-full">
      {ranked.length ? (
        <>
          <div className="crew-podium">
            {ranked.slice(0, 3).map((m, i) => <article key={m.id}><span>#{i + 1}</span><strong>{m.name}</strong><small>{formatBounty(m.contribution)}</small></article>)}
          </div>
          {ranked.slice(3).map((m, i) => <div className="crew-row" key={m.id}><span>#{i + 4} {m.name}</span><strong>{formatBounty(m.contribution)}</strong></div>)}
        </>
      ) : <EmptyState title="Classement en attente" text="Le podium apparaitra avec les premiers membres." />}
    </section>
  )
}

function Settings({ crew, viewerRole, onLockedAction }) {
  const canSettings = uiCanShow(viewerRole, 'manage_settings')
  return (
    <div className="crew-two-col">
      <section className="crew-panel">
        <div className="crew-panel-head"><span>Identite du navire</span></div>
        <div className="crew-form-preview">
          <label>Nom<input value={crew.name} readOnly /></label>
          <label>Devise<input value={crew.motto || ''} readOnly /></label>
          <label>Recrutement<input value={crew.recruitment_open ? 'Ouvert' : 'Ferme'} readOnly /></label>
          <LockedAction disabled={!canSettings} onClick={() => onLockedAction('parametres')}>Modifier</LockedAction>
        </div>
      </section>
      <section className="crew-panel crew-danger">
        <div className="crew-panel-head"><span>Zone dangereuse</span></div>
        <p>Transfert de capitaine et suppression exigent une confirmation forte et un log serveur immutable.</p>
        <LockedAction disabled={!canSettings} onClick={() => onLockedAction('transferer capitaine')}>Transferer capitaine</LockedAction>
        <LockedAction disabled={!canSettings} onClick={() => onLockedAction('supprimer equipage')}>Supprimer equipage</LockedAction>
      </section>
    </div>
  )
}

function ReadOnlyBanner() {
  return (
    <div className="crew-readonly">
      <strong>Phase 1 read-only</strong>
      <span>Les actions sensibles sont volontairement verrouillees tant que les RPC/RLS serveur et le journal d'audit ne sont pas actifs.</span>
    </div>
  )
}

export default function CrewHQPage() {
  const { discordId, isAuthenticated } = useAuth()
  const prefersReducedMotion = useReducedMotion()
  const [activeTab, setActiveTab] = useState('overview')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchCrewDashboard(discordId)
      .then(result => { if (mounted) { setData(result); setError(null) } })
      .catch(err => { if (mounted) setError(err.message || 'Impossible de charger le QG') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [discordId])

  const onLockedAction = (action) => {
    setNotice(`Action "${action}" verrouillee: backend securise requis en Phase 2.`)
    window.setTimeout(() => setNotice(null), 3600)
  }

  if (loading) {
    return <main className="crew-qg-page"><div className="crew-loading"><span />Compilation du QG...</div></main>
  }

  if (error || !data) {
    return <main className="crew-qg-page"><EmptyState title="QG inaccessible" text={error || 'Les archives equipage ne repondent pas.'} /></main>
  }

  const props = { data, onLockedAction }
  const visibleTabs = visibleTabsFor(data.viewerRole)
  const activeVisibleTab = visibleTabs.some(([id]) => id === activeTab) ? activeTab : visibleTabs[0]?.[0] || 'overview'

  return (
    <main className="crew-qg-page">
      <div className="crew-bg-fog" aria-hidden="true" />
      <div className="crew-qg-shell">
        <Hero crew={data.crew} members={data.members} viewerRole={data.viewerRole} onLockedAction={onLockedAction} />
        <ReadOnlyBanner />
        {!isAuthenticated && <div className="crew-readonly crew-readonly-guest"><strong>Mode visiteur</strong><span>Connecte Discord pour voir les outils internes autorises par ton role.</span></div>}

        <nav className="crew-tabs" aria-label="Navigation equipage" role="tablist">
          {visibleTabs.map(([id, label]) => (
            <button key={id} className={activeVisibleTab === id ? 'active' : ''} type="button" role="tab" aria-selected={activeVisibleTab === id} onClick={() => setActiveTab(id)}>
              {label}
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.section
            key={activeVisibleTab}
            className="crew-tab-content"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
          >
            {activeVisibleTab === 'overview' && <Overview {...props} />}
            {activeVisibleTab === 'members' && <Members members={data.members} viewerRole={data.viewerRole} onLockedAction={onLockedAction} />}
            {activeVisibleTab === 'hierarchy' && <Hierarchy members={data.members} />}
            {activeVisibleTab === 'recruitment' && <Recruitment {...props} />}
            {activeVisibleTab === 'missions' && <Missions missions={data.missions} viewerRole={data.viewerRole} onLockedAction={onLockedAction} />}
            {activeVisibleTab === 'treasury' && <Treasury members={data.members} viewerRole={data.viewerRole} onLockedAction={onLockedAction} />}
            {activeVisibleTab === 'territories' && <Territories territories={data.territories} viewerRole={data.viewerRole} onLockedAction={onLockedAction} />}
            {activeVisibleTab === 'diplomacy' && <Diplomacy diplomacy={data.diplomacy} viewerRole={data.viewerRole} onLockedAction={onLockedAction} />}
            {activeVisibleTab === 'journal' && <Journal logs={data.logs} />}
            {activeVisibleTab === 'ranking' && <Ranking members={data.members} />}
            {activeVisibleTab === 'settings' && <Settings crew={data.crew} viewerRole={data.viewerRole} onLockedAction={onLockedAction} />}
          </motion.section>
        </AnimatePresence>
      </div>
      {notice && <div className="crew-toast" role="status">{notice}</div>}
    </main>
  )
}
