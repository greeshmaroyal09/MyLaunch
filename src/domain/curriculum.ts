import type { TaskDefinition, TaskProgressStatus } from './task'

export type CurriculumTrack = 'Primary' | 'Secondary'
export type CurriculumLane = 'Shared foundation' | 'Generative AI' | 'Voice AI' | 'Secondary Java'
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
  lane: CurriculumLane
  roadmapOrder: number
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
