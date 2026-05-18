import { useNavigate } from 'react-router-dom'
import BramsTraitorGame from '../game/ui/BramsTraitorGame.jsx'

export default function BramsTraitorPage() {
  const navigate = useNavigate()
  return <BramsTraitorGame onClose={() => navigate('/')} />
}
