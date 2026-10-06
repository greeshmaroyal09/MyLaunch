import { ArrowRight, ClipboardCheck } from 'lucide-react'
import type { WeeklyTest } from '../domain/weeklyTest'
import { formatDate } from '../services/DateService'
import './weekly-test.css'

type WeeklyTestCardProps = {
  test: WeeklyTest
  onOpen: () => void
  compact?: boolean
}

export function WeeklyTestCard({ test, onOpen, compact = false }: WeeklyTestCardProps) {
  const hasQuestions = test.questionIds.length > 0
  const label = test.status === 'COMPLETED' ? 'Completed'
    : test.status === 'IN_PROGRESS' ? 'In progress'
      : test.status === 'POSTPONED' ? 'Postponed'
        : test.status === 'MISSED' ? 'Missed · no penalty'
          : hasQuestions ? 'Scheduled' : 'No weekly material yet'

  return (
    <section className={`weekly-test-card${compact ? ' weekly-test-card-compact' : ''}`} aria-label="Weekly test">
      <div className="weekly-test-card-icon"><ClipboardCheck size={17} aria-hidden="true" /></div>
      <div className="weekly-test-card-copy">
        <span className="weekly-test-card-eyebrow">WEEKLY REVIEW · {label.toUpperCase()}</span>
        <strong>{test.result ? `${test.result.score}/${test.result.totalQuestions} · ${test.result.percentage}%` : hasQuestions ? `${test.questionIds.length} questions` : 'Builds from completed topics'}</strong>
        <small>{test.status === 'COMPLETED' ? `Week of ${formatDate(test.weekStartDate, { month: 'short', day: 'numeric' })}` : `Scheduled · ${formatDate(test.scheduledDate, { weekday: 'short', month: 'short', day: 'numeric' })}`}</small>
      </div>
      <button className="weekly-test-open" type="button" onClick={onOpen} aria-label="Open weekly test">
        <ArrowRight size={15} aria-hidden="true" />
      </button>
    </section>
  )
}
