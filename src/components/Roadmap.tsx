import { Check, LockKeyhole, Sparkles } from 'lucide-react'
import type { TaskProgressMap } from '../domain/curriculum'
import { getRoadmapStages } from '../services/RoadmapStageService'
import './components.css'

export function Roadmap({ progressState }: { progressState: TaskProgressMap }) {
  const stages = getRoadmapStages(progressState)
  return (
    <section className="roadmap-panel" aria-labelledby="roadmap-title">
      <div className="roadmap-heading"><div><div className="section-eyebrow">THE LONG VIEW</div><h2 id="roadmap-title">Your journey</h2></div><Sparkles size={19} aria-hidden="true" /></div>
      <p className="roadmap-intro">Follow your progress from foundations to career preparation.</p>
      <div className="journey-map">
        <svg className="journey-route" viewBox="0 0 60 600" preserveAspectRatio="none" aria-hidden="true"><path d="M30 0 C8 75 52 125 30 200 S8 325 30 400 S52 525 30 600" /></svg>
        <ol className="journey-stages">
          {stages.map((stage, index) => (
            <li key={stage.title} className={`journey-stage journey-${stage.state}`} aria-current={stage.state === 'current' ? 'step' : undefined}>
              <div className="journey-node">{stage.state === 'complete' ? <Check size={18} aria-hidden="true" /> : stage.state === 'locked' ? <LockKeyhole size={17} aria-hidden="true" /> : String(index + 1).padStart(2, '0')}</div>
              <div className="journey-stage-copy">
                <div className="journey-stage-top"><span>STAGE {String(index + 1).padStart(2, '0')}</span><span className="journey-state">{stage.state === 'current' ? 'YOU ARE HERE' : stage.state === 'complete' ? 'COMPLETED' : 'LOCKED'}</span></div>
                <strong>{stage.title}</strong>
                <p>{stage.description}</p>
                <small>{stage.completed} / {stage.taskIds.length} tasks complete</small>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
