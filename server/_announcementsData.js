const now = Date.now()
const minutes = (n) => new Date(now - n * 60_000).toISOString()

export const ANNOUNCEMENTS = [
  {
    id: 'ann-1',
    author_name: 'Brams Staff',
    author_avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
    created_at: minutes(42),
    content: 'Watch Party Dr. Stone ce soir. Pensez à passer avant le début pour être prêt.',
  },
  {
    id: 'ann-2',
    author_name: 'Brams Team',
    author_avatar: 'https://cdn.discordapp.com/embed/avatars/1.png',
    created_at: minutes(210),
    content: 'Le Blind Test ouvre bientôt. Les scores et le Hall of Fame sont en cours de suivi.',
  },
  {
    id: 'ann-3',
    author_name: 'Modération',
    author_avatar: 'https://cdn.discordapp.com/embed/avatars/2.png',
    created_at: minutes(960),
    content: 'Les théories et les wikis passent toujours par validation avant publication.',
    edited_at: minutes(840),
  },
]

export const DISCORD_FEED = [
  {
    id: 'msg-1',
    author: {
      globalName: 'Brams Staff',
      username: 'brams.staff',
      avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
      bot: true,
    },
    timestamp: minutes(42),
    content: 'Watch Party Dr. Stone ce soir. Pensez à passer avant le début pour être prêt.',
    embeds: [],
    attachments: [],
  },
  {
    id: 'msg-2',
    author: {
      globalName: 'Brams Team',
      username: 'brams.team',
      avatar: 'https://cdn.discordapp.com/embed/avatars/1.png',
      bot: true,
    },
    timestamp: minutes(210),
    content: 'Le Blind Test ouvre bientôt. Les scores et le Hall of Fame sont en cours de suivi.',
    embeds: [
      {
        title: 'Blind Test',
        description: 'Le leaderboard est branché et le suivi des scores est actif.',
        color: 0xb6913d,
      },
    ],
    attachments: [],
  },
  {
    id: 'msg-3',
    author: {
      globalName: 'Modération',
      username: 'moderation',
      avatar: 'https://cdn.discordapp.com/embed/avatars/2.png',
      bot: true,
    },
    timestamp: minutes(960),
    content: 'Les théories et les wikis passent toujours par validation avant publication.',
    embeds: [],
    attachments: [],
  },
]

