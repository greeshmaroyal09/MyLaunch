import type { TaskProgressMap } from './curriculum'

export type SkipType = 'EXCUSED' | 'UNEXCUSED'

export type ProgressEventType = 'TASK_COMPLETED' | 'TASK_SKIPPED' | 'WEEKLY_TEST_COMPLETED'

export type ProgressEvent = {
  id: string
  taskId: string
  date: string
  plannedDate?: string
  type: ProgressEventType
  pointsDelta: number
  xpDelta: number
  skipType?: SkipType
  reason?: string
}

export type ProgressState = {
  taskProgress: TaskProgressMap
  events: ProgressEvent[]
  qualifyingDates: string[]
}

export type LevelProgress = {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
  nextLevelXP: number | null
  progressPercent: number
}

export type ProgressSummary = {
  totalPoints: number
  totalXP: number
  currentLevel: LevelProgress
  currentStreak: number
  longestStreak: number
  completedTaskIds: string[]
  skippedTaskIds: string[]
  completedTaskCount: number
  totalTaskCount: number
  curriculumCompletionPercent: number
}
