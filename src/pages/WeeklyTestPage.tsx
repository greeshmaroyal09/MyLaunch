import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, ClipboardCheck } from 'lucide-react'
import type { CalendarConfiguration, CalendarDate, LeaveRecord } from '../domain/calendar'
import type { ProgressEvent } from '../domain/progress'
import type { WeeklyTest } from '../domain/weeklyTest'
import { CalendarService } from '../services/CalendarService'
import { compareDates, formatDate, nextDay } from '../services/DateService'
import { WeeklyTestService } from '../services/WeeklyTestService'
import '../components/weekly-test.css'

type WeeklyTestPageProps = {
  date: CalendarDate
  events: ProgressEvent[]
  tests: WeeklyTest[]
  calendarConfiguration: CalendarConfiguration
  leaveRecords: LeaveRecord[]
  onEnsure: (date: CalendarDate) => void
  onStart: (testId: string, date: CalendarDate) => void
  onAnswer: (testId: string, questionId: string, answerId: string) => void
  onPostpone: (testId: string, newDate: CalendarDate, today: CalendarDate) => void
  onSubmit: (testId: string, date: CalendarDate) => void
}

export function WeeklyTestPage({ date, events, tests, calendarConfiguration, leaveRecords, onEnsure, onStart, onAnswer, onPostpone, onSubmit }: WeeklyTestPageProps) {
  const preview = WeeklyTestService.getTest({ date, events, calendarConfiguration, leaveRecords, tests })
  const dueTest = tests
    .filter((test) => test.status !== 'COMPLETED' && compareDates(test.scheduledDate, date) <= 0)
    .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate))[0]
  const activeTest = dueTest ?? tests.find((test) => test.weekStartDate === preview.weekStartDate) ?? preview
  const questions = WeeklyTestService.getQuestions(activeTest)
  const canStart = (activeTest.status === 'AVAILABLE' || activeTest.status === 'POSTPONED' || activeTest.status === 'MISSED')
    && activeTest.questionIds.length > 0
    && compareDates(date, activeTest.scheduledDate) >= 0
  const canPostpone = activeTest.status === 'AVAILABLE' || activeTest.status === 'IN_PROGRESS' || activeTest.status === 'POSTPONED'
    || (activeTest.status === 'NOT_AVAILABLE' && activeTest.questionIds.length > 0)

  useEffect(() => {
    onEnsure(date)
  }, [date, onEnsure])

  return (
    <div className="weekly-test-page">
      <header className="weekly-test-page-heading">
        <div>
          <div className="welcome-kicker">WEEKLY ASSESSMENT</div>
          <h1>Weekly test</h1>
          <p>Questions come only from curriculum topics you have completed.</p>
        </div>
        <div className="weekly-test-week-badge"><CalendarDays size={16} aria-hidden="true" /><span>{formatDate(activeTest.weekStartDate, { month: 'short', day: 'numeric' })} – {formatDate(activeTest.weekEndDate, { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
      </header>

      {activeTest.status === 'NOT_AVAILABLE' && activeTest.questionIds.length === 0 ? (
        <section className="weekly-test-empty">
          <ClipboardCheck size={23} aria-hidden="true" />
          <h2>No weekly material yet</h2>
          <p>{compareDates(date, activeTest.scheduledDate) < 0
            ? `The test is scheduled for ${formatDate(activeTest.scheduledDate, { weekday: 'long', month: 'long', day: 'numeric' })}. It will use topics completed during this week and earlier review material.`
            : 'Complete curriculum topics during the week to build a relevant assessment. No unrelated questions are added.'}</p>
          <span>Current week · {formatDate(activeTest.weekStartDate, { month: 'long', day: 'numeric' })} to {formatDate(activeTest.weekEndDate, { month: 'long', day: 'numeric' })}</span>
        </section>
      ) : (
        <>
          <section className="weekly-test-overview">
            <div className="weekly-test-overview-main">
              <div className={`weekly-test-status weekly-test-status-${activeTest.status.toLowerCase()}`}><i />{statusLabel(activeTest.status)}</div>
              <h2>{activeTest.questionIds.length} question{activeTest.questionIds.length === 1 ? '' : 's'}</h2>
              <p>{activeTest.status === 'COMPLETED'
                ? `Submitted ${formatDate(activeTest.result?.submittedAt ?? date, { weekday: 'long', month: 'long', day: 'numeric' })}`
                : `${formatDate(activeTest.scheduledDate, { weekday: 'long', month: 'long', day: 'numeric' })} · 60% current week, 30% recent review, 10% cumulative review when material is available.`}</p>
              <div className="weekly-test-breakdown">
                <span><strong>{countCategory(activeTest, 'CURRENT_WEEK')}</strong> current-week</span>
                <span><strong>{countCategory(activeTest, 'RECENT_REVIEW')}</strong> recent review</span>
                <span><strong>{countCategory(activeTest, 'CUMULATIVE_REVIEW')}</strong> cumulative</span>
              </div>
            </div>
            {canStart && activeTest.status !== 'IN_PROGRESS' && (
              <button className="weekly-test-primary-action" type="button" onClick={() => onStart(activeTest.id, date)}>
                {activeTest.status === 'MISSED' ? 'Take missed test' : activeTest.status === 'POSTPONED' ? 'Resume test' : 'Start test'}
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            )}
          </section>

          {activeTest.status === 'NOT_AVAILABLE' && activeTest.questionIds.length > 0 && (
            <p className="weekly-test-notice">This test is set for {formatDate(activeTest.scheduledDate, { weekday: 'long', month: 'long', day: 'numeric' })}. It is not available to start yet.</p>
          )}

          {activeTest.status === 'IN_PROGRESS' && (
            <WeeklyQuestionPanel key={activeTest.id} test={activeTest} questions={questions} date={date} onAnswer={onAnswer} onSubmit={onSubmit} />
          )}

          {activeTest.status === 'COMPLETED' && activeTest.result && (
            <section className="weekly-result-panel" aria-labelledby="weekly-result-title">
              <div className="weekly-result-score"><strong>{activeTest.result.score}/{activeTest.result.totalQuestions}</strong><span>{activeTest.result.percentage}%</span></div>
              <div className="weekly-result-title"><div className="section-eyebrow">ASSESSMENT RESULT</div><h2 id="weekly-result-title">Weekly review complete</h2><p>{activeTest.result.correctCount} correct · {activeTest.result.incorrectCount} incorrect</p></div>
              <div className="weekly-result-split">
                <div><span>Current week</span><strong>{activeTest.result.currentWeekCorrect}/{activeTest.result.currentWeekTotal}</strong></div>
                <div><span>Review</span><strong>{activeTest.result.reviewCorrect}/{activeTest.result.reviewTotal}</strong></div>
              </div>
              <div className="weekly-review-topics"><strong>Topics to revisit</strong>{activeTest.result.topicsNeedingReview.length ? <ul>{activeTest.result.topicsNeedingReview.map((topic) => <li key={topic}>{topic}</li>)}</ul> : <p>No incorrect topics in this attempt.</p>}</div>
              <p className="weekly-reward-note">Assessment completion reward · +25 points · +25 XP</p>
            </section>
          )}

          {canPostpone && activeTest.status !== 'COMPLETED' && (
            <WeeklyPostponeForm key={activeTest.id} test={activeTest} date={date} calendarConfiguration={calendarConfiguration} leaveRecords={leaveRecords} onPostpone={onPostpone} />
          )}
        </>
      )}

      {tests.length > 1 && (
        <section className="weekly-test-history">
          <div className="section-eyebrow">PAST WEEKS</div>
          <h2>Assessment history</h2>
          {tests.filter((test) => test.id !== activeTest.id).slice().reverse().map((test) => (
            <div className="weekly-history-row" key={test.id}>
              <span>Week of {formatDate(test.weekStartDate, { month: 'short', day: 'numeric' })}</span>
              <strong>{test.result ? `${test.result.score}/${test.result.totalQuestions} · ${test.result.percentage}%` : statusLabel(test.status)}</strong>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

type WeeklyQuestionPanelProps = {
  test: WeeklyTest
  questions: ReturnType<typeof WeeklyTestService.getQuestions>
  date: CalendarDate
  onAnswer: (testId: string, questionId: string, answerId: string) => void
  onSubmit: (testId: string, date: CalendarDate) => void
}

function WeeklyQuestionPanel({ test, questions, date, onAnswer, onSubmit }: WeeklyQuestionPanelProps) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const currentQuestion = questions[questionIndex]
  const answeredCount = test.questionIds.filter((id) => Boolean(test.answers[id])).length

  if (!currentQuestion) return null

  return (
    <section className="weekly-question-panel" aria-labelledby="weekly-question-title">
      <div className="weekly-question-topline">
        <span>QUESTION {questionIndex + 1} OF {questions.length}</span>
        <span>{test.questionCategories[currentQuestion.id] === 'CURRENT_WEEK' ? 'CURRENT WEEK' : test.questionCategories[currentQuestion.id] === 'RECENT_REVIEW' ? 'RECENT REVIEW' : 'CUMULATIVE REVIEW'}</span>
      </div>
      <div className="weekly-question-progress"><span style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div>
      <div className="weekly-question-source">{currentQuestion.subject} · {currentQuestion.sourceTopic}</div>
      <h2 id="weekly-question-title">{currentQuestion.text}</h2>
      <fieldset className="weekly-answer-options">
        <legend>Select one answer</legend>
        {currentQuestion.options.map((option) => (
          <label className={test.answers[currentQuestion.id] === option.id ? 'is-selected' : ''} key={option.id}>
            <input type="radio" name={`answer-${currentQuestion.id}`} value={option.id} checked={test.answers[currentQuestion.id] === option.id} onChange={() => onAnswer(test.id, currentQuestion.id, option.id)} />
            <span>{option.text}</span>
          </label>
        ))}
      </fieldset>
      <div className="weekly-question-actions">
        <button type="button" className="weekly-test-secondary-action" disabled={questionIndex === 0} onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}><ArrowLeft size={14} />Previous</button>
        {questionIndex < questions.length - 1 ? (
          <button type="button" className="weekly-test-primary-action" onClick={() => setQuestionIndex((index) => Math.min(questions.length - 1, index + 1))}>Next<ArrowRight size={14} /></button>
        ) : (
          <button type="button" className="weekly-test-primary-action" disabled={answeredCount !== questions.length} onClick={() => onSubmit(test.id, date)}><Check size={15} />Submit test</button>
        )}
      </div>
      {answeredCount !== questions.length && <p className="weekly-test-answer-count">Answered {answeredCount} of {questions.length}. Answer every question before submitting.</p>}
    </section>
  )
}

type WeeklyPostponeFormProps = {
  test: WeeklyTest
  date: CalendarDate
  calendarConfiguration: CalendarConfiguration
  leaveRecords: LeaveRecord[]
  onPostpone: (testId: string, newDate: CalendarDate, today: CalendarDate) => void
}

function WeeklyPostponeForm({ test, date, calendarConfiguration, leaveRecords, onPostpone }: WeeklyPostponeFormProps) {
  const [postponeDate, setPostponeDate] = useState('')
  const postponeAllowed = postponeDate !== ''
    && compareDates(postponeDate, date) > 0
    && CalendarService.getStatus(postponeDate, calendarConfiguration, leaveRecords) === 'LEARNING_DAY'

  function submitPostpone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!postponeAllowed) return
    onPostpone(test.id, postponeDate, date)
    setPostponeDate('')
  }

  return (
    <form className="weekly-postpone-form" onSubmit={submitPostpone}>
      <div><strong>Reschedule this week's test</strong><small>It keeps this week's material and can only move to a future learning day.</small></div>
      <div className="weekly-postpone-controls">
        <input type="date" aria-label="New weekly test date" value={postponeDate} min={nextDay(date)} onChange={(event) => setPostponeDate(event.target.value)} />
        <button type="submit" disabled={!postponeAllowed}>Postpone</button>
      </div>
      {postponeDate && CalendarService.getStatus(postponeDate, calendarConfiguration, leaveRecords) !== 'LEARNING_DAY' && <small className="weekly-validation-message">Choose a learning day. Holidays and leave are unavailable.</small>}
    </form>
  )
}

function countCategory(test: WeeklyTest, category: 'CURRENT_WEEK' | 'RECENT_REVIEW' | 'CUMULATIVE_REVIEW'): number {
  return Object.values(test.questionCategories).filter((value) => value === category).length
}

function statusLabel(status: WeeklyTest['status']): string {
  switch (status) {
    case 'AVAILABLE': return 'Available'
    case 'IN_PROGRESS': return 'In progress'
    case 'COMPLETED': return 'Completed'
    case 'POSTPONED': return 'Postponed'
    case 'MISSED': return 'Missed · no penalty'
    default: return 'Not available'
  }
}
