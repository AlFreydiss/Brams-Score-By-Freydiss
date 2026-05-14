import { useEffect } from 'react'

const CSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.94); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
  @keyframes drift {
    0%,100% { transform: translate(0,0); }
    33%     { transform: translate(20px,-15px); }
    66%     { transform: translate(-10px,20px); }
  }
  @keyframes float {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-12px); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes ripple {
    0%   { transform: scale(0); opacity: 1; }
    100% { transform: scale(4); opacity: 0; }
  }
  @keyframes bounceIn {
    0%   { transform: scale(0.3); opacity: 0; }
    50%  { transform: scale(1.05); }
    70%  { transform: scale(0.9); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-8px); }
    40%     { transform: translateX(8px); }
    60%     { transform: translateX(-5px); }
    80%     { transform: translateX(5px); }
  }
  @keyframes haki-wave {
    0%   { transform: scale(0); opacity: 0.8; }
    100% { transform: scale(6); opacity: 0; }
  }
  @keyframes gear5spin {
    0%   { transform: scale(0) rotate(-180deg); opacity: 0; }
    60%  { transform: scale(1.3) rotate(10deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes typewriter {
    from { width: 0; }
    to   { width: 100%; }
  }
  @keyframes blink {
    0%, 100% { border-color: transparent; }
    50%      { border-color: currentColor; }
  }
  @keyframes gradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes particleBurst {
    0%   { transform: translate(0,0) scale(1); opacity: 1; }
    100% { transform: translate(var(--dx,30px), var(--dy,-60px)) scale(0); opacity: 0; }
  }

  /* Utilitaires animation */
  .fade-up   { animation: fadeUp  0.7s ease-out both; }
  .fade-up-2 { animation: fadeUp  0.7s 0.12s ease-out both; }
  .fade-up-3 { animation: fadeUp  0.7s 0.24s ease-out both; }
  .fade-in   { animation: fadeIn  0.4s ease-out both; }
  .scale-in  { animation: scaleIn 0.25s ease-out both; }
  .bounce-in { animation: bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }

  /* Scroll reveal */
  .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.65s ease, transform 0.65s ease; }
  .reveal.visible { opacity: 1; transform: translateY(0); }
  .reveal-2 { transition-delay: 0.12s !important; }
  .reveal-3 { transition-delay: 0.24s !important; }
  .reveal-4 { transition-delay: 0.36s !important; }

  /* Shimmer skeleton */
  .skeleton {
    background: linear-gradient(90deg, #1e2024 25%, #2a2d32 50%, #1e2024 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 6px;
  }

  /* Comic mode halftone pattern */
  .halftone-overlay {
    background-image: radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px);
    background-size: 6px 6px;
    pointer-events: none;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #111214; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

  /* Selection */
  ::selection { background: rgba(224,82,74,0.3); }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Hide mobile */
  @media (max-width: 768px) {
    .hide-mobile { display: none !important; }
  }

  /* ── Thème clair ── */
  body.theme-light .h2 { color: #111214 !important; }
  body.theme-light .sub { color: rgba(0,0,0,0.58) !important; }
  body.theme-light .label { color: var(--accent) !important; }
  body.theme-light .btn-ghost { color: #111214 !important; }
  body.theme-light ::-webkit-scrollbar-thumb { background: #ccc; }

  /* ── Thème coloré ── */
  body.theme-colorful .h2 {
    background: linear-gradient(135deg, #ff6b9d, #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  body.theme-colorful .label { color: #ff6b9d !important; }
  body.theme-colorful .btn-primary { background: #ff6b9d; box-shadow: 0 4px 24px rgba(255,107,157,0.3); }
  body.theme-colorful .btn-primary:hover { box-shadow: 0 6px 32px rgba(255,107,157,0.5); }
`

export default function GlobalStyles() {
  useEffect(() => {
    const id = 'brams-global-styles'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = CSS
    document.head.appendChild(el)
    return () => el.remove()
  }, [])
  return null
}
