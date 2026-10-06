export type OpportunityType = 'INTERNSHIP' | 'FULL_TIME' | 'OFF_CAMPUS' | 'CAMPUS' | 'OTHER'
export type WorkMode = 'REMOTE' | 'HYBRID' | 'ON_SITE' | 'UNSPECIFIED'
export type OpportunitySource = 'Company Careers' | 'LinkedIn' | 'Unstop' | 'Referral' | 'College' | 'Job Portal' | 'Other'
export type OpportunityStatus = 'OPEN' | 'CLOSED' | 'DRAFT'

export type OpportunityEligibility = {
  eligibleGraduationYears?: number[]
  minimumGraduationYear?: number
  maximumGraduationYear?: number
  batchText?: string
  minimumCGPA?: number
  degreeRequirements?: string[]
  branchRequirements?: string[]
  experienceRequirements?: string[]
}

export type Opportunity = {
  id: string
  companyId: string
  companyName: string
  roleTitle: string
  opportunityType: OpportunityType
  location?: string
  workMode: WorkMode
  source: OpportunitySource
  applicationUrl?: string
  companyUrl?: string
  description?: string
  requiredSkills: string[]
  preferredSkills: string[]
  eligibility: OpportunityEligibility
  applicationOpeningDate?: string
  applicationDeadline?: string
  status: OpportunityStatus
  notes?: string
  projectIds: string[]
  createdAt: string
  updatedAt: string
}
