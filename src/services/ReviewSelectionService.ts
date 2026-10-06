import { questionBank } from '../data/questionBank'
import type { ProgressEvent } from '../domain/progress'
import type { Question, WeeklyQuestionCategory, WeekModel } from '../domain/weeklyTest'
import { getOlderReviewTaskIds, getRecentReviewTaskIds } from './WeekService'

export type SelectedWeeklyQuestion = {
  question: Question
  category: WeeklyQuestionCategory
}

const questionLimit = 10

export function selectWeeklyQuestions(week: WeekModel, events: ProgressEvent[]): SelectedWeeklyQuestion[] {
  const currentTaskIds = new Set(week.completedTaskIds)
  if (currentTaskIds.size === 0) return []
  const recentTaskIds = new Set(getRecentReviewTaskIds(week, events))
  const olderTaskIds = new Set(getOlderReviewTaskIds(week, events))
  const current = questionBank.filter((question) => currentTaskIds.has(question.taskId))
  const recent = questionBank.filter((question) => recentTaskIds.has(question.taskId) && !currentTaskIds.has(question.taskId))
  const older = questionBank.filter((question) => olderTaskIds.has(question.taskId)
    && !currentTaskIds.has(question.taskId)
    && !recentTaskIds.has(question.taskId))
  const availableCount = current.length + recent.length + older.length
  const targetCount = Math.min(questionLimit, availableCount)
  if (targetCount === 0) return []

  const currentTarget = Math.floor(targetCount * 0.6)
  const recentTarget = Math.floor(targetCount * 0.3)
  const targets: Record<WeeklyQuestionCategory, number> = {
    CURRENT_WEEK: currentTarget,
    RECENT_REVIEW: recentTarget,
    CUMULATIVE_REVIEW: targetCount - currentTarget - recentTarget,
  }
  const pools: Record<WeeklyQuestionCategory, Question[]> = {
    CURRENT_WEEK: current,
    RECENT_REVIEW: recent,
    CUMULATIVE_REVIEW: older,
  }
  const selected: SelectedWeeklyQuestion[] = []
  const selectedIds = new Set<string>()

  for (const category of ['CURRENT_WEEK', 'RECENT_REVIEW', 'CUMULATIVE_REVIEW'] as const) {
    takeFromPool(category, targets[category], pools[category], selected, selectedIds)
  }

  const fillOrder: WeeklyQuestionCategory[] = ['CURRENT_WEEK', 'RECENT_REVIEW', 'CUMULATIVE_REVIEW']
  while (selected.length < targetCount) {
    let added = false
    for (const category of fillOrder) {
      const remaining = pools[category].find((question) => !selectedIds.has(question.id))
      if (!remaining) continue
      selected.push({ question: remaining, category })
      selectedIds.add(remaining.id)
      added = true
      if (selected.length === targetCount) break
    }
    if (!added) break
  }

  return selected
}

function takeFromPool(
  category: WeeklyQuestionCategory,
  count: number,
  pool: Question[],
  selected: SelectedWeeklyQuestion[],
  selectedIds: Set<string>,
): void {
  for (const question of pool) {
    if (selected.filter((entry) => entry.category === category).length >= count) return
    if (selectedIds.has(question.id)) continue
    selected.push({ question, category })
    selectedIds.add(question.id)
  }
}
