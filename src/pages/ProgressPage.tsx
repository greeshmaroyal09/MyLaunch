import { useState } from 'react'
import { Activity, BookOpenCheck, BriefcaseBusiness, CalendarCheck2, Check, CircleHelp, Clock3, Layers3, Trophy } from 'lucide-react'
import type { Application } from '../domain/application'
import type { CalendarConfiguration, CalendarDate, LeaveRecord } from '../domain/calendar'
import type { ProgressState } from '../domain/progress'
import type { Project } from '../domain/project'
import type { WeeklyTest } from '../domain/weeklyTest'
import { formatDate } from '../services/DateService'
import { getProgressDashboardData, type ProgressTrackFilter } from '../services/ProgressDashboardService'
import './progress.css'

type ProgressPageProps = {
  progress: ProgressState
  date: CalendarDate
  calendarConfiguration: CalendarConfiguration
  leaveRecords: LeaveRecord[]
  weeklyTests: WeeklyTest[]
  projects: Project[]
  applications: Application[]
}

const trackOptions: Array<{ value: ProgressTrackFilter; label: string }> = [
  { value: 'Primary', label: 'Primary track' },
  { value: 'AI / ML', label: 'AI / ML track' },
  { value: 'All', label: 'All subjects' },
]

export function ProgressPage(props: ProgressPageProps) {
  const [trackFilter, setTrackFilter] = useState<ProgressTrackFilter>('All')
  const data = getProgressDashboardData(props)
  const { summary } = data
  const subjects = data.subjectProgress.filter(({ subject }) => trackFilter === 'All' || subject.track === trackFilter)
  const latestResult = data.assessments.latest?.result

  return (
    <div className="progress-page">
      <header className="progress-heading">
        <div>
          <p className="progress-eyebrow">MYLAUNCH / YOUR MOMENTUM</p>
          <h1>Progress</h1>
          <p className="progress-intro">A clear record of what you have learned, practiced, and built.</p>
        </div>
        <div className="progress-level-stamp" aria-label={`Level ${summary.currentLevel.level}`}>
          <Trophy size={17} aria-hidden="true" />
          <span>LEVEL {summary.currentLevel.level}</span>
        </div>
      </header>

      <section className="progress-overview" aria-label="Overall curriculum progress">
        <div className="progress-overview-main">
          <div className="progress-section-heading">
            <div><p className="progress-eyebrow">CURRICULUM</p><h2>Overall progress</h2></div>
            <strong>{summary.curriculumCompletionPercent}%</strong>
          </div>
          <div className="progress-track"><span style={{ width: `${summary.curriculumCompletionPercent}%` }} /></div>
          <p className="progress-overview-caption">{summary.completedTaskCount} of {summary.totalTaskCount} tasks complete <span>·</span> {summary.totalTaskCount - summary.completedTaskCount} remaining</p>
          <div className="progress-xp-line">
            <span>{summary.currentLevel.xpIntoLevel} / {summary.currentLevel.xpForNextLevel} XP to next level</span>
            <span>{summary.totalXP} XP total</span>
          </div>
          <div className="progress-track progress-track-small"><span style={{ width: `${summary.currentLevel.progressPercent}%` }} /></div>
        </div>
        <div className="progress-overview-stats">
          <Metric icon={Trophy} label="Total points" value={summary.totalPoints.toLocaleString()} />
          <Metric icon={Activity} label="Current streak" value={`${summary.currentStreak} days`} detail={`Longest ${summary.longestStreak} days`} />
          <Metric icon={Clock3} label="Completed task time" value={formatMinutes(data.totalCompletedMinutes)} detail="Curriculum estimates" />
        </div>
      </section>

      <section className="progress-weekly" aria-label="This week's progress">
        <div className="progress-section-heading progress-section-heading-compact">
          <div><p className="progress-eyebrow">WEEK OF {formatDate(data.weekly.startDate, { month: 'short', day: 'numeric' }).toUpperCase()}</p><h2>This week</h2></div>
          <CalendarCheck2 size={20} aria-hidden="true" />
        </div>
        <div className="progress-weekly-grid">
          <Metric icon={Check} label="Learning days" value={String(data.weekly.learningDaysCompleted)} />
          <Metric icon={BookOpenCheck} label="Tasks completed" value={String(data.weekly.tasksCompleted)} />
          <Metric icon={Clock3} label="Estimated minutes" value={formatMinutes(data.weekly.minutesCompleted)} />
        </div>
      </section>

      <section className="progress-subjects" aria-labelledby="subject-progress-title">
        <div className="progress-section-heading subjects-heading">
          <div><p className="progress-eyebrow">CAREER PREPARATION ROADMAP</p><h2 id="subject-progress-title">Subject progress</h2></div>
          <div className="progress-filter" role="group" aria-label="Filter subjects by track">
            {trackOptions.map((option) => (
              <button key={option.value} type="button" aria-pressed={trackFilter === option.value} onClick={() => setTrackFilter(option.value)}>{option.label}</button>
            ))}
          </div>
        </div>
        <div className="progress-subject-list">
          {subjects.map(({ subject, completedTaskCount, totalTaskCount, completionPercent, completedMinutes, plannedMinutes }) => (
            <article className="progress-subject-row" key={subject.id}>
              <div className="progress-subject-info">
                <strong>{subject.name}</strong>
                <span className={`progress-track-tag ${subject.track === 'Primary' ? 'is-primary' : 'is-secondary'}`}>{subject.track === 'Primary' ? 'Primary' : 'AI / ML'}</span>
              </div>
              <div className="progress-subject-bar-wrap">
                <div className="progress-track"><span style={{ width: `${completionPercent}%` }} /></div>
                <span className="progress-subject-count">{completedTaskCount} / {totalTaskCount} tasks</span>
              </div>
              <div className="progress-subject-value"><strong>{completionPercent}%</strong><span>{completedMinutes} / {plannedMinutes} min</span></div>
            </article>
          ))}
          {subjects.length === 0 && <p className="progress-empty">No subjects are available in this track.</p>}
        </div>
        <p className="progress-track-note"><strong>Primary:</strong> Java, DSA, SQL, core CS, and backend. <strong>Secondary:</strong> Python and AI / ML subjects.</p>
      </section>

      <div className="progress-detail-grid">
        <section className="progress-panel" aria-labelledby="activity-title">
          <PanelHeading icon={Activity} eyebrow="LATEST FROM YOUR LEDGER" title="Recent activity" id="activity-title" />
          {data.recentActivity.length ? (
            <div className="progress-activity-list">
              {data.recentActivity.map((item) => (
                <article className="progress-activity-row" key={item.id}>
                  <div className={`progress-activity-dot ${item.action === 'Skipped' ? 'is-skip' : ''}`} />
                  <div className="progress-activity-copy"><strong>{item.title}</strong><span>{item.subject} · {item.action}</span></div>
                  <time dateTime={item.date}>{formatDate(item.date, { month: 'short', day: 'numeric' })}</time>
                  <span className="progress-activity-reward">{signed(item.pointsDelta)} pts <span>/</span> {signed(item.xpDelta)} XP</span>
                </article>
              ))}
            </div>
          ) : <EmptyState icon={Activity} text="Completed and skipped curriculum tasks will appear here." />}
        </section>

        <section className="progress-panel" aria-labelledby="assessment-title">
          <PanelHeading icon={BookOpenCheck} eyebrow="WEEKLY REVIEW" title="Assessments" id="assessment-title" />
          {latestResult ? (
            <>
              <div className="progress-assessment-score"><strong>{latestResult.percentage}%</strong><span>{latestResult.correctCount} / {latestResult.totalQuestions} correct · {data.assessments.completed} completed</span></div>
              <div className="progress-review-split">
                <span>Current week <strong>{latestResult.currentWeekTotal ? `${Math.round(latestResult.currentWeekCorrect / latestResult.currentWeekTotal * 100)}%` : '—'}</strong></span>
                <span>Review <strong>{latestResult.reviewTotal ? `${Math.round(latestResult.reviewCorrect / latestResult.reviewTotal * 100)}%` : '—'}</strong></span>
              </div>
              {latestResult.topicsNeedingReview.length > 0 && <p className="progress-review-topics"><strong>Topics to revisit:</strong> {latestResult.topicsNeedingReview.join(', ')}</p>}
            </>
          ) : <EmptyState icon={CircleHelp} text={data.assessments.completed ? 'No scored result is available.' : 'Your first completed weekly test will appear here.'} />}
          <p className="progress-panel-footnote">{data.assessments.completed} {data.assessments.completed === 1 ? 'test' : 'tests'} completed</p>
        </section>

        <section className="progress-panel" aria-labelledby="projects-title">
          <PanelHeading icon={Layers3} eyebrow="BUILDING EXPERIENCE" title="Projects" id="projects-title" />
          <div className="progress-stat-grid">
            <CompactStat label="Total" value={data.projects.total} />
            <CompactStat label="In progress" value={data.projects.inProgress} />
            <CompactStat label="Completed" value={data.projects.completed} />
            <CompactStat label="Portfolio-ready" value={data.projects.portfolioReady} />
          </div>
          {data.projects.total > 0 ? <p className="progress-panel-footnote">Project tasks: {data.projects.completedTasks} / {data.projects.totalTasks} complete</p> : <p className="progress-panel-footnote">Projects you create will be summarized here. Project work does not change curriculum XP.</p>}
        </section>

        <section className="progress-panel" aria-labelledby="career-title">
          <PanelHeading icon={BriefcaseBusiness} eyebrow="CAREER ACTIVITY" title="Launch snapshot" id="career-title" />
          <div className="progress-career-summary"><strong>{summary.curriculumCompletionPercent}%</strong><span>curriculum complete</span><strong>{trackCompletion(data.subjectProgress, 'Primary')}%</strong><span>primary track complete</span></div>
          <div className="progress-stat-grid progress-career-stats">
            <CompactStat label="Applications" value={data.career.totalApplications} />
            <CompactStat label="Active" value={data.career.activeApplications} />
            <CompactStat label="Interviews" value={data.career.interviews} />
            <CompactStat label="Offers" value={data.career.offers} />
          </div>
          <p className="progress-panel-footnote">Projects: {data.projects.completed} completed · {data.projects.portfolioReady} portfolio-ready</p>
        </section>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Trophy; label: string; value: string; detail?: string }) {
  return <div className="progress-metric"><Icon size={17} aria-hidden="true" /><div><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div></div>
}

function PanelHeading({ icon: Icon, eyebrow, title, id }: { icon: typeof Activity; eyebrow: string; title: string; id: string }) {
  return <div className="progress-panel-heading"><Icon size={18} aria-hidden="true" /><div><p className="progress-eyebrow">{eyebrow}</p><h2 id={id}>{title}</h2></div></div>
}

function CompactStat({ label, value }: { label: string; value: number }) {
  return <div className="progress-compact-stat"><span>{label}</span><strong>{value}</strong></div>
}

function EmptyState({ icon: Icon, text }: { icon: typeof Activity; text: string }) {
  return <div className="progress-empty-state"><Icon size={18} aria-hidden="true" /><p>{text}</p></div>
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return `${remainder} min`
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

function trackCompletion(subjects: ReturnType<typeof getProgressDashboardData>['subjectProgress'], track: string): number {
  const included = subjects.filter(({ subject }) => subject.track === track)
  const total = included.reduce((sum, item) => sum + item.totalTaskCount, 0)
  const completed = included.reduce((sum, item) => sum + item.completedTaskCount, 0)
  return total === 0 ? 0 : Math.round(completed / total * 100)
}