export default {
  content: [
    './src/tierlist/**/*.{ts,tsx}',
    './src/components/TierListPage.jsx',
    // shadcn/ui cloisonné : on scanne UNIQUEMENT le dossier ui/. Les composants
    // portent toutes leurs classes → ils s'affichent complets. On NE charge
    // JAMAIS @tailwind base (preflight) → aucun reset global, les pages en
    // styles inline restent intactes. (Élargir à ./src/** ferait regénérer
    // toutes les utilities dans tierlist.css aussi → bundle gonflé.)
    './src/components/ui/**/*.{js,jsx}',
    // Nouvelle stack : les NOUVEAUX composants .tsx (Tailwind+shadcn) partout
    // dans src/ — n'inclut volontairement PAS les .jsx existants (inline
    // styles) pour ne pas regénérer/gonfler les feuilles existantes.
    './src/**/*.tsx',
  ],
  theme: {
    extend: {
      colors: {
        tierbg: '#0f0f0f',
        tierpanel: '#171717',
        tierline: 'rgba(255,255,255,0.10)',
        tiergold: '#f6c52f',
      },
      fontFamily: {
        gamer: ['Impact', 'Arial Black', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        tier: '0 24px 90px rgba(0,0,0,0.45)',
        glow: '0 0 34px rgba(246,197,47,0.18)',
      },
    },
  },
  plugins: [],
}
