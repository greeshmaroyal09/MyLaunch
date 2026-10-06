import type { Application, ApplicationStatus } from '../domain/application'
import type { Company } from '../domain/company'
import type { Opportunity, OpportunitySource, OpportunityType, WorkMode } from '../domain/opportunity'
import { CareerService } from './CareerService'
import { evaluateOpportunityEligibility, type EligibilityOutcome } from './EligibilityService'

export type JobOpportunityType = Extract<OpportunityType, 'FULL_TIME' | 'CAMPUS' | 'OFF_CAMPUS'>

export type JobFilters = {
  search: string
  opportunityType: JobOpportunityType | 'ALL'
  eligibility: EligibilityOutcome | 'ALL'
  applicationStatus: ApplicationStatus | 'UNTRACKED' | 'ALL'
  workMode: WorkMode | 'ALL'
  location: string
  deadline: 'ALL' | 'UPCOMING' | 'PASSED' | 'NONE'
  source: OpportunitySource | 'ALL'
}

export const jobOpportunityTypes: JobOpportunityType[] = ['FULL_TIME', 'CAMPUS', 'OFF_CAMPUS']

export const jobApplicationStatuses: ApplicationStatus[] = [
  'SAVED', 'PLANNED', 'APPLIED', 'ONLINE_ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN', 'EXPIRED',
]

export const JobService = {
  getOpportunities(opportunities: Opportunity[]): Opportunity[] {
    return opportunities.filter((opportunity) => jobOpportunityTypes.includes(opportunity.opportunityType as JobOpportunityType))
  },

  getOverview(companies: Company[], opportunities: Opportunity[], applications: Application[]) {
    const jobs = this.getOpportunities(opportunities)
    const jobIds = new Set(jobs.map((opportunity) => opportunity.id))
    const jobApplications = applications.filter((application) => jobIds.has(application.opportunityId))
    const careerOverview = CareerService.getOverview(companies, jobs, jobApplications, 2028)
    const statusCounts = Object.fromEntries(jobApplicationStatuses.map((status) => [
      status,
      jobApplications.filter((application) => application.status === status).length,
    ])) as Record<ApplicationStatus, number>
    const typeCounts = Object.fromEntries(jobOpportunityTypes.map((type) => [
      type,
      jobs.filter((opportunity) => opportunity.opportunityType === type).length,
    ])) as Record<JobOpportunityType, number>

    return { ...careerOverview, statusCounts, typeCounts }
  },

  getLocations(opportunities: Opportunity[]): string[] {
    return [...new Set(this.getOpportunities(opportunities)
      .map((opportunity) => opportunity.location?.trim())
      .filter((location): location is string => Boolean(location)))].sort((left, right) => left.localeCompare(right))
  },

  getFilteredOpportunities(opportunities: Opportunity[], applications: Application[], filters: JobFilters): Opportunity[] {
    const search = filters.search.trim().toLocaleLowerCase()
    return this.getOpportunities(opportunities)
      .filter((opportunity) => {
        const application = CareerService.getOpportunityApplication(opportunity.id, applications)
        const eligibility = evaluateOpportunityEligibility(opportunity, 2028).outcome
        if (search && !`${opportunity.companyName} ${opportunity.roleTitle}`.toLocaleLowerCase().includes(search)) return false
        if (filters.opportunityType !== 'ALL' && opportunity.opportunityType !== filters.opportunityType) return false
        if (filters.eligibility !== 'ALL' && eligibility !== filters.eligibility) return false
        if (filters.applicationStatus === 'UNTRACKED' && application) return false
        if (filters.applicationStatus !== 'ALL' && filters.applicationStatus !== 'UNTRACKED' && application?.status !== filters.applicationStatus) return false
        if (filters.workMode !== 'ALL' && opportunity.workMode !== filters.workMode) return false
        if (filters.location !== 'ALL' && (opportunity.location?.trim() ?? '') !== filters.location) return false
        if (filters.source !== 'ALL' && opportunity.source !== filters.source) return false
        if (filters.deadline !== 'ALL' && CareerService.getDeadlineStatus(opportunity.applicationDeadline) !== filters.deadline) return false
        return true
      })
      .sort((left, right) => {
        const leftDeadline = left.applicationDeadline ?? '9999-12-31'
        const rightDeadline = right.applicationDeadline ?? '9999-12-31'
        return leftDeadline.localeCompare(rightDeadline) || left.companyName.localeCompare(right.companyName) || left.roleTitle.localeCompare(right.roleTitle)
      })
  },
}