import { useMemo, useState } from 'react'
import { ArrowRight, Plus, Trash2 } from 'lucide-react'
import type { Project, ProjectCategory, ProjectDifficulty } from '../domain/project'
import type { ProjectCreateInput } from '../services/ProjectService'
import './projects.css'

type FilterKey = 'All' | 'In Progress' | 'Completed' | 'Portfolio Ready' | 'Archived'

type ProjectsPageProps = {
  projects: Project[]
  onCreateProject: (input: ProjectCreateInput) => Project | null
  onDeleteProject: (projectId: string) => void
  onOpenProject: (projectId: string) => void
}

export function ProjectsPage({ projects, onCreateProject, onDeleteProject, onOpenProject }: ProjectsPageProps) {
  const [filter, setFilter] = useState<FilterKey>('All')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ProjectCategory>('SDE / Backend')
  const [difficulty, setDifficulty] = useState<ProjectDifficulty>('Beginner')
  const [error, setError] = useState('')

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (filter === 'All') return true
      if (filter === 'In Progress') return ['IDEA', 'PLANNED', 'IN_PROGRESS'].includes(project.status)
      if (filter === 'Completed') return project.status === 'COMPLETED'
      if (filter === 'Portfolio Ready') return project.portfolioReadiness.portfolioReady
      return project.status === 'ARCHIVED'
    })
  }, [filter, projects])

  function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const result = onCreateProject({ title, description, category, difficulty })
      if (!result) {
        setError('Could not create the project.')
        return
      }
      setTitle('')
      setDescription('')
      setError('')
      onOpenProject(result.id)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Project could not be created.')
    }
  }

  return (
    <div className="projects-page">
      <header className="projects-header">
        <div>
          <div className="welcome-kicker">PORTFOLIO BUILDER</div>
          <h1>Projects</h1>
        </div>
      </header>

      <section className="project-create-panel">
        <h2>Create a project</h2>
        <form onSubmit={submitCreate} className="project-create-form">
          <label>
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Resume refactor" required />
          </label>
          <label>
            <span>Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What problem does this project solve?" required />
          </label>
          <div className="project-form-row">
            <label>
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value as ProjectCategory)}>
                {['SDE / Backend', 'DSA / Systems', 'AI / ML', 'Data', 'Full Stack', 'Cloud / DevOps', 'Academic / Research', 'Other'].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Difficulty</span>
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as ProjectDifficulty)}>
                {['Beginner', 'Intermediate', 'Advanced'].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          {error && <small className="project-validation-message">{error}</small>}
          <button type="submit" className="project-primary-button"><Plus size={15} />Create project</button>
        </form>
      </section>

      <section className="project-list-panel">
        <div className="project-filters" aria-label="Project filters">
          {(['All', 'In Progress', 'Completed', 'Portfolio Ready', 'Archived'] as FilterKey[]).map((option) => (
            <button key={option} type="button" className={filter === option ? 'is-active' : ''} onClick={() => setFilter(option)}>{option}</button>
          ))}
        </div>

        <div className="project-grid">
          {filteredProjects.length ? filteredProjects.map((project) => (
            <article className="project-card" key={project.id}>
              <div className="project-card-topline">
                <span className="project-category">{project.category}</span>
                <span className={`project-status project-status-${project.status.toLowerCase()}`}>{project.status}</span>
              </div>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <div className="project-meta-row">
                <span>{project.difficulty}</span>
                <span>{project.progress}%</span>
              </div>
              <div className="project-meta-row">
                <span>{project.tasks.length} tasks</span>
                {project.targetCompletionDate ? <span>Due {project.targetCompletionDate}</span> : <span>No target date</span>}
              </div>
              <div className="project-readiness-pill">{project.portfolioReadiness.portfolioReady ? 'Portfolio ready' : 'Needs evidence'}</div>
              <div className="project-card-actions">
                <button type="button" className="project-secondary-button" onClick={() => onOpenProject(project.id)}>Open <ArrowRight size={14} /></button>
                <button type="button" className="project-delete-button" aria-label={`Delete ${project.title}`} onClick={() => onDeleteProject(project.id)}><Trash2 size={14} /></button>
              </div>
            </article>
          )) : (
            <div className="empty-projects">No projects match this filter yet.</div>
          )}
        </div>
      </section>
    </div>
  )
}
