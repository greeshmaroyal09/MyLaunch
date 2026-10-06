import { useMemo, useState } from 'react'
import { Building2, Plus, Trash2 } from 'lucide-react'
import { getTodayDate } from '../services/DateService'
import type { Application } from '../domain/application'
import type { Company } from '../domain/company'
import type { Opportunity, OpportunitySource, OpportunityType, WorkMode } from '../domain/opportunity'
import type { Project } from '../domain/project'
import { CareerService } from '../services/CareerService'
import { evaluateOpportunityEligibility } from '../services/EligibilityService'
import './career.css'

type CareerPageProps = {
  companies: Company[]
  opportunities: Opportunity[]
  applications: Application[]
  projects: Project[]
  onCreateCompany: (name: string, website?: string, careersUrl?: string, notes?: string) => Company | null
  onCreateOpportunity: (input: {
    companyId: string
    roleTitle: string
    opportunityType: OpportunityType
    location?: string
    workMode?: WorkMode
    source?: OpportunitySource
    applicationUrl?: string
    companyUrl?: string
    description?: string
    requiredSkills?: string[]
    preferredSkills?: string[]
    eligibility?: Partial<Opportunity['eligibility']>
    applicationDeadline?: string
    notes?: string
    projectIds?: string[]
  }) => Opportunity | null
  onSelectOpportunity: (opportunityId: string) => void
  onDeleteOpportunity: (opportunityId: string) => void
}

type FilterKey = 'All' | 'Eligible' | 'Unknown' | 'Internship' | 'Full Time' | 'Applied' | 'Active' | 'Deadline Soon' | 'Closed'

export function CareerPage({ companies, opportunities, applications, projects: _projects, onCreateCompany, onCreateOpportunity, onSelectOpportunity, onDeleteOpportunity }: CareerPageProps) {
  const [filter, setFilter] = useState<FilterKey>('All')
  const [companyName, setCompanyName] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [companyCareersUrl, setCompanyCareersUrl] = useState('')
  const [companyNotes, setCompanyNotes] = useState('')
  const [opportunityCompanyId, setOpportunityCompanyId] = useState(companies[0]?.id ?? '')
  const [roleTitle, setRoleTitle] = useState('')
  const [opportunityType, setOpportunityType] = useState<OpportunityType>('INTERNSHIP')
  const [location, setLocation] = useState('')
  const [workMode, setWorkMode] = useState<WorkMode>('UNSPECIFIED')
  const [source, setSource] = useState<OpportunitySource>('Other')
  const [opportunityDeadline, setOpportunityDeadline] = useState('')
  const [opportunityNotes, setOpportunityNotes] = useState('')
  const [batchText, setBatchText] = useState('')
  const [companyError, setCompanyError] = useState('')
  const [opportunityError, setOpportunityError] = useState('')

  const todayKey = getTodayDate()
  const overview = useMemo(() => CareerService.getOverview(companies, opportunities, applications, 2028), [applications, companies, opportunities])

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opportunity) => {
      const application = CareerService.getOpportunityApplication(opportunity.id, applications)
      const eligibility = evaluateOpportunityEligibility(opportunity, 2028).outcome
      switch (filter) {
        case 'Eligible':
          return eligibility === 'ELIGIBLE'
        case 'Unknown':
          return eligibility === 'UNKNOWN'
        case 'Internship':
          return opportunity.opportunityType === 'INTERNSHIP'
        case 'Full Time':
          return opportunity.opportunityType === 'FULL_TIME'
        case 'Applied':
          return Boolean(application && ['APPLIED', 'ONLINE_ASSESSMENT', 'INTERVIEW', 'OFFER'].includes(application.status))
        case 'Active':
          return Boolean(application && ['PLANNED', 'APPLIED', 'ONLINE_ASSESSMENT', 'INTERVIEW'].includes(application.status))
        case 'Deadline Soon': {
          if (!opportunity.applicationDeadline) return false
          return compareDeadlineDays(opportunity.applicationDeadline, todayKey) >= 0 && compareDeadlineDays(opportunity.applicationDeadline, todayKey) <= 14
        }
        case 'Closed':
          return opportunity.status === 'CLOSED'
        default:
          return true
      }
    })
  }, [applications, filter, opportunities, todayKey])

  function handleCreateCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!companyName.trim()) {
      setCompanyError('Company name is required.')
      return
    }

    const result = onCreateCompany(companyName.trim(), companyWebsite.trim() || undefined, companyCareersUrl.trim() || undefined, companyNotes.trim() || undefined)
    if (!result) {
      setCompanyError('Could not create the company.')
      return
    }

    setCompanyName('')
    setCompanyWebsite('')
    setCompanyCareersUrl('')
    setCompanyNotes('')
    setCompanyError('')
    setOpportunityCompanyId(result.id)
  }

  function handleCreateOpportunity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!roleTitle.trim()) {
      setOpportunityError('Role title is required.')
      return
    }
    if (!opportunityCompanyId) {
      setOpportunityError('Choose a company first.')
      return
    }

    const result = onCreateOpportunity({
      companyId: opportunityCompanyId,
      roleTitle: roleTitle.trim(),
      opportunityType,
      location: location.trim() || undefined,
      workMode,
      source,
      applicationDeadline: opportunityDeadline || undefined,
      notes: opportunityNotes.trim() || undefined,
      eligibility: {
        batchText: batchText.trim() || undefined,
      },
    })

    if (!result) {
      setOpportunityError('Could not create the opportunity.')
      return
    }

    setRoleTitle('')
    setLocation('')
    setWorkMode('UNSPECIFIED')
    setSource('Other')
    setOpportunityDeadline('')
    setOpportunityNotes('')
    setBatchText('')
    setOpportunityError('')
    onSelectOpportunity(result.id)
  }

  return (
    <div className="career-page">
      <header className="career-header">
        <div>
          <div className="welcome-kicker">CAREER LAUNCH</div>
          <h1>Career dashboard</h1>
        </div>
      </header>

      <section className="career-overview-grid">
        <article className="career-stat-card">
          <span>Total opportunities</span>
          <strong>{overview.totalOpportunities}</strong>
        </article>
        <article className="career-stat-card">
          <span>Eligible</span>
          <strong>{overview.eligibleOpportunities}</strong>
        </article>
        <article className="career-stat-card">
          <span>Unknown</span>
          <strong>{overview.unknownEligibility}</strong>
        </article>
        <article className="career-stat-card">
          <span>Applied</span>
          <strong>{overview.appliedCount}</strong>
        </article>
        <article className="career-stat-card">
          <span>Active apps</span>
          <strong>{overview.activeApplications}</strong>
        </article>
        <article className="career-stat-card">
          <span>Interviews</span>
          <strong>{overview.interviews}</strong>
        </article>
        <article className="career-stat-card">
          <span>Offers</span>
          <strong>{overview.offers}</strong>
        </article>
        <article className="career-stat-card">
          <span>Upcoming deadlines</span>
          <strong>{overview.upcomingDeadlines}</strong>
        </article>
      </section>

      <section className="career-action-grid">
        <div className="career-panel">
          <h2>Add company</h2>
          <form onSubmit={handleCreateCompany} className="career-form">
            <label>
              <span>Name</span>
              <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Example: Microsoft" required />
            </label>
            <label>
              <span>Website</span>
              <input value={companyWebsite} onChange={(event) => setCompanyWebsite(event.target.value)} placeholder="https://example.com" />
            </label>
            <label>
              <span>Careers URL</span>
              <input value={companyCareersUrl} onChange={(event) => setCompanyCareersUrl(event.target.value)} placeholder="https://example.com/careers" />
            </label>
            <label>
              <span>Notes</span>
              <textarea value={companyNotes} onChange={(event) => setCompanyNotes(event.target.value)} placeholder="What do you know about this company?" />
            </label>
            {companyError && <small className="field-error">{companyError}</small>}
            <button type="submit" className="primary-button"><Building2 size={14} />Add company</button>
          </form>
        </div>

        <div className="career-panel">
          <h2>Add opportunity</h2>
          <form onSubmit={handleCreateOpportunity} className="career-form">
            <label>
              <span>Company</span>
              <select value={opportunityCompanyId} onChange={(event) => setOpportunityCompanyId(event.target.value)}>
                {companies.length ? companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                )) : <option value="">Create a company first</option>}
              </select>
            </label>
            <label>
              <span>Role title</span>
              <input value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} placeholder="Software Engineer Intern" required />
            </label>
            <div className="field-row">
              <label>
                <span>Type</span>
                <select value={opportunityType} onChange={(event) => setOpportunityType(event.target.value as OpportunityType)}>
                  {['INTERNSHIP', 'FULL_TIME', 'OFF_CAMPUS', 'CAMPUS', 'OTHER'].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Work mode</span>
                <select value={workMode} onChange={(event) => setWorkMode(event.target.value as WorkMode)}>
                  {['REMOTE', 'HYBRID', 'ON_SITE', 'UNSPECIFIED'].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span>Location</span>
              <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Bengaluru, India" />
            </label>
            <label>
              <span>Source</span>
              <select value={source} onChange={(event) => setSource(event.target.value as OpportunitySource)}>
                {['Company Careers', 'LinkedIn', 'Unstop', 'Referral', 'College', 'Job Portal', 'Other'].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Application deadline</span>
              <input type="date" value={opportunityDeadline} onChange={(event) => setOpportunityDeadline(event.target.value)} />
            </label>
            <label>
              <span>Batch text</span>
              <input value={batchText} onChange={(event) => setBatchText(event.target.value)} placeholder="2027/2028 graduates" />
            </label>
            <label>
              <span>Notes</span>
              <textarea value={opportunityNotes} onChange={(event) => setOpportunityNotes(event.target.value)} placeholder="Application notes, requirements, or recruiter context." />
            </label>
            {opportunityError && <small className="field-error">{opportunityError}</small>}
            <button type="submit" className="primary-button"><Plus size={14} />Add opportunity</button>
          </form>
        </div>
      </section>

      <section className="career-panel">
        <div className="filter-row">
          {(['All', 'Eligible', 'Unknown', 'Internship', 'Full Time', 'Applied', 'Active', 'Deadline Soon', 'Closed'] as FilterKey[]).map((option) => (
            <button key={option} type="button" className={filter === option ? 'filter-pill active' : 'filter-pill'} onClick={() => setFilter(option)}>{option}</button>
          ))}
        </div>

        <div className="opportunity-grid">
          {filteredOpportunities.length ? filteredOpportunities.map((opportunity) => {
            const application = CareerService.getOpportunityApplication(opportunity.id, applications)
            const eligibility = evaluateOpportunityEligibility(opportunity, 2028)
            const deadlineStatus = CareerService.getDeadlineStatus(opportunity.applicationDeadline)
            return (
              <article className="opportunity-card" key={opportunity.id}>
                <div className="opportunity-card-header">
                  <div>
                    <div className="card-kicker">{opportunity.companyName}</div>
                    <h3>{opportunity.roleTitle}</h3>
                  </div>
                  <button type="button" className="ghost-button" onClick={() => onSelectOpportunity(opportunity.id)}>Open</button>
                </div>
                <div className="meta-row">
                  <span>{opportunity.opportunityType}</span>
                  <span>{opportunity.workMode}</span>
                </div>
                <div className="meta-row">
                  <span>{opportunity.location || 'Location TBD'}</span>
                  <span>{opportunity.source}</span>
                </div>
                <div className="eligibility-row">
                  <span className={`eligibility-badge ${eligibility.outcome.toLowerCase()}`}>{eligibility.outcome}</span>
                  {opportunity.applicationDeadline && (
                    <span className={`deadline-badge ${deadlineStatus === 'PASSED' ? 'passed' : deadlineStatus === 'UPCOMING' ? 'upcoming' : ''}`}>
                      {CareerService.formatDeadline(opportunity.applicationDeadline)}
                    </span>
                  )}
                </div>
                <p className="short-reason">{eligibility.explanation}</p>
                <div className="card-footer">
                  <span>{application ? `Application: ${application.status}` : 'Not applied yet'}</span>
                  <button type="button" className="trash-button" aria-label={`Delete ${opportunity.roleTitle}`} onClick={() => onDeleteOpportunity(opportunity.id)}><Trash2 size={14} /></button>
                </div>
              </article>
            )
          }) : (
            <div className="empty-state">No opportunities match this filter.</div>
          )}
        </div>
      </section>
    </div>
  )
}

function compareDeadlineDays(deadline: string, todayKey: string): number {
  const deadlineDate = new Date(`${deadline}T12:00:00`)
  const todayDate = new Date(`${todayKey}T12:00:00`)
  return Math.ceil((deadlineDate.getTime() - todayDate.getTime()) / 86400000)
}
