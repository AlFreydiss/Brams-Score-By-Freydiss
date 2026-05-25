// Les `value` sont stables — ne les change pas si tu modifies les libellés,
// sinon le mapping de rôles Railway devient obsolète.

export const QUESTIONS = [
  {
    id: 'raison',
    title: "🏴‍☠️ Qu'est-ce qui t'amène à bord ?",
    hint: "Plusieurs choix possibles — on ajuste les salons selon tes intérêts.",
    multi: true,
    cols: 2,
    options: [
      { value: 'anime',    icon: 'sparkles',   title: "Fans d'anime",   desc: 'Partager, débattre, découvrir' },
      { value: 'vocal',    icon: 'headphones', title: 'Vocal & rangs',  desc: 'Grimper de Pirate à Yonkou' },
      { value: 'buster',   icon: 'cpu',        title: 'Bot Buster',     desc: '/banque, /wanted, quiz et events' },
      { value: 'op',       icon: 'map',        title: 'One Piece',      desc: 'Théories, chapitres, lore' },
      { value: 'observer', icon: 'eye',        title: 'Juste observer', desc: 'Je verrai bien ce que ça donne' },
    ]
  },
  {
    id: 'equipage',
    title: "⚓ Ton équipage de cœur ?",
    hint: "Un seul choix — ton rôle sera attribué automatiquement.",
    multi: false,
    cols: 2,
    options: [
      { value: 'mugiwara', icon: 'hat',    title: 'Mugiwara',       desc: "L'équipage du futur Roi des Pirates" },
      { value: 'heart',    icon: 'heart',  title: 'Heart Pirates',  desc: 'Law et sa précision chirurgicale' },
      { value: 'redhair',  icon: 'flame',  title: 'Red Hair',       desc: 'La puissance tranquille de Shanks' },
      { value: 'roger',    icon: 'skull',  title: 'Roger Pirates',  desc: 'Les légendes qui ont tout accompli' },
      { value: 'other',    icon: 'anchor', title: 'Autre équipage', desc: 'Mon allégeance est ailleurs' },
    ]
  },
  {
    id: 'usage',
    title: "🎯 Tu viens surtout pour quoi ?",
    hint: "Plusieurs choix possibles.",
    multi: true,
    cols: 2,
    options: [
      { value: 'vocal',  icon: 'headphones', title: 'Le vocal',      desc: 'Papoter, jouer, chill en fond' },
      { value: 'chat',   icon: 'message',    title: 'Le chat',       desc: 'Texte, mèmes, discussions' },
      { value: 'bot',    icon: 'cpu',        title: 'Le bot Buster', desc: 'Commandes, économie, profil' },
      { value: 'events', icon: 'trophy',     title: 'Quiz & events', desc: 'Compétitions, classements' },
    ]
  },
  {
    id: 'objectif',
    title: "🎖️ Ton objectif de rang ?",
    hint: "Honnête avec toi-même — ça aide à calibrer les notifs.",
    multi: false,
    cols: 2,
    options: [
      { value: 'pirate',      icon: 'flag',   title: 'Pirate',      desc: "Je passe quand j'ai le temps" },
      { value: 'shichibukai', icon: 'sword',  title: 'Shichibukai', desc: 'Je suis là régulièrement' },
      { value: 'amiral',      icon: 'shield', title: 'Amiral',      desc: 'Je prends ça au sérieux' },
      { value: 'yonkou',      icon: 'crown',  title: 'Yonkou',      desc: 'No life assumé, je vise le top 🏴‍☠️' },
    ]
  }
]

export function getEndMessage(answers) {
  const objectif = answers?.objectif

  const messages = {
    yonkou: {
      titre: 'Futur Yonkou du Brams Community',
      prime: '??? 000 000 Berry',
      desc: "S'est embarqué sur le Brams Community avec une seule ambition : dominer le classement vocal. Dangereux. À surveiller.",
      conclusion: "Bienvenue à bord, capitaine. Le vocal t'attend. 🎙️",
    },
    amiral: {
      titre: 'Recrue sérieuse',
      prime: '500 000 Berry',
      desc: "Motivé, régulier, les Marines l'ont à l'œil. Pourrait devenir une menace réelle.",
      conclusion: 'Bienvenue sur le Brams Community. On te verra souvent. ⚓',
    },
    shichibukai: {
      titre: 'Membre régulier',
      prime: '150 000 Berry',
      desc: "Ni trop sage, ni trop fou. Passe quand ça l'arrange. Accord provisoire accordé.",
      conclusion: 'Bienvenue à bord. Les salons sont ouverts. 🗺️',
    },
    pirate: {
      titre: 'Nouveau moussaillon',
      prime: '50 000 Berry',
      desc: "Tout juste débarqué. Inoffensif pour l'instant. À réévaluer selon l'activité.",
      conclusion: "Bienvenue sur le Brams Community. Prends le temps de t'installer. 🌊",
    },
  }

  return messages[objectif] ?? messages.pirate
}
