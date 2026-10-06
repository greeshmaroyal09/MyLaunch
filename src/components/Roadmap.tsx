import { LockKeyhole, Star } from 'lucide-react'
import { Character } from './Character'
import './components.css'

type Level = {
  number: number
  title: string
  state: 'complete' | 'current' | 'locked'
  x: number
  y: number
}

const levels: Level[] = [
  { number: 1, title: 'Foundation', state: 'complete', x: 20, y: 10 },
  { number: 2, title: 'Core Skills', state: 'current', x: 69, y: 25 },
  { number: 3, title: 'Problem Solving', state: 'locked', x: 37, y: 41 },
  { number: 4, title: 'Backend', state: 'locked', x: 76, y: 57 },
  { number: 5, title: 'Projects', state: 'locked', x: 31, y: 73 },
  { number: 6, title: 'Career', state: 'locked', x: 66, y: 89 },
]

export function Roadmap() {
  return (
    <section className="roadmap-panel" aria-labelledby="roadmap-title">
      <div className="roadmap-heading">
        <div>
          <div className="section-eyebrow">THE LONG VIEW</div>
          <h2 id="roadmap-title">Your journey</h2>
        </div>
        <span className="map-prototype-label">MAP PROTOTYPE</span>
      </div>
      <p className="roadmap-intro">One step leads to another. This path is a visual example.</p>
      <div className="roadmap-landscape">
        <svg className="road-path" viewBox="0 0 760 920" preserveAspectRatio="none" aria-hidden="true">
          <path className="path-shadow" d="M150 95 C145 205 505 155 520 272 S245 345 282 425 S610 472 570 584 S180 633 223 724 S530 795 485 860" />
          <path className="path-line" d="M150 95 C145 205 505 155 520 272 S245 345 282 425 S610 472 570 584 S180 633 223 724 S530 795 485 860" />
          <path className="path-center" d="M150 95 C145 205 505 155 520 272 S245 345 282 425 S610 472 570 584 S180 633 223 724 S530 795 485 860" />
        </svg>
        <span className="map-animal animal-cat" aria-label="Small cat companion">🐈</span>
        <span className="map-animal animal-bird" aria-label="Small bird companion">🐦</span>
        <span className="map-animal animal-turtle" aria-label="Small turtle companion">🐢</span>
        {levels.map((level) => <LevelNode key={level.number} level={level} />)}
        <div className="map-character" style={{ left: '77%', top: '23%' }}>
          <Character size="marker" />
          <span>YOU ARE HERE</span>
        </div>
        <div className="map-locked-note"><LockKeyhole size={13} aria-hidden="true" /> Locked</div>
      </div>
      <div className="roadmap-caption"><span><Star size={13} fill="currentColor" aria-hidden="true" /></span>Static roadmap example · no progress or unlock logic</div>
    </section>
  )
}

function LevelNode({ level }: { level: Level }) {
  const { number, title, state, x, y } = level
  return (
    <div className={`level-node level-${state}`} style={{ left: `${x}%`, top: `${y}%` }}>
      <div className="level-marker">
        {state === 'locked' ? <LockKeyhole size={17} aria-hidden="true" /> : <span>{String(number).padStart(2, '0')}</span>}
      </div>
      <div className="level-copy"><span>LEVEL {number}</span><strong>{title}</strong></div>
    </div>
  )
}
