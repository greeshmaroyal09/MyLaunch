import type { CalendarDate } from './calendar'

export type QuestionType = 'MULTIPLE_CHOICE'
export type QuestionDifficulty = 'FOUNDATION' | 'CORE' | 'CHALLENGE'
export type WeeklyTestStatus = 'NOT_AVAILABLE' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'POSTPONED' | 'MISSED'
export type WeeklyQuestionCategory = 'CURRENT_WEEK' | 'RECENT_REVIEW' | 'CUMULATIVE_REVIEW'

export type QuestionOption = {
  id: string
  text: string
}

export type Question = {
  id: string
  taskId: string
  topicId: string
  subject: string
  sourceTopic: string
  text: string
  type: QuestionType
  options: QuestionOption[]
  correctAnswerId: string
  explanation: string
  difficulty: QuestionDifficulty
}

export type WeekModel = {
  id: string
  startDate: CalendarDate
  endDate: CalendarDate
  weeklyTestDate: CalendarDate
  learningDates: CalendarDate[]
  completedTaskIds: string[]
  skippedTaskIds: string[]
  eligibleReviewTaskIds: string[]
}

export type WeeklyTestResult = {
  score: number
  totalQuestions: number
  correctCount: number
  incorrectCount: number
  percentage: number
  currentWeekCorrect: number
  currentWeekTotal: number
  reviewCorrect: number
  reviewTotal: number
  topicsNeedingReview: string[]
  submittedAt: string
}

export type WeeklyTest = {
  id: string
  weekStartDate: CalendarDate
  weekEndDate: CalendarDate
  scheduledDate: CalendarDate
  originalScheduledDate: CalendarDate
  status: WeeklyTestStatus
  questionIds: string[]
  questionCategories: Record<string, WeeklyQuestionCategory>
  answers: Record<string, string>
  result?: WeeklyTestResult
  createdAt: string
  postponedAt?: string
}
