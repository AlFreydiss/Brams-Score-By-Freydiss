import Icon from './Icon.jsx'

export default function QuestionStep({ step, total, question, value, onChange }) {
  const isSelected = (opt) =>
    question.multi ? (value || []).includes(opt.value) : value === opt.value

  const handleClick = (opt) => {
    if (question.multi) {
      const v = value || []
      onChange(v.includes(opt.value) ? v.filter((x) => x !== opt.value) : [...v, opt.value])
    } else {
      onChange(opt.value)
    }
  }

  return (
    <div className="qstep" key={question.id}>
      <p className="qmeta">
        Question {step + 1} sur {total} <span className="dot">•</span> <b>Requis</b>
      </p>
      <h2 className="qtitle">{question.title}</h2>

      <div className={`qgrid cols-${question.cols || 2}`}>
        {question.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`qopt ${isSelected(opt) ? 'sel' : ''}`}
            onClick={() => handleClick(opt)}
            aria-pressed={isSelected(opt)}
          >
            <span className="qopt-icon">
              <Icon name={opt.icon} size={22} />
            </span>
            <span className="qopt-text">
              <span className="qopt-title">{opt.title}</span>
              <span className="qopt-desc">{opt.desc}</span>
            </span>
            {isSelected(opt) && (
              <span className="qopt-check">
                <Icon name="check" size={14} strokeWidth={2.5} />
              </span>
            )}
          </button>
        ))}
      </div>

      <style>{`
        .qstep {
          animation: riseIn 0.5s ease-out;
        }
        .qmeta {
          font-size: 12px;
          color: var(--text-dim);
          letter-spacing: 0.4px;
          text-transform: uppercase;
          margin-bottom: 12px;
          font-weight: 500;
        }
        .qmeta .dot { opacity: 0.5; }
        .qmeta b {
          color: var(--accent);
          font-weight: 500;
        }
        .qtitle {
          font-family: var(--display);
          font-size: clamp(22px, 2.4vw, 28px);
          font-weight: 600;
          line-height: 1.2;
          letter-spacing: -0.01em;
          margin-bottom: 26px;
          color: #fff;
        }
        .qgrid {
          display: grid;
          gap: 10px;
        }
        .qgrid.cols-2 { grid-template-columns: repeat(2, 1fr); }
        .qgrid.cols-3 { grid-template-columns: repeat(3, 1fr); }

        .qopt {
          position: relative;
          display: flex;
          gap: 14px;
          align-items: flex-start;
          text-align: left;
          background: rgba(28, 30, 38, 0.85);
          border: 0.5px solid var(--border);
          border-radius: 10px;
          padding: 13px 15px;
          color: #fff;
          transition: background 0.18s ease, border-color 0.18s ease, transform 0.12s ease;
        }
        .qopt:hover {
          background: rgba(38, 40, 50, 0.95);
          border-color: var(--border-hover);
        }
        .qopt:active {
          transform: scale(0.99);
        }
        .qopt.sel {
          background: var(--accent-tint);
          border-color: var(--accent);
        }
        .qopt-icon {
          flex-shrink: 0;
          margin-top: 1px;
          color: rgba(255, 255, 255, 0.9);
        }
        .qopt.sel .qopt-icon {
          color: var(--accent);
        }
        .qopt-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .qopt-title {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          letter-spacing: -0.005em;
        }
        .qopt-desc {
          font-size: 12.5px;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .qopt-check {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 600px) {
          .qgrid.cols-2,
          .qgrid.cols-3 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
