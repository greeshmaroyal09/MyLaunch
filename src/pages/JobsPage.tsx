import { useState, type FormEvent } from 'react'
import { ArrowUpRight, BriefcaseBusiness, CalendarDays, CircleHelp, MapPin, Plus, Search, X } from 'lucide-react'
import type { Application, ApplicationStatus } from '../domain/application'
import type { Company } from '../domain/company'
import type { Opportunity, OpportunitySource, WorkMode } from '../domain/opportunity'
import { CareerService } from '../services/CareerService'
import { evaluateOpportunityEligibility, type EligibilityOutcome } from '../services/EligibilityService'
import type { CreateOpportunityInput } from '../services/OpportunityService'
import { JobService, jobApplicationStatuses, jobOpportunityTypes, type JobFilters, type JobOpportunityType } from '../services/JobService'
import './jobs.css'

type JobDraft = {
  company: string
  role: string
  opportunityType: JobOpportunityType
  location: string
  workMode: WorkMode
  source: OpportunitySource
  applicationUrl: string
  companyUrl: string
  description: string
  requiredSkills: string
  preferredSkills: string
  batchText: string
  eligibleGraduationYears: string
  minimumGraduationYear: string
  maximumGraduationYear: string
  minimumCGPA: string
  degreeRequirements: string
  branchRequirements: string
  experienceRequirements: string
  applicationOpeningDate: string
  applicationDeadline: string
  notes: string
}

const initialDraft: JobDraft = {
  company: '', role: '', opportunityType: 'FULL_TIME', location: '', workMode: 'UNSPECIFIED', source: 'Other',
  applicationUrl: '', companyUrl: '', description: '', requiredSkills: '', preferredSkills: '', batchText: '',
  eligibleGraduationYears: '', minimumGraduationYear: '', maximumGraduationYear: '', minimumCGPA: '',
  degreeRequirements: '', branchRequirements: '', experienceRequirements: '', applicationOpeningDate: '',
  applicationDeadline: '', notes: '',
}

type JobsPageProps = {
  companies: Company[]
  opportunities: Opportunity[]
  applications: Application[]
  onCreateCompany: (name: string, website?: string) => Company | null
  onCreateOpportunity: (input: CreateOpportunityInput) => Opportunity | null
  onSelectOpportunity: (opportunityId: string) => void
}

const typeLabels: Record<JobOpportunityType, string> = {
  FULL_TIME: 'Full-time / General',
  CAMPUS: 'Campus',
  OFF_CAMPUS: 'Off-campus',
}

export function JobsPage({ companies, opportunities, applications, onCreateCompany, onCreateOpportunity, onSelectOpportunity }: JobsPageProps) {
  const [filters, setFilters] = useState<JobFilters>({
    search: '', opportunityType: 'ALL', eligibility: 'ALL', applicationStatus: 'ALL', workMode: 'ALL', location: 'ALL', deadline: 'ALL', source: 'ALL',
  })
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<JobDraft>(initialDraft)
  const [formError, setFormError] = useState('')
  const jobs = JobService.getOpportunities(opportunities)
  const overview = JobService.getOverview(companies, jobs, applications)
  const filtered = JobService.getFilteredOpportunities(jobs, applications, filters)
  const locations = JobService.getLocations(jobs)

  function updateFilter<K extends keyof JobFilters>(key: K, value: JobFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function updateDraft<K extends keyof JobDraft>(key: K, value: JobDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function createJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    const companyName = draft.company.trim()
    const roleTitle = draft.role.trim()
    if (!companyName || !roleTitle) {
      setFormError('Company and role are required.')
      return
    }
    const company = onCreateCompany(companyName, optionalText(draft.companyUrl))
    if (!company) {
      setFormError('Could not save the company.')
      return
    }
    const opportunity = onCreateOpportunity({
      companyId: company.id,
      companyName: company.name,
      roleTitle,
      opportunityType: draft.opportunityType,
      location: optionalText(draft.location),
      workMode: draft.workMode,
      source: draft.source,
      applicationUrl: optionalText(draft.applicationUrl),
      companyUrl: optionalText(draft.companyUrl),
      description: optionalText(draft.description),
      requiredSkills: splitList(draft.requiredSkills),
      preferredSkills: splitList(draft.preferredSkills),
      eligibility: {
        batchText: optionalText(draft.batchText),
        eligibleGraduationYears: parseYears(draft.eligibleGraduationYears),
        minimumGraduationYear: parseOptionalNumber(draft.minimumGraduationYear),
        maximumGraduationYear: parseOptionalNumber(draft.maximumGraduationYear),
        minimumCGPA: parseOptionalNumber(draft.minimumCGPA),
        degreeRequirements: splitList(draft.degreeRequirements),
        branchRequirements: splitList(draft.branchRequirements),
        experienceRequirements: splitList(draft.experienceRequirements),
      },
      applicationOpeningDate: optionalText(draft.applicationOpeningDate),
      applicationDeadline: optionalText(draft.applicationDeadline),
      notes: optionalText(draft.notes),
    })
    if (!opportunity) {
      setFormError('Could not save the job opportunity.')
      return
    }
    setDraft(initialDraft)
    setShowForm(false)
    onSelectOpportunity(opportunity.id)
  }

  return (
    <div className="jobs-page">
      <header className="jobs-header">
        <div>
          <p className="jobs-eyebrow">CAREER TOOLKIT / JOBS</p>
          <h1>Job tracker</h1>
          <p>Track full-time, campus, and off-campus roles in one application pipeline.</p>
        </div>
        <button className="job-primary-button" type="button" onClick={() => setShowForm((visible) => !visible)}>
          {showForm ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
          {showForm ? 'Close form' : 'Add job'}
        </button>
      </header>

      <section className="job-stats" aria-label="Job opportunity overview">
        <Stat label="Job opportunities" value={overview.totalOpportunities} />
        <Stat label="Full-time / General" value={overview.typeCounts.FULL_TIME} />
        <Stat label="Campus" value={overview.typeCounts.CAMPUS} />
        <Stat label="Off-campus" value={overview.typeCounts.OFF_CAMPUS} />
        <Stat label="Eligible · 2028" value={overview.eligibleOpportunities} />
        <Stat label="Unknown eligibility" value={overview.unknownEligibility} />
        <Stat label="Saved" value={overview.statusCounts.SAVED} />
        <Stat label="Planned" value={overview.statusCounts.PLANNED} />
        <Stat label="Applied" value={overview.statusCounts.APPLIED} />
        <Stat label="Online assessments" value={overview.statusCounts.ONLINE_ASSESSMENT} />
        <Stat label="Interviews" value={overview.statusCounts.INTERVIEW} />
        <Stat label="Offers" value={overview.statusCounts.OFFER} />
        <Stat label="Rejected" value={overview.statusCounts.REJECTED} />
        <Stat label="Deadlines · 14 days" value={overview.upcomingDeadlines} />
      </section>

      {showForm && <JobForm draft={draft} error={formError} updateDraft={updateDraft} onSubmit={createJob} />}

      <section className="job-list-panel" aria-labelledby="job-list-title">
        <div className="job-list-heading">
          <div><p className="jobs-eyebrow">YOUR OPPORTUNITIES</p><h2 id="job-list-title">Jobs</h2></div>
          <span>{filtered.length} of {jobs.length}</span>
        </div>
        <div className="job-filters">
          <label className="job-search">
            <Search size={16} aria-hidden="true" />
            <input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search company or role" aria-label="Search company or role" />
          </label>
          <label><span>Opportunity type</span><select value={filters.opportunityType} onChange={(event) => updateFilter('opportunityType', event.target.value as JobFilters['opportunityType'])}><option value="ALL">All job types</option>{jobOpportunityTypes.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}</select></label>
          <label><span>Eligibility</span><select value={filters.eligibility} onChange={(event) => updateFilter('eligibility', event.target.value as JobFilters['eligibility'])}><option value="ALL">All eligibility</option><option value="ELIGIBLE">Eligible</option><option value="INELIGIBLE">Ineligible</option><option value="UNKNOWN">Unknown</option></select></label>
          <label><span>Application</span><select value={filters.applicationStatus} onChange={(event) => updateFilter('applicationStatus', event.target.value as JobFilters['applicationStatus'])}><option value="ALL">All statuses</option><option value="UNTRACKED">Not tracked</option>{jobApplicationStatuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></label>
          <label><span>Work mode</span><select value={filters.workMode} onChange={(event) => updateFilter('workMode', event.target.value as JobFilters['workMode'])}><option value="ALL">All modes</option>{(['REMOTE', 'HYBRID', 'ON_SITE', 'UNSPECIFIED'] as WorkMode[]).map((mode) => <option key={mode} value={mode}>{formatWorkMode(mode)}</option>)}</select></label>
          <label><span>Location</span><select value={filters.location} onChange={(event) => updateFilter('location', event.target.value)}><option value="ALL">All locations</option>{locations.map((location) => <option key={location} value={location}>{location}</option>)}</select></label>
          <label><span>Deadline</span><select value={filters.deadline} onChange={(event) => updateFilter('deadline', event.target.value as JobFilters['deadline'])}><option value="ALL">All deadlines</option><option value="UPCOMING">Upcoming</option><option value="PASSED">Passed</option><option value="NONE">No deadline</option></select></label>
          <label><span>Source</span><select value={filters.source} onChange={(event) => updateFilter('source', event.target.value as JobFilters['source'])}><option value="ALL">All sources</option>{(['Company Careers', 'LinkedIn', 'Unstop', 'Referral', 'College', 'Job Portal', 'Other'] as OpportunitySource[]).map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
        </div>
        {filtered.length ? (
          <div className="job-opportunity-list">
            {filtered.map((opportunity) => <JobRow key={opportunity.id} opportunity={opportunity} application={CareerService.getOpportunityApplication(opportunity.id, applications)} onOpen={() => onSelectOpportunity(opportunity.id)} />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="job-empty-state">
            <BriefcaseBusiness size={24} aria-hidden="true" />
            <h3>No job opportunities yet</h3>
            <p>Add a full-time, campus, or off-campus role to track its eligibility, deadline, and application progress.</p>
            <button className="job-primary-button" type="button" onClick={() => setShowForm(true)}><Plus size={15} aria-hidden="true" />Add your first job</button>
          </div>
        ) : <div className="job-empty-filter"><CircleHelp size={17} aria-hidden="true" />No jobs match these filters.</div>}
      </section>
    </div>
  )
}

function JobRow({ opportunity, application, onOpen }: { opportunity: Opportunity; application: Application | null; onOpen: () => void }) {
  const eligibility = evaluateOpportunityEligibility(opportunity, 2028)
  const deadlineStatus = CareerService.getDeadlineStatus(opportunity.applicationDeadline)
  return (
    <article className="job-row">
      <div className="job-company-mark" aria-hidden="true">{opportunity.companyName.trim().slice(0, 1).toUpperCase()}</div>
      <div className="job-row-main">
        <div className="job-company-name">{opportunity.companyName}</div>
        <h3>{opportunity.roleTitle}</h3>
        <div className="job-meta">
          <span><MapPin size={13} aria-hidden="true" />{opportunity.location || 'Location not listed'}</span>
          <span>{formatWorkMode(opportunity.workMode)}</span>
          <span>{opportunity.source}</span>
        </div>
      </div>
      <div className="job-row-facts">
        <span className={`job-type-tag job-type-${opportunity.opportunityType.toLowerCase()}`}>{typeLabels[opportunity.opportunityType as JobOpportunityType]}</span>
        <span className={`job-eligibility ${eligibility.outcome.toLowerCase()}`} title={eligibility.explanation}>{formatEligibility(eligibility.outcome)}</span>
        <span className="job-app-status">{application ? formatStatus(application.status) : 'Not tracked'}</span>
        <span className={`job-deadline ${deadlineStatus.toLowerCase()}`}><CalendarDays size={13} aria-hidden="true" />{opportunity.applicationDeadline ? CareerService.formatDeadline(opportunity.applicationDeadline) : 'No deadline'}</span>
      </div>
      <button className="job-open-button" type="button" onClick={onOpen} aria-label={`Open ${opportunity.companyName}, ${opportunity.roleTitle}`} title="View job"><ArrowUpRight size={17} aria-hidden="true" /></button>
    </article>
  )
}

function JobForm({ draft, error, updateDraft, onSubmit }: {
  draft: JobDraft
  error: string
  updateDraft: <K extends keyof JobDraft>(key: K, value: JobDraft[K]) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <section className="job-form-panel" aria-labelledby="add-job-title">
      <div className="job-form-heading"><div><p className="jobs-eyebrow">MANUAL ENTRY</p><h2 id="add-job-title">Add a job opportunity</h2></div><span>Only company and role are required.</span></div>
      <form className="job-form" onSubmit={onSubmit}>
        <FormInput label="Company" value={draft.company} onChange={(value) => updateDraft('company', value)} required />
        <FormInput label="Role" value={draft.role} onChange={(value) => updateDraft('role', value)} required placeholder="Software Engineer" />
        <label><span>Opportunity type</span><select value={draft.opportunityType} onChange={(event) => updateDraft('opportunityType', event.target.value as JobOpportunityType)}>{jobOpportunityTypes.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}</select></label>
        <FormInput label="Location" value={draft.location} onChange={(value) => updateDraft('location', value)} placeholder="City, country or Remote" />
        <label><span>Work mode</span><select value={draft.workMode} onChange={(event) => updateDraft('workMode', event.target.value as WorkMode)}>{(['REMOTE', 'HYBRID', 'ON_SITE', 'UNSPECIFIED'] as WorkMode[]).map((mode) => <option key={mode} value={mode}>{formatWorkMode(mode)}</option>)}</select></label>
        <label><span>Source</span><select value={draft.source} onChange={(event) => updateDraft('source', event.target.value as OpportunitySource)}>{(['Company Careers', 'LinkedIn', 'Unstop', 'Referral', 'College', 'Job Portal', 'Other'] as OpportunitySource[]).map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
        <FormInput label="Application URL" value={draft.applicationUrl} onChange={(value) => updateDraft('applicationUrl', value)} type="url" placeholder="https://" />
        <FormInput label="Company URL" value={draft.companyUrl} onChange={(value) => updateDraft('companyUrl', value)} type="url" placeholder="https://" />
        <FormInput label="Application opens" value={draft.applicationOpeningDate} onChange={(value) => updateDraft('applicationOpeningDate', value)} type="date" />
        <FormInput label="Deadline" value={draft.applicationDeadline} onChange={(value) => updateDraft('applicationDeadline', value)} type="date" />
        <FormInput label="Required skills" value={draft.requiredSkills} onChange={(value) => updateDraft('requiredSkills', value)} placeholder="Java, SQL" />
        <FormInput label="Preferred skills" value={draft.preferredSkills} onChange={(value) => updateDraft('preferredSkills', value)} placeholder="Spring Boot, Git" />
        <FormInput label="Batch / graduation text" value={draft.batchText} onChange={(value) => updateDraft('batchText', value)} placeholder="2028 graduates" />
        <FormInput label="Eligible graduation years" value={draft.eligibleGraduationYears} onChange={(value) => updateDraft('eligibleGraduationYears', value)} placeholder="2027, 2028" />
        <FormInput label="Minimum graduation year" value={draft.minimumGraduationYear} onChange={(value) => updateDraft('minimumGraduationYear', value)} type="number" />
        <FormInput label="Maximum graduation year" value={draft.maximumGraduationYear} onChange={(value) => updateDraft('maximumGraduationYear', value)} type="number" />
        <FormInput label="Minimum CGPA" value={draft.minimumCGPA} onChange={(value) => updateDraft('minimumCGPA', value)} type="number" step="0.01" />
        <FormInput label="Degree requirements" value={draft.degreeRequirements} onChange={(value) => updateDraft('degreeRequirements', value)} placeholder="B.Tech, B.E." />
        <FormInput label="Branch requirements" value={draft.branchRequirements} onChange={(value) => updateDraft('branchRequirements', value)} placeholder="Computer Science" />
        <FormInput label="Experience requirements" value={draft.experienceRequirements} onChange={(value) => updateDraft('experienceRequirements', value)} placeholder="2+ years" />
        <label className="job-form-wide"><span>Description</span><textarea value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} rows={3} /></label>
        <label className="job-form-wide"><span>Notes</span><textarea value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} rows={2} /></label>
        <p className="job-form-note">Eligibility uses the existing 2028 rules. Missing or unclear graduation information remains Unknown. Opportunity type is based only on the type you select.</p>
        {error && <p className="job-form-error" role="alert">{error}</p>}
        <div className="job-form-actions"><button className="job-primary-button" type="submit"><Plus size={15} aria-hidden="true" />Save job</button></div>
      </form>
    </section>
  )
}

function FormInput({ label, value, onChange, type = 'text', placeholder, required = false, step }: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  step?: string
}) {
  return <label><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} step={step} /></label>
}

function Stat({ label, value }: { label: string; value: number }) {
  return <article className="job-stat"><span>{label}</span><strong>{value}</strong></article>
}

function splitList(value: string): string[] {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))]
}

function parseYears(value: string): number[] {
  return [...new Set(value.split(',').map((item) => Number(item.trim())).filter((year) => Number.isInteger(year) && year >= 1900 && year <= 2200))]
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function optionalText(value: string): string | undefined {
  return value.trim() || undefined
}

function formatStatus(status: ApplicationStatus): string {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatWorkMode(mode: WorkMode): string {
  return mode === 'ON_SITE' ? 'On-site' : mode === 'UNSPECIFIED' ? 'Not specified' : mode.charAt(0) + mode.slice(1).toLowerCase()
}

function formatEligibility(outcome: EligibilityOutcome): string {
  return outcome === 'ELIGIBLE' ? 'Eligible · 2028' : outcome === 'INELIGIBLE' ? 'Ineligible' : 'Unknown'
}