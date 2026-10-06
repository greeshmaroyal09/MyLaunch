export type ApplicationStatus =
  | 'SAVED'
  | 'PLANNED'
  | 'APPLIED'
  | 'ONLINE_ASSESSMENT'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED'

export type Application = {
  id: string
  opportunityId: string
  appliedDate?: string
  status: ApplicationStatus
  currentStage: string
  notes?: string
  nextActionDate?: string
  lastUpdated: string
  createdAt: string
  updatedAt: string
}
