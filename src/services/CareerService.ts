import type { Application } from '../domain/application'
import type { Company } from '../domain/company'
import type { Opportunity } from '../domain/opportunity'
import { getTodayDate, parseDateKey } from './DateService'
import { evaluateOpportunityEligibility } from './EligibilityService'

export type CareerOverview = {
  totalOpportunities: number
  eligibleOpportunities: number
  unknownEligibility: number
  appliedCount: number
  activeApplications: number
  interviews: number
  offers: number
  upcomingDeadlines: number
}

export const CareerService = {
  getOverview(_companies: Company[], opportunities: Opportunity[], applications: Application[], graduationYear = 2028): CareerOverview {
    const eligibleOpportunities = opportunities.filter((opportunity) => evaluateOpportunityEligibility(opportunity, graduationYear).outcome === 'ELIGIBLE').length
    const unknownEligibility = opportunities.filter((opportunity) => evaluateOpportunityEligibility(opportunity, graduationYear).outcome === 'UNKNOWN').length
    const appliedCount = applications.filter((application) => application.status === 'APPLIED' || application.status === 'ONLINE_ASSESSMENT' || application.status === 'INTERVIEW' || application.status === 'OFFER').length
    const activeApplications = applications.filter((application) => ['PLANNED', 'APPLIED', 'ONLINE_ASSESSMENT', 'INTERVIEW'].includes(application.status)).length
    const interviews = applications.filter((application) => application.status === 'INTERVIEW').length
    const offers = applications.filter((application) => application.status === 'OFFER').length
    const today = getTodayDate()
    const upcomingDeadlines = opportunities.filter((opportunity) => {
      if (!opportunity.applicationDeadline) return false
      const diffDays = compareDeadlineDays(opportunity.applicationDeadline, today)
      return diffDays >= 0 && diffDays <= 14
    }).length

    return {
      totalOpportunities: opportunities.length,
      eligibleOpportunities,
      unknownEligibility,
      appliedCount,
      activeApplications,
      interviews,
      offers,
      upcomingDeadlines,
    }
  },

  getOpportunityApplication(opportunityId: string, applications: Application[]) {
    return applications.find((application) => application.opportunityId === opportunityId) ?? null
  },

  getDeadlineStatus(deadline?: string): 'UPCOMING' | 'PASSED' | 'NONE' {
    if (!deadline) return 'NONE'
    const target = parseDateKey(deadline)
    const today = parseDateKey(getTodayDate())
    return target.getTime() >= today.getTime() ? 'UPCOMING' : 'PASSED'
  },

  formatDeadline(deadline?: string): string {
    if (!deadline) return 'No deadline'
    const date = parseDateKey(deadline)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  },
}

function compareDeadlineDays(deadline: string, todayKey: string): number {
  const deadlineDate = parseDateKey(deadline)
  const todayDate = parseDateKey(todayKey)
  const diffMs = deadlineDate.getTime() - todayDate.getTime()
  return Math.ceil(diffMs / 86400000)
}
