import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import AppSidebar from '../components/AppSidebar.jsx'
import { apiRequest } from '../lib/api.js'

const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })
const dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

function CardHeader({ eyebrow, title, meta, accent }) {
  return <header className="card-header"><div><span className={`eyebrow ${accent || ''}`}>{eyebrow}</span><h2>{title}</h2></div>{meta && <span className="meta">{meta}</span>}</header>
}

function CardLink({ to, children = 'View details' }) {
  return <Link className="card-link" to={to}>{children}<span aria-hidden="true">→</span></Link>
}

function DashboardState({ status = 'loading', children, dark = false }) {
  const isError = status === 'error'
  return (
    <div
      className={`dashboard-card-state ${status} ${dark ? 'dark' : ''}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      {status === 'loading' && <span className="loading-shimmer" aria-hidden="true"><i /><i /><i /></span>}
      <span>{children}</span>
    </div>
  )
}

function dueDetails(value) {
  if (!value) return { label: 'No due date', tone: 'neutral' }
  const dueDate = new Date(`${value}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysAway = Math.round((dueDate - today) / 86_400_000)
  if (daysAway < 0) return { label: `Overdue by ${Math.abs(daysAway)} ${Math.abs(daysAway) === 1 ? 'day' : 'days'}`, tone: 'overdue' }
  if (daysAway === 0) return { label: 'Due today', tone: 'today' }
  if (daysAway === 1) return { label: 'Due tomorrow', tone: 'soon' }
  if (daysAway <= 7) return { label: `Due in ${daysAway} days`, tone: 'soon' }
  return {
    label: `Due ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(dueDate)}`,
    tone: 'neutral',
  }
}

function formatTransactionDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
    .format(new Date(`${value}T00:00:00`))
}

function scoreLabel(score) {
  if (score === null) return 'Not enough data'
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Strong'
  if (score >= 50) return 'Building'
  return 'Growing'
}

function buildInsight(analytics) {
  if (!analytics?.hasAnyData) return {
    title: 'Your first insight is one step away',
    body: 'Add activity in any area and Momentum will surface a useful, data-based takeaway here.',
  }
  if (analytics.tasks.totalTasks > 0 && analytics.tasks.remainingTasks === 0) return {
    title: 'Your task list is all caught up',
    body: `You have completed all ${analytics.tasks.totalTasks} of your current tasks.`,
  }
  if (analytics.finance.expensesThisMonth > analytics.finance.incomeThisMonth) return {
    title: 'Expenses are above income this month',
    body: `Your current monthly balance is ${currency.format(analytics.finance.monthlyBalance)}. Review your categories for more detail.`,
  }
  const components = [
    ['habits', analytics.momentumScore.habits],
    ['tasks', analytics.momentumScore.tasks],
    ['fitness', analytics.momentumScore.fitness],
    ['finance', analytics.momentumScore.finance],
  ].filter(([, component]) => component.hasData)
  if (components.length > 0) {
    const [name, component] = [...components].sort((left, right) => right[1].score - left[1].score)[0]
    return {
      title: `${name[0].toUpperCase()}${name.slice(1)} is your strongest area`,
      body: `Its component score is ${component.score}/100. Keep that rhythm while building the other areas.`,
    }
  }
  return {
    title: `${analytics.habits.todayCompletionPercentage}% of today’s habits are complete`,
    body: `${analytics.habits.completedToday} of ${analytics.habits.totalActiveHabits} habits are done today.`,
  }
}

export default function DashboardPage() {
  const { user, accessToken, logout } = useAuth()
  const [habits, setHabits] = useState([])
  const [tasks, setTasks] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [habitsStatus, setHabitsStatus] = useState('loading')
  const [tasksStatus, setTasksStatus] = useState('loading')
  const [fitnessStatus, setFitnessStatus] = useState('loading')
  const [financeStatus, setFinanceStatus] = useState('loading')
  const [analytics, setAnalytics] = useState(null)
  const [analyticsStatus, setAnalyticsStatus] = useState('loading')

  const request = useCallback((path) => apiRequest(path, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }), [accessToken])

  useEffect(() => {
    let isCurrent = true
    const load = (path, setData, setStatus) => request(path)
      .then((items) => {
        if (!isCurrent) return
        setData(items)
        setStatus('ready')
      })
      .catch(() => {
        if (isCurrent) setStatus('error')
      })

    load('/api/habits', setHabits, setHabitsStatus)
    load('/api/tasks', setTasks, setTasksStatus)
    load('/api/workouts', setWorkouts, setFitnessStatus)
    load('/api/financetransactions', setTransactions, setFinanceStatus)
    load('/api/analytics/summary', setAnalytics, setAnalyticsStatus)

    return () => {
      isCurrent = false
    }
  }, [request])

  const now = new Date()
  const firstName = user.displayName.split(' ')[0]
  const initials = user.displayName.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
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
  const focusDue = dueDetails(focusTask?.dueDate)

  const weekStart = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
  const weekStartValue = [weekStart.getFullYear(), String(weekStart.getMonth() + 1).padStart(2, '0'), String(weekStart.getDate()).padStart(2, '0')].join('-')
  const nextWeekStart = new Date(weekStart)
  nextWeekStart.setDate(weekStart.getDate() + 7)
  const nextWeekStartValue = [nextWeekStart.getFullYear(), String(nextWeekStart.getMonth() + 1).padStart(2, '0'), String(nextWeekStart.getDate()).padStart(2, '0')].join('-')
  const weeklyWorkouts = workouts.filter((workout) => workout.workoutDate >= weekStartValue && workout.workoutDate < nextWeekStartValue)
  const weeklyMinutes = weeklyWorkouts.reduce((total, workout) => total + workout.durationMinutes, 0)
  const weeklyCalories = weeklyWorkouts.reduce((total, workout) => total + (workout.caloriesBurned ?? 0), 0)
  const fitnessProgress = Math.min(100, Math.round(weeklyMinutes / 150 * 100))
  const latestWorkout = workouts[0]

  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthlyTransactions = transactions.filter((transaction) => transaction.transactionDate.startsWith(currentMonth))
  const monthlyIncome = monthlyTransactions.filter((transaction) => transaction.type === 'Income').reduce((total, transaction) => total + transaction.amount, 0)
  const monthlyExpenses = monthlyTransactions.filter((transaction) => transaction.type === 'Expense').reduce((total, transaction) => total + transaction.amount, 0)
  const monthlyBalance = monthlyIncome - monthlyExpenses
  const latestTransaction = transactions[0]
  const monthName = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(now)
  const momentumScore = analytics?.momentumScore.score
  const dailyHabitMax = Math.max(...(analytics?.habits.dailyCompletions.map((day) => day.value) ?? [0]), 1)
  const hasWeeklyHabitActivity = (analytics?.habits.completionsThisWeek ?? 0) > 0
  const insight = buildInsight(analytics)

  const summaryItems = [
    { tone: 'purple', icon: '✓', label: 'Habits today', value: habitsStatus === 'ready' ? `${completedHabits}/${habits.length}` : '—', detail: habitsStatus === 'error' ? 'Unavailable' : `${habitProgress}% complete` },
    { tone: 'orange', icon: '□', label: 'Tasks remaining', value: tasksStatus === 'ready' ? remainingTasks : '—', detail: tasksStatus === 'error' ? 'Unavailable' : `${taskProgress}% complete overall` },
    { tone: 'green', icon: '↗', label: 'Weekly movement', value: fitnessStatus === 'ready' ? `${weeklyMinutes} min` : '—', detail: fitnessStatus === 'error' ? 'Unavailable' : `${fitnessProgress}% of 150 min` },
    { tone: 'teal', icon: '$', label: 'Monthly balance', value: financeStatus === 'ready' ? currency.format(monthlyBalance) : '—', detail: financeStatus === 'error' ? 'Unavailable' : monthName },
  ]

  return (
    <div className="app-shell">
      <AppSidebar user={user} onLogout={logout} />
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">M</span><strong>Momentum</strong></div>
          <div className="crumb"><span>Dashboard</span><b>/</b><strong>Overview</strong></div>
          <div className="top-actions"><div className="top-avatar" aria-label={`Signed in as ${user.displayName}`}>{initials}</div></div>
        </header>

        <main className="dashboard-page">
          <section className="welcome">
            <div><p className="date">{dateFormatter.format(now)}</p><h1>{greeting}, {firstName}.</h1><p>Here’s the shape of your day. Keep the momentum going.</p></div>
            {habitsStatus === 'ready' && habits.length > 0 && <div className="day-pill"><span className="status-dot" />{completedHabits} of {habits.length} habits complete today</div>}
          </section>

          <section className="dashboard-summary" aria-label="Today at a glance" aria-busy={[habitsStatus, tasksStatus, fitnessStatus, financeStatus].includes('loading')}>
            {summaryItems.map((item) => <article className={`summary-item ${item.tone}`} key={item.label}><span className="summary-icon" aria-hidden="true">{item.icon}</span><div><span>{item.label}</span><strong className={item.label === 'Monthly balance' && monthlyBalance < 0 ? 'negative' : ''}>{item.value}</strong><small>{item.detail}</small></div></article>)}
          </section>

          <section className="quick-actions" aria-labelledby="quick-actions-title">
            <div><span className="eyebrow">Shortcuts</span><h2 id="quick-actions-title">Quick actions</h2></div>
            <nav aria-label="Quick actions">
              <Link to="/habits"><span aria-hidden="true">＋</span>Add habit</Link>
              <Link to="/tasks"><span aria-hidden="true">＋</span>Add task</Link>
              <Link to="/fitness"><span aria-hidden="true">↗</span>Log workout</Link>
              <Link to="/finance"><span aria-hidden="true">$</span>Add transaction</Link>
            </nav>
          </section>

          <section className="dashboard-grid">
            <article className="card score-card" aria-busy={analyticsStatus === 'loading'}>
              <CardHeader eyebrow="Overall performance" title="Momentum Score" meta="This week" />
              {analyticsStatus === 'loading' ? <DashboardState>Calculating your score…</DashboardState> : analyticsStatus === 'error' ? <DashboardState status="error">Momentum Score is temporarily unavailable.</DashboardState> : (
                <div className="score-content">
                  <div className="score-ring" style={{ '--score': `${momentumScore ?? 0}%` }}><div><strong>{momentumScore ?? '—'}</strong><span>{scoreLabel(momentumScore)}</span></div></div>
                  <div className="score-copy"><p>{momentumScore === null ? 'Add activity to begin building your score.' : 'Your score blends only the areas where you have meaningful activity.'}</p><div className="score-legend"><span><i className="purple" />Habits <b>{analytics.momentumScore.habits.score ?? 'N/A'}</b></span><span><i className="orange" />Tasks <b>{analytics.momentumScore.tasks.score ?? 'N/A'}</b></span><span><i className="green" />Fitness <b>{analytics.momentumScore.fitness.score ?? 'N/A'}</b></span><span><i className="teal" />Finance <b>{analytics.momentumScore.finance.score ?? 'N/A'}</b></span></div></div>
                </div>
              )}
              <CardLink to="/analytics">Explore analytics</CardLink>
            </article>

            <article className="card habits-card" aria-busy={habitsStatus === 'loading'}>
              <CardHeader eyebrow="Today" title="Habits" meta={habitsStatus === 'ready' ? `${completedHabits} of ${habits.length}` : ''} accent="purple-text" />
              {habitsStatus === 'loading' ? <DashboardState>Loading habits…</DashboardState> : habitsStatus === 'error' ? <DashboardState status="error">Habits are temporarily unavailable.</DashboardState> : habits.length === 0 ? <DashboardState status="empty">No habits yet. Add one to begin a daily rhythm.</DashboardState> : (
                <div className="habit-list">
                  {habits.slice(0, 3).map((habit) => <div key={habit.id}><span className={`check ${habit.isCompletedToday ? 'checked' : ''}`} aria-label={habit.isCompletedToday ? 'Completed today' : 'Not completed today'}>{habit.isCompletedToday ? '✓' : ''}</span><p><strong>{habit.name}</strong><small>{habit.currentStreak} day streak</small></p><em>{habit.isCompletedToday ? 'Done' : 'Today'}</em></div>)}
                </div>
              )}
              <div className="progress-caption"><span>Today’s progress</span><b>{habitProgress}%</b></div>
              <div className="progress-line" role="progressbar" aria-label="Habit completion today" aria-valuemin="0" aria-valuemax="100" aria-valuenow={habitProgress}><span style={{ width: `${habitProgress}%` }} /></div>
              <CardLink to="/habits">Manage habits</CardLink>
            </article>

            <article className="card tasks-card" aria-busy={tasksStatus === 'loading'}>
              <CardHeader eyebrow="Focus" title="Tasks" meta={tasksStatus === 'ready' ? `${remainingTasks} remaining` : ''} accent="orange-text" />
              {tasksStatus === 'loading' ? <DashboardState>Loading tasks…</DashboardState> : tasksStatus === 'error' ? <DashboardState status="error">Tasks are temporarily unavailable.</DashboardState> : tasks.length === 0 ? <DashboardState status="empty">Your task list is empty. Add your next priority.</DashboardState> : (
                <>
                  <div className="task-summary"><strong>{remainingTasks}</strong><span>remaining<br />right now</span><div className="donut" style={{ background: `conic-gradient(#df9a58 ${taskProgress}%, #f4e9df 0)` }} aria-label={`${taskProgress}% of tasks complete`}><b>{taskProgress}%</b></div></div>
                  {focusTask ? <div className={`priority urgency-${focusDue.tone}`}><span>{focusTask.priority === 1 ? 'High' : focusTask.priority === 2 ? 'Medium' : 'Low'} priority</span><strong>{focusTask.title}</strong><small>{focusDue.label}</small></div> : <div className="priority complete-priority"><span>All complete</span><strong>You’re caught up</strong><small>No remaining tasks</small></div>}
                </>
              )}
              <CardLink to="/tasks">View all tasks</CardLink>
            </article>

            <article className="card weekly-card" aria-busy={analyticsStatus === 'loading'}>
              <CardHeader eyebrow="Activity" title="Weekly Progress" meta="Habit completions" accent="blue-text" />
              {analyticsStatus === 'loading' ? <DashboardState>Loading weekly progress…</DashboardState> : analyticsStatus === 'error' ? <DashboardState status="error">Weekly progress is temporarily unavailable.</DashboardState> : !hasWeeklyHabitActivity ? <DashboardState status="empty">No habit completions yet this week.</DashboardState> : (
                <>
                  <div className="chart" role="img" aria-label={`${analytics.habits.completionsThisWeek} habit completions this week`}>
                    {analytics.habits.dailyCompletions.map((day) => <div className={`bar-col ${day.date === analytics.period.today ? 'today' : ''}`} key={day.date} title={`${day.label}: ${day.value} completions`}><span className="chart-value">{day.value}</span><div className="bar-track"><span style={{ height: `${Math.max(7, day.value / dailyHabitMax * 100)}%` }} /></div><b>{day.label.slice(0, 1)}</b><small className="sr-only">{day.label}: {day.value} completions</small></div>)}
                  </div>
                  <div className="chart-footer"><span><i />Daily completions</span><strong>{analytics.habits.completionsThisWeek} <small>this week</small></strong></div>
                </>
              )}
              <CardLink to="/analytics">View weekly analytics</CardLink>
            </article>

            <article className="card fitness-card" aria-busy={fitnessStatus === 'loading'}>
              <CardHeader eyebrow="Movement" title="Fitness" meta="150 min target" accent="green-text" />
              {fitnessStatus === 'loading' ? <DashboardState>Loading fitness…</DashboardState> : fitnessStatus === 'error' ? <DashboardState status="error">Fitness is temporarily unavailable.</DashboardState> : (
                <>
                  <div className="fitness-main"><div className="metric-icon" aria-hidden="true">↗</div><div><strong>{latestWorkout?.workoutType ?? 'No workouts yet'}</strong><span>{latestWorkout ? `Latest · ${latestWorkout.durationMinutes} min` : 'Log your first workout'}</span></div></div>
                  <div className="progress-caption"><span>Weekly target</span><b>{weeklyMinutes} / 150 min</b></div>
                  <div className="progress-line green" role="progressbar" aria-label="Weekly fitness minutes" aria-valuemin="0" aria-valuemax="150" aria-valuenow={Math.min(weeklyMinutes, 150)}><span style={{ width: `${fitnessProgress}%` }} /></div>
                  <div className="stat-row"><span><b>{weeklyWorkouts.length}</b><small>workouts</small></span><span><b>{weeklyMinutes}</b><small>minutes</small></span><span><b>{weeklyCalories}</b><small>calories</small></span></div>
                </>
              )}
              <CardLink to="/fitness">View fitness</CardLink>
            </article>

            <article className="card finance-card" aria-busy={financeStatus === 'loading'}>
              <CardHeader eyebrow="This month" title="Finance" meta={monthName} accent="teal-text" />
              {financeStatus === 'loading' ? <DashboardState>Loading finance…</DashboardState> : financeStatus === 'error' ? <DashboardState status="error">Finance is temporarily unavailable.</DashboardState> : (
                <>
                  <div className="finance-balance"><span>Monthly balance</span><strong className={monthlyBalance < 0 ? 'negative' : ''}>{currency.format(monthlyBalance)}</strong></div>
                  <div className="finance-totals"><span><small>Income</small><b className="income">{currency.format(monthlyIncome)}</b></span><span><small>Expenses</small><b className="expense">{currency.format(monthlyExpenses)}</b></span></div>
                  {latestTransaction ? <div className={`finance-note ${latestTransaction.type.toLowerCase()}`}><span>{latestTransaction.type === 'Income' ? '↓' : '↑'}</span><p><strong>{latestTransaction.type} · {currency.format(latestTransaction.amount)}</strong><small>{latestTransaction.category} · {formatTransactionDate(latestTransaction.transactionDate)}</small></p></div> : <div className="finance-note empty"><span>$</span><p><strong>No transactions yet</strong><small>Add one to see monthly cash flow</small></p></div>}
                </>
              )}
              <CardLink to="/finance">View finances</CardLink>
            </article>

            <article className="card insights-card" aria-busy={analyticsStatus === 'loading'}>
              <CardHeader eyebrow="From your data" title="Insight" meta={analyticsStatus === 'ready' ? 'Updated now' : ''} accent="purple-text" />
              {analyticsStatus === 'loading' ? <DashboardState dark>Finding a useful insight…</DashboardState> : analyticsStatus === 'error' ? <DashboardState status="error" dark>An insight isn’t available right now.</DashboardState> : <div className="insight-content"><div className="spark">✦</div><div><strong>{insight.title}</strong><p>{insight.body}</p><span>Based on your current Momentum data</span></div></div>}
              <CardLink to="/analytics">See all analytics</CardLink>
            </article>
          </section>
        </main>
      </div>
    </div>
  )
}
