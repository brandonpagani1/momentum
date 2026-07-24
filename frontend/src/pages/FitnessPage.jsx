import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import AppSidebar from '../components/AppSidebar.jsx'
import { apiRequest } from '../lib/api.js'

function todayValue() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

const newDraft = () => ({
  workoutType: '',
  durationMinutes: '',
  workoutDate: todayValue(),
  caloriesBurned: '',
  notes: '',
})

function sortWorkouts(items) {
  return [...items].sort((left, right) =>
    right.workoutDate.localeCompare(left.workoutDate)
    || right.createdAt.localeCompare(left.createdAt))
}

function formatWorkoutDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export default function FitnessPage() {
  const { user, accessToken, logout } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [draft, setDraft] = useState(newDraft)
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
    request('/api/workouts')
      .then(setWorkouts)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false))
  }, [request])

  const resetForm = () => {
    setDraft(newDraft())
    setEditingId(null)
  }

  const submitWorkout = async (event) => {
    event.preventDefault()
    const duration = Number(draft.durationMinutes)
    const calories = draft.caloriesBurned === '' ? null : Number(draft.caloriesBurned)
    if (!draft.workoutType.trim() || !draft.workoutDate
      || !Number.isInteger(duration) || duration < 1 || duration > 1440
      || (calories !== null && (!Number.isInteger(calories) || calories < 0))) return

    setIsSaving(true)
    setError('')
    try {
      const payload = {
        ...draft,
        durationMinutes: duration,
        caloriesBurned: calories,
      }
      const saved = await request(editingId ? `/api/workouts/${editingId}` : '/api/workouts', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
      setWorkouts((current) => sortWorkouts(editingId
        ? current.map((workout) => workout.id === editingId ? saved : workout)
        : [...current, saved]))
      resetForm()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (workout) => {
    setEditingId(workout.id)
    setDraft({
      workoutType: workout.workoutType,
      durationMinutes: workout.durationMinutes,
      workoutDate: workout.workoutDate,
      caloriesBurned: workout.caloriesBurned ?? '',
      notes: workout.notes ?? '',
    })
    setError('')
  }

  const deleteWorkout = async (workout) => {
    if (!window.confirm(`Delete your ${workout.workoutType} workout? This cannot be undone.`)) return
    setBusyId(workout.id)
    setError('')
    try {
      await request(`/api/workouts/${workout.id}`, { method: 'DELETE' })
      setWorkouts((current) => current.filter((item) => item.id !== workout.id))
      if (editingId === workout.id) resetForm()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId(null)
    }
  }

  const totalMinutes = workouts.reduce((total, workout) => total + workout.durationMinutes, 0)
  const initials = user.displayName.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="app-shell">
      <AppSidebar user={user} onLogout={logout} />
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">M</span><strong>Momentum</strong></div>
          <div className="crumb"><span>Workspace</span><b>/</b><strong>Fitness</strong></div>
          <div className="top-actions"><div className="top-avatar">{initials}</div></div>
        </header>

        <main className="fitness-page">
          <section className="habits-heading fitness-heading">
            <div><p className="date">Movement and energy</p><h1>Your fitness</h1><p>Log each workout and watch your active time add up.</p></div>
            <div className="completion-summary fitness-summary"><strong>{totalMinutes}</strong><span>minutes across<br />{workouts.length} {workouts.length === 1 ? 'workout' : 'workouts'}</span></div>
          </section>

          {error && <div className="habits-error" role="alert">{error}</div>}

          <section className="habits-layout">
            <article className="habit-panel habit-form-card fitness-form-card">
              <span className="eyebrow green-text">{editingId ? 'Update workout' : 'New workout'}</span>
              <h2>{editingId ? 'Edit your workout' : 'Log your movement'}</h2>
              <form onSubmit={submitWorkout}>
                <label>Workout type<input maxLength="100" value={draft.workoutType} onChange={(event) => setDraft({ ...draft, workoutType: event.target.value })} placeholder="e.g. Strength training" required /></label>
                <div className="task-form-grid">
                  <label>Duration (minutes)<input type="number" min="1" max="1440" step="1" value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: event.target.value })} required /></label>
                  <label>Workout date<input type="date" value={draft.workoutDate} onChange={(event) => setDraft({ ...draft, workoutDate: event.target.value })} required /></label>
                </div>
                <label>Calories burned <span>Optional</span><input type="number" min="0" step="1" value={draft.caloriesBurned} onChange={(event) => setDraft({ ...draft, caloriesBurned: event.target.value })} placeholder="e.g. 320" /></label>
                <label>Notes <span>Optional</span><textarea maxLength="500" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="How did the workout feel?" /></label>
                <div className="habit-form-actions">
                  {editingId && <button type="button" className="button-secondary" onClick={resetForm}>Cancel</button>}
                  <button type="submit" className="button-primary fitness-primary" disabled={isSaving}>{isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Log workout'}</button>
                </div>
              </form>
            </article>

            <section className="habit-panel habit-list-panel" aria-live="polite">
              <header><div><span className="eyebrow">History</span><h2>Workout history</h2></div><span className="habit-total">{workouts.length} {workouts.length === 1 ? 'workout' : 'workouts'}</span></header>
              {isLoading ? <div className="habit-state">Loading your workouts…</div> : workouts.length === 0 ? (
                <div className="habit-state empty fitness-empty"><span>↗</span><h3>No workouts logged yet</h3><p>Log your first workout to start building your history.</p></div>
              ) : (
                <div className="habits-list">
                  {workouts.map((workout) => <article className="habit-row fitness-row" key={workout.id}>
                    <div className="workout-icon" aria-hidden="true">↗</div>
                    <div className="habit-copy fitness-copy">
                      <h3>{workout.workoutType}</h3>
                      {workout.notes && <p>{workout.notes}</p>}
                      <span><b>◷</b> {workout.durationMinutes} min · {formatWorkoutDate(workout.workoutDate)}{workout.caloriesBurned !== null ? ` · ${workout.caloriesBurned} cal` : ''}</span>
                    </div>
                    <div className="habit-actions"><button type="button" onClick={() => startEditing(workout)} disabled={busyId === workout.id}>Edit</button><button className="delete" type="button" onClick={() => deleteWorkout(workout)} disabled={busyId === workout.id}>Delete</button></div>
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
