import { addDays, compareDates, nextDay } from './DateService'

export type StreakSummary = {
  currentStreak: number
  longestStreak: number
}

export type IsLearningDate = (date: string) => boolean

export function calculateStreaks(
  qualifyingDates: string[],
  asOfDate: string,
  isLearningDate: IsLearningDate = () => true,
): StreakSummary {
  const dates = [...new Set(qualifyingDates)].sort()
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 }

  const qualifying = new Set(dates)
  let longestStreak = 1
  let runLength = 1
  for (let index = 1; index < dates.length; index += 1) {
    if (noMissedLearningDays(dates[index - 1], dates[index], qualifying, isLearningDate)) runLength += 1
    else runLength = 1
    longestStreak = Math.max(longestStreak, runLength)
  }

  const lastDate = dates.at(-1)!
  if (compareDates(lastDate, asOfDate) > 0) return { currentStreak: 0, longestStreak }
  let currentStreak = 1
  for (let cursor = nextDay(lastDate); compareDates(cursor, asOfDate) < 0; cursor = addDays(cursor, 1)) {
    if (isLearningDate(cursor) && !qualifying.has(cursor)) {
      currentStreak = 0
      break
    }
  }

  if (currentStreak > 0) {
    for (let index = dates.length - 1; index > 0; index -= 1) {
      if (!noMissedLearningDays(dates[index - 1], dates[index], qualifying, isLearningDate)) break
      currentStreak += 1
    }
  }

  return { currentStreak, longestStreak }
}

function noMissedLearningDays(start: string, end: string, qualifying: Set<string>, isLearningDate: IsLearningDate): boolean {
  for (let cursor = nextDay(start); compareDates(cursor, end) < 0; cursor = addDays(cursor, 1)) {
    if (isLearningDate(cursor) && !qualifying.has(cursor)) return false
  }
  return true
}
