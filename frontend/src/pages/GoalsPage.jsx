import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import AppSidebar from '../components/AppSidebar.jsx'
import { apiRequest } from '../lib/api.js'

const today = new Date().toISOString().slice(0, 10)
const categories = ['Habits', 'Tasks', 'Fitness', 'Finance', 'Personal', 'Other']
const statuses = ['Active', 'Completed', 'Paused']
const emptyDraft = {
  title: '', description: '', category: 'Personal', targetValue: '', currentValue: '0',
  unit: '', startDate: today, targetDate: today, status: 'Active',
}

const percent = (goal) => Math.min(100, Math.round(goal.currentValue / goal.targetValue * 100))
const formatValue = (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
const formatDate = (value) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`))

function targetDetail(value) {
  const target = new Date(`${value}T00:00:00`)
  const current = new Date()
  current.setHours(0, 0, 0, 0)
  const days = Math.round((target - current) / 86_400_000)
  if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} overdue`
  if (days === 0) return 'Due today'
  return `${days} ${days === 1 ? 'day' : 'days'} remaining`
}

function goalPayload(draft, overrides = {}) {
  return {
    title: draft.title.trim(),
    description: draft.description?.trim() || null,
    category: draft.category.trim(),
    targetValue: Number(draft.targetValue),
    currentValue: Number(draft.currentValue),
    unit: draft.unit?.trim() || null,
    startDate: draft.startDate,
    targetDate: draft.targetDate,
    status: draft.status,
    ...overrides,
  }
}

export default function GoalsPage() {
  const { user, accessToken, logout } = useAuth()
  const [goals, setGoals] = useState([])
  const [draft, setDraft] = useState(emptyDraft)
  const [editingId, setEditingId] = useState(null)
  const [filter, setFilter] = useState('Active')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [validation, setValidation] = useState('')

  const request = useCallback((path, options = {}) => apiRequest(path, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
  }), [accessToken])

  const load = useCallback(() => {
    setIsLoading(true)
    setError('')
    request('/api/goals').then(setGoals).catch((requestError) => setError(requestError.message)).finally(() => setIsLoading(false))
  }, [request])

  useEffect(() => {
    let isCurrent = true
    request('/api/goals')
      .then((items) => { if (isCurrent) setGoals(items) })
      .catch((requestError) => { if (isCurrent) setError(requestError.message) })
      .finally(() => { if (isCurrent) setIsLoading(false) })
    return () => { isCurrent = false }
  }, [request])

  const resetForm = () => {
    setDraft({ ...emptyDraft, startDate: today, targetDate: today })
    setEditingId(null)
    setValidation('')
  }

  const submit = async (event) => {
    event.preventDefault()
    const targetValue = Number(draft.targetValue)
    const currentValue = Number(draft.currentValue)
    if (!draft.title.trim() || !draft.category.trim()) return setValidation('Title and category are required.')
    if (targetValue <= 0 || currentValue < 0 || currentValue > targetValue) return setValidation('Progress must be between 0 and the target, and the target must be greater than 0.')
    if (!draft.startDate || draft.targetDate < draft.startDate) return setValidation('Choose a target date on or after the start date.')
    setIsSaving(true); setError(''); setValidation('')
    try {
      const payload = goalPayload(draft)
      const saved = await request(editingId ? `/api/goals/${editingId}` : '/api/goals', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
      setGoals((current) => editingId ? current.map((goal) => goal.id === saved.id ? saved : goal) : [saved, ...current])
      resetForm()
      setFilter(saved.status)
    } catch (requestError) { setError(requestError.message) } finally { setIsSaving(false) }
  }

  const startEditing = (goal) => {
    setEditingId(goal.id)
    setDraft({ ...goal, description: goal.description ?? '', unit: goal.unit ?? '', targetValue: String(goal.targetValue), currentValue: String(goal.currentValue) })
    setValidation('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const updateProgress = async (goal, value) => {
    const currentValue = Number(value)
    if (!Number.isFinite(currentValue) || currentValue < 0 || currentValue > goal.targetValue) return setError(`Progress for “${goal.title}” must be between 0 and ${goal.targetValue}.`)
    setBusyId(goal.id); setError('')
    try {
      const updated = await request(`/api/goals/${goal.id}/progress`, { method: 'PUT', body: JSON.stringify({ currentValue }) })
      setGoals((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (requestError) { setError(requestError.message) } finally { setBusyId(null) }
  }

  const setStatus = async (goal, status) => {
    setBusyId(goal.id); setError('')
    try {
      const currentValue = status === 'Completed' ? goal.targetValue : goal.currentValue
      const updated = await request(`/api/goals/${goal.id}`, {
        method: 'PUT',
        body: JSON.stringify(goalPayload(goal, { status, currentValue })),
      })
      setGoals((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (requestError) { setError(requestError.message) } finally { setBusyId(null) }
  }

  const remove = async (goal) => {
    if (!window.confirm(`Delete “${goal.title}”? This cannot be undone.`)) return
    setBusyId(goal.id); setError('')
    try {
      await request(`/api/goals/${goal.id}`, { method: 'DELETE' })
      setGoals((current) => current.filter((item) => item.id !== goal.id))
      if (editingId === goal.id) resetForm()
    } catch (requestError) { setError(requestError.message) } finally { setBusyId(null) }
  }

  const counts = useMemo(() => Object.fromEntries(statuses.map((status) => [status, goals.filter((goal) => goal.status === status).length])), [goals])
  const visibleGoals = goals.filter((goal) => goal.status === filter)
  const initials = user.displayName.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="app-shell">
      <AppSidebar user={user} onLogout={logout} />
      <div className="workspace">
        <header className="topbar"><div className="mobile-brand"><span className="brand-mark">M</span><strong>Momentum</strong></div><div className="crumb"><span>Workspace</span><b>/</b><strong>Goals</strong></div><div className="top-actions"><div className="top-avatar">{initials}</div></div></header>
        <main className="goals-page">
          <section className="habits-heading goals-heading"><div><p className="date">Aim with intention</p><h1>Your goals</h1><p>Set a clear target, track progress, and celebrate the finish.</p></div><div className="completion-summary goals-summary"><strong>{counts.Active}</strong><span>active<br />goals</span></div></section>
          {error && <div className="habits-error" role="alert">{error}<button type="button" onClick={load}>Retry</button></div>}
          <section className="goals-layout">
            <article className="habit-panel habit-form-card goals-form-card">
              <span className="eyebrow green-text">{editingId ? 'Update goal' : 'New goal'}</span><h2>{editingId ? 'Edit your goal' : 'Define your next milestone'}</h2>
              <form onSubmit={submit}>
                {validation && <div className="goal-validation" role="alert">{validation}</div>}
                <label>Title<input maxLength="150" required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Read 24 books" /></label>
                <label>Description <span>Optional</span><textarea maxLength="1000" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Why this goal matters or helpful notes" /></label>
                <div className="goal-form-grid"><label>Category<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Unit <span>Optional</span><input maxLength="30" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="books, km, $" /></label></div>
                <div className="goal-form-grid"><label>Target value<input type="number" min="0.01" step="0.01" required value={draft.targetValue} onChange={(e) => setDraft({ ...draft, targetValue: e.target.value })} /></label><label>Current value<input type="number" min="0" step="0.01" required value={draft.currentValue} onChange={(e) => setDraft({ ...draft, currentValue: e.target.value })} /></label></div>
                <div className="goal-form-grid"><label>Start date<input type="date" required value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></label><label>Target date<input type="date" min={draft.startDate} required value={draft.targetDate} onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })} /></label></div>
                <label>Status<select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                <div className="habit-form-actions">{editingId && <button type="button" className="button-secondary" onClick={resetForm}>Cancel</button>}<button type="submit" className="button-primary goals-primary" disabled={isSaving}>{isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Create goal'}</button></div>
              </form>
            </article>
            <section className="habit-panel goals-list-panel" aria-live="polite">
              <header className="goals-list-header"><div><span className="eyebrow">Progress</span><h2>Goal tracker</h2></div><div className="goal-filters" role="group" aria-label="Filter goals">{statuses.map((status) => <button type="button" className={filter === status ? 'active' : ''} onClick={() => setFilter(status)} key={status}>{status} <b>{counts[status]}</b></button>)}</div></header>
              {isLoading ? <div className="habit-state">Loading your goals…</div> : visibleGoals.length === 0 ? <div className="habit-state empty goals-empty"><span>◎</span><h3>No {filter.toLowerCase()} goals</h3><p>{goals.length ? 'Choose another status or update a goal.' : 'Create your first goal to start tracking meaningful progress.'}</p></div> : (
                <div className="goals-list">{visibleGoals.map((goal) => <article className={`goal-card status-${goal.status.toLowerCase()}`} key={goal.id}>
                  <header><div><span className="goal-category">{goal.category}</span><h3>{goal.title}</h3></div><span className="goal-status">{goal.status}</span></header>
                  {goal.description && <p>{goal.description}</p>}
                  <div className="goal-numbers"><strong>{formatValue(goal.currentValue)} <small>{goal.unit ?? ''}</small></strong><span>of {formatValue(goal.targetValue)} {goal.unit ?? ''}</span><b>{percent(goal)}%</b></div>
                  <div className="goal-progress" role="progressbar" aria-label={`${goal.title} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent(goal)}><i style={{ width: `${percent(goal)}%` }} /></div>
                  <div className="goal-dates"><span>Started <b>{formatDate(goal.startDate)}</b></span><span>Target <b>{formatDate(goal.targetDate)}</b><small className={targetDetail(goal.targetDate).includes('overdue') ? 'overdue' : ''}>{targetDetail(goal.targetDate)}</small></span></div>
                  <div className="goal-controls"><form onSubmit={(e) => { e.preventDefault(); updateProgress(goal, e.currentTarget.elements.progress.value) }}><label><span className="sr-only">Progress for {goal.title}</span><input name="progress" type="number" min="0" max={goal.targetValue} step="0.01" defaultValue={goal.currentValue} disabled={busyId === goal.id} /></label><button type="submit" disabled={busyId === goal.id}>Update</button></form><div>{goal.status === 'Paused' ? <button type="button" onClick={() => setStatus(goal, 'Active')} disabled={busyId === goal.id}>Resume</button> : goal.status !== 'Completed' && <button type="button" onClick={() => setStatus(goal, 'Paused')} disabled={busyId === goal.id}>Pause</button>}{goal.status !== 'Completed' && <button type="button" onClick={() => setStatus(goal, 'Completed')} disabled={busyId === goal.id}>Complete</button>}<button type="button" onClick={() => startEditing(goal)} disabled={busyId === goal.id}>Edit</button><button type="button" className="delete" onClick={() => remove(goal)} disabled={busyId === goal.id}>Delete</button></div></div>
                </article>)}</div>
              )}
            </section>
          </section>
        </main>
      </div>
    </div>
  )
}
