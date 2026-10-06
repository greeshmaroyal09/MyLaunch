import { CalendarDays, Clock3 } from 'lucide-react'
import type { CalendarConfiguration, CalendarDate, LeaveRecord } from '../domain/calendar'
import type { DailySchedule, ScheduleSummary as ScheduleSummaryData } from '../domain/dailySchedule'
import type { TaskProgressMap } from '../domain/curriculum'
import type { ProgressEvent, ProgressSummary } from '../domain/progress'
import type { ScheduledTask, SkipType } from '../domain/task'
import type { WeeklyTest } from '../domain/weeklyTest'
import { getCurriculumTasks } from '../data/curriculum'
import { CalendarService } from '../services/CalendarService'
import { formatScheduleDate, ScheduleService } from '../services/ScheduleService'
import { nextDay } from '../services/DateService'
import { ScheduleSummary } from './ScheduleSummary'
import { TaskList } from './TaskList'
import { CurriculumSnapshot } from './CurriculumSnapshot'
import { ProgressMiniSummary } from './ProgressMiniSummary'
import { WeeklyTestCard } from './WeeklyTestCard'
import './today-dashboard.css'

type TodayDashboardProps = {
  schedule: DailySchedule
  summary: ScheduleSummaryData
  progressState: TaskProgressMap
  progressSummary: ProgressSummary
  progressEvents: ProgressEvent[]
  schedulesByDate: Record<string, DailySchedule>
  calendarConfiguration: CalendarConfiguration
  leaveRecords: LeaveRecord[]
  onCompleteTask: (taskId: string) => void
  onSkipTask: (taskId: string, skipType?: SkipType, reason?: string) => void
  onUnskipTask: (taskId: string) => void
  onContinueAhead?: () => void
  onViewRoadmap: () => void
  weeklyTest?: WeeklyTest
  onViewTests: () => void
}

export function TodayDashboard({ schedule, summary, progressState, progressSummary, progressEvents, schedulesByDate, calendarConfiguration, leaveRecords, onCompleteTask, onSkipTask, onUnskipTask, onContinueAhead, onViewRoadmap, weeklyTest, onViewTests }: TodayDashboardProps) {
  const tasks: ScheduledTask[] = schedule.tasks
  const taskTitlesById = Object.fromEntries(getCurriculumTasks().map((task) => [task.id, task.title]))
  const eventMessagesByTaskId: Record<string, string> = Object.fromEntries(progressEvents
    .filter((event) => event.date === schedule.date)
    .map((event) => [event.taskId, event.type === 'TASK_COMPLETED'
      ? `Earned +${event.pointsDelta} points · +${event.xpDelta} XP`
      : event.type === 'TASK_SKIPPED'
        ? `Skipped · ${event.skipType === 'EXCUSED' ? 'Excused' : 'Unexcused'}${event.reason ? ` · ${event.reason}` : ''}`
        : `Skipped · ${event.pointsDelta} points · ${event.xpDelta} XP`]))

  const upcomingDates: Array<{ date: CalendarDate; tasks: ScheduledTask[]; totalMinutes: number }> = []
  let cursor = nextDay(schedule.date)
  while (upcomingDates.length < 4 && cursor <= '9999-12-31') {
    if (CalendarService.getStatus(cursor, calendarConfiguration, leaveRecords) === 'LEARNING_DAY') {
      const futureSchedule = schedulesByDate[cursor] ?? ScheduleService.generateForDate(cursor, progressState, calendarConfiguration, leaveRecords).schedule
      upcomingDates.push({
        date: cursor,
        tasks: futureSchedule.tasks.slice(0, 3),
        totalMinutes: futureSchedule.tasks.reduce((total, task) => total + task.estimatedMinutes, 0),
      })
    }
    cursor = nextDay(cursor)
  }
  const canContinueAhead = schedule.tasks.length > 0 && schedule.tasks.every((task) => task.status === 'Completed')

  return (
    <div className="today-dashboard">
      <header className="today-page-heading">
        <div>
          <div className="welcome-kicker">YOUR DAILY PLAN</div>
          <h1>Today's journey</h1>
          <p>A focused set of steps, chosen from your current learning frontier.</p>
        </div>
        <div className="today-date-card">
          <CalendarDays size={17} aria-hidden="true" />
          <span>{formatScheduleDate(schedule.date)}</span>
        </div>
      </header>

      <ScheduleSummary summary={summary} />
      <ProgressMiniSummary progress={progressSummary} />
      <CurriculumSnapshot schedule={schedule} progressState={progressState} onViewRoadmap={onViewRoadmap} />
      {schedule.calendarStatus !== 'LEARNING_DAY' && (
        <div className={`today-calendar-message today-calendar-${schedule.calendarStatus.toLowerCase()}`} role="status">
          <span>{CalendarService.getStatusLabel(schedule.calendarStatus)}</span>
          <p>{schedule.calendarStatus === 'LEAVE'
            ? 'Today is marked as leave. Unfinished tasks remain eligible for a later learning day.'
            : 'Today is a configured non-learning day. No daily tasks are scheduled.'}</p>
        </div>
      )}
      {weeklyTest?.scheduledDate === schedule.date && <WeeklyTestCard test={weeklyTest} onOpen={onViewTests} />}

      <section className="today-task-section" aria-labelledby="today-task-heading">
        <div className="today-task-heading">
          <div>
            <div className="section-eyebrow">SCHEDULED WORK</div>
            <h2 id="today-task-heading">{schedule.calendarStatus === 'LEARNING_DAY' ? "Today's tasks" : 'No learning tasks today'}</h2>
          </div>
          <span className="available-time"><Clock3 size={14} aria-hidden="true" /> Up to {schedule.availableMinutes} min</span>
        </div>
        <p className="today-dashboard-date">{formatScheduleDate(schedule.date, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <TaskList tasks={tasks} onComplete={onCompleteTask} onSkip={onSkipTask} onUnskip={onUnskipTask} taskTitlesById={taskTitlesById} eventMessagesByTaskId={eventMessagesByTaskId} />
        {canContinueAhead && onContinueAhead && (
          <button type="button" className="continue-ahead-button" onClick={onContinueAhead}>Continue Ahead</button>
        )}
        <div className="schedule-footnote">{schedule.calendarStatus === 'LEARNING_DAY' ? 'Generated from the current learning frontier · example curriculum' : 'No tasks were moved or marked complete for this date.'}</div>
      </section>

      {upcomingDates.length > 0 && (
        <section className="future-schedule-panel" aria-labelledby="future-schedule-heading">
          <div className="today-task-heading">
            <div>
              <div className="section-eyebrow">UPCOMING</div>
              <h2 id="future-schedule-heading">Future plan</h2>
            </div>
          </div>
          <div className="future-schedule-list">
            {upcomingDates.map((day) => (
              <div key={day.date} className="future-day-card">
                <div className="future-day-header">
                  <strong>{formatScheduleDate(day.date, { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
                  <span>{day.totalMinutes} min</span>
                </div>
                <ul>
                  {day.tasks.length > 0 ? day.tasks.map((task) => (
                    <li key={task.id}>
                      <span>{task.title}</span>
                      <small>{task.type} · {task.estimatedMinutes} min{task.plannedDate ? ` · planned ${formatScheduleDate(task.plannedDate, { month: 'short', day: 'numeric' })}` : ''}</small>
                    </li>
                  )) : <li>Light review window</li>}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
