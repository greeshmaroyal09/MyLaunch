import { curriculum } from '../data/curriculum'
import type { Curriculum, CurriculumTrack } from '../domain/curriculum'
import type { PracticeResource, ResourceCategory } from '../domain/task'

export type ResourceRelationship = {
  subject: string
  track: CurriculumTrack
  topic: string
  taskId: string
  taskTitle: string
  taskType: string
}

export type CurriculumResource = PracticeResource & {
  id: string
  relationships: ResourceRelationship[]
}

export type ResourceFilters = {
  search: string
  track: CurriculumTrack | 'All'
  subject: string | 'ALL'
  type: ResourceCategory | 'ALL'
  difficulty: string | 'ALL'
}

export const defaultResourceFilters: ResourceFilters = {
  search: '',
  track: 'All',
  subject: 'ALL',
  type: 'ALL',
  difficulty: 'ALL',
}

export const ResourceService = {
  getResources(source: Curriculum = curriculum): CurriculumResource[] {
    const resourcesByUrl = new Map<string, CurriculumResource>()
    for (const subject of source.subjects) {
      for (const module of subject.modules) {
        for (const topic of module.topics) {
          for (const task of topic.tasks) {
            for (const resource of task.practiceResources ?? []) {
              const existing = resourcesByUrl.get(resource.url)
              const relationship: ResourceRelationship = {
                subject: subject.name,
                track: subject.track,
                topic: topic.title,
                taskId: task.id,
                taskTitle: task.title,
                taskType: task.type,
              }
              if (existing) {
                if (!existing.relationships.some((item) => item.taskId === task.id)) existing.relationships.push(relationship)
                continue
              }
              resourcesByUrl.set(resource.url, { ...resource, id: resource.url, relationships: [relationship] })
            }
          }
        }
      }
    }
    return [...resourcesByUrl.values()].sort((left, right) => left.title.localeCompare(right.title))
  },

  getSubjects(resources: CurriculumResource[], track: CurriculumTrack | 'All' = 'All'): string[] {
    return [...new Set(resources.flatMap((resource) => resource.relationships
      .filter((relationship) => track === 'All' || relationship.track === track)
      .map((relationship) => relationship.subject)))].sort((left, right) => left.localeCompare(right))
  },

  getTypes(resources: CurriculumResource[], track: CurriculumTrack | 'All' = 'All'): ResourceCategory[] {
    return [...new Set(resources
      .filter((resource) => resource.relationships.some((relationship) => track === 'All' || relationship.track === track))
      .map((resource) => resource.resourceType))].sort((left, right) => left.localeCompare(right))
  },

  getDifficulties(resources: CurriculumResource[], track: CurriculumTrack | 'All' = 'All'): string[] {
    return [...new Set(resources
      .filter((resource) => resource.relationships.some((relationship) => track === 'All' || relationship.track === track))
      .map((resource) => resource.difficulty)
      .filter((difficulty): difficulty is string => Boolean(difficulty)))].sort((left, right) => left.localeCompare(right))
  },

  filter(resources: CurriculumResource[], filters: ResourceFilters): CurriculumResource[] {
    const search = filters.search.trim().toLocaleLowerCase()
    return resources.flatMap((resource) => {
      const relationships = resource.relationships.filter((relationship) =>
        (filters.track === 'All' || relationship.track === filters.track)
        && (filters.subject === 'ALL' || relationship.subject === filters.subject),
      )
      if (relationships.length === 0) return []
      if (filters.type !== 'ALL' && resource.resourceType !== filters.type) return []
      if (filters.difficulty !== 'ALL' && resource.difficulty !== filters.difficulty) return []
      if (search) {
        const searchableText = [resource.title, resource.platform, resource.resourceType, resource.usage, resource.difficulty ?? '', ...relationships.flatMap((item) => [item.subject, item.topic, item.taskTitle, item.taskType])]
          .join(' ')
          .toLocaleLowerCase()
        if (!searchableText.includes(search)) return []
      }
      return [{ ...resource, relationships }]
    })
  },
}