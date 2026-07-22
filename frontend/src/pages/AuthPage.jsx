import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login'
  const { isAuthenticated, login, register } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ displayName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleChange = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }))
  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const credentials = isLogin ? { email: form.email, password: form.password } : form
      await (isLogin ? login(credentials) : register(credentials))
      navigate(location.state?.from?.pathname ?? '/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><span className="brand-mark">M</span><span>Momentum</span></div>
        <div className="auth-heading">
          <span>{isLogin ? 'Welcome back' : 'Start building momentum'}</span>
          <h1>{isLogin ? 'Sign in to your account' : 'Create your account'}</h1>
          <p>{isLogin ? 'Your dashboard is ready when you are.' : 'One secure account for your personal workspace.'}</p>
        </div>
        <form onSubmit={handleSubmit}>
          {!isLogin && <label>Display name<input name="displayName" value={form.displayName} onChange={handleChange} minLength="2" maxLength="80" autoComplete="name" required /></label>}
          <label>Email address<input name="email" value={form.email} onChange={handleChange} type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" value={form.password} onChange={handleChange} type="password" minLength="8" autoComplete={isLogin ? 'current-password' : 'new-password'} required /></label>
          {!isLogin && <p className="password-hint">Use at least 8 characters with uppercase, lowercase, and a number.</p>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="auth-submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}</button>
        </form>
        <p className="auth-switch">{isLogin ? 'New to Momentum?' : 'Already have an account?'} <Link to={isLogin ? '/register' : '/login'}>{isLogin ? 'Create an account' : 'Sign in'}</Link></p>
      </section>
    </main>
  )
}
