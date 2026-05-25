import Icon from './Icon.jsx'
import { getEndMessage } from '../data/questions.js'

export default function DoneScreen({ answers = {} }) {
  const msg = getEndMessage(answers)

  return (
    <div className="done">
      <div className="done-ring">
        <div className="done-check">
          <Icon name="check" size={30} strokeWidth={2.5} />
        </div>
      </div>

      <div className="wanted-card">
        <div className="wanted-header">🏴‍☠️ AVIS DE RECHERCHE</div>
        <div className="wanted-titre">{msg.titre}</div>
        <div className="wanted-prime">Prime : <strong>{msg.prime}</strong></div>
        <p className="wanted-desc">"{msg.desc}"</p>
        <div className="wanted-conclusion">{msg.conclusion}</div>
      </div>

      <p className="done-hint">
        Tes rôles sont en train d'être attribués sur le serveur.<br />
        Tu peux fermer cet onglet et retourner sur Discord.
      </p>

      <style>{`
        .done {
          text-align: center;
          padding: 12px 8px;
          animation: riseIn 0.6s ease-out;
        }
        .done-ring {
          position: relative;
          width: 72px;
          height: 72px;
          margin: 0 auto 22px;
          border-radius: 50%;
          background: rgba(52, 211, 153, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .done-ring::before {
          content: '';
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 1px solid rgba(52, 211, 153, 0.3);
          animation: pulseRing 2.2s ease-out infinite;
        }
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        .done-check {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--success);
          color: #062a1c;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wanted-card {
          background: #1E1F22;
          border: 1px solid #E0524A55;
          border-radius: 14px;
          padding: 20px 24px;
          margin: 0 auto 20px;
          max-width: 420px;
          text-align: left;
        }
        .wanted-header {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #E0524A;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .wanted-titre {
          font-family: var(--display);
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 6px;
        }
        .wanted-prime {
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }
        .wanted-prime strong {
          color: #FFD700;
        }
        .wanted-desc {
          font-size: 13.5px;
          color: var(--text-muted);
          line-height: 1.6;
          font-style: italic;
          border-left: 2px solid #E0524A55;
          padding-left: 12px;
          margin: 0 0 14px;
        }
        .wanted-conclusion {
          font-size: 14px;
          color: #fff;
          font-weight: 500;
        }
        .done-hint {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.65;
        }
      `}</style>
    </div>
  )
}
