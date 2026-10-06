import { ArrowLeft, ExternalLink, Plus } from 'lucide-react'
import type { Application, ApplicationStatus } from '../domain/application'
import type { Company } from '../domain/company'
import type { Opportunity, OpportunitySource, OpportunityType, WorkMode } from '../domain/opportunity'
import type { Project } from '../domain/project'
import { CareerService } from '../services/CareerService'
import { evaluateOpportunityEligibility } from '../services/EligibilityService'
import './career.css'

type OpportunityDetailPageProps = {
  opportunity: Opportunity
  application: Application | null
  companies: Company[]
  projects: Project[]
  backLabel?: string
  onBack: () => void
  onUpdateOpportunity: (opportunityId: string, updates: Partial<Opportunity>) => void
  onDeleteOpportunity: (opportunityId: string) => void
  onCreateApplication: (opportunityId: string, input: { status?: ApplicationStatus; appliedDate?: string; nextActionDate?: string; notes?: string; currentStage?: string }) => Application | null
  onUpdateApplication: (applicationId: string, updates: Partial<Application>) => void
  onDeleteApplication: (applicationId: string) => void
}

export function OpportunityDetailPage({ opportunity, application, companies, projects, backLabel = 'Career', onBack, onUpdateOpportunity, onDeleteOpportunity, onCreateApplication, onUpdateApplication, onDeleteApplication }: OpportunityDetailPageProps) {
  const eligibility = evaluateOpportunityEligibility(opportunity, 2028)
  const deadlineStatus = CareerService.getDeadlineStatus(opportunity.applicationDeadline)
  const company = companies.find((entry) => entry.id === opportunity.companyId)
  void company

  function toggleProject(projectId: string) {
    const nextProjectIds = opportunity.projectIds.includes(projectId)
      ? opportunity.projectIds.filter((id) => id !== projectId)
      : [...opportunity.projectIds, projectId]

    onUpdateOpportunity(opportunity.id, { projectIds: nextProjectIds })
  }

  return (
    <div className={`opportunity-detail-page${backLabel === 'Internships' ? ' internship-detail' : ''}`}>
      <button type="button" className="back-button" onClick={onBack}><ArrowLeft size={14} />Back to {backLabel}</button>
      <header className="detail-header">
        <div>
          <div className="welcome-kicker">{opportunity.opportunityType === 'INTERNSHIP' ? 'INTERNSHIP' : 'OPPORTUNITY'}</div>
          <h1>{opportunity.roleTitle}</h1>
        </div>
        <span className={`eligibility-badge ${eligibility.outcome.toLowerCase()}`}>{eligibility.outcome}</span>
      </header>

      <section className="career-panel detail-layout">
        <div>
          <h2>Overview</h2>
          <div className="detail-metadata">
            <span><strong>Company:</strong> {opportunity.companyName}</span>
            <span><strong>Type:</strong> {opportunity.opportunityType}</span>
            <span><strong>Work mode:</strong> {opportunity.workMode}</span>
            <span><strong>Location:</strong> {opportunity.location || 'TBD'}</span>
            <span><strong>Source:</strong> {opportunity.source}</span>
            <span><strong>Application opens:</strong> {opportunity.applicationOpeningDate ? CareerService.formatDeadline(opportunity.applicationOpeningDate) : 'Not listed'}</span>
            <span><strong>Deadline:</strong> {opportunity.applicationDeadline ? `${CareerService.formatDeadline(opportunity.applicationDeadline)} (${deadlineStatus})` : 'No deadline set'}</span>
          </div>
          <p className="detail-eligibility-note">{eligibility.explanation}</p>
          {isExternalUrl(opportunity.applicationUrl) && <a href={opportunity.applicationUrl} target="_blank" rel="noreferrer" className="external-link"><ExternalLink size={14} />Open application page</a>}
          {isExternalUrl(opportunity.companyUrl) && <a href={opportunity.companyUrl} target="_blank" rel="noreferrer" className="external-link"><ExternalLink size={14} />Open company website</a>}
          <div className="detail-section">
            <h3>Opportunity details</h3>
            <label><span>Description</span><textarea value={opportunity.description ?? ''} onChange={(event) => onUpdateOpportunity(opportunity.id, { description: event.target.value })} /></label>
            <div className="detail-skill-groups">
              <div><strong>Required skills</strong><p>{opportunity.requiredSkills.length ? opportunity.requiredSkills.join(', ') : 'Not listed'}</p></div>
              <div><strong>Preferred skills</strong><p>{opportunity.preferredSkills.length ? opportunity.preferredSkills.join(', ') : 'Not listed'}</p></div>
            </div>
            <label><span>Opportunity notes</span><textarea value={opportunity.notes ?? ''} onChange={(event) => onUpdateOpportunity(opportunity.id, { notes: event.target.value })} placeholder="Notes" /></label>
          </div>
        </div>

        <div>
          <h2>Application</h2>
          {!application ? (
            <button type="button" className="primary-button" onClick={() => onCreateApplication(opportunity.id, { status: 'SAVED' })}><Plus size={14} />Create application</button>
          ) : (
            <div className="application-editor">
              <label>
                <span>Status</span>
                <select value={application.status} onChange={(event) => onUpdateApplication(application.id, { status: event.target.value as ApplicationStatus })}>
                  {['SAVED', 'PLANNED', 'APPLIED', 'ONLINE_ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN', 'EXPIRED'].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Current stage</span>
                <input value={application.currentStage} onChange={(event) => onUpdateApplication(application.id, { currentStage: event.target.value })} />
              </label>
              <label>
                <span>Applied date</span>
                <input type="date" value={application.appliedDate ?? ''} onChange={(event) => onUpdateApplication(application.id, { appliedDate: event.target.value || undefined })} />
              </label>
              <label>
                <span>Next action date</span>
                <input type="date" value={application.nextActionDate ?? ''} onChange={(event) => onUpdateApplication(application.id, { nextActionDate: event.target.value || undefined })} />
              </label>
              <label>
                <span>Notes</span>
                <textarea value={application.notes ?? ''} onChange={(event) => onUpdateApplication(application.id, { notes: event.target.value })} />
              </label>
              <div className="button-row">
                <button type="button" className="ghost-button" onClick={() => onDeleteApplication(application.id)}>Delete application</button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="career-panel detail-layout">
        <div>
          <h2>Eligibility</h2>
          <div className="detail-metadata">
            <span><strong>Batch text:</strong> {opportunity.eligibility.batchText || 'Not recorded'}</span>
            <span><strong>Eligible years:</strong> {opportunity.eligibility.eligibleGraduationYears?.length ? opportunity.eligibility.eligibleGraduationYears.join(', ') : 'Not recorded'}</span>
            <span><strong>Min graduation year:</strong> {opportunity.eligibility.minimumGraduationYear ?? 'Not recorded'}</span>
            <span><strong>Max graduation year:</strong> {opportunity.eligibility.maximumGraduationYear ?? 'Not recorded'}</span>
            <span><strong>Minimum CGPA:</strong> {opportunity.eligibility.minimumCGPA ?? 'Not recorded'}</span>
            <span><strong>Degree requirements:</strong> {opportunity.eligibility.degreeRequirements?.length ? opportunity.eligibility.degreeRequirements.join(', ') : 'Not recorded'}</span>
            <span><strong>Branch requirements:</strong> {opportunity.eligibility.branchRequirements?.length ? opportunity.eligibility.branchRequirements.join(', ') : 'Not recorded'}</span>
            <span><strong>Experience requirements:</strong> {opportunity.eligibility.experienceRequirements?.length ? opportunity.eligibility.experienceRequirements.join(', ') : 'Not recorded'}</span>
          </div>
        </div>

        <div>
          <h2>Related projects</h2>
          <div className="project-association-list">
            {projects.length ? projects.map((project) => (
              <label key={project.id} className="checkbox-row">
                <input type="checkbox" checked={opportunity.projectIds.includes(project.id)} onChange={() => toggleProject(project.id)} />
                <span>{project.title}</span>
              </label>
            )) : <p>No projects yet.</p>}
          </div>
        </div>
      </section>

      <section className="career-panel">
        <h2>Opportunity metadata</h2>
        <div className="detail-metadata">
          <label>
            <span>Company</span>
            <input value={opportunity.companyName} onChange={(event) => onUpdateOpportunity(opportunity.id, { companyName: event.target.value })} />
          </label>
          <label>
            <span>Role type</span>
            <select value={opportunity.opportunityType} onChange={(event) => onUpdateOpportunity(opportunity.id, { opportunityType: event.target.value as OpportunityType })}>
              {['INTERNSHIP', 'FULL_TIME', 'OFF_CAMPUS', 'CAMPUS', 'OTHER'].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>Work mode</span>
            <select value={opportunity.workMode} onChange={(event) => onUpdateOpportunity(opportunity.id, { workMode: event.target.value as WorkMode })}>
              {['REMOTE', 'HYBRID', 'ON_SITE', 'UNSPECIFIED'].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>Source</span>
            <select value={opportunity.source} onChange={(event) => onUpdateOpportunity(opportunity.id, { source: event.target.value as OpportunitySource })}>
              {['Company Careers', 'LinkedIn', 'Unstop', 'Referral', 'College', 'Job Portal', 'Other'].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>Location</span>
            <input value={opportunity.location ?? ''} onChange={(event) => onUpdateOpportunity(opportunity.id, { location: event.target.value || undefined })} />
          </label>
          <label>
            <span>Application URL</span>
            <input value={opportunity.applicationUrl ?? ''} onChange={(event) => onUpdateOpportunity(opportunity.id, { applicationUrl: event.target.value || undefined })} />
          </label>
          <label>
            <span>Company URL</span>
            <input value={opportunity.companyUrl ?? ''} onChange={(event) => onUpdateOpportunity(opportunity.id, { companyUrl: event.target.value || undefined })} />
          </label>
          <label>
            <span>Deadline</span>
            <input type="date" value={opportunity.applicationDeadline ?? ''} onChange={(event) => onUpdateOpportunity(opportunity.id, { applicationDeadline: event.target.value || undefined })} />
          </label>
          <label>
            <span>Application opening date</span>
            <input type="date" value={opportunity.applicationOpeningDate ?? ''} onChange={(event) => onUpdateOpportunity(opportunity.id, { applicationOpeningDate: event.target.value || undefined })} />
          </label>
          <label>
            <span>Status</span>
            <select value={opportunity.status} onChange={(event) => onUpdateOpportunity(opportunity.id, { status: event.target.value as Opportunity['status'] })}>
              {['OPEN', 'CLOSED', 'DRAFT'].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <div className="button-row">
          <button type="button" className="trash-button" onClick={() => onDeleteOpportunity(opportunity.id)}>Delete opportunity</button>
        </div>
      </section>
    </div>
  )
}

function isExternalUrl(value?: string): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}
