import type { Application, ApplicationStatus } from '../domain/application'

export type CreateApplicationInput = {
  opportunityId: string
  appliedDate?: string
  status?: ApplicationStatus
  currentStage?: string
  notes?: string
  nextActionDate?: string
}

export const ApplicationService = {
  createApplication(input: CreateApplicationInput): Application {
    if (!input.opportunityId) throw new Error('Opportunity is required.')

    const now = new Date().toISOString()
    return {
      id: `application-${now}-${Math.abs(Math.random())}`,
      opportunityId: input.opportunityId,
      appliedDate: input.appliedDate?.trim() || undefined,
      status: input.status ?? 'SAVED',
      currentStage: input.currentStage?.trim() || 'New application',
      notes: input.notes?.trim() || undefined,
      nextActionDate: input.nextActionDate?.trim() || undefined,
      lastUpdated: now,
      createdAt: now,
      updatedAt: now,
    }
  },

  updateApplication(application: Application, updates: Partial<Application>): Application {
    return {
      ...application,
      ...updates,
      lastUpdated: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
}
