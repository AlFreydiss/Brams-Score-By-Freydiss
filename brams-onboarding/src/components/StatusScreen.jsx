import Icon from './Icon.jsx'

const MESSAGES = {
  loading: {
    icon: 'loader',
    title: 'Vérification de ton lien…',
    desc: 'Un instant, on dégage l\u2019ancre.',
    spin: true
  },
  invalid: {
    icon: 'warning',
    title: 'Lien invalide',
    desc: 'Ce lien n\u2019existe pas. Demande à un membre du staff de t\u2019en générer un nouveau.'
  },
  used: {
    icon: 'check',
    title: 'Déjà inscrit',
    desc: 'Tu as déjà rempli ce formulaire. Si tu veux modifier tes choix, utilise /onboarding sur le serveur.'
  },
  expired: {
    icon: 'warning',
    title: 'Lien expiré',
    desc: 'Ton lien a passé sa date limite. Refais /onboarding sur Discord pour en obtenir un nouveau.'
  },
  no_token: {
    icon: 'warning',
    title: 'Aucun lien fourni',
    desc: 'Tu dois arriver ici depuis le lien personnel que le bot t\u2019a envoyé en DM.'
  },
  network: {
    icon: 'warning',
    title: 'Connexion impossible',
    desc: 'On n\u2019arrive pas à joindre nos serveurs. Réessaie dans quelques secondes.'
  }
}

export default function StatusScreen({ kind = 'loading' }) {
  const m = MESSAGES[kind] || MESSAGES.invalid
  return (
    <div className={`status ${kind}`}>
      <div className={`status-icon ${m.spin ? 'spin' : ''}`}>
        <Icon name={m.icon} size={28} strokeWidth={1.8} />
      </div>
      <h2>{m.title}</h2>
      <p>{m.desc}</p>

      <style>{`
        .status {
          text-align: center;
          padding: 12px 8px;
          animation: riseIn 0.5s ease-out;
        }
        .status-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-muted);
        }
        .status.invalid .status-icon,
        .status.expired .status-icon,
        .status.no_token .status-icon,
        .status.network .status-icon {
          background: rgba(224, 82, 74, 0.14);
          color: var(--accent);
        }
        .status.used .status-icon {
          background: rgba(52, 211, 153, 0.14);
          color: var(--success);
        }
        .status-icon.spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .status h2 {
          font-family: var(--display);
          font-size: 22px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 8px;
          letter-spacing: -0.01em;
        }
        .status p {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.6;
          max-width: 380px;
          margin: 0 auto;
        }
      `}</style>
    </div>
  )
}
