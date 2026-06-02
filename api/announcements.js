import { ANNOUNCEMENTS } from '../server/_announcementsData.js'

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json(ANNOUNCEMENTS)
}

