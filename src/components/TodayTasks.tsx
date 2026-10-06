import { ArrowRight } from 'lucide-react'
import type { DailySchedule, ScheduleSummary as ScheduleSummaryData } from '../domain/dailySchedule'
import type { TaskProgressMap } from '../domain/curriculum'
import type { CalendarDate } from '../domain/calendar'
import type { ProgressSummary } from '../domain/progress'
import { CurriculumSnapshot } from './CurriculumSnapshot'
import { ProgressMiniSummary } from './ProgressMiniSummary'
import { formatScheduleDate } from '../services/ScheduleService'
import { ScheduleSummary } from './ScheduleSummary'
import { TaskList } from './TaskList'
import './components.css'

type TodayTasksProps = {
  schedule: DailySchedule
  summary: ScheduleSummaryData
  progressState: TaskProgressMap
  progressSummary: ProgressSummary
  onViewToday: () => void
  onViewRoadmap: () => void
  calendarStatusLabel: string
  upcomingLearningDate: CalendarDate
}

export function TodayTasks({ schedule, summary, progressState, progressSummary, onViewToday, onViewRoadmap, calendarStatusLabel, upcomingLearningDate }: TodayTasksProps) {
  return (
    <section className="today-panel" aria-labelledby="today-title">
      <div className="section-eyebrow">{formatScheduleDate(schedule.date, { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}</div>
      <div className="today-heading-row">
        <h2 id="today-title">Today's journey</h2>
        <span className="sample-tag">SCHEDULED</span>
      </div>
      <p className="today-intro">From your current learning frontier.</p>
      <div className="home-calendar-strip"><span>{calendarStatusLabel}</span><small>Next learning day · {formatScheduleDate(upcomingLearningDate, { weekday: 'short', month: 'short', day: 'numeric' })}</small></div>
      <ScheduleSummary summary={summary} compact />
      <TaskList tasks={schedule.tasks} compact />
      <ProgressMiniSummary progress={progressSummary} />
      <CurriculumSnapshot schedule={schedule} progressState={progressState} onViewRoadmap={onViewRoadmap} compact />
      <button className="view-today-button" type="button" onClick={onViewToday}>
        Open today's plan <ArrowRight size={14} aria-hidden="true" />
      </button>
    </section>
  )
}
