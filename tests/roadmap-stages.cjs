const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
}
const { getRoadmapStages } = require('../src/services/RoadmapStageService.ts')
const { StorageService } = require('../src/services/StorageService.ts')
const { ProgressService, createProgressState } = require('../src/services/ProgressService.ts')
const { ScheduleService } = require('../src/services/ScheduleService.ts')
const { curriculum, getCurriculumTasks } = require('../src/data/curriculum.ts')
const { seedCalendarConfiguration } = require('../src/data/seedCalendar.ts')
const { APP_STATE_SCHEMA_VERSION } = require('../src/domain/appState.ts')

const initial = getRoadmapStages({})
assert.equal(initial[0].title, 'Foundation')
assert.equal(initial[0].state, 'current')
assert.equal(initial[0].completed, 0)
assert.ok(initial.slice(1).every((stage) => stage.state === 'locked'))

const partial = Object.fromEntries(initial[0].taskIds.slice(0, -1).map((id) => [id, 'COMPLETED']))
partial['fastapi-task-01'] = 'COMPLETED'
assert.equal(getRoadmapStages(partial)[0].state, 'current')
assert.equal(getRoadmapStages(partial)[0].completed, initial[0].taskIds.length - 1)

const foundationComplete = Object.fromEntries(initial[0].taskIds.map((id) => [id, 'COMPLETED']))
const next = getRoadmapStages(foundationComplete)
assert.equal(next[0].state, 'complete')
assert.equal(next[1].state, 'current')
assert.ok(next.slice(2).every((stage) => stage.state === 'locked'))

const allComplete = Object.fromEntries(initial.flatMap((stage) => stage.taskIds.map((id) => [id, 'COMPLETED'])))
assert.ok(getRoadmapStages(allComplete).every((stage) => stage.state === 'complete'))

// Exercise the same browser-storage serialization and task status derivation as a reload.
const localData = new Map()
global.window = { localStorage: {
  getItem: (key) => localData.get(key) ?? null,
  setItem: (key, value) => localData.set(key, value),
  removeItem: (key) => localData.delete(key),
} }
let progress = createProgressState()
const taskById = new Map(getCurriculumTasks().map((task) => [task.id, task]))
const savedState = {
  schemaVersion: APP_STATE_SCHEMA_VERSION, progress, schedulesByDate: {}, currentDate: '2026-11-25',
  selectedCalendarDate: '2026-11-25', calendarConfiguration: seedCalendarConfiguration, leaveRecords: [],
  weeklyTests: [], projects: [], companies: [], opportunities: [], applications: [], theme: 'light',
}
for (const [index, id] of initial[0].taskIds.entries()) {
  const task = taskById.get(id)
  progress = ProgressService.completeTask(progress, { ...task, status: 'Pending', progressStatus: 'AVAILABLE', dueDate: '2026-11-25' }, '2026-11-25')
  StorageService.save({ ...savedState, progress })
  const reloaded = StorageService.load()
  assert.ok(reloaded, 'saved state should load')
  const rederived = ScheduleService.getProgressState(curriculum, reloaded.progress.taskProgress)
  const stages = getRoadmapStages(rederived)
  assert.equal(stages[0].state, index === initial[0].taskIds.length - 1 ? 'complete' : 'current')
  assert.equal(stages[1].state, index === initial[0].taskIds.length - 1 ? 'current' : 'locked')
}
const removedId = initial[0].taskIds.at(-1)
const undone = ProgressService.uncompleteTask(progress, removedId)
const rederived = ScheduleService.getProgressState(curriculum, undone.taskProgress)
StorageService.save({ ...savedState, progress: { ...undone, taskProgress: rederived } })
const restored = StorageService.load()
assert.equal(getRoadmapStages(restored.progress.taskProgress)[0].state, 'current')
assert.equal(getRoadmapStages(restored.progress.taskProgress)[1].state, 'locked')
console.log('Roadmap transitions and browser-storage reload checks passed')
