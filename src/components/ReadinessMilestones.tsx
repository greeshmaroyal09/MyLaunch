import type { Project } from '../domain/project'
import type { DailySchedule } from '../domain/dailySchedule'
import type { TaskProgressMap } from '../domain/curriculum'
import type { ProgressEvent } from '../domain/progress'
import { HolidayPlanService, internshipTaskIds, type HolidayPlanSettings } from '../services/HolidayPlanService'
import { addDays } from '../services/DateService'
import { formatScheduleDate } from '../services/ScheduleService'

const milestones = [
  { title: 'Internship Apply-Ready', items: [
    ['python', 'Write and explain Python fundamentals and intermediate code.'],
    ['git-sql', 'Use Git/GitHub and basic SQL independently.'],
    ['foundations', 'Explain core CN/OS and introductory ML concepts.'],
    ['practice', 'Solve a curated set of Python/DSA problems and explain approach and complexity.'],
    ['project', 'Complete a working AI/GenAI or Voice AI project with README, demo, tests and basic evaluation.'],
    ['resume', 'Review resume and GitHub, and complete an interview-practice checkpoint.'],
  ] },
  { title: 'Entry-Level Full-Time Apply-Ready', items: [
    ['internship', 'Meet the internship readiness checklist.'],
    ['dsa', 'Demonstrate stronger DSA and explain complexity under interview conditions.'],
    ['api', 'Build, test and deploy an API with reliable error handling.'],
    ['evaluation', 'Demonstrate deeper ML/GenAI evaluation and reliability.'],
    ['two-projects', 'Present two polished, documented projects with demos and evaluations.'],
    ['mock', 'Complete mock-interview practice and review feedback.'],
  ] },
]

export function ReadinessMilestones({ settings, onChange, plan, progress, events, projects }: { settings: HolidayPlanSettings; onChange: (settings: HolidayPlanSettings) => void; plan: DailySchedule[]; progress: TaskProgressMap; events: ProgressEvent[]; projects: Project[] }) {
  const projectedDates = internshipTaskIds.map((id) => progress[id] === 'COMPLETED' ? events.find((event) => event.taskId === id && event.type === 'TASK_COMPLETED')?.date ?? settings.startDate : plan.find((day) => day.tasks.some((task) => task.id === id))?.date)
  const projectedDate = projectedDates.every(Boolean) ? projectedDates.filter((date): date is string => Boolean(date)).sort().at(-1) : undefined
  let availableMinutes = 0
  if (projectedDate) for (let date = settings.startDate; date <= projectedDate; date = addDays(date, 1)) availableMinutes += HolidayPlanService.budgetFor(settings, date)
  const accumulatedHours = projectedDate ? availableMinutes / 60 : undefined
  const relevantProjects = projects.filter((project) => /language friend|voice companion/i.test(project.title))
  return <section className="future-schedule-panel" aria-labelledby="readiness-title">
    <div className="today-task-heading"><div><div className="section-eyebrow">APPLICATION READINESS</div><h2 id="readiness-title">Readiness milestones</h2></div></div>
    <p className="today-dashboard-date">Internship application target: January–February 2027. Projected learning checkpoint: {projectedDate ? formatScheduleDate(projectedDate, { month: 'short', day: 'numeric', year: 'numeric' }) : 'not yet estimable'}{accumulatedHours !== undefined ? ` · ${accumulatedHours} available hours from the plan start` : ''}{projectedDate && projectedDate > '2027-02-28' ? ' · after the target window' : ''}. This assumes planned work is completed and unconfigured days use {settings.dailyMinutes / 60} hour. Available hours are not a record of time studied. Apply-readiness also requires the evidence below; it is not a hiring guarantee.</p>
    {relevantProjects.length > 0 && <p className="today-dashboard-date">Existing project{relevantProjects.length === 1 ? '' : 's'} to reuse: {relevantProjects.map((project) => project.title).join(', ')}.</p>}
    <div className="readiness-grid">{milestones.map((milestone) => <div className="future-day-card" key={milestone.title}>
      <div className="future-day-header"><strong>{milestone.title}</strong></div>
      {milestone.title.startsWith('Entry') && <p className="today-dashboard-date">Later milestone; no date is guaranteed. Requires all internship evidence plus the following.</p>}
      <div className="readiness-checklist">{milestone.items.map(([id, label]) => {
        const key = `${milestone.title}:${id}`
        return <label key={key}><input type="checkbox" checked={settings.readinessChecks[key] ?? false} onChange={(event) => onChange({ ...settings, readinessChecks: { ...settings.readinessChecks, [key]: event.target.checked } })} /><span>{label}</span></label>
      })}</div>
    </div>)}</div>
    <p className="today-dashboard-date">Project tasks are work sessions, not estimates of all the time needed to build or polish a project. Add time as needed. Check an item only when you can demonstrate it; completing lessons alone does not mark either milestone ready.</p>
  </section>
}
