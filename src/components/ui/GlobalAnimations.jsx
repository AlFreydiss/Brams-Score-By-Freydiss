// Injecte TOUTES les @keyframes « fou de fou » une seule fois (importé dans App).
// Respecte prefers-reduced-motion : neutralise les classes d'animation .fou-*.
export default function GlobalAnimations() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes shimmer       { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      @keyframes shimmerBtn    { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      @keyframes barReflet     { 0%{transform:translateX(-120%)} 60%,100%{transform:translateX(320%)} }
      @keyframes badgePulse    { 0%,100%{opacity:.7} 50%{opacity:1} }
      @keyframes auraOr        { 0%,100%{box-shadow:0 0 12px rgba(255,215,0,.4)} 50%{box-shadow:0 0 28px rgba(255,215,0,.85)} }
      @keyframes auraArgent    { 0%,100%{box-shadow:0 0 12px rgba(192,192,192,.35)} 50%{box-shadow:0 0 26px rgba(220,220,220,.8)} }
      @keyframes auraBronze    { 0%,100%{box-shadow:0 0 12px rgba(205,127,50,.35)} 50%{box-shadow:0 0 26px rgba(205,127,50,.8)} }
      @keyframes slideInLeft   { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
      @keyframes slideInUp     { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
      @keyframes sparkFly      { from{opacity:1;transform:translate(0,0) scale(1)} to{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.3)} }
      @keyframes activeAmount  { 0%,100%{box-shadow:0 0 0 rgba(247,201,72,0)} 50%{box-shadow:0 0 16px rgba(247,201,72,.6)} }
      @keyframes rippleExpand  { from{width:0;height:0;opacity:.8} to{width:240px;height:240px;opacity:0} }
      @keyframes bgShift       { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
      @keyframes badgePop      { from{transform:scale(1)} to{transform:scale(1.2)} }
      @keyframes antenneBounce { 0%,100%{transform:rotate(-10deg)} 50%{transform:rotate(10deg)} }
      @keyframes ddBlink       { 0%,92%,100%{transform:scaleY(1)} 96%{transform:scaleY(.05)} }
      @keyframes mouthWobble   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(1.5px)} }
      @keyframes iconBounce    { 0%{transform:translateY(0)} 40%{transform:translateY(-8px)} 70%{transform:translateY(-3px)} 100%{transform:translateY(0)} }
      @keyframes revealUp      { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
      @keyframes countBump     { 0%{transform:scale(1)} 30%{transform:scale(1.4)} 100%{transform:scale(1)} }
      @keyframes pulseRing     { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(1.8);opacity:0} }
      @keyframes blinkCursor   { 0%,100%{opacity:1} 50%{opacity:0} }
      @media (prefers-reduced-motion: reduce) {
        [class*="fou-"], [data-fou] { animation: none !important; }
      }
    ` }} />
  )
}
