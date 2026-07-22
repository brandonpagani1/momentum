import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import AppSidebar from '../components/AppSidebar.jsx'
import { apiRequest } from '../lib/api.js'

const emptyDraft = { name: '', description: '' }

export default function HabitsPage() {
  const { user, accessToken, logout } = useAuth()
  const [habits, setHabits] = useState([])
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
    request('/api/habits')
      .then(setHabits)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false))
  }, [request])

  const resetForm = () => {
    setDraft(emptyDraft)
    setEditingId(null)
  }

  const submitHabit = async (event) => {
    event.preventDefault()
    if (!draft.name.trim()) return
    setIsSaving(true)
    setError('')
    try {
      const saved = await request(editingId ? `/api/habits/${editingId}` : '/api/habits', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(draft),
      })
      setHabits((current) => editingId
        ? current.map((habit) => habit.id === editingId ? saved : habit)
        : [...current, saved])
      resetForm()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (habit) => {
    setEditingId(habit.id)
    setDraft({ name: habit.name, description: habit.description ?? '' })
    setError('')
  }

  const toggleToday = async (habit) => {
    setBusyId(habit.id)
    setError('')
    try {
      const updated = await request(`/api/habits/${habit.id}/today`, {
        method: 'PUT',
        body: JSON.stringify({ isCompleted: !habit.isCompletedToday }),
      })
      setHabits((current) => current.map((item) => item.id === habit.id ? updated : item))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId(null)
    }
  }

  const deleteHabit = async (habit) => {
    if (!window.confirm(`Delete “${habit.name}”? This cannot be undone.`)) return
    setBusyId(habit.id)
    setError('')
    try {
      await request(`/api/habits/${habit.id}`, { method: 'DELETE' })
      setHabits((current) => current.filter((item) => item.id !== habit.id))
      if (editingId === habit.id) resetForm()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId(null)
    }
  }

  const completedCount = habits.filter((habit) => habit.isCompletedToday).length
  const initials = user.displayName.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="app-shell">
      <AppSidebar user={user} onLogout={logout} />
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">M</span><strong>Momentum</strong></div>
          <div className="crumb"><span>Workspace</span><b>/</b><strong>Habits</strong></div>
          <div className="top-actions"><div className="top-avatar">{initials}</div></div>
        </header>

        <main className="habits-page">
          <section className="habits-heading">
            <div><p className="date">Daily practice</p><h1>Your habits</h1><p>Small actions, repeated consistently, create momentum.</p></div>
            <div className="completion-summary"><strong>{completedCount}</strong><span>of {habits.length}<br />done today</span></div>
          </section>

          {error && <div className="habits-error" role="alert">{error}</div>}

          <section className="habits-layout">
            <article className="habit-panel habit-form-card">
              <span className="eyebrow purple-text">{editingId ? 'Update habit' : 'New habit'}</span>
              <h2>{editingId ? 'Edit your habit' : 'Build a new rhythm'}</h2>
              <form onSubmit={submitHabit}>
                <label>Habit name<input maxLength="100" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Read for 20 minutes" required /></label>
                <label>Note <span>Optional</span><textarea maxLength="300" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Why does this matter to you?" /></label>
                <div className="habit-form-actions">
                  {editingId && <button type="button" className="button-secondary" onClick={resetForm}>Cancel</button>}
                  <button type="submit" className="button-primary" disabled={isSaving || !draft.name.trim()}>{isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Add habit'}</button>
                </div>
              </form>
            </article>

            <section className="habit-panel habit-list-panel" aria-live="polite">
              <header><div><span className="eyebrow">Today</span><h2>Daily checklist</h2></div><span className="habit-total">{habits.length} {habits.length === 1 ? 'habit' : 'habits'}</span></header>
              {isLoading ? <div className="habit-state">Loading your habits…</div> : habits.length === 0 ? (
                <div className="habit-state empty"><span>✓</span><h3>Your list is ready</h3><p>Add your first habit and start building a streak today.</p></div>
              ) : (
                <div className="habits-list">
                  {habits.map((habit) => <article className={`habit-row ${habit.isCompletedToday ? 'complete' : ''}`} key={habit.id}>
                    <button className="habit-toggle" type="button" disabled={busyId === habit.id} onClick={() => toggleToday(habit)} aria-label={`${habit.isCompletedToday ? 'Mark incomplete' : 'Mark complete'}: ${habit.name}`} aria-pressed={habit.isCompletedToday}>{habit.isCompletedToday ? '✓' : ''}</button>
                    <div className="habit-copy"><h3>{habit.name}</h3>{habit.description && <p>{habit.description}</p>}<span><b>↗</b> {habit.currentStreak} day streak</span></div>
                    <div className="habit-actions"><button type="button" onClick={() => startEditing(habit)} disabled={busyId === habit.id}>Edit</button><button className="delete" type="button" onClick={() => deleteHabit(habit)} disabled={busyId === habit.id}>Delete</button></div>
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
