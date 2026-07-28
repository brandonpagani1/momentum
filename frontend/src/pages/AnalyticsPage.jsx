import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import AppSidebar from '../components/AppSidebar.jsx'
import { apiRequest } from '../lib/api.js'

const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })

function interpretation(score) {
  if (score === null) return 'Not enough data'
  if (score >= 85) return 'Excellent momentum'
  if (score >= 70) return 'Strong momentum'
  if (score >= 50) return 'Building momentum'
  return 'Room to grow'
}

function BarChart({ data, emptyText, formatValue = (value) => value }) {
  const max = Math.max(...data.map((item) => item.value), 0)
  if (max === 0) return <div className="analytics-empty compact">{emptyText}</div>

  return (
    <div className="analytics-bars" role="img" aria-label={emptyText.replace('No ', 'Chart of ')}>
      {data.map((item) => (
        <div className="analytics-bar" key={item.date}>
          <span className="bar-value">{formatValue(item.value)}</span>
          <div className="analytics-bar-track">
            <i style={{ height: `${Math.max(6, item.value / max * 100)}%` }} />
          </div>
          <b>{item.label}</b>
        </div>
      ))}
    </div>
  )
}

function Metric({ label, value, detail }) {
  return <div className="analytics-metric"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>
}

export default function AnalyticsPage() {
  const { user, accessToken, logout } = useAuth()
  const [summary, setSummary] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  const request = useCallback(() => apiRequest('/api/analytics/summary', {
    headers: { Authorization: `Bearer ${accessToken}` },
  }), [accessToken])

  const load = () => {
    setStatus('loading')
    setError('')
    request()
      .then((data) => {
        setSummary(data)
        setStatus('ready')
      })
      .catch((requestError) => {
        setError(requestError.message)
        setStatus('error')
      })
  }

  useEffect(() => {
    let isCurrent = true
    request()
      .then((data) => {
        if (!isCurrent) return
        setSummary(data)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!isCurrent) return
        setError(requestError.message)
        setStatus('error')
      })
    return () => {
      isCurrent = false
    }
  }, [request])

  const initials = user.displayName.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase()
  const components = useMemo(() => summary ? [
    ['Habits', summary.momentumScore.habits],
    ['Tasks', summary.momentumScore.tasks],
    ['Fitness', summary.momentumScore.fitness],
    ['Finance', summary.momentumScore.finance],
  ] : [], [summary])

  return (
    <div className="app-shell">
      <AppSidebar user={user} onLogout={logout} />
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">M</span><strong>Momentum</strong></div>
          <div className="crumb"><span>Workspace</span><b>/</b><strong>Analytics</strong></div>
          <div className="top-actions"><div className="top-avatar">{initials}</div></div>
        </header>

        <main className="analytics-page">
          <section className="analytics-heading">
            <div><p className="date">Your progress, in focus</p><h1>Analytics & insights</h1><p>See how your daily actions add up across every part of Momentum.</p></div>
          </section>

          {status === 'loading' && <div className="analytics-state" aria-live="polite">Building your analytics…</div>}
          {status === 'error' && <div className="analytics-state error" role="alert"><h2>Analytics couldn’t load</h2><p>{error}</p><button type="button" onClick={load}>Try again</button></div>}
          {status === 'ready' && !summary.hasAnyData && <div className="analytics-state empty"><span>✦</span><h2>Your insights will appear here</h2><p>Add a habit, task, workout, or transaction to begin building your Momentum Score.</p></div>}

          {status === 'ready' && summary.hasAnyData && (
            <>
              <section className="analytics-score-card">
                <div className="analytics-score">
                  <span>Momentum Score</span>
                  <strong>{summary.momentumScore.score ?? '—'}<small>{summary.momentumScore.score !== null && '/100'}</small></strong>
                  <p>{interpretation(summary.momentumScore.score)}</p>
                </div>
                <div className="component-scores">
                  <h2>Component breakdown</h2>
                  {components.map(([name, component]) => <div key={name}><span>{name}<small>{component.weight}% weight</small></span><div><i style={{ width: `${component.score ?? 0}%` }} /></div><b>{component.hasData ? component.score : 'N/A'}</b></div>)}
                  <p>Only areas with data count toward your score.</p>
                </div>
              </section>

              <section className="weekly-overview">
                <header><span className="eyebrow">At a glance</span><h2>Weekly overview</h2></header>
                <div>
                  <Metric label="Habits today" value={`${summary.habits.todayCompletionPercentage}%`} detail={`${summary.habits.completedToday} of ${summary.habits.totalActiveHabits}`} />
                  <Metric label="Tasks completed" value={summary.tasks.completedTasks} detail={`${summary.tasks.remainingTasks} remaining`} />
                  <Metric label="Workout minutes" value={summary.fitness.minutesThisWeek} detail={`${summary.fitness.workoutsThisWeek} workouts`} />
                  <Metric label="Monthly balance" value={currency.format(summary.finance.monthlyBalance)} detail="Income minus expenses" />
                </div>
              </section>

              <section className="analytics-grid">
                <article className="analytics-card">
                  <header><div><span className="eyebrow purple-text">Consistency</span><h2>Habits</h2></div><strong>{summary.habits.todayCompletionPercentage}% today</strong></header>
                  <BarChart data={summary.habits.dailyCompletions} emptyText="No habit completions this week." />
                  <footer>{summary.habits.completionsThisWeek} completions this week</footer>
                </article>

                <article className="analytics-card">
                  <header><div><span className="eyebrow orange-text">Execution</span><h2>Tasks</h2></div><strong>{summary.tasks.completionPercentage}% complete</strong></header>
                  <div className="task-split">
                    <Metric label="Completed" value={summary.tasks.completedTasks} />
                    <Metric label="Remaining" value={summary.tasks.remainingTasks} />
                  </div>
                  <div className="split-bar" aria-label={`${summary.tasks.completionPercentage}% of tasks completed`}><i style={{ width: `${summary.tasks.completionPercentage}%` }} /></div>
                  {!summary.tasks.isWeeklyActivityAvailable && <p className="data-note">Weekly activity needs completion dates, which aren’t recorded yet.</p>}
                </article>

                <article className="analytics-card">
                  <header><div><span className="eyebrow green-text">Movement</span><h2>Fitness</h2></div><strong>{summary.fitness.minutesThisWeek} min</strong></header>
                  <BarChart data={summary.fitness.dailyMinutes} emptyText="No workout minutes this week." formatValue={(value) => `${value}m`} />
                  <div className="analytics-stat-row"><span><b>{summary.fitness.workoutsThisWeek}</b> workouts</span><span><b>{summary.fitness.caloriesThisWeek}</b> calories</span><span><b>{summary.fitness.workoutsThisMonth}</b> this month</span></div>
                </article>

                <article className="analytics-card finance-analytics">
                  <header><div><span className="eyebrow teal-text">Cash flow</span><h2>Finance</h2></div><strong>{currency.format(summary.finance.monthlyBalance)}</strong></header>
                  <div className="income-expense"><Metric label="Income" value={currency.format(summary.finance.incomeThisMonth)} /><Metric label="Expenses" value={currency.format(summary.finance.expensesThisMonth)} /></div>
                  <h3>Expenses by category</h3>
                  {summary.finance.expensesByCategory.length === 0 ? <div className="analytics-empty compact">No expenses this month.</div> : <div className="category-list">{summary.finance.expensesByCategory.map((item) => <div key={item.category}><span>{item.category}</span><i><b style={{ width: `${item.total / summary.finance.expensesThisMonth * 100}%` }} /></i><strong>{currency.format(item.total)}</strong></div>)}</div>}
                </article>

                <article className="analytics-card goals-analytics">
                  <header><div><span className="eyebrow green-text">Milestones</span><h2>Goals</h2></div><strong>{summary.goals.completionRate}% complete</strong></header>
                  <div className="analytics-stat-row">
                    <span><b>{summary.goals.activeGoals}</b> active</span>
                    <span><b>{summary.goals.completedGoals}</b> completed</span>
                    <span><b>{summary.goals.pausedGoals}</b> paused</span>
                  </div>
                  <div className="goal-analytics-progress"><div><span>Average active progress</span><b>{summary.goals.averageActiveProgress}%</b></div><div className="split-bar" role="progressbar" aria-label="Average progress across active goals" aria-valuemin="0" aria-valuemax="100" aria-valuenow={summary.goals.averageActiveProgress}><i style={{ width: `${summary.goals.averageActiveProgress}%` }} /></div></div>
                  <p className="data-note">Goals are reported here but do not change the Momentum Score formula.</p>
                </article>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
