// ── Comptes VIP boutique (miroir front de VIP_FREE_ACCOUNTS dans api/bot-tools.js)
// Le vrai bypass est SERVEUR ; ici on ne gère que l'affichage (libellé des
// boutons prix + messages perso).
export const VIP_FREE = {
  '1094070545248694342': { label: 'Gratuit pour le Capitaine 👑', short: 'Gratuit 👑' },
  '1495896013037113366': { label: 'Gratuit pour Amel 💛', short: 'Gratuit 💛' },
}

export function vipFree(discordId) {
  return VIP_FREE[String(discordId || '')] || null
}

// Message perso affiché à Amel à sa connexion (site + boutique).
export const AMEL_ID = '1495896013037113366'
export const AMEL_MESSAGE = 'profite bb jtm 💛'
