export default {
  content: [
    './src/tierlist/**/*.{ts,tsx}',
    './src/components/TierListPage.jsx',
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
