import { Character } from '../components/Character'
import { PointsDisplay } from '../components/PointsDisplay'
import { Roadmap } from '../components/Roadmap'
import { TodayTasks } from '../components/TodayTasks'
import type { DailySchedule, ScheduleSummary as ScheduleSummaryData } from '../domain/dailySchedule'
import type { TaskProgressMap } from '../domain/curriculum'
import type { ProgressSummary } from '../domain/progress'
import type { CalendarDate } from '../domain/calendar'
import type { WeeklyTest } from '../domain/weeklyTest'
import { WeeklyTestCard } from '../components/WeeklyTestCard'
import './home.css'

type ProjectsSummary = {
  activeProjects: number
  completedProjects: number
  portfolioReadyProjects: number
  nearestTargetDate?: string
}

type CareerSummary = {
  eligibleOpportunities: number
  activeApplications: number
  upcomingDeadlines: number
  interviews: number
  offers: number
  portfolioReadyProjects: number
}

type HomePageProps = {
  schedule: DailySchedule
  summary: ScheduleSummaryData
  progressState: TaskProgressMap
  progressSummary: ProgressSummary
  onViewToday: () => void
  onViewRoadmap: () => void
  calendarStatusLabel: string
  upcomingLearningDate: CalendarDate
  weeklyTest: WeeklyTest
  onViewTests: () => void
  projectsSummary: ProjectsSummary
  onViewProjects: () => void
  careerSummary: CareerSummary
  onViewCareer: () => void
}

export function HomePage({ schedule, summary, progressState, progressSummary, onViewToday, onViewRoadmap, calendarStatusLabel, upcomingLearningDate, weeklyTest, onViewTests, projectsSummary, onViewProjects, careerSummary, onViewCareer }: HomePageProps) {
  return (
    <div className="home-page">
      <section className="welcome-row" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <div className="welcome-kicker">YOUR NEXT CHAPTER STARTS HERE</div>
          <h1 id="welcome-title">Good evening, Greeshma<span>.</span></h1>
          <p>Ready for today's journey?</p>
        </div>
        <div className="welcome-rule" aria-hidden="true" />
        <span className="welcome-day">DAY 01<br /><small>OF YOUR JOURNEY</small></span>
      </section>

      <section className="avatar-banner" aria-label="Profile and total points">
        <div className="avatar-backdrop" aria-hidden="true" />
        <div className="avatar-area"><Character /></div>
        <div className="avatar-message">
          <div className="avatar-kicker">YOUR ADVENTURE COMPANION</div>
          <h2>A place for your<br />character to grow.</h2>
          <p>Your own journey, one milestone at a time.</p>
        </div>
        <PointsDisplay progress={progressSummary} />
      </section>

      <div className="home-columns">
        <Roadmap />
        <aside className="home-aside">
          <TodayTasks schedule={schedule} summary={summary} progressState={progressState} progressSummary={progressSummary} onViewToday={onViewToday} onViewRoadmap={onViewRoadmap} calendarStatusLabel={calendarStatusLabel} upcomingLearningDate={upcomingLearningDate} />
          <WeeklyTestCard test={weeklyTest} onOpen={onViewTests} compact />
          <section className="home-project-summary" aria-label="Project summary">
            <div className="section-eyebrow">PROJECTS</div>
            <div className="project-summary-grid">
              <strong>{projectsSummary.activeProjects}</strong>
              <span>active</span>
            </div>
            <div className="project-summary-grid">
              <strong>{projectsSummary.completedProjects}</strong>
              <span>completed</span>
            </div>
            <div className="project-summary-grid">
              <strong>{projectsSummary.portfolioReadyProjects}</strong>
              <span>portfolio-ready</span>
            </div>
            <p>{projectsSummary.nearestTargetDate ? `Next target · ${projectsSummary.nearestTargetDate}` : 'Add a project to start building evidence.'}</p>
            <button type="button" className="weekly-test-secondary-action" onClick={onViewProjects}>Open projects</button>
          </section>
          <section className="home-project-summary" aria-label="Career summary">
            <div className="section-eyebrow">CAREER</div>
            <div className="project-summary-grid">
              <strong>{careerSummary.eligibleOpportunities}</strong>
              <span>eligible</span>
            </div>
            <div className="project-summary-grid">
              <strong>{careerSummary.activeApplications}</strong>
              <span>active apps</span>
            </div>
            <div className="project-summary-grid">
              <strong>{careerSummary.upcomingDeadlines}</strong>
              <span>upcoming deadlines</span>
            </div>
            <div className="project-summary-grid">
              <strong>{careerSummary.interviews}</strong>
              <span>interviews</span>
            </div>
            <div className="project-summary-grid">
              <strong>{careerSummary.offers}</strong>
              <span>offers</span>
            </div>
            <p>{careerSummary.portfolioReadyProjects} portfolio-ready projects available for career evidence.</p>
            <button type="button" className="weekly-test-secondary-action" onClick={onViewCareer}>Open career</button>
          </section>
          <div className="aside-note">
            <span className="aside-note-icon">✦</span>
            <p>Small, steady steps add up to a journey that's yours.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
