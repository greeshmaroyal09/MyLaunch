import { careerPriorities } from '../data/careerPriorities'

type CareerPriorityProps = { compact?: boolean }

export function CareerPriority({ compact = false }: CareerPriorityProps) {
  return (
    <section className={`career-priority${compact ? ' career-priority-compact' : ''}`} aria-label="Career-track priorities">
      <div className="career-priority-main">
        <span>PRIMARY CAREER DIRECTION</span>
        <h2>{careerPriorities.primaryDirection}</h2>
        <div className="career-priority-tags">
          {careerPriorities.specialisationInterests.map((interest) => <span key={interest}>{interest}</span>)}
        </div>
      </div>
      <div className="career-priority-supporting">
        <p><strong>Secondary learning track</strong>{careerPriorities.secondaryTrack} · {careerPriorities.secondaryPurpose}</p>
        <p><strong>Roadmap structure</strong>Shared foundations, then two specialization lanes</p>
      </div>
    </section>
  )
}
