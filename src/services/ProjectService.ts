import type { Project, ProjectCategory, ProjectDifficulty, ProjectMilestone, ProjectMilestoneStatus, ProjectStatus, ProjectTask, ProjectTaskStatus } from '../domain/project'

const urlPattern = /^https?:\/\//i

export type ProjectCreateInput = {
  title: string
  description: string
  category: ProjectCategory
  difficulty: ProjectDifficulty
  techStack?: string[]
  targetCompletionDate?: string
  repositoryUrl?: string
  deploymentUrl?: string
  demoUrl?: string
}

export type ProjectTaskInput = {
  title: string
  description?: string
  estimatedMinutes?: number
  status?: ProjectTaskStatus
  milestoneId?: string
}

export type ProjectMilestoneInput = {
  title: string
  description?: string
  status?: ProjectMilestoneStatus
}

export const ProjectService = {
  createProject(input: ProjectCreateInput): Project {
    const title = input.title.trim()
    const description = input.description.trim()
    if (!title) throw new Error('Project title is required.')
    if (!description) throw new Error('Project description is required.')

    const now = new Date().toISOString()
    const project: Project = {
      id: `project-${now}-${Math.abs(Math.random())}`,
      title,
      description,
      category: input.category,
      difficulty: input.difficulty,
      status: 'IDEA',
      techStack: normalizeList(input.techStack),
      startDate: new Date().toISOString().slice(0, 10),
      targetCompletionDate: input.targetCompletionDate?.trim() || undefined,
      progress: 0,
      associatedSubjects: [],
      tasks: [],
      milestones: [],
      repositoryUrl: normalizeUrl(input.repositoryUrl),
      deploymentUrl: normalizeUrl(input.deploymentUrl),
      demoUrl: normalizeUrl(input.demoUrl),
      readmeStatus: false,
      documentationStatus: false,
      resumeReady: false,
      createdAt: now,
      updatedAt: now,
      portfolioReadiness: {
        implementationComplete: false,
        repositoryAvailable: false,
        readmeAvailable: false,
        deploymentAvailable: false,
        documentationComplete: false,
        resumeReady: false,
        portfolioReady: false,
      },
    }

    return this.ensureProject(project)
  },

  ensureProject(project: Project): Project {
    const tasks = sortProjectTasks((project.tasks ?? []).map((task) => ({
      ...task,
      projectId: project.id,
    })))
    const milestones = sortProjectMilestones((project.milestones ?? []).map((milestone) => ({
      ...milestone,
      projectId: project.id,
      taskIds: [...new Set((milestone.taskIds ?? []).filter(Boolean))],
    })))
    const progress = calculateProjectProgress(tasks)
    const status = deriveProjectStatus(project.status, tasks)
    const portfolioReadiness = calculatePortfolioReadiness({ ...project, tasks, milestones, progress, status })
    return {
      ...project,
      tasks,
      milestones,
      status,
      progress,
      portfolioReadiness,
      updatedAt: new Date().toISOString(),
    }
  },

  updateProject(project: Project, updates: Partial<Project>): Project {
    return this.ensureProject({ ...project, ...updates, updatedAt: new Date().toISOString() })
  },

  addProjectTask(project: Project, input: ProjectTaskInput): Project {
    const title = input.title.trim()
    if (!title) throw new Error('Project task title is required.')
    const task: ProjectTask = {
      id: `task-${project.id}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      projectId: project.id,
      title,
      description: input.description?.trim() ?? '',
      estimatedMinutes: Number(input.estimatedMinutes ?? 30),
      status: input.status ?? 'TODO',
      order: project.tasks.length,
      milestoneId: input.milestoneId,
    }
    const nextProject = this.ensureProject({
      ...project,
      tasks: [...project.tasks, task],
      updatedAt: new Date().toISOString(),
    })
    return this.syncMilestonesWithTask(nextProject)
  },

  updateProjectTask(project: Project, taskId: string, updates: Partial<ProjectTask>): Project {
    const nextTasks = project.tasks.map((task) => task.id === taskId ? { ...task, ...updates, projectId: project.id } : task)
    const nextProject = this.ensureProject({ ...project, tasks: nextTasks, updatedAt: new Date().toISOString() })
    return this.syncMilestonesWithTask(nextProject)
  },

  deleteProjectTask(project: Project, taskId: string): Project {
    const nextProject = this.ensureProject({
      ...project,
      tasks: project.tasks.filter((task) => task.id !== taskId),
      milestones: project.milestones.map((milestone) => ({
        ...milestone,
        taskIds: milestone.taskIds.filter((id) => id !== taskId),
      })),
      updatedAt: new Date().toISOString(),
    })
    return this.syncMilestonesWithTask(nextProject)
  },

  addMilestone(project: Project, input: ProjectMilestoneInput): Project {
    const title = input.title.trim()
    if (!title) throw new Error('Milestone title is required.')

    const milestone: ProjectMilestone = {
      id: `milestone-${project.id}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      projectId: project.id,
      title,
      description: input.description?.trim() ?? '',
      order: project.milestones.length,
      status: input.status ?? 'PLANNED',
      taskIds: [],
    }
    return this.ensureProject({
      ...project,
      milestones: [...project.milestones, milestone],
      updatedAt: new Date().toISOString(),
    })
  },

  updateMilestone(project: Project, milestoneId: string, updates: Partial<ProjectMilestone>): Project {
    const nextProject = this.ensureProject({
      ...project,
      milestones: project.milestones.map((item) => item.id === milestoneId ? { ...item, ...updates, projectId: project.id } : item),
      updatedAt: new Date().toISOString(),
    })
    return this.syncMilestonesWithTask(nextProject)
  },

  deleteMilestone(project: Project, milestoneId: string): Project {
    const nextProject = this.ensureProject({
      ...project,
      milestones: project.milestones.filter((milestone) => milestone.id !== milestoneId),
      tasks: project.tasks.map((task) => task.milestoneId === milestoneId ? { ...task, milestoneId: undefined } : task),
      updatedAt: new Date().toISOString(),
    })
    return this.syncMilestonesWithTask(nextProject)
  },

  getPortfolioReadiness(project: Project): Project['portfolioReadiness'] {
    return calculatePortfolioReadiness(project)
  },

  syncMilestonesWithTask(project: Project): Project {
    const nextMilestones = project.milestones.map((milestone) => {
      const taskIds = milestone.taskIds.filter((taskId) => project.tasks.some((task) => task.id === taskId))
      const milestoneStatus = deriveMilestoneStatus(taskIds, project.tasks)
      return { ...milestone, taskIds, status: milestoneStatus }
    })

    return {
      ...project,
      milestones: sortProjectMilestones(nextMilestones),
    }
  },

  calculateProgress(tasks: ProjectTask[]): number {
    return calculateProjectProgress(tasks)
  },

  validateUrl(value?: string): string | undefined {
    return normalizeUrl(value)
  },
}

function sortProjectTasks(tasks: ProjectTask[]): ProjectTask[] {
  return [...tasks].sort((left, right) => left.order - right.order || left.title.localeCompare(right.title))
}

function sortProjectMilestones(milestones: ProjectMilestone[]): ProjectMilestone[] {
  return [...milestones].sort((left, right) => left.order - right.order || left.title.localeCompare(right.title))
}

function calculateProjectProgress(tasks: ProjectTask[]): number {
  if (!tasks.length) return 0
  const completed = tasks.filter((task) => task.status === 'COMPLETED').length
  return Math.round(completed / tasks.length * 100)
}

function deriveProjectStatus(status: ProjectStatus, tasks: ProjectTask[]): ProjectStatus {
  if (!tasks.length) return status === 'ARCHIVED' ? 'ARCHIVED' : 'PLANNED'
  const completed = tasks.filter((task) => task.status === 'COMPLETED').length
  if (completed === tasks.length) return 'COMPLETED'
  if (completed > 0) return 'IN_PROGRESS'
  if (status === 'ARCHIVED') return 'ARCHIVED'
  return 'PLANNED'
}

function calculatePortfolioReadiness(project: Project): Project['portfolioReadiness'] {
  const total = project.tasks.length
  const completed = project.tasks.filter((task) => task.status === 'COMPLETED').length
  const implementationComplete = total > 0 && completed === total
  const repositoryAvailable = Boolean(project.repositoryUrl && urlPattern.test(project.repositoryUrl))
  const readmeAvailable = Boolean(project.readmeStatus)
  const deploymentAvailable = Boolean(project.deploymentUrl && urlPattern.test(project.deploymentUrl)) || Boolean(project.demoUrl && urlPattern.test(project.demoUrl))
  const documentationComplete = Boolean(project.documentationStatus)
  const resumeReady = Boolean(project.resumeReady)
  const portfolioReady = implementationComplete && repositoryAvailable && readmeAvailable && documentationComplete && resumeReady

  return {
    implementationComplete,
    repositoryAvailable,
    readmeAvailable,
    deploymentAvailable,
    documentationComplete,
    resumeReady,
    portfolioReady,
  }
}

function normalizeUrl(value?: string): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return urlPattern.test(trimmed) ? trimmed : undefined
}

function normalizeList(value?: string[]): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((entry) => entry.trim()).filter(Boolean))]
}

function deriveMilestoneStatus(taskIds: string[], tasks: ProjectTask[]): ProjectMilestoneStatus {
  if (!taskIds.length) return 'PLANNED'
  const milestoneTasks = tasks.filter((task) => taskIds.includes(task.id))
  if (milestoneTasks.every((task) => task.status === 'COMPLETED')) return 'COMPLETED'
  if (milestoneTasks.some((task) => task.status === 'IN_PROGRESS' || task.status === 'COMPLETED')) return 'IN_PROGRESS'
  return 'PLANNED'
}
