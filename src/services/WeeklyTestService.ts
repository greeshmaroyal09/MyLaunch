import { questionBank } from '../data/questionBank'
import type { CalendarConfiguration, CalendarDate, LeaveRecord } from '../domain/calendar'
import type { ProgressEvent } from '../domain/progress'
import type { WeeklyTest, WeeklyTestResult, WeeklyTestStatus, WeekModel } from '../domain/weeklyTest'
import { CalendarService } from './CalendarService'
import { addDays, compareDates } from './DateService'
import { selectWeeklyQuestions } from './ReviewSelectionService'
import { getWeekModel } from './WeekService'

const weeklyTestReward = 25
const bankById = new Map(questionBank.map((question) => [question.id, question]))

export type WeeklyTestContext = {
  date: CalendarDate
  events: ProgressEvent[]
  calendarConfiguration: CalendarConfiguration
  leaveRecords: LeaveRecord[]
  tests: WeeklyTest[]
}

export const WeeklyTestService = {
  refreshStatuses(tests: WeeklyTest[], date: CalendarDate): WeeklyTest[] {
    return tests.map((test) => updateMissedStatus(test, date))
  },

  getWeek(date: CalendarDate, events: ProgressEvent[], calendar: CalendarConfiguration): WeekModel {
    return getWeekModel(date, events, calendar)
  },

  getTest(context: WeeklyTestContext): WeeklyTest {
    const week = getWeekModel(context.date, context.events, context.calendarConfiguration, context.leaveRecords)
    const existing = context.tests.find((test) => test.weekStartDate === week.startDate)
    if (existing) return updateMissedStatus(existing, context.date)
    const scheduledDate = resolveScheduledDate(week.weeklyTestDate, context.calendarConfiguration, context.leaveRecords)
    if (compareDates(context.date, week.weeklyTestDate) < 0) return emptyTest(week, scheduledDate, 'NOT_AVAILABLE')
    const selected = selectWeeklyQuestions(week, context.events)
    if (selected.length === 0 || week.completedTaskIds.length === 0) return emptyTest(week, scheduledDate, 'NOT_AVAILABLE')
    return buildTest(week, scheduledDate, selected, context.date)
  },

  ensureTest(context: WeeklyTestContext): WeeklyTest[] {
    const week = getWeekModel(context.date, context.events, context.calendarConfiguration, context.leaveRecords)
    const existing = context.tests.find((test) => test.weekStartDate === week.startDate)
    if (existing) {
      const updated = updateMissedStatus(existing, context.date)
      return updated === existing ? context.tests : replaceTest(context.tests, updated)
    }
    const test = this.getTest(context)
    if (test.status === 'NOT_AVAILABLE') return context.tests
    return [...context.tests, test].sort((left, right) => left.weekStartDate.localeCompare(right.weekStartDate))
  },

  startTest(tests: WeeklyTest[], testId: string, date: CalendarDate): WeeklyTest[] {
    const test = tests.find((item) => item.id === testId)
    if (!test || test.status === 'COMPLETED' || compareDates(date, test.scheduledDate) < 0) return tests
    const updated = { ...test, status: 'IN_PROGRESS' as const }
    return replaceTest(tests, updated)
  },

  answerQuestion(tests: WeeklyTest[], testId: string, questionId: string, answerId: string): WeeklyTest[] {
    const test = tests.find((item) => item.id === testId)
    const question = bankById.get(questionId)
    if (!test || test.status !== 'IN_PROGRESS' || !test.questionIds.includes(questionId)) return tests
    if (!question?.options.some((option) => option.id === answerId)) return tests
    return replaceTest(tests, { ...test, answers: { ...test.answers, [questionId]: answerId } })
  },

  postponeTest(
    tests: WeeklyTest[],
    testId: string,
    newDate: CalendarDate,
    today: CalendarDate,
    calendar: CalendarConfiguration,
    leaves: LeaveRecord[],
  ): WeeklyTest[] {
    const test = tests.find((item) => item.id === testId)
    if (!test || test.status === 'COMPLETED' || compareDates(newDate, today) <= 0) return tests
    if (CalendarService.getStatus(newDate, calendar, leaves) !== 'LEARNING_DAY') return tests
    return replaceTest(tests, {
      ...test,
      status: 'POSTPONED',
      scheduledDate: newDate,
      postponedAt: today,
    })
  },

  submitTest(tests: WeeklyTest[], testId: string, submittedAt: CalendarDate): { tests: WeeklyTest[]; completed?: WeeklyTest } {
    const test = tests.find((item) => item.id === testId)
    if (!test || test.status !== 'IN_PROGRESS' || test.result || test.questionIds.length === 0) return { tests }
    if (test.questionIds.some((questionId) => !test.answers[questionId])) return { tests }
    const result = calculateResult(test, submittedAt)
    const completed: WeeklyTest = { ...test, status: 'COMPLETED', result }
    return { tests: replaceTest(tests, completed), completed }
  },

  getResult(test: WeeklyTest): WeeklyTestResult | undefined {
    return test.result
  },

  rewardEvent(test: WeeklyTest, date: CalendarDate): ProgressEvent {
    return {
      id: `weekly-test:${test.id}`,
      taskId: test.id,
      date,
      type: 'WEEKLY_TEST_COMPLETED',
      pointsDelta: weeklyTestReward,
      xpDelta: weeklyTestReward,
    }
  },

  getQuestions(test: WeeklyTest) {
    return test.questionIds.map((id) => bankById.get(id)).filter((question) => question !== undefined)
  },

  getQuestionCategory(test: WeeklyTest, questionId: string) {
    return test.questionCategories[questionId]
  },
}

function resolveScheduledDate(sunday: CalendarDate, calendar: CalendarConfiguration, leaves: LeaveRecord[]): CalendarDate {
  if (CalendarService.getStatus(sunday, calendar, leaves) === 'LEARNING_DAY') return sunday
  return CalendarService.nextLearningDate(addDays(sunday, 1), calendar, leaves)
}

function buildTest(
  week: WeekModel,
  scheduledDate: CalendarDate,
  selected: ReturnType<typeof selectWeeklyQuestions>,
  generatedDate: CalendarDate,
): WeeklyTest {
  return {
    id: `weekly-test:${week.id}`,
    weekStartDate: week.startDate,
    weekEndDate: week.endDate,
    scheduledDate,
    originalScheduledDate: scheduledDate,
    status: compareDates(generatedDate, scheduledDate) < 0 ? 'NOT_AVAILABLE' : 'AVAILABLE',
    questionIds: selected.map((entry) => entry.question.id),
    questionCategories: Object.fromEntries(selected.map((entry) => [entry.question.id, entry.category])),
    answers: {},
    createdAt: `${week.weeklyTestDate}T00:00:00`,
  }
}

function emptyTest(week: WeekModel, scheduledDate: CalendarDate, status: WeeklyTestStatus): WeeklyTest {
  return {
    id: `weekly-test:${week.id}`,
    weekStartDate: week.startDate,
    weekEndDate: week.endDate,
    scheduledDate,
    originalScheduledDate: scheduledDate,
    status,
    questionIds: [],
    questionCategories: {},
    answers: {},
    createdAt: '',
  }
}

function updateMissedStatus(test: WeeklyTest, date: CalendarDate): WeeklyTest {
  if (test.status === 'NOT_AVAILABLE' && test.questionIds.length > 0) {
    if (compareDates(date, test.scheduledDate) > 0) return { ...test, status: 'MISSED' }
    if (compareDates(date, test.scheduledDate) === 0) return { ...test, status: 'AVAILABLE' }
  }
  if ((test.status === 'AVAILABLE' || test.status === 'POSTPONED') && compareDates(date, test.scheduledDate) > 0) {
    return { ...test, status: 'MISSED' }
  }
  return test
}

function calculateResult(test: WeeklyTest, submittedAt: CalendarDate): WeeklyTestResult {
  let correctCount = 0
  let currentWeekCorrect = 0
  let currentWeekTotal = 0
  let reviewCorrect = 0
  let reviewTotal = 0
  const topicsNeedingReview: string[] = []

  for (const questionId of test.questionIds) {
    const question = bankById.get(questionId)
    if (!question) continue
    const correct = test.answers[questionId] === question.correctAnswerId
    const category = test.questionCategories[questionId]
    if (category === 'CURRENT_WEEK') {
      currentWeekTotal += 1
      if (correct) currentWeekCorrect += 1
    } else {
      reviewTotal += 1
      if (correct) reviewCorrect += 1
    }
    if (correct) correctCount += 1
    else topicsNeedingReview.push(question.sourceTopic)
  }

  const totalQuestions = test.questionIds.length
  return {
    score: correctCount,
    totalQuestions,
    correctCount,
    incorrectCount: totalQuestions - correctCount,
    percentage: totalQuestions === 0 ? 0 : Math.round(correctCount / totalQuestions * 100),
    currentWeekCorrect,
    currentWeekTotal,
    reviewCorrect,
    reviewTotal,
    topicsNeedingReview: [...new Set(topicsNeedingReview)],
    submittedAt,
  }
}

function replaceTest(tests: WeeklyTest[], updated: WeeklyTest): WeeklyTest[] {
  const found = tests.some((test) => test.id === updated.id)
  if (!found) return [...tests, updated].sort((left, right) => left.weekStartDate.localeCompare(right.weekStartDate))
  return tests.map((test) => test.id === updated.id ? updated : test)
}
