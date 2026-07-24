import { NavLink } from 'react-router-dom'

const navItems = [
  ['▦', 'Overview', '/dashboard'],
  ['✓', 'Habits', '/habits'],
  ['□', 'Tasks', '/tasks'],
  ['⌁', 'Fitness'],
  ['$', 'Finance'],
  ['⌁', 'Analytics'],
]

const Icon = ({ children }) => <span className="icon" aria-hidden="true">{children}</span>

export default function AppSidebar({ user, onLogout }) {
  const initials = user.displayName.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">M</span><span>Momentum</span></div>
      <nav className="side-nav" aria-label="Primary navigation">
        <p className="nav-label">Workspace</p>
        {navItems.map(([icon, label, path]) => path ? (
          <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to={path} key={label}>
            <Icon>{icon}</Icon><span>{label}</span>
          </NavLink>
        ) : (
          <span className="nav-item nav-item-disabled" key={label}>
            <Icon>{icon}</Icon><span>{label}</span>
          </span>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="nav-item"><Icon>?</Icon><span>Help center</span></div>
        <div className="user-mini"><div className="avatar">{initials}</div><div><strong>{user.displayName}</strong><button type="button" onClick={onLogout}>Sign out</button></div></div>
      </div>
    </aside>
  )
}
