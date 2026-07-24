import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import AppSidebar from '../components/AppSidebar.jsx'
import { apiRequest } from '../lib/api.js'

const emptyDraft = { title: '', description: '', dueDate: '', priority: 2 }
const priorityLabels = { 1: 'High', 2: 'Medium', 3: 'Low' }

function formatDueDate(value) {
  if (!value) return 'No due date'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(`${value}T00:00:00`))
}

export default function TasksPage() {
  const { user, accessToken, logout } = useAuth()
  const [tasks, setTasks] = useState([])
  const [draft, setDraft] = useState(emptyDraft)
  const [editingId, setEditingId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const request = useCallback((path, options = {}) => apiRequest(path, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
  }), [accessToken])

  useEffect(() => {
    request('/api/tasks')
      .then(setTasks)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false))
  }, [request])

  const resetForm = () => {
    setDraft(emptyDraft)
    setEditingId(null)
  }

  const submitTask = async (event) => {
    event.preventDefault()
    if (!draft.title.trim()) return
    setIsSaving(true)
    setError('')
    try {
      const payload = { ...draft, dueDate: draft.dueDate || null, priority: Number(draft.priority) }
      const saved = await request(editingId ? `/api/tasks/${editingId}` : '/api/tasks', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
      setTasks((current) => editingId
        ? current.map((task) => task.id === editingId ? saved : task)
        : [...current, saved])
      resetForm()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (task) => {
    setEditingId(task.id)
    setDraft({
      title: task.title,
      description: task.description ?? '',
      dueDate: task.dueDate ?? '',
      priority: task.priority,
    })
    setError('')
  }

  const toggleCompletion = async (task) => {
    setBusyId(task.id)
    setError('')
    try {
      const updated = await request(`/api/tasks/${task.id}/completion`, {
        method: 'PUT',
        body: JSON.stringify({ isCompleted: !task.isCompleted }),
      })
      setTasks((current) => current.map((item) => item.id === task.id ? updated : item))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId(null)
    }
  }

  const deleteTask = async (task) => {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return
    setBusyId(task.id)
    setError('')
    try {
      await request(`/api/tasks/${task.id}`, { method: 'DELETE' })
      setTasks((current) => current.filter((item) => item.id !== task.id))
      if (editingId === task.id) resetForm()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId(null)
    }
  }

  const completedCount = tasks.filter((task) => task.isCompleted).length
  const initials = user.displayName.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="app-shell">
      <AppSidebar user={user} onLogout={logout} />
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">M</span><strong>Momentum</strong></div>
          <div className="crumb"><span>Workspace</span><b>/</b><strong>Tasks</strong></div>
          <div className="top-actions"><div className="top-avatar">{initials}</div></div>
        </header>

        <main className="tasks-page">
          <section className="habits-heading tasks-heading">
            <div><p className="date">Plan your progress</p><h1>Your tasks</h1><p>Focus on what matters and move your work forward.</p></div>
            <div className="completion-summary task-completion-summary"><strong>{completedCount}</strong><span>of {tasks.length}<br />completed</span></div>
          </section>

          {error && <div className="habits-error" role="alert">{error}</div>}

          <section className="habits-layout">
            <article className="habit-panel habit-form-card task-form-card">
              <span className="eyebrow orange-text">{editingId ? 'Update task' : 'New task'}</span>
              <h2>{editingId ? 'Edit your task' : 'Add to your plan'}</h2>
              <form onSubmit={submitTask}>
                <label>Title<input maxLength="150" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Finish project proposal" required /></label>
                <label>Description <span>Optional</span><textarea maxLength="500" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Add useful details or context" /></label>
                <div className="task-form-grid">
                  <label>Due date <span>Optional</span><input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></label>
                  <label>Priority<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })}><option value="1">High</option><option value="2">Medium</option><option value="3">Low</option></select></label>
                </div>
                <div className="habit-form-actions">
                  {editingId && <button type="button" className="button-secondary" onClick={resetForm}>Cancel</button>}
                  <button type="submit" className="button-primary task-primary" disabled={isSaving || !draft.title.trim()}>{isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Add task'}</button>
                </div>
              </form>
            </article>

            <section className="habit-panel habit-list-panel" aria-live="polite">
              <header><div><span className="eyebrow">Your plan</span><h2>Task list</h2></div><span className="habit-total">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span></header>
              {isLoading ? <div className="habit-state">Loading your tasks…</div> : tasks.length === 0 ? (
                <div className="habit-state empty task-empty"><span>□</span><h3>Your list is clear</h3><p>Add your first task and turn your plans into progress.</p></div>
              ) : (
                <div className="habits-list">
                  {tasks.map((task) => <article className={`habit-row task-row ${task.isCompleted ? 'complete' : ''}`} key={task.id}>
                    <button className="habit-toggle task-toggle" type="button" disabled={busyId === task.id} onClick={() => toggleCompletion(task)} aria-label={`${task.isCompleted ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`} aria-pressed={task.isCompleted}>{task.isCompleted ? '✓' : ''}</button>
                    <div className="habit-copy task-copy">
                      <div className="task-title-line"><h3>{task.title}</h3><span className={`priority-badge priority-${task.priority}`}>{priorityLabels[task.priority]}</span></div>
                      {task.description && <p>{task.description}</p>}
                      <span className="task-due"><b>◷</b> {formatDueDate(task.dueDate)} · {task.isCompleted ? 'Completed' : 'Open'}</span>
                    </div>
                    <div className="habit-actions"><button type="button" onClick={() => startEditing(task)} disabled={busyId === task.id}>Edit</button><button className="delete" type="button" onClick={() => deleteTask(task)} disabled={busyId === task.id}>Delete</button></div>
                  </article>)}
                </div>
              )}
            </section>
          </section>
        </main>
      </div>
    </div>
  )
}
