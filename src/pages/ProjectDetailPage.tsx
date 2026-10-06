import { useState } from 'react'
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react'
import type { Project, ProjectCategory, ProjectDifficulty, ProjectMilestone, ProjectTask } from '../domain/project'
import { ProjectService } from '../services/ProjectService'
import './projects.css'

type ProjectDetailPageProps = {
  project: Project
  onBack: () => void
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void
  onAddProjectTask: (projectId: string, input: { title: string; description?: string; estimatedMinutes?: number; status?: ProjectTask['status']; milestoneId?: string }) => void
  onUpdateProjectTask: (projectId: string, taskId: string, updates: Partial<ProjectTask>) => void
  onDeleteProjectTask: (projectId: string, taskId: string) => void
  onAddProjectMilestone: (projectId: string, input: { title: string; description?: string; status?: ProjectMilestone['status'] }) => void
  onUpdateProjectMilestone: (projectId: string, milestoneId: string, updates: Partial<ProjectMilestone>) => void
  onDeleteProjectMilestone: (projectId: string, milestoneId: string) => void
}

export function ProjectDetailPage({ project, onBack, onUpdateProject, onAddProjectTask, onUpdateProjectTask, onDeleteProjectTask, onAddProjectMilestone, onUpdateProjectMilestone, onDeleteProjectMilestone }: ProjectDetailPageProps) {
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskMinutes, setTaskMinutes] = useState('60')
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [milestoneDescription, setMilestoneDescription] = useState('')
  const [taskError, setTaskError] = useState('')
  const [milestoneError, setMilestoneError] = useState('')

  const portfolioReadiness = ProjectService.getPortfolioReadiness(project)

  function updateProjectField<K extends keyof Project>(key: K, value: Project[K]) {
    onUpdateProject(project.id, { [key]: value } as Partial<Project>)
  }

  function handleAddTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onAddProjectTask(project.id, {
        title: taskTitle,
        description: taskDescription,
        estimatedMinutes: Number(taskMinutes) || 30,
      })
      setTaskTitle('')
      setTaskDescription('')
      setTaskMinutes('60')
      setTaskError('')
    } catch (caughtError) {
      setTaskError(caughtError instanceof Error ? caughtError.message : 'Task could not be added.')
    }
  }

  function handleAddMilestone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onAddProjectMilestone(project.id, {
        title: milestoneTitle,
        description: milestoneDescription,
      })
      setMilestoneTitle('')
      setMilestoneDescription('')
      setMilestoneError('')
    } catch (caughtError) {
      setMilestoneError(caughtError instanceof Error ? caughtError.message : 'Milestone could not be added.')
    }
  }

  return (
    <div className="project-detail-page">
      <button type="button" className="project-back-button" onClick={onBack}><ArrowLeft size={14} />Back to projects</button>

      <header className="project-detail-header">
        <div>
          <div className="welcome-kicker">PROJECT</div>
          <h1>{project.title}</h1>
        </div>
        <span className={`project-status project-status-${project.status.toLowerCase()}`}>{project.status}</span>
      </header>

      <section className="project-overview-grid">
        <div className="project-detail-panel">
          <h2>Overview</h2>
          <p>{project.description}</p>
          <div className="project-detail-metadata">
            <span><strong>Category:</strong> {project.category}</span>
            <span><strong>Difficulty:</strong> {project.difficulty}</span>
            <span><strong>Progress:</strong> {project.progress}%</span>
            <span><strong>Target:</strong> {project.targetCompletionDate ?? 'No target date'}</span>
          </div>
          <div className="tech-stack"><strong>Tech stack:</strong> {project.techStack.length ? project.techStack.join(', ') : 'Not added yet'}</div>
        </div>

        <div className="project-detail-panel">
          <h2>Portfolio readiness</h2>
          <ul className="readiness-list">
            <li className={portfolioReadiness.implementationComplete ? 'is-ready' : ''}><Check size={14} /> Implementation complete</li>
            <li className={portfolioReadiness.repositoryAvailable ? 'is-ready' : ''}><Check size={14} /> Repository available</li>
            <li className={portfolioReadiness.readmeAvailable ? 'is-ready' : ''}><Check size={14} /> README available</li>
            <li className={portfolioReadiness.deploymentAvailable ? 'is-ready' : ''}><Check size={14} /> Deployment/demo available</li>
            <li className={portfolioReadiness.documentationComplete ? 'is-ready' : ''}><Check size={14} /> Documentation complete</li>
            <li className={portfolioReadiness.resumeReady ? 'is-ready' : ''}><Check size={14} /> Resume bullet ready</li>
          </ul>
          <p className="portfolio-ready-label">Portfolio ready: {portfolioReadiness.portfolioReady ? 'Yes' : 'Not yet'}</p>
        </div>
      </section>

      <section className="project-detail-panel">
        <h2>Edit metadata</h2>
        <div className="project-edit-grid">
          <label>
            <span>Title</span>
            <input value={project.title} onChange={(event) => updateProjectField('title', event.target.value)} />
          </label>
          <label>
            <span>Category</span>
            <select value={project.category} onChange={(event) => updateProjectField('category', event.target.value as ProjectCategory)}>
              {['SDE / Backend', 'DSA / Systems', 'AI / ML', 'Data', 'Full Stack', 'Cloud / DevOps', 'Academic / Research', 'Other'].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>Difficulty</span>
            <select value={project.difficulty} onChange={(event) => updateProjectField('difficulty', event.target.value as ProjectDifficulty)}>
              {['Beginner', 'Intermediate', 'Advanced'].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            <span>Target completion</span>
            <input type="date" value={project.targetCompletionDate ?? ''} onChange={(event) => updateProjectField('targetCompletionDate', event.target.value || undefined)} />
          </label>
          <label className="full-width">
            <span>Description</span>
            <textarea value={project.description} onChange={(event) => updateProjectField('description', event.target.value)} />
          </label>
          <label>
            <span>Tech stack</span>
            <input value={project.techStack.join(', ')} onChange={(event) => updateProjectField('techStack', event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean))} />
          </label>
          <label>
            <span>Repository URL</span>
            <input value={project.repositoryUrl ?? ''} onChange={(event) => updateProjectField('repositoryUrl', event.target.value.trim() || undefined)} />
          </label>
          <label>
            <span>Deployment URL</span>
            <input value={project.deploymentUrl ?? ''} onChange={(event) => updateProjectField('deploymentUrl', event.target.value.trim() || undefined)} />
          </label>
          <label>
            <span>Demo URL</span>
            <input value={project.demoUrl ?? ''} onChange={(event) => updateProjectField('demoUrl', event.target.value.trim() || undefined)} />
          </label>
        </div>
        <div className="project-evidence-row">
          <label><input type="checkbox" checked={project.readmeStatus} onChange={(event) => updateProjectField('readmeStatus', event.target.checked)} /> README available</label>
          <label><input type="checkbox" checked={project.documentationStatus} onChange={(event) => updateProjectField('documentationStatus', event.target.checked)} /> Documentation complete</label>
          <label><input type="checkbox" checked={project.resumeReady} onChange={(event) => updateProjectField('resumeReady', event.target.checked)} /> Resume ready</label>
        </div>
      </section>

      <section className="project-detail-panel">
        <h2>Project tasks</h2>
        <form onSubmit={handleAddTask} className="project-inline-form">
          <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Add a project task" />
          <input value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} placeholder="Short description" />
          <input value={taskMinutes} onChange={(event) => setTaskMinutes(event.target.value)} type="number" min="10" step="10" />
          <button type="submit" className="project-primary-button"><Plus size={14} />Add task</button>
        </form>
        {taskError && <small className="project-validation-message">{taskError}</small>}
        <div className="task-list">
          {project.tasks.length ? project.tasks.map((task) => (
            <div className="task-row" key={task.id}>
              <div className="task-copy">
                <strong>{task.title}</strong>
                <small>{task.description || 'No description yet'} · {task.estimatedMinutes} min</small>
              </div>
              <div className="task-actions">
                <select value={task.status} onChange={(event) => onUpdateProjectTask(project.id, task.id, { status: event.target.value as ProjectTask['status'] })}>
                  {['TODO', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <button type="button" aria-label={`Delete ${task.title}`} onClick={() => onDeleteProjectTask(project.id, task.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          )) : <p>No tasks yet.</p>}
        </div>
      </section>

      <section className="project-detail-panel">
        <h2>Milestones</h2>
        <form onSubmit={handleAddMilestone} className="project-inline-form">
          <input value={milestoneTitle} onChange={(event) => setMilestoneTitle(event.target.value)} placeholder="Add milestone" />
          <input value={milestoneDescription} onChange={(event) => setMilestoneDescription(event.target.value)} placeholder="Milestone description" />
          <button type="submit" className="project-primary-button"><Plus size={14} />Add milestone</button>
        </form>
        {milestoneError && <small className="project-validation-message">{milestoneError}</small>}
        <div className="task-list">
          {project.milestones.length ? project.milestones.map((milestone) => (
            <div className="task-row" key={milestone.id}>
              <div className="task-copy">
                <strong>{milestone.title}</strong>
                <small>{milestone.description || 'No description yet'} · {milestone.taskIds.length} linked tasks</small>
              </div>
              <div className="task-actions">
                <select value={milestone.status} onChange={(event) => onUpdateProjectMilestone(project.id, milestone.id, { status: event.target.value as ProjectMilestone['status'] })}>
                  {['PLANNED', 'IN_PROGRESS', 'COMPLETED'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <button type="button" aria-label={`Delete ${milestone.title}`} onClick={() => onDeleteProjectMilestone(project.id, milestone.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          )) : <p>No milestones yet.</p>}
        </div>
      </section>
    </div>
  )
}
