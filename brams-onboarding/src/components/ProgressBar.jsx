export default function ProgressBar({ current, total }) {
  return (
    <div className="pb" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={i <= current ? 'on' : ''} />
      ))}
      <style>{`
        .pb {
          display: flex;
          gap: 4px;
          margin-bottom: 22px;
        }
        .pb span {
          flex: 1;
          height: 3px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
          transition: background 0.35s ease;
        }
        .pb span.on {
          background: var(--accent);
        }
      `}</style>
    </div>
  )
}
