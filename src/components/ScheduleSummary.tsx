import type { ScheduleSummary as ScheduleSummaryData } from '../domain/dailySchedule'

export function ScheduleSummary({ summary, compact = false }: { summary: ScheduleSummaryData; compact?: boolean }) {
  if (compact) {
    return (
      <div className="schedule-compact-summary" aria-label={`${summary.taskCount} tasks, ${summary.plannedMinutes} minutes planned`}>
        <span>{summary.taskCount} tasks</span>
        <span>{summary.plannedMinutes} min planned</span>
        {summary.completedCount > 0 && <span>{summary.completedCount} completed</span>}
      </div>
    )
  }

  const items = [
    { label: "Today's tasks", value: summary.taskCount },
    { label: 'Completed', value: summary.completedCount },
    { label: 'Remaining', value: summary.remainingCount },
    { label: 'Planned time', value: `${summary.plannedMinutes} min` },
  ]

  return (
    <div className="schedule-summary" aria-label="Today's schedule summary">
      {items.map(({ label, value }) => (
        <div className="summary-stat" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}
