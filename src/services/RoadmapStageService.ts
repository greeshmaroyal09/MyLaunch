import { curriculum, getCurriculumTasks } from '../data/curriculum'
import type { Subject, TaskProgressMap } from '../domain/curriculum'

export type RoadmapStage = { title: string; description: string; taskIds: string[]; state: 'complete' | 'current' | 'locked'; completed: number }

function tasksOf(subject: Subject): string[] {
  return subject.modules.flatMap((module) => module.topics.flatMap((topic) => topic.tasks.map((task) => task.id)))
}

export function getRoadmapStages(progress: TaskProgressMap): RoadmapStage[] {
  const bySubject = new Map(curriculum.subjects.map((subject) => [subject.id, tasksOf(subject)]))
  const subjects = (...ids: string[]) => ids.flatMap((id) => bySubject.get(id) ?? [])
  const python = bySubject.get('python') ?? []
  const requiredIds = new Set(getCurriculumTasks(curriculum).filter((task) => task.required).map((task) => task.id))
  const definitions = [
    { title: 'Foundation', description: 'Python basics and core practice', taskIds: python.slice(0, 10).filter((id) => requiredIds.has(id)) },
    { title: 'Core Skills', description: 'Python, data and ML foundations', taskIds: [...python.slice(10), ...subjects('numpy-pandas', 'data-visualization', 'math-statistics', 'machine-learning')] },
    { title: 'Problem Solving', description: 'DSA and interview practice', taskIds: subjects('dsa') },
    { title: 'Applied AI', description: 'APIs, model applications and reliability', taskIds: subjects('fastapi', 'llm-fundamentals', 'applied-ai-core', 'rag') },
    { title: 'Projects', description: 'Build, evaluate and document your work', taskIds: subjects('portfolio-work') },
    { title: 'Career', description: 'Specializations and application preparation', taskIds: subjects('nlp', 'neural-networks', 'pytorch', 'transformer-attention', 'mlops', 'generative-ai-specialization', 'voice-ai-specialization', 'full-time-preparation') },
  ]
  const completedCounts = definitions.map((stage) => stage.taskIds.filter((id) => progress[id] === 'COMPLETED').length)
  const currentIndex = definitions.findIndex((stage, index) => stage.taskIds.length === 0 || completedCounts[index] < stage.taskIds.length)
  return definitions.map((stage, index) => ({
    ...stage,
    completed: completedCounts[index],
    state: stage.taskIds.length > 0 && completedCounts[index] === stage.taskIds.length ? 'complete' : index === currentIndex ? 'current' : 'locked',
  }))
}
