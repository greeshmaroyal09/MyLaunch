import type { Company } from '../domain/company'
import type { Opportunity, OpportunitySource, OpportunityStatus, OpportunityType, WorkMode } from '../domain/opportunity'

export type CreateOpportunityInput = {
  companyId: string
  companyName?: string
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
  applicationOpeningDate?: string
  applicationDeadline?: string
  status?: OpportunityStatus
  notes?: string
  projectIds?: string[]
}

export const OpportunityService = {
  createOpportunity(input: CreateOpportunityInput, company?: Company): Opportunity {
    const roleTitle = input.roleTitle.trim()
    if (!roleTitle) throw new Error('Role title is required.')
    if (!input.companyId && !company) throw new Error('Company is required.')

    const now = new Date().toISOString()
    const companyName = (input.companyName ?? company?.name ?? '').trim()
    if (!companyName) throw new Error('Company name is required.')

    return this.ensureOpportunity({
      id: `opportunity-${now}-${Math.abs(Math.random())}`,
      companyId: input.companyId || company!.id,
      companyName,
      roleTitle,
      opportunityType: input.opportunityType,
      location: input.location?.trim() || undefined,
      workMode: input.workMode ?? 'UNSPECIFIED',
      source: input.source ?? 'Other',
      applicationUrl: normalizeOptionalUrl(input.applicationUrl),
      companyUrl: normalizeOptionalUrl(input.companyUrl),
      description: input.description?.trim() || undefined,
      requiredSkills: normalizeList(input.requiredSkills),
      preferredSkills: normalizeList(input.preferredSkills),
      eligibility: {
        eligibleGraduationYears: normalizeNumbers(input.eligibility?.eligibleGraduationYears),
        minimumGraduationYear: normalizeNumber(input.eligibility?.minimumGraduationYear),
        maximumGraduationYear: normalizeNumber(input.eligibility?.maximumGraduationYear),
        batchText: input.eligibility?.batchText?.trim() || undefined,
        minimumCGPA: normalizeNumber(input.eligibility?.minimumCGPA),
        degreeRequirements: normalizeList(input.eligibility?.degreeRequirements),
        branchRequirements: normalizeList(input.eligibility?.branchRequirements),
        experienceRequirements: normalizeList(input.eligibility?.experienceRequirements),
      },
      applicationOpeningDate: input.applicationOpeningDate?.trim() || undefined,
      applicationDeadline: input.applicationDeadline?.trim() || undefined,
      status: input.status ?? 'OPEN',
      notes: input.notes?.trim() || undefined,
      projectIds: normalizeList(input.projectIds),
      createdAt: now,
      updatedAt: now,
    })
  },

  ensureOpportunity(opportunity: Opportunity): Opportunity {
    return {
      ...opportunity,
      companyId: opportunity.companyId,
      companyName: opportunity.companyName.trim() || 'Unknown company',
      roleTitle: opportunity.roleTitle.trim(),
      requiredSkills: normalizeList(opportunity.requiredSkills),
      preferredSkills: normalizeList(opportunity.preferredSkills),
      projectIds: [...new Set((opportunity.projectIds ?? []).filter(Boolean))],
      eligibility: {
        eligibleGraduationYears: normalizeNumbers(opportunity.eligibility.eligibleGraduationYears),
        minimumGraduationYear: normalizeNumber(opportunity.eligibility.minimumGraduationYear),
        maximumGraduationYear: normalizeNumber(opportunity.eligibility.maximumGraduationYear),
        batchText: opportunity.eligibility.batchText?.trim() || undefined,
        minimumCGPA: normalizeNumber(opportunity.eligibility.minimumCGPA),
        degreeRequirements: normalizeList(opportunity.eligibility.degreeRequirements),
        branchRequirements: normalizeList(opportunity.eligibility.branchRequirements),
        experienceRequirements: normalizeList(opportunity.eligibility.experienceRequirements),
      },
      updatedAt: new Date().toISOString(),
    }
  },

  updateOpportunity(opportunity: Opportunity, updates: Partial<Opportunity>): Opportunity {
    return this.ensureOpportunity({
      ...opportunity,
      ...updates,
      updatedAt: new Date().toISOString(),
    })
  },
}

function normalizeList(values?: string[] | string): string[] {
  if (Array.isArray(values)) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
  }
  if (typeof values === 'string') {
    return values.split(',').map((value) => value.trim()).filter(Boolean)
  }
  return []
}

function normalizeOptionalUrl(value?: string): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function normalizeNumber(value?: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return value
}

function normalizeNumbers(values?: number[]): number[] {
  if (!Array.isArray(values)) return []
  return [...new Set(values.filter((value) => Number.isFinite(value)).map((value) => Number(value)))]
}
