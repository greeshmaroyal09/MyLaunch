import { useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { Navigation } from './components/Navigation'
import { TodayDashboard } from './components/TodayDashboard'
import { CurriculumRoadmap } from './components/CurriculumRoadmap'
import { CalendarPage } from './pages/CalendarPage'
import { WeeklyTestPage } from './pages/WeeklyTestPage'
import { HomePage } from './pages/HomePage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { CareerPage } from './pages/CareerPage'
import { OpportunityDetailPage } from './pages/OpportunityDetailPage'
import { ProgressPage } from './pages/ProgressPage'
import { InternshipsPage } from './pages/InternshipsPage'
import { JobsPage } from './pages/JobsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ResourcesPage } from './pages/ResourcesPage'
import { sectionDescriptions } from './pages/sectionContent'
import { ScheduleProvider } from './state/ScheduleProvider'
import { useSchedule } from './state/useSchedule'
import { formatScheduleDate, ScheduleService } from './services/ScheduleService'
import { ProgressService } from './services/ProgressService'
import { CalendarService } from './services/CalendarService'
import { getTodayDate, nextDay } from './services/DateService'
import { WeeklyTestService } from './services/WeeklyTestService'
import { evaluateOpportunityEligibility } from './services/EligibilityService'
import { JobService } from './services/JobService'
import type { Section } from './types'
import './App.css'

function App() {
  return (
    <ScheduleProvider>
      <ApplicationShell />
    </ScheduleProvider>
  )
}

function ApplicationShell() {
  const [activeSection, setActiveSection] = useState<Section>('Home')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedCareerOpportunityId, setSelectedCareerOpportunityId] = useState<string | null>(null)
  const { schedule, progress, theme, setTheme, completeTask, skipTask, unskipTask, continueAhead, calendarConfiguration, leaveRecords, schedulesByDate, selectedCalendarDate, inspectDate, markLeave, removeLeave, weeklyTests, projects, companies, opportunities, applications, ensureWeeklyTest, startWeeklyTest, answerWeeklyQuestion, postponeWeeklyTest, submitWeeklyTest, createProject, updateProject, deleteProject, addProjectTask, updateProjectTask, deleteProjectTask, addProjectMilestone, updateProjectMilestone, deleteProjectMilestone, createCompany, deleteCompany, createOpportunity, updateOpportunity, deleteOpportunity, createApplication, updateApplication, deleteApplication } = useSchedule()
  const summary = ScheduleService.getSummary(schedule)
  const isLearningDate = (date: string) => CalendarService.getStatus(date, calendarConfiguration, leaveRecords) === 'LEARNING_DAY'
  const progressSummary = ProgressService.getSummary(progress, schedule.date, isLearningDate)
  const calendarStatusLabel = CalendarService.getStatusLabel(schedule.calendarStatus)
  const upcomingLearningDate = CalendarService.nextLearningDate(nextDay(schedule.date), calendarConfiguration, leaveRecords)
  const weeklyTestContext = { date: schedule.date, events: progress.events, calendarConfiguration, leaveRecords, tests: weeklyTests }
  const weeklyTestPreview = WeeklyTestService.getTest(weeklyTestContext)
  const weeklyTestForHome = weeklyTests
    .filter((test) => test.status !== 'COMPLETED')
    .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate))[0] ?? weeklyTestPreview
  const weeklyTestForToday = weeklyTests.find((test) => test.scheduledDate === schedule.date)
    ?? (weeklyTestPreview.scheduledDate === schedule.date ? weeklyTestPreview : undefined)
  const projectSummary = {
    activeProjects: projects.filter((project) => ['IDEA', 'PLANNED', 'IN_PROGRESS'].includes(project.status)).length,
    completedProjects: projects.filter((project) => project.status === 'COMPLETED').length,
    portfolioReadyProjects: projects.filter((project) => project.portfolioReadiness.portfolioReady).length,
    nearestTargetDate: projects
      .map((project) => project.targetCompletionDate)
      .filter((value): value is string => Boolean(value))
      .sort()[0],
  }
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null
  const selectedInternshipOpportunity = opportunities.find((opportunity) => opportunity.id === selectedCareerOpportunityId && opportunity.opportunityType === 'INTERNSHIP') ?? null
  const selectedJobOpportunity = JobService.getOpportunities(opportunities).find((opportunity) => opportunity.id === selectedCareerOpportunityId) ?? null
  function deleteInternshipOpportunity(opportunityId: string) {
    const opportunity = opportunities.find((item) => item.id === opportunityId)
    if (!opportunity) return
    deleteOpportunity(opportunityId)
    const hasOtherOpportunities = opportunities.some((item) => item.id !== opportunityId && item.companyId === opportunity.companyId)
    if (!hasOtherOpportunities) deleteCompany(opportunity.companyId)
    setSelectedCareerOpportunityId(null)
  }
  function deleteJobOpportunity(opportunityId: string) {
    const opportunity = opportunities.find((item) => item.id === opportunityId)
    if (!opportunity) return
    deleteOpportunity(opportunityId)
    const hasOtherOpportunities = opportunities.some((item) => item.id !== opportunityId && item.companyId === opportunity.companyId)
    if (!hasOtherOpportunities) deleteCompany(opportunity.companyId)
    setSelectedCareerOpportunityId(null)
  }
  const todayKey = getTodayDate()
  const careerSummary = {
    eligibleOpportunities: opportunities.filter((opportunity) => evaluateOpportunityEligibility(opportunity, 2028).outcome === 'ELIGIBLE').length,
    activeApplications: applications.filter((application) => ['PLANNED', 'APPLIED', 'ONLINE_ASSESSMENT', 'INTERVIEW'].includes(application.status)).length,
    upcomingDeadlines: opportunities.filter((opportunity) => {
      if (!opportunity.applicationDeadline) return false
      const deadline = opportunity.applicationDeadline
      const diff = compareDeadlineDays(deadline, todayKey)
      return diff >= 0 && diff <= 14
    }).length,
    interviews: applications.filter((application) => application.status === 'INTERVIEW').length,
    offers: applications.filter((application) => application.status === 'OFFER').length,
    portfolioReadyProjects: projects.filter((project) => project.portfolioReadiness.portfolioReady).length,
  }
  const selectedCareerOpportunity = opportunities.find((opportunity) => opportunity.id === selectedCareerOpportunityId) ?? null

  return (
    <div className="app-shell" data-theme={theme}>
      <Navigation activeSection={activeSection} onNavigate={setActiveSection} />
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-mark">
            <Sparkles size={16} aria-hidden="true" />
            <span>YOUR CAREER, IN MOTION</span>
          </div>
          <div className="topbar-actions">
            <span className="today-date">{formatScheduleDate(schedule.date, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</span>
            <button className="icon-button search-button" type="button" aria-label="Search coming in a later phase" title="Search coming later" disabled>
              <Search size={18} aria-hidden="true" />
            </button>
            <div className="profile-chip" aria-label="Greeshma's profile">
              <span className="profile-initial">G</span>
              <span className="profile-name">Greeshma</span>
            </div>
          </div>
        </header>

        <main className="main-content">
          {activeSection === 'Home' ? (
            <HomePage schedule={schedule} summary={summary} progressState={progress.taskProgress} progressSummary={progressSummary} onViewToday={() => setActiveSection('Today')} onViewRoadmap={() => setActiveSection('Roadmaps')} calendarStatusLabel={calendarStatusLabel} upcomingLearningDate={upcomingLearningDate} weeklyTest={weeklyTestForHome} onViewTests={() => setActiveSection('Tests')} projectsSummary={projectSummary} onViewProjects={() => setActiveSection('Projects')} careerSummary={careerSummary} onViewCareer={() => setActiveSection('Career')} />
          ) : activeSection === 'Today' ? (
            <TodayDashboard
              schedule={schedule}
              summary={summary}
              progressState={progress.taskProgress}
              progressSummary={progressSummary}
              progressEvents={progress.events}
              schedulesByDate={schedulesByDate}
              calendarConfiguration={calendarConfiguration}
              leaveRecords={leaveRecords}
              onCompleteTask={completeTask}
              onSkipTask={skipTask}
              onUnskipTask={unskipTask}
              onContinueAhead={continueAhead}
              onViewRoadmap={() => setActiveSection('Roadmaps')}
              weeklyTest={weeklyTestForToday}
              onViewTests={() => setActiveSection('Tests')}
            />
          ) : activeSection === 'Roadmaps' ? (
            <CurriculumRoadmap
              progressState={progress.taskProgress}
              progressSummary={progressSummary}
              skippedTaskIds={progress.events.filter((event) => event.type === 'TASK_SKIPPED' && event.date === schedule.date).map((event) => event.taskId)}
              onToggleTask={completeTask}
            />
          ) : activeSection === 'Calendar' ? (
            <CalendarPage today={getTodayDate()} selectedDate={selectedCalendarDate} configuration={calendarConfiguration} leaves={leaveRecords} schedulesByDate={schedulesByDate} progressEvents={progress.events} onInspectDate={inspectDate} onMarkLeave={markLeave} onRemoveLeave={removeLeave} />
          ) : activeSection === 'Progress' ? (
            <ProgressPage progress={progress} date={schedule.date} calendarConfiguration={calendarConfiguration} leaveRecords={leaveRecords} weeklyTests={weeklyTests} projects={projects} applications={applications} />
          ) : activeSection === 'Tests' ? (
            <WeeklyTestPage date={getTodayDate()} events={progress.events} tests={weeklyTests} calendarConfiguration={calendarConfiguration} leaveRecords={leaveRecords} onEnsure={ensureWeeklyTest} onStart={startWeeklyTest} onAnswer={answerWeeklyQuestion} onPostpone={postponeWeeklyTest} onSubmit={submitWeeklyTest} />
          ) : activeSection === 'Projects' ? (
            selectedProject ? (
              <ProjectDetailPage
                project={selectedProject}
                onBack={() => setSelectedProjectId(null)}
                onUpdateProject={updateProject}
                onAddProjectTask={addProjectTask}
                onUpdateProjectTask={updateProjectTask}
                onDeleteProjectTask={deleteProjectTask}
                onAddProjectMilestone={addProjectMilestone}
                onUpdateProjectMilestone={updateProjectMilestone}
                onDeleteProjectMilestone={deleteProjectMilestone}
              />
            ) : (
              <ProjectsPage
                projects={projects}
                onOpenProject={(projectId) => setSelectedProjectId(projectId)}
                onCreateProject={createProject}
                onDeleteProject={deleteProject}
              />
            )
          ) : activeSection === 'Career' ? (
            selectedCareerOpportunity ? (
              <OpportunityDetailPage
                opportunity={selectedCareerOpportunity}
                application={applications.find((application) => application.opportunityId === selectedCareerOpportunity.id) ?? null}
                companies={companies}
                projects={projects}
                onBack={() => setSelectedCareerOpportunityId(null)}
                onUpdateOpportunity={updateOpportunity}
                onDeleteOpportunity={deleteOpportunity}
                onCreateApplication={createApplication}
                onUpdateApplication={updateApplication}
                onDeleteApplication={deleteApplication}
              />
            ) : (
              <CareerPage
                companies={companies}
                opportunities={opportunities}
                applications={applications}
                projects={projects}
                onCreateCompany={createCompany}
                onCreateOpportunity={createOpportunity}
                onSelectOpportunity={(opportunityId) => setSelectedCareerOpportunityId(opportunityId)}
                onDeleteOpportunity={deleteOpportunity}
              />
            )
          ) : activeSection === 'Internships' ? (
            selectedInternshipOpportunity ? (
              <OpportunityDetailPage
                opportunity={selectedInternshipOpportunity}
                application={applications.find((application) => application.opportunityId === selectedInternshipOpportunity.id) ?? null}
                companies={companies}
                projects={projects}
                backLabel="Internships"
                onBack={() => setSelectedCareerOpportunityId(null)}
                onUpdateOpportunity={updateOpportunity}
                onDeleteOpportunity={deleteInternshipOpportunity}
                onCreateApplication={createApplication}
                onUpdateApplication={updateApplication}
                onDeleteApplication={deleteApplication}
              />
            ) : (
              <InternshipsPage
                companies={companies}
                opportunities={opportunities}
                applications={applications}
                onCreateCompany={createCompany}
                onCreateOpportunity={createOpportunity}
                onSelectOpportunity={setSelectedCareerOpportunityId}
              />
            )
          ) : activeSection === 'Jobs' ? (
            selectedJobOpportunity ? (
              <OpportunityDetailPage
                opportunity={selectedJobOpportunity}
                application={applications.find((application) => application.opportunityId === selectedJobOpportunity.id) ?? null}
                companies={companies}
                projects={projects}
                backLabel="Jobs"
                onBack={() => setSelectedCareerOpportunityId(null)}
                onUpdateOpportunity={updateOpportunity}
                onDeleteOpportunity={deleteJobOpportunity}
                onCreateApplication={createApplication}
                onUpdateApplication={updateApplication}
                onDeleteApplication={deleteApplication}
              />
            ) : (
              <JobsPage
                companies={companies}
                opportunities={opportunities}
                applications={applications}
                onCreateCompany={createCompany}
                onCreateOpportunity={createOpportunity}
                onSelectOpportunity={setSelectedCareerOpportunityId}
              />
            )
          ) : activeSection === 'Settings' ? (
            <SettingsPage theme={theme} onThemeChange={setTheme} />
          ) : activeSection === 'Resources' ? (
            <ResourcesPage />
          ) : (
            <section className="placeholder-page" aria-labelledby="page-title">
              <div className="placeholder-kicker">MYLAUNCH / {String(activeSection).toUpperCase()}</div>
              <div className="placeholder-mark"><Sparkles size={24} aria-hidden="true" /></div>
              <h1 id="page-title">{activeSection}</h1>
              <p>{sectionDescriptions[activeSection]}</p>
              <span className="phase-label">Coming in a later phase</span>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

function compareDeadlineDays(deadline: string, todayKey: string): number {
  const deadlineDate = new Date(`${deadline}T12:00:00`)
  const todayDate = new Date(`${todayKey}T12:00:00`)
  return Math.ceil((deadlineDate.getTime() - todayDate.getTime()) / 86400000)
}

export default App
