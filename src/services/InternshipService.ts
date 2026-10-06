import type { Application, ApplicationStatus } from '../domain/application'
import type { Company } from '../domain/company'
import type { Opportunity, OpportunitySource, WorkMode } from '../domain/opportunity'
import { CareerService } from './CareerService'
import { evaluateOpportunityEligibility, type EligibilityOutcome } from './EligibilityService'

export type InternshipFilters = {
  search: string
  eligibility: EligibilityOutcome | 'ALL'
  applicationStatus: ApplicationStatus | 'UNTRACKED' | 'ALL'
  workMode: WorkMode | 'ALL'
  location: string
  deadline: 'ALL' | 'UPCOMING' | 'PASSED' | 'NONE'
  source: OpportunitySource | 'ALL'
}

export const emptyInternshipFilters: InternshipFilters = {
  search: '',
  eligibility: 'ALL',
  applicationStatus: 'ALL',
  workMode: 'ALL',
  location: 'ALL',
  deadline: 'ALL',
  source: 'ALL',
}

export const internshipStatuses: ApplicationStatus[] = [
  'SAVED', 'PLANNED', 'APPLIED', 'ONLINE_ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN', 'EXPIRED',
]

export const InternshipService = {
  getOpportunities(opportunities: Opportunity[]): Opportunity[] {
    return opportunities.filter((opportunity) => opportunity.opportunityType === 'INTERNSHIP')
  },

  getOverview(companies: Company[], opportunities: Opportunity[], applications: Application[]) {
    const internships = this.getOpportunities(opportunities)
    const internshipIds = new Set(internships.map((opportunity) => opportunity.id))
    const internshipApplications = applications.filter((application) => internshipIds.has(application.opportunityId))
    const careerOverview = CareerService.getOverview(companies, internships, internshipApplications, 2028)
    const statusCounts = Object.fromEntries(internshipStatuses.map((status) => [
      status,
      internshipApplications.filter((application) => application.status === status).length,
    ])) as Record<ApplicationStatus, number>

    return { ...careerOverview, statusCounts }
  },

  getLocations(opportunities: Opportunity[]): string[] {
    return [...new Set(this.getOpportunities(opportunities)
      .map((opportunity) => opportunity.location?.trim())
      .filter((location): location is string => Boolean(location)))].sort((left, right) => left.localeCompare(right))
  },

  getFilteredOpportunities(
    opportunities: Opportunity[],
    applications: Application[],
    filters: InternshipFilters,
  ): Opportunity[] {
    const search = filters.search.trim().toLocaleLowerCase()
    return this.getOpportunities(opportunities)
      .filter((opportunity) => {
        const application = CareerService.getOpportunityApplication(opportunity.id, applications)
        const eligibility = evaluateOpportunityEligibility(opportunity, 2028).outcome
        if (search && !`${opportunity.companyName} ${opportunity.roleTitle}`.toLocaleLowerCase().includes(search)) return false
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