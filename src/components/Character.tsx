import { Sparkles, UserRound } from 'lucide-react'
import './components.css'

type CharacterProps = {
  size?: 'portrait' | 'marker'
}

export function Character({ size = 'portrait' }: CharacterProps) {
  return (
    <div className={`character-slot character-${size}`} aria-label="Main character artwork placeholder">
      <div className="character-halo" />
      <div className="character-figure">
        <UserRound size={size === 'portrait' ? 76 : 25} strokeWidth={1.35} aria-hidden="true" />
      </div>
      {size === 'portrait' && <Sparkles className="character-star" size={19} aria-hidden="true" />}
      {size === 'portrait' && <span className="character-placeholder-label">CHARACTER ARTWORK SLOT</span>}
    </div>
  )
}
