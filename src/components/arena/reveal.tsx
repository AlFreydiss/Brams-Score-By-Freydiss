import { motion, useReducedMotion } from "framer-motion";

// Habillage télé : une barre blanche traverse le texte et le laisse derrière
// elle, une fois, à l'arrivée à l'écran.

export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.span className="ar-reveal" initial="out" whileInView="in" viewport={{ once: true, margin: "-40px" }}>
      <motion.span className="ar-reveal-txt" variants={{ out: { opacity: 0 }, in: { opacity: 1, transition: { delay: delay + 0.3, duration: 0.01 } } }}>
        {children}
      </motion.span>
      <motion.i
        className="ar-reveal-bar"
        aria-hidden
        variants={{ out: { x: "-101%" }, in: { x: ["-101%", "0%", "101%"], transition: { delay, duration: 0.7, times: [0, 0.45, 1], ease: [0.7, 0, 0.3, 1] } } }}
      />
    </motion.span>
  );
}
