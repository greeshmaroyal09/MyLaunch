import type { TaskDefinition, TaskProgressStatus } from './task'

export type CurriculumTrack = 'Primary' | 'AI / ML'
export type TaskProgressMap = Record<string, TaskProgressStatus>

export type TaskPrerequisite = {
  taskId: string
  relationship: 'required-before'
}

export type CurriculumTask = TaskDefinition & {
  prerequisiteRelationships: TaskPrerequisite[]
  topicId: string
}

export type Topic = {
  id: string
  title: string
  description: string
  order: number
  tasks: CurriculumTask[]
}

export type Module = {
  id: string
  title: string
  order: number
  topics: Topic[]
}

export type Subject = {
  id: string
  name: string
  track: CurriculumTrack
  order: number
  modules: Module[]
}

export type Curriculum = {
  id: string
  title: string
  subjects: Subject[]
}

export type CurriculumProgress = {
  progressByTaskId: TaskProgressMap
  completedTaskCount: number
  totalTaskCount: number
  completionPercent: number
}
