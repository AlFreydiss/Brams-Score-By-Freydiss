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

  /* ── Hero title ── */
  @keyframes slideFromLeft {
    from { opacity: 0; transform: translateX(-36px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideFromRight {
    from { opacity: 0; transform: translateX(36px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes communityGradient {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes communityGlow {
    0%, 100% { filter: drop-shadow(0 0 18px rgba(255,160,30,0.28)); }
    50%       { filter: drop-shadow(0 0 42px rgba(255,185,55,0.58)); }
  }
  @keyframes ha-title-breath {
    0%, 100% { text-shadow: 0 1px 0 rgba(0,0,0,.70), 0 4px 16px rgba(0,0,0,.55), 0 0 50px rgba(200,130,25,.18); }
    50%       { text-shadow: 0 1px 0 rgba(0,0,0,.70), 0 4px 16px rgba(0,0,0,.55), 0 0 70px rgba(220,150,30,.34); }
  }
  .hero-brams {
    display: block;
    background: none !important;
    -webkit-text-fill-color: unset !important;
    -webkit-background-clip: unset !important;
    background-clip: unset !important;
    color: rgba(238,228,205,0.96);
    text-shadow:
      0 1px 0 rgba(0,0,0,.70),
      0 4px 16px rgba(0,0,0,.55),
      0 0 50px rgba(200,130,25,.18);
    animation: slideFromLeft 0.85s cubic-bezier(0.22,1,0.36,1) both,
               ha-title-breath 8s 1s ease-in-out infinite;
  }
  .hero-community-glow {
    display: block;
    animation: communityGlow 3s 1s ease-in-out infinite;
    will-change: filter;
  }
  .hero-community {
    display: block;
    /* Force Pirata One — OnePiece n'a pas tous les glyphes ASCII (i, t, y…) */
    font-family: 'Pirata One', cursive;
    background: linear-gradient(135deg, #b86a0a 0%, #e8a820 25%, #f5c842 50%, #d4900a 75%, #b86a0a 100%);
    background-size: 300% 300%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation:
      slideFromRight 0.85s 0.2s cubic-bezier(0.22,1,0.36,1) both,
      communityGradient 4.5s 1s ease infinite;
  }

  /* ── Calendrier button ── */
  @keyframes calShimmer {
    0%   { left: -100%; opacity: 1; }
    18%  { left: 150%;  opacity: 1; }
    100% { left: 150%;  opacity: 0; }
  }
  .cal-btn {
    padding: 7px 14px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    background: linear-gradient(135deg, rgba(14,165,233,0.10) 0%, rgba(99,102,241,0.10) 100%);
    border: 1px solid rgba(56,189,248,0.28);
    color: #38bdf8;
    display: flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease, background 0.22s ease, border-color 0.22s ease;
  }
  .cal-btn:hover {
    transform: scale(1.05);
    background: linear-gradient(135deg, rgba(14,165,233,0.20) 0%, rgba(99,102,241,0.20) 100%);
    border-color: rgba(56,189,248,0.52);
    box-shadow: 0 0 20px rgba(56,189,248,0.22), 0 4px 16px rgba(99,102,241,0.18);
  }
  .cal-btn::before {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 55%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(56,189,248,0.18), transparent);
    animation: calShimmer 5.5s 2.5s ease-in-out infinite;
    pointer-events: none;
  }
  .cal-icon {
    display: inline-block;
    transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1);
  }
  .cal-btn:hover .cal-icon {
    transform: rotate(-14deg) scale(1.22);
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

  /* ── Anti-artifact rendering ── */
  /*
   * Ne PAS mettre transform:translateZ(0) sur chaque section :
   * ça crée des composite-layer boundaries visibles entre sections.
   * On isole uniquement les éléments fixes (background video/overlay)
   * et le wrapper principal via isolation:isolate dans App.jsx.
   */

  /* Empêche l'overflow horizontal parasite sur mobile */
  html, body {
    max-width: 100vw;
    overflow-x: hidden;
  }

  /* Pas de gap subpixel sur les images/vidéos inline */
  img, picture, video, canvas, iframe, svg {
    display: block;
    vertical-align: bottom;
    border: 0;
  }

  /* Les cartes et éléments avec border-radius ne laissent pas de frange */
  .card {
    isolation: isolate;
  }

  /* Orb : pas de transform supplémentaire pour éviter les conflits de layer */
  .orb {
    will-change: transform;
  }

  /* Les flip cards gèrent backface-visibility directement via inline styles */

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

  /* Show mobile only */
  .show-mobile { display: none !important; }
  @media (max-width: 768px) {
    .show-mobile { display: flex !important; }
  }

  /* Right sidebar panel — only visible on very wide screens */
  .right-panel {
    display: none !important;
  }
  @media (min-width: 1740px) {
    .right-panel {
      display: flex !important;
    }
  }

  /* ── AI Chat bubble float animation ── */
  @keyframes floatAI {
    0%,100% { transform: translateY(0px); }
    50%     { transform: translateY(-5px); }
  }

  /* ── Smooth theme transitions ── */
  .theme-changing * {
    transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease !important;
  }
  .theme-changing img,
  .theme-changing video,
  .theme-changing iframe,
  .theme-changing canvas {
    transition: none !important;
  }

  /* ── Thème clair ── */
  body.theme-light ::-webkit-scrollbar-track { background: #f5eedd; }
  body.theme-light ::-webkit-scrollbar-thumb { background: #c4a882; border-radius: 3px; }
  body.theme-light .h2 { color: #18203c !important; }
  body.theme-light .sub { color: rgba(24,32,60,0.55) !important; }
  body.theme-light .label { color: var(--accent) !important; }
  body.theme-light .btn-ghost { color: #18203c !important; }

  /* ── Thème coloré ── */
  body.theme-colorful ::-webkit-scrollbar-track { background: #020b12; }
  body.theme-colorful ::-webkit-scrollbar-thumb { background: #1a5a58; border-radius: 3px; }
  body.theme-colorful .h2 {
    background: linear-gradient(135deg, #00c8b0, #00f5e0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  body.theme-colorful .label { color: #00c8b0 !important; }
  body.theme-colorful .btn-primary { background: #00c8b0; box-shadow: 0 4px 24px rgba(0,200,175,0.3); }
  body.theme-colorful .btn-primary:hover { box-shadow: 0 6px 32px rgba(0,200,175,0.5); }

  /* ── Wiki / Théories — rendu Markdown ── */
  .wiki-content h2 { font-family: 'Pirata One', cursive; font-size: 26px; color: #fff; margin: 32px 0 14px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .wiki-content h3 { font-size: 19px; color: rgba(255,255,255,0.9); font-weight: 700; margin: 24px 0 10px; }
  .wiki-content h4 { font-size: 15px; color: rgba(255,255,255,0.8); font-weight: 700; margin: 18px 0 8px; }
  .wiki-content p  { font-size: 15px; color: rgba(255,255,255,0.72); line-height: 1.8; margin: 0 0 14px; }
  .wiki-content ul, .wiki-content ol { padding-left: 24px; margin: 0 0 14px; color: rgba(255,255,255,0.7); font-size: 15px; line-height: 1.75; }
  .wiki-content li { margin-bottom: 5px; }
  .wiki-content code { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 1px 6px; font-family: monospace; font-size: 13px; color: #d4a017; }
  .wiki-content pre { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0 0 16px; }
  .wiki-content pre code { background: none; border: none; padding: 0; color: rgba(255,255,255,0.85); font-size: 13px; }
  .wiki-content hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 26px 0; }
  .wiki-content a  { color: #d4a017; text-decoration: none; }
  .wiki-content a:hover { text-decoration: underline; }
  .wiki-content strong { color: #fff; font-weight: 700; }
  .wiki-content em { font-style: italic; }
  @media (max-width: 768px) {
    .wiki-content h2 { font-size: 22px; }
    .wiki-content h3 { font-size: 17px; }
  }
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
