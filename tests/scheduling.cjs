const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
}
const { HolidayPlanService, internshipTaskIds } = require('../src/services/HolidayPlanService.ts')
const { getCurriculumTasks } = require('../src/data/curriculum.ts')
const { addDays } = require('../src/services/DateService.ts')
const startDate = '2026-11-25'
const taskMap = new Map(getCurriculumTasks().map((task) => [task.id, task]))
const makeSettings = (dailyMinutes, budgetsByDate = {}) => ({ startDate, dailyMinutes, budgetsByDate, readinessChecks: {} })

for (const dailyMinutes of [60, 120, 180]) {
  const settings = makeSettings(dailyMinutes)
  const progress = { 'java-basics-learn': 'COMPLETED' }
  const days = HolidayPlanService.createPlan(settings, progress, [], startDate)
  assert.ok(days.length > 0)
  if (dailyMinutes === 60) assert.ok(days.length > 25, 'plan must continue beyond 25 days when work remains')
  assert.equal(days[0].date, startDate)
  assert.equal(days[0].tasks[0].id, 'python-task-01')
  assert.ok(days.some((day) => day.date === '2026-11-28'))
  assert.ok(days.some((day) => day.date === '2026-11-29'))
  const seen = new Set(), prior = { ...progress }, subjects = new Set()
  for (const [index, day] of days.entries()) {
    assert.equal(day.date, addDays(startDate, index))
    assert.ok(day.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0) <= dailyMinutes)
    for (const task of day.tasks) {
      assert.ok(!seen.has(task.id), `duplicate ${task.id}`)
      assert.notEqual(task.subject, 'Java')
      assert.ok(task.prerequisiteTaskIds.every((id) => prior[id] === 'COMPLETED'), `unmet prerequisite ${task.id}`)
      seen.add(task.id); subjects.add(task.subject); prior[task.id] = 'COMPLETED'
    }
  }
  for (const id of internshipTaskIds) assert.ok(seen.has(id), `missing internship task ${id}`)
  assert.ok(seen.has('full-time-preparation-task-06'), 'full-time preparation remains in the forecast')
  for (const subject of ['Python', 'Computer Networks', 'Operating Systems', 'Git/GitHub', 'SQL', 'DSA', 'Portfolio Project Work', 'Voice AI / Conversational AI Engineer']) assert.ok(subjects.has(subject), `missing ${subject}`)
  assert.deepEqual(progress, { 'java-basics-learn': 'COMPLETED' })
  const internship = internshipTaskIds.map((id) => days.find((day) => day.tasks.some((task) => task.id === id)).date).sort().at(-1)
  console.log(`${dailyMinutes} min: internship learning checkpoint ${internship}; ${days.length} days, curriculum ends ${days.at(-1).date}`)
}
const baseline = HolidayPlanService.createPlan(makeSettings(60), {}, [], startDate)
const mixedSettings = makeSettings(60, { '2026-11-25': 180, '2026-11-26': 120 })
const mixed = HolidayPlanService.createPlan(mixedSettings, {}, [], startDate)
assert.equal(mixed[0].availableMinutes, 180)
assert.equal(mixed[1].availableMinutes, 120)
assert.equal(mixed[2].availableMinutes, 60)
assert.ok(mixed[0].tasks.length > baseline[0].tasks.length)
assert.ok(mixed.at(-1).date <= baseline.at(-1).date)
const checkpoint = (plan) => internshipTaskIds.map((id) => plan.find((day) => day.tasks.some((task) => task.id === id))?.date).sort().at(-1)
assert.ok(checkpoint(mixed) <= checkpoint(baseline), 'extra available time must not delay the internship learning checkpoint')
const prior = { 'python-task-01': 'COMPLETED', 'java-basics-learn': 'COMPLETED' }
const restored = HolidayPlanService.createPlan(mixedSettings, prior, [], startDate)
assert.ok(!restored.flatMap((day) => day.tasks).some((task) => task.id === 'python-task-01'))
assert.equal(prior['java-basics-learn'], 'COMPLETED')
const event = { type: 'TASK_COMPLETED', taskId: 'python-task-01', date: startDate, pointsDelta: 25 }
const remainingDay = HolidayPlanService.createPlan(makeSettings(60), prior, [event], startDate)[0]
assert.ok(remainingDay.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0) + event.pointsDelta <= 60)
const tasks = getCurriculumTasks(), byId = new Map(tasks.map((task) => [task.id, task]))
assert.equal(byId.size, tasks.length)
assert.deepEqual(byId.get('python-task-01').prerequisiteTaskIds, [])
const visiting = new Set(), visited = new Set()
function visit(id) { assert.ok(byId.has(id), `missing ${id}`); assert.ok(!visiting.has(id), `cycle ${id}`); if (visited.has(id)) return; visiting.add(id); for (const dependency of byId.get(id).prerequisiteTaskIds) visit(dependency); visiting.delete(id); visited.add(id) }
for (const task of tasks) visit(task.id)
for (const url of ['https://docs.python.org/3/tutorial/', 'https://www.hackerrank.com/domains/python', 'https://leetcode.com/studyplan/', 'https://www.kaggle.com/learn/', 'https://git-scm.com/book/en/v2', 'https://scikit-learn.org/stable/getting_started', 'https://docs.pytorch.org/tutorials/beginner/basics/intro', 'https://fastapi.tiangolo.com/tutorial/']) assert.ok(tasks.some((task) => task.practiceResources?.some((resource) => resource.url === url)), `missing resource ${url}`)
assert.ok(taskMap.has('portfolio-work-task-06'))
console.log('Budgets, progression, resources, history and prerequisite checks passed')
