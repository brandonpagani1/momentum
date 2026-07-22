const Icon = ({ children }) => <span className="icon" aria-hidden="true">{children}</span>

const navItems = [
  ['▦', 'Overview'],
  ['✓', 'Habits'],
  ['□', 'Tasks'],
  ['⌁', 'Fitness'],
  ['$', 'Finance'],
  ['⌁', 'Analytics'],
]

const week = [
  ['M', 76], ['T', 92], ['W', 64], ['T', 86], ['F', 72], ['S', 48], ['S', 58],
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">M</span><span>Momentum</span></div>
      <nav className="side-nav" aria-label="Primary navigation">
        <p className="nav-label">Workspace</p>
        {navItems.map(([icon, label], index) => (
          <div className={`nav-item ${index === 0 ? 'active' : ''}`} key={label}>
            <Icon>{icon}</Icon><span>{label}</span>
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="nav-item"><Icon>?</Icon><span>Help center</span></div>
        <div className="user-mini"><div className="avatar">BP</div><div><strong>Brandon</strong><span>Personal workspace</span></div><b>⋯</b></div>
      </div>
    </aside>
  )
}

function CardHeader({ eyebrow, title, meta, accent }) {
  return <header className="card-header"><div><span className={`eyebrow ${accent || ''}`}>{eyebrow}</span><h2>{title}</h2></div>{meta && <span className="meta">{meta}</span>}</header>
}

function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">M</span><strong>Momentum</strong></div>
          <div className="crumb"><span>Dashboard</span><b>/</b><strong>Overview</strong></div>
          <div className="top-actions"><div className="search"><span>⌕</span><span>Search anything</span><kbd>⌘ K</kbd></div><div className="notification">•</div><div className="top-avatar">BP</div></div>
        </header>

        <main>
          <section className="welcome">
            <div><p className="date">Tuesday, July 22</p><h1>Good morning, Brandon.</h1><p>Here’s the shape of your day. Keep the momentum going.</p></div>
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
              <CardHeader eyebrow="Today" title="Habits" meta="4 of 5" accent="purple-text" />
              <div className="habit-list"><div><span className="check checked">✓</span><p><strong>Morning planning</strong><small>18 day streak</small></p><em>7:30 AM</em></div><div><span className="check checked">✓</span><p><strong>Read 20 minutes</strong><small>6 day streak</small></p><em>8:10 AM</em></div><div><span className="check"></span><p><strong>Evening reflection</strong><small>Due tonight</small></p><em>9:00 PM</em></div></div>
              <div className="progress-line"><span style={{width: '80%'}}></span></div>
            </article>

            <article className="card tasks-card">
              <CardHeader eyebrow="Focus" title="Tasks" meta="3 remaining" accent="orange-text" />
              <div className="task-summary"><strong>7</strong><span>completed<br/>this week</span><div className="donut"><b>70%</b></div></div>
              <div className="priority"><span>High priority</span><strong>Finish project outline</strong><small>Today · Work</small></div>
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

export default App
