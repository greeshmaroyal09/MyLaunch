export type TaskType = 'Learn' | 'Practice' | 'Revision' | 'Problem Solving' | 'Project Work'
export type TaskStatus = 'Pending' | 'Completed' | 'Skipped'
export type TaskProgressStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED'
export type SkipType = 'EXCUSED' | 'UNEXCUSED'

export type ResourcePlatform = 'LeetCode' | 'HackerRank' | 'CodeChef' | 'Official Documentation' | 'GeeksforGeeks' | 'MDN' | 'Java Documentation' | 'Python Documentation' | 'SQL reference/practice' | 'Other reputable source' | 'Platform' | 'Guide' | 'Video' | 'Documentation'
export type PracticeResourceType = ResourcePlatform
export type ResourceUsage = 'LEARN' | 'PRACTICE' | 'REFERENCE'
export type ResourceCategory = 'Tutorial' | 'Documentation' | 'Problem Set' | 'Practice Problem' | 'Reference' | 'Article' | 'Course/Guide'

export type PracticeResource = {
  id?: string
  title: string
  platform: ResourcePlatform
  type?: PracticeResourceType
  resourceType: ResourceCategory
  usage: ResourceUsage
  url: string
  difficulty?: string
  subject?: string
  topic?: string
  relatedTaskIds?: string[]
  description?: string
}

export type TaskDefinition = {
  id: string
  title: string
  subject: string
  topic?: string
  type: TaskType
  description: string
  estimatedMinutes: number
  priority: number
  required: boolean
  dueOffsetDays: number
  prerequisiteTaskIds: string[]
  pairedTaskId?: string
  legacyTaskIds?: string[]
  plannedDate?: string
  practiceResources?: PracticeResource[]
}

export type ScheduledTask = Omit<TaskDefinition, 'dueOffsetDays'> & {
  status: TaskStatus
  progressStatus: TaskProgressStatus
  dueDate: string
  skipType?: SkipType
  skipReason?: string
}
