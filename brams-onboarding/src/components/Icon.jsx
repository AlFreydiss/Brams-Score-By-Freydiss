import {
  Sparkles,
  Gamepad2,
  Gamepad,
  Headphones,
  Film,
  Cpu,
  Monitor,
  Puzzle,
  Smartphone,
  X,
  Trophy,
  Globe,
  Flag,
  Megaphone,
  CalendarDays,
  Radio,
  BellOff,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Loader2
} from 'lucide-react'

function SoccerBall({ size = 20, strokeWidth = 1.75, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="12,7 16.5,10.5 14.7,16 9.3,16 7.5,10.5" />
      <path d="M12 2 V7 M12 17 V22 M2 12 H7 M17 12 H22 M5 5 L7.5 7 M19 5 L16.5 7 M5 19 L9.3 16 M19 19 L14.7 16" />
    </svg>
  )
}

const MAP = {
  sparkles: Sparkles,
  gamepad: Gamepad,
  gamepad2: Gamepad2,
  football: SoccerBall,
  headphones: Headphones,
  movie: Film,
  cpu: Cpu,
  desktop: Monitor,
  puzzle: Puzzle,
  mobile: Smartphone,
  x: X,
  trophy: Trophy,
  world: Globe,
  flag: Flag,
  megaphone: Megaphone,
  calendar: CalendarDays,
  broadcast: Radio,
  'bell-off': BellOff,
  check: Check,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  warning: AlertTriangle,
  loader: Loader2
}

export default function Icon({ name, size = 20, strokeWidth = 1.75, ...rest }) {
  const Cmp = MAP[name] || Sparkles
  return <Cmp size={size} strokeWidth={strokeWidth} aria-hidden="true" {...rest} />
}
