import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, LockKeyhole } from 'lucide-react'
import type { CalendarConfiguration, CalendarDate, CalendarDayStatus, LeaveRecord } from '../domain/calendar'
import type { DailySchedule } from '../domain/dailySchedule'
import type { ProgressEvent } from '../domain/progress'
import { getCurriculumTasks } from '../data/curriculum'
import { CalendarService } from '../services/CalendarService'
import { compareDates, firstOfMonth, formatDate, monthCalendarDates, monthKey, shiftMonth } from '../services/DateService'
import { TaskList } from '../components/TaskList'
import './calendar.css'

type CalendarPageProps = {
  today: CalendarDate
  selectedDate: CalendarDate
  configuration: CalendarConfiguration
  leaves: LeaveRecord[]
  schedulesByDate: Record<string, DailySchedule>
  progressEvents: ProgressEvent[]
  onInspectDate: (date: CalendarDate) => void
  onMarkLeave: (date: CalendarDate, reason: string) => void
  onRemoveLeave: (date: CalendarDate) => void
}

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarPage({ today, selectedDate, configuration, leaves, schedulesByDate, progressEvents, onInspectDate, onMarkLeave, onRemoveLeave }: CalendarPageProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => firstOfMonth(selectedDate))
  const [leaveReason, setLeaveReason] = useState('')
  const dates = monthCalendarDates(visibleMonth)
  const selectedStatus = CalendarService.getStatus(selectedDate, configuration, leaves)
  const selectedSchedule = schedulesByDate[selectedDate]
  const selectedLeave = leaves.find((leave) => leave.date === selectedDate && leave.status === 'ACTIVE')
  const dateEvents = progressEvents.filter((event) => event.date === selectedDate)
  const completedCount = dateEvents.filter((event) => event.type === 'TASK_COMPLETED').length
  const skippedCount = dateEvents.filter((event) => event.type === 'TASK_SKIPPED').length
  const selectedTasks = selectedSchedule?.tasks ?? []
  const plannedCount = selectedTasks.filter((task) => task.status !== 'Skipped').length
  const taskTitlesById = Object.fromEntries(getCurriculumTasks().map((task) => [task.id, task.title]))
  const canMarkLeave = CalendarService.canMarkLeave(selectedDate, configuration, leaves)
  const isInAcademicRange = compareDates(selectedDate, configuration.academicStartDate) >= 0
    && compareDates(selectedDate, configuration.academicEndDate) <= 0

  function selectDate(date: CalendarDate) {
    setLeaveReason('')
    if (monthKey(date) !== monthKey(visibleMonth)) setVisibleMonth(firstOfMonth(date))
    onInspectDate(date)
  }

  function submitLeave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!leaveReason.trim()) return
    onMarkLeave(selectedDate, leaveReason)
    setLeaveReason('')
  }

  return (
    <div className="calendar-page">
      <header className="calendar-page-heading">
        <div>
          <div className="welcome-kicker">YOUR PREPARATION CALENDAR</div>
          <h1>Progress calendar</h1>
          <p>Review scheduled work and activity by date.</p>
        </div>
        <div className="calendar-config-note">
          <CalendarDays size={16} aria-hidden="true" />
          <span>Example weekdays · no official holidays configured</span>
        </div>
      </header>

      <div className="calendar-layout">
        <section className="calendar-month" aria-label="Progress calendar month">
          <header className="calendar-month-heading">
            <button className="calendar-month-nav" type="button" aria-label="Previous month" onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <h2>{formatDate(visibleMonth, { month: 'long', year: 'numeric' })}</h2>
            <button className="calendar-month-nav" type="button" aria-label="Next month" onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </header>
          <div className="calendar-grid" role="grid" aria-label={formatDate(visibleMonth, { month: 'long', year: 'numeric' })}>
            {weekdayLabels.map((label) => <div className="calendar-weekday" role="columnheader" key={label}>{label}</div>)}
            {dates.map((date) => {
              const status = CalendarService.getStatus(date, configuration, leaves)
              const schedule = schedulesByDate[date]
              const events = progressEvents.filter((event) => event.date === date)
              const datePlannedCount = schedule?.tasks.filter((task) => task.status !== 'Skipped').length ?? 0
              const dateCompletedCount = events.filter((event) => event.type === 'TASK_COMPLETED').length
              const dateSkippedCount = events.filter((event) => event.type === 'TASK_SKIPPED').length
              const outsideMonth = date.slice(0, 7) !== visibleMonth.slice(0, 7)
              return (
                <button
                  className={`calendar-day calendar-day-${status.toLowerCase()}${date === selectedDate ? ' is-selected' : ''}${date === today ? ' is-today' : ''}${outsideMonth ? ' is-outside-month' : ''}`}
                  type="button"
                  role="gridcell"
                  aria-label={`${formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, ${CalendarService.getStatusLabel(status)}, ${datePlannedCount} scheduled, ${dateCompletedCount} completed, ${dateSkippedCount} skipped`}
                  aria-pressed={date === selectedDate}
                  key={date}
                  onClick={() => selectDate(date)}
                >
                  <span className="calendar-day-number">{Number(date.slice(-2))}</span>
                  <span className="calendar-day-state" aria-hidden="true" />
                  {(datePlannedCount > 0 || dateCompletedCount > 0 || dateSkippedCount > 0) && (
                    <span className="calendar-day-counts">
                      <span>{dateCompletedCount}/{datePlannedCount}</span>
                      {dateSkippedCount > 0 && <small>{dateSkippedCount} skip</small>}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="calendar-legend" aria-label="Calendar day types">
            <LegendItem status="LEARNING_DAY" label="Learning day" />
            <LegendItem status="HOLIDAY" label="Holiday" />
            <LegendItem status="LEAVE" label="Leave" />
            <span className="calendar-legend-marker calendar-legend-selected"><i />Selected</span>
          </div>
        </section>

        <aside className="calendar-day-detail" aria-labelledby="selected-date-title">
          <div className="section-eyebrow">SELECTED DATE</div>
          <h2 id="selected-date-title">{formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
          <span className={`calendar-status-pill calendar-status-${selectedStatus.toLowerCase()}`}>
            <i />{CalendarService.getStatusLabel(selectedStatus)}
          </span>
          <div className="calendar-day-stats">
            <span><strong>{plannedCount}</strong> scheduled</span>
            <span><strong>{completedCount}</strong> completed</span>
            <span><strong>{skippedCount}</strong> skipped</span>
          </div>
          {selectedStatus === 'LEAVE' && selectedLeave && (
            <div className="leave-reason"><LockKeyhole size={13} aria-hidden="true" /><span>{selectedLeave.reason}</span></div>
          )}
          {selectedStatus === 'HOLIDAY' && (
            <p className="calendar-day-message">No learning schedule is generated for this non-learning day.</p>
          )}
          {selectedStatus === 'LEAVE' && (
            <p className="calendar-day-message">Leave is marked for this date. Unfinished tasks remain eligible on later learning days.</p>
          )}
          {selectedStatus === 'LEARNING_DAY' && !selectedSchedule && (
            <p className="calendar-day-message">No schedule was recorded for this date.</p>
          )}
          {selectedStatus === 'LEARNING_DAY' && selectedSchedule && selectedTasks.length === 0 && (
            <p className="calendar-day-message">No tasks were scheduled for this learning day.</p>
          )}
          {selectedStatus === 'LEARNING_DAY' && selectedTasks.length > 0 && (
            <TaskList tasks={selectedTasks} compact taskTitlesById={taskTitlesById} />
          )}

          {canMarkLeave && (
            <form className="leave-form" onSubmit={submitLeave}>
              <label htmlFor="leave-reason">Mark this learning day as leave</label>
              <div className="leave-form-row">
                <input id="leave-reason" value={leaveReason} onChange={(event) => setLeaveReason(event.target.value)} placeholder="Reason" maxLength={100} required />
                <button type="submit" disabled={!leaveReason.trim()}>Mark leave</button>
              </div>
              <small>Leave can only be set for today or a future learning day.</small>
            </form>
          )}
          {selectedLeave && compareDates(selectedDate, today) >= 0 && (
            <button className="remove-leave-button" type="button" onClick={() => onRemoveLeave(selectedDate)}>Remove leave</button>
          )}
          {!isInAcademicRange && <p className="calendar-day-message">Outside the example academic date range.</p>}
        </aside>
      </div>
    </div>
  )
}

function LegendItem({ status, label }: { status: CalendarDayStatus; label: string }) {
  return <span className={`calendar-legend-marker calendar-legend-${status.toLowerCase()}`}><i />{label}</span>
}
