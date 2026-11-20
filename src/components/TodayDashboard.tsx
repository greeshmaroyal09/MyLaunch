import { CalendarDays, Clock3 } from 'lucide-react'
import type { CalendarConfiguration, CalendarDate, LeaveRecord } from '../domain/calendar'
import type { DailySchedule, ScheduleSummary as ScheduleSummaryData } from '../domain/dailySchedule'
import type { TaskProgressMap } from '../domain/curriculum'
import type { ProgressEvent, ProgressSummary } from '../domain/progress'
import type { ScheduledTask, SkipType } from '../domain/task'
import type { WeeklyTest } from '../domain/weeklyTest'
import type { Project } from '../domain/project'
import { getCurriculumTasks } from '../data/curriculum'
import { CalendarService } from '../services/CalendarService'
import { formatScheduleDate } from '../services/ScheduleService'
import { HolidayPlanService, type HolidayPlanSettings, type StudyBudget } from '../services/HolidayPlanService'
import { nextDay, previousDay } from '../services/DateService'
import { ScheduleSummary } from './ScheduleSummary'
import { TaskList } from './TaskList'
import { CurriculumSnapshot } from './CurriculumSnapshot'
import { ProgressMiniSummary } from './ProgressMiniSummary'
import { WeeklyTestCard } from './WeeklyTestCard'
import { CareerPriority } from './CareerPriority'
import { ReadinessMilestones } from './ReadinessMilestones'
import './today-dashboard.css'

type TodayDashboardProps = {
  schedule: DailySchedule
  summary: ScheduleSummaryData
  progressState: TaskProgressMap
  progressSummary: ProgressSummary
  progressEvents: ProgressEvent[]
  projects: Project[]
  holidayPlan: HolidayPlanSettings
  onChangeHolidayPlan: (settings: HolidayPlanSettings) => void
  calendarConfiguration: CalendarConfiguration
  leaveRecords: LeaveRecord[]
  onCompleteTask: (taskId: string) => void
  onSkipTask: (taskId: string, skipType?: SkipType, reason?: string) => void
  onUnskipTask: (taskId: string) => void
  onContinueAhead?: () => void
  onNavigateToDate: (date: CalendarDate) => void
  onViewRoadmap: () => void
  weeklyTest?: WeeklyTest
  onViewTests: () => void
}

export function TodayDashboard({ schedule, summary, progressState, progressSummary, progressEvents, projects, holidayPlan, onChangeHolidayPlan, calendarConfiguration, leaveRecords, onCompleteTask, onSkipTask, onUnskipTask, onContinueAhead, onNavigateToDate, onViewRoadmap, weeklyTest, onViewTests }: TodayDashboardProps) {
  const tasks: ScheduledTask[] = schedule.tasks
  const taskTitlesById = Object.fromEntries(getCurriculumTasks().map((task) => [task.id, task.title]))
  const eventMessagesByTaskId: Record<string, string> = Object.fromEntries(progressEvents
    .filter((event) => event.date === schedule.date)
    .map((event) => [event.taskId, event.type === 'TASK_COMPLETED'
      ? `Earned +${event.pointsDelta} points · +${event.xpDelta} XP`
      : event.type === 'TASK_SKIPPED'
        ? `Skipped · ${event.skipType === 'EXCUSED' ? 'Excused' : 'Unexcused'}${event.reason ? ` · ${event.reason}` : ''}`
        : `Skipped · ${event.pointsDelta} points · ${event.xpDelta} XP`]))

  const upcomingDates = HolidayPlanService.createPlan(holidayPlan, progressState, progressEvents)
  const completedMinutes = progressEvents.filter((event) => event.type === 'TASK_COMPLETED' && event.date === schedule.date).reduce((total, event) => total + Math.max(0, event.pointsDelta), 0)
  const selectedBudget = HolidayPlanService.budgetFor(holidayPlan, schedule.date)
  const canContinueAhead = schedule.tasks.length > 0 && schedule.tasks.every((task) => task.status === 'Completed')
  const previousLearningDate = previousDay(schedule.date)
  const nextLearningDate = nextDay(schedule.date)
  const canNavigatePrevious = HolidayPlanService.indexOf(holidayPlan, previousLearningDate) >= 0 || CalendarService.getStatus(previousLearningDate, calendarConfiguration, leaveRecords) === 'LEARNING_DAY'
  const canNavigateNext = HolidayPlanService.indexOf(holidayPlan, nextLearningDate) >= 0 || CalendarService.getStatus(nextLearningDate, calendarConfiguration, leaveRecords) === 'LEARNING_DAY'

  return (
    <div className="today-dashboard">
      <header className="today-page-heading">
        <div>
          <div className="welcome-kicker">YOUR DAILY PLAN</div>
          <h1>Today's journey</h1>
          <p>A focused set of steps, chosen from your current learning frontier.</p>
        </div>
        <div className="planner-date-navigation" aria-label="Planner learning day navigation">
          <button
            type="button"
            className="planner-date-arrow"
            aria-label="Previous learning day"
            onClick={() => onNavigateToDate(previousLearningDate)}
            disabled={!canNavigatePrevious}
          >
            ←
          </button>
          <CalendarDays size={17} aria-hidden="true" />
          <span className="planner-current-date">{formatScheduleDate(schedule.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <button
            type="button"
            className="planner-date-arrow"
            aria-label="Next learning day"
            onClick={() => onNavigateToDate(nextLearningDate)}
            disabled={!canNavigateNext}
          >
            →
          </button>
        </div>
      </header>

      <CareerPriority compact />

      <section className="holiday-plan-settings" aria-label="Holiday study plan settings">
        <label>Plan start date <input type="date" value={holidayPlan.startDate} onChange={(event) => { if (event.target.value) onChangeHolidayPlan({ ...holidayPlan, startDate: event.target.value }) }} /></label>
        <label>Budget for {formatScheduleDate(schedule.date, { month: 'short', day: 'numeric' })} <select value={HolidayPlanService.budgetFor(holidayPlan, schedule.date)} onChange={(event) => onChangeHolidayPlan({ ...holidayPlan, budgetsByDate: { ...holidayPlan.budgetsByDate, [schedule.date]: Number(event.target.value) as StudyBudget } })}><option value={60}>1 hour</option><option value={120}>2 hours</option><option value={180}>3 hours</option></select></label>
      </section>

      <ScheduleSummary summary={summary} />
      {completedMinutes > selectedBudget && <div className="today-calendar-message" role="status"><span>Already completed: {completedMinutes} minutes</span><p>This is above the newly selected {selectedBudget}-minute budget. Your history is preserved and no more work is scheduled for this date.</p></div>}
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
          <span className="available-time" title={`Scheduled workload: ${summary.plannedMinutes} min. Daily capacity ceiling: ${schedule.availableMinutes} min.`}>
            <Clock3 size={14} aria-hidden="true" /> {summary.plannedMinutes} min scheduled · Max {schedule.availableMinutes} min
          </span>
        </div>
        <p className="today-dashboard-date">{formatScheduleDate(schedule.date, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <TaskList tasks={tasks} onComplete={onCompleteTask} onSkip={onSkipTask} onUnskip={onUnskipTask} taskTitlesById={taskTitlesById} eventMessagesByTaskId={eventMessagesByTaskId} />
        {canContinueAhead && onContinueAhead && (
          <button type="button" className="continue-ahead-button" onClick={onContinueAhead}>Continue Ahead</button>
        )}
        <div className="schedule-footnote">{schedule.calendarStatus === 'LEARNING_DAY' ? 'Tasks unlock as prerequisites are completed. Completed work remains in your progress history.' : 'No tasks were moved or marked complete for this date.'}</div>
      </section>

      <ReadinessMilestones settings={holidayPlan} onChange={onChangeHolidayPlan} plan={upcomingDates} progress={progressState} events={progressEvents} projects={projects} />

      {upcomingDates.length > 0 && (
        <section className="future-schedule-panel" aria-labelledby="future-schedule-heading">
          <div className="today-task-heading">
            <div>
              <div className="section-eyebrow">UPCOMING</div>
              <h2 id="future-schedule-heading">Future plan</h2>
              <p className="today-dashboard-date">Consecutive calendar days, including weekends. The forecast assumes planned work is completed; your actual progress changes only when you complete tasks.</p>
            </div>
          </div>
          <div className="future-schedule-list">
            {upcomingDates.map((day) => (
              <div key={day.date} className="future-day-card">
                <div className="future-day-header">
                  <strong>{formatScheduleDate(day.date, { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
                  <span>{day.tasks.reduce((total, task) => total + task.estimatedMinutes, 0)} min</span>
                </div>
                <label className="future-day-budget">Study budget <select aria-label={`Study budget for ${day.date}`} value={HolidayPlanService.budgetFor(holidayPlan, day.date)} onChange={(event) => onChangeHolidayPlan({ ...holidayPlan, budgetsByDate: { ...holidayPlan.budgetsByDate, [day.date]: Number(event.target.value) as StudyBudget } })}><option value={60}>1 hour</option><option value={120}>2 hours</option><option value={180}>3 hours</option></select></label>
                <ul>
                  {day.tasks.length > 0 ? day.tasks.map((task) => (
                    <li key={task.id}>
                      <span>{task.subject}: {task.title}</span>
                      <small>{task.type} · {task.estimatedMinutes} min{task.plannedDate ? ` · planned ${formatScheduleDate(task.plannedDate, { month: 'short', day: 'numeric' })}` : ''}</small>
                    </li>
                  )) : <li>No tasks scheduled for this date</li>}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
