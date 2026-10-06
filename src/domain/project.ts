export type ProjectCategory = 'SDE / Backend' | 'DSA / Systems' | 'AI / ML' | 'Data' | 'Full Stack' | 'Cloud / DevOps' | 'Academic / Research' | 'Other'
export type ProjectStatus = 'IDEA' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED'
export type ProjectDifficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type ProjectTaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
export type ProjectMilestoneStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED'

export type ProjectTask = {
  id: string
  projectId: string
  title: string
  description: string
  estimatedMinutes: number
  status: ProjectTaskStatus
  order: number
  milestoneId?: string
}

export type ProjectMilestone = {
  id: string
  projectId: string
  title: string
  description: string
  order: number
  status: ProjectMilestoneStatus
  taskIds: string[]
}

export type ProjectReadiness = {
  implementationComplete: boolean
  repositoryAvailable: boolean
  readmeAvailable: boolean
  deploymentAvailable: boolean
  documentationComplete: boolean
  resumeReady: boolean
  portfolioReady: boolean
}

export type Project = {
  id: string
  title: string
  description: string
  category: ProjectCategory
  difficulty: ProjectDifficulty
  status: ProjectStatus
  techStack: string[]
  startDate: string
  targetCompletionDate?: string
  progress: number
  associatedSubjects: string[]
  tasks: ProjectTask[]
  milestones: ProjectMilestone[]
  repositoryUrl?: string
  deploymentUrl?: string
  demoUrl?: string
  readmeStatus: boolean
  documentationStatus: boolean
  resumeReady: boolean
  createdAt: string
  updatedAt: string
  portfolioReadiness: ProjectReadiness
}
