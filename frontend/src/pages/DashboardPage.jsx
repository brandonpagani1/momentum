import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import AppSidebar from '../components/AppSidebar.jsx'
import { apiRequest } from '../lib/api.js'

const week = [
  ['M', 76], ['T', 92], ['W', 64], ['T', 86], ['F', 72], ['S', 48], ['S', 58],
]

function CardHeader({ eyebrow, title, meta, accent }) {
  return <header className="card-header"><div><span className={`eyebrow ${accent || ''}`}>{eyebrow}</span><h2>{title}</h2></div>{meta && <span className="meta">{meta}</span>}</header>
}

function formatDueDate(value) {
  if (!value) return 'No due date'

  const dueDate = new Date(`${value}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (dueDate.getTime() === today.getTime()) return 'Today'
  if (dueDate.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(dueDate)
}

function DashboardPage() {
  const { user, accessToken, logout } = useAuth()
  const [habits, setHabits] = useState([])
  const [tasks, setTasks] = useState([])
  const [habitsStatus, setHabitsStatus] = useState('loading')
  const [tasksStatus, setTasksStatus] = useState('loading')

  const request = useCallback((path) => apiRequest(path, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }), [accessToken])

  useEffect(() => {
    let isCurrent = true

    request('/api/habits')
      .then((items) => {
        if (!isCurrent) return
        setHabits(items)
        setHabitsStatus('ready')
      })
      .catch(() => {
        if (isCurrent) setHabitsStatus('error')
      })

    request('/api/tasks')
      .then((items) => {
        if (!isCurrent) return
        setTasks(items)
        setTasksStatus('ready')
      })
      .catch(() => {
        if (isCurrent) setTasksStatus('error')
      })

    return () => {
      isCurrent = false
    }
  }, [request])

  const firstName = user.displayName.split(' ')[0]
  const initials = user.displayName.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase()
  const completedHabits = habits.filter((habit) => habit.isCompletedToday).length
  const habitProgress = habits.length ? Math.round((completedHabits / habits.length) * 100) : 0
  const completedTasks = tasks.filter((task) => task.isCompleted).length
  const remainingTasks = tasks.length - completedTasks
  const taskProgress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0
  const focusTask = useMemo(() => tasks
    .filter((task) => !task.isCompleted)
    .sort((left, right) =>
      left.priority - right.priority
      || (left.dueDate ?? '9999-12-31').localeCompare(right.dueDate ?? '9999-12-31')
      || left.createdAt.localeCompare(right.createdAt))[0], [tasks])

  return (
    <div className="app-shell">
      <AppSidebar user={user} onLogout={logout} />
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">M</span><strong>Momentum</strong></div>
          <div className="crumb"><span>Dashboard</span><b>/</b><strong>Overview</strong></div>
          <div className="top-actions"><div className="search"><span>⌕</span><span>Search anything</span><kbd>⌘ K</kbd></div><div className="notification">•</div><div className="top-avatar">{initials}</div></div>
        </header>

        <main>
          <section className="welcome">
            <div><p className="date">Tuesday, July 22</p><h1>Good morning, {firstName}.</h1><p>Here’s the shape of your day. Keep the momentum going.</p></div>
            <div className="day-pill"><span className="status-dot"></span>Day 18 of your streak</div>
          </section>

          <section className="dashboard-grid">
            <article className="card score-card">
              <CardHeader eyebrow="Overall performance" title="Momentum Score" meta="This week" />
              <div className="score-content">
                <div className="score-ring"><div><strong>82</strong><span>Excellent</span></div></div>
                <div className="score-copy"><div className="trend">↗ <strong>6 points</strong> <span>from last week</span></div><p>You’re building a strong rhythm across your core areas.</p><div className="score-legend"><span><i className="purple"></i>Habits <b>90</b></span><span><i className="green"></i>Fitness <b>78</b></span><span><i className="orange"></i>Tasks <b>81</b></span></div></div>
              </div>
            </article>

            <article className="card habits-card">
              <CardHeader eyebrow="Today" title="Habits" meta={habitsStatus === 'ready' ? `${completedHabits} of ${habits.length}` : ''} accent="purple-text" />
              {habitsStatus === 'loading' ? <div className="dashboard-card-state">Loading habits…</div> : habitsStatus === 'error' ? <div className="dashboard-card-state error">Couldn’t load habits.</div> : habits.length === 0 ? <div className="dashboard-card-state">No habits yet.</div> : (
                <div className="habit-list">
                  {habits.slice(0, 3).map((habit) => <div key={habit.id}><span className={`check ${habit.isCompletedToday ? 'checked' : ''}`}>{habit.isCompletedToday ? '✓' : ''}</span><p><strong>{habit.name}</strong><small>{habit.currentStreak} day streak</small></p><em>{habit.isCompletedToday ? 'Done' : 'Today'}</em></div>)}
                </div>
              )}
              <div className="progress-line"><span style={{width: `${habitProgress}%`}}></span></div>
            </article>

            <article className="card tasks-card">
              <CardHeader eyebrow="Focus" title="Tasks" meta={tasksStatus === 'ready' ? `${remainingTasks} remaining` : ''} accent="orange-text" />
              {tasksStatus === 'loading' ? <div className="dashboard-card-state">Loading tasks…</div> : tasksStatus === 'error' ? <div className="dashboard-card-state error">Couldn’t load tasks.</div> : tasks.length === 0 ? <div className="dashboard-card-state">No tasks yet.</div> : (
                <>
                  <div className="task-summary"><strong>{completedTasks}</strong><span>completed<br/>in total</span><div className="donut" style={{background: `conic-gradient(#df9a58 ${taskProgress}%, #f4e9df 0)`}}><b>{taskProgress}%</b></div></div>
                  {focusTask ? <div className="priority"><span>{focusTask.priority === 1 ? 'High' : focusTask.priority === 2 ? 'Medium' : 'Low'} priority</span><strong>{focusTask.title}</strong><small>{formatDueDate(focusTask.dueDate)} · Open</small></div> : <div className="priority complete-priority"><span>All complete</span><strong>You’re caught up</strong><small>No remaining tasks</small></div>}
                </>
              )}
            </article>

            <article className="card weekly-card">
              <CardHeader eyebrow="Activity" title="Weekly Progress" meta="Jul 16–22" accent="blue-text" />
              <div className="chart">
                {week.map(([day, height], index) => <div className="bar-col" key={index}><div className="bar-track"><span style={{height: `${height}%`}} className={index === 3 ? 'highlight' : ''}></span></div><b>{day}</b></div>)}
              </div>
              <div className="chart-footer"><span><i></i>Daily score</span><strong>+12% <small>vs. last week</small></strong></div>
            </article>

            <article className="card fitness-card">
              <CardHeader eyebrow="Movement" title="Fitness" meta="Today" accent="green-text" />
              <div className="fitness-main"><div className="metric-icon">↗</div><div><strong>6,842</strong><span>steps</span></div><em>68%</em></div>
              <div className="progress-line green"><span style={{width: '68%'}}></span></div>
              <div className="stat-row"><span><b>42</b><small>active min</small></span><span><b>2.8</b><small>kilometers</small></span><span><b>310</b><small>calories</small></span></div>
            </article>

            <article className="card finance-card">
              <CardHeader eyebrow="This month" title="Finance" meta="July" accent="teal-text" />
              <div className="budget"><div><span>Monthly budget</span><strong>$2,184 <small>of $3,200</small></strong></div><b>68%</b></div>
              <div className="progress-line teal"><span style={{width: '68%'}}></span></div>
              <div className="finance-note"><span>↓</span><p><strong>$184 under pace</strong><small>Looking good for this month</small></p></div>
            </article>

            <article className="card insights-card">
              <CardHeader eyebrow="For you" title="Insights" meta="Updated today" accent="purple-text" />
              <div className="insight-content"><div className="spark">✦</div><div><strong>Your most productive window is 9–11 AM</strong><p>You complete 34% more priority tasks when you start before 9:30.</p><span>Based on your last 4 weeks</span></div></div>
            </article>
          </section>
        </main>
      </div>
    </div>
  )
}

export default DashboardPage
