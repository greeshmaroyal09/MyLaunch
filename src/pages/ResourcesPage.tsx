import { useState } from 'react'
import { BookOpenText, ExternalLink, Search, SlidersHorizontal } from 'lucide-react'
import type { CurriculumTrack } from '../domain/curriculum'
import { defaultResourceFilters, ResourceService, type ResourceFilters } from '../services/ResourceService'
import './resources.css'

const tracks: Array<{ value: ResourceFilters['track']; label: string }> = [
  { value: 'Primary', label: 'Primary' },
  { value: 'AI / ML', label: 'AI / ML / Secondary' },
  { value: 'All', label: 'All resources' },
]

export function ResourcesPage() {
  const [filters, setFilters] = useState<ResourceFilters>(defaultResourceFilters)
  const resources = ResourceService.getResources()
  const filteredResources = ResourceService.filter(resources, filters)
  const subjects = ResourceService.getSubjects(resources, filters.track)
  const types = ResourceService.getTypes(resources, filters.track)
  const difficulties = ResourceService.getDifficulties(resources, filters.track)

  function updateFilter<K extends keyof ResourceFilters>(key: K, value: ResourceFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function selectTrack(track: CurriculumTrack | 'All') {
    setFilters((current) => ({ ...current, track, subject: 'ALL', type: 'ALL', difficulty: 'ALL' }))
  }

  return (
    <div className="resources-page">
      <header className="resources-header">
        <div>
          <p className="resources-eyebrow">MYLAUNCH / CURRICULUM LIBRARY</p>
          <h1>Resources</h1>
          <p>Find the learning and practice links attached to your curriculum tasks.</p>
        </div>
        <div className="resources-total" aria-label={`${resources.length} resources in the curriculum`}>
          <strong>{resources.length}</strong><span>resources</span>
        </div>
      </header>

      <section className="resources-filter-panel" aria-label="Find resources">
        <label className="resources-search">
          <Search size={16} aria-hidden="true" />
          <input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search resources, tasks, or subjects" aria-label="Search resources, tasks, or subjects" />
        </label>
        <div className="resources-track-filter" role="group" aria-label="Filter curriculum track">
          {tracks.map((track) => (
            <button key={track.value} type="button" aria-pressed={filters.track === track.value} onClick={() => selectTrack(track.value)}>{track.label}</button>
          ))}
        </div>
        <div className="resources-select-filters">
          <label><span>Subject</span><select value={filters.subject} onChange={(event) => updateFilter('subject', event.target.value)}><option value="ALL">All subjects</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
          <label><span>Resource type</span><select value={filters.type} onChange={(event) => updateFilter('type', event.target.value as ResourceFilters['type'])}><option value="ALL">All types</option>{types.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <label><span>Difficulty</span><select value={filters.difficulty} onChange={(event) => updateFilter('difficulty', event.target.value)}><option value="ALL">All difficulties</option>{difficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}</select></label>
        </div>
      </section>

      <div className="resources-results-heading">
        <div><SlidersHorizontal size={15} aria-hidden="true" /><span>{filteredResources.length} of {resources.length} resources</span></div>
        <span>{filters.track === 'All' ? 'All curriculum tracks' : filters.track === 'Primary' ? 'Primary career track' : 'AI / ML secondary track'}</span>
      </div>

      {filteredResources.length ? (
        <section className="resource-grid" aria-label="Curriculum resources">
          {filteredResources.map((resource) => (
            <article className="resource-card" key={resource.id}>
              <div className="resource-card-heading">
                <div className="resource-icon"><BookOpenText size={17} aria-hidden="true" /></div>
                <div className="resource-card-title">
                  <h2>{resource.title}</h2>
                  <span>{resource.platform}</span>
                  <small>{resource.resourceType} · {resource.usage}</small>
                </div>
              </div>
              {resource.difficulty && <span className="resource-difficulty">{resource.difficulty}</span>}
              <div className="resource-contexts">
                {resource.relationships.map((relationship) => (
                  <div className="resource-context" key={`${resource.id}-${relationship.taskId}`}>
                    <div className="resource-context-topline"><strong>{relationship.subject}</strong><span className={`resource-track-tag ${relationship.track === 'Primary' ? 'is-primary' : 'is-secondary'}`}>{relationship.track}</span></div>
                    <span className="resource-topic">{relationship.topic}</span>
                    <small>Task: {relationship.taskTitle} · {relationship.taskType}</small>
                  </div>
                ))}
              </div>
              <a className="resource-open-link" href={resource.url} target="_blank" rel="noreferrer noopener" aria-label={`Open ${resource.title} in a new tab`}>
                <span>Open resource</span><ExternalLink size={14} aria-hidden="true" />
              </a>
            </article>
          ))}
        </section>
      ) : resources.length === 0 ? (
        <section className="resources-empty" role="status">
          <BookOpenText size={23} aria-hidden="true" />
          <h2>No curriculum resources yet</h2>
          <p>Resources will appear here when they are attached to curriculum tasks.</p>
        </section>
      ) : (
        <section className="resources-empty" role="status">
          <Search size={22} aria-hidden="true" />
          <h2>No resources match these filters</h2>
          <p>Try another search or choose a different subject, type, or difficulty.</p>
        </section>
      )}
    </div>
  )
}