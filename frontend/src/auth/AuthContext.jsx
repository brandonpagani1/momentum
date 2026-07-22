import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../lib/api.js'
import { AuthContext } from './AuthContextState.js'

const STORAGE_KEY = 'momentum.auth'
function readStoredSession() {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return session?.accessToken && new Date(session.expiresAt) > new Date() ? session : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession)
  const [isLoading, setIsLoading] = useState(Boolean(session))
  const accessToken = session?.accessToken

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }, [])

  useEffect(() => {
    if (!accessToken) return

    apiRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((user) => setSession((current) => current ? { ...current, user } : null))
      .catch(logout)
      .finally(() => setIsLoading(false))
  }, [accessToken, logout])

  const authenticate = useCallback(async (path, credentials) => {
    const nextSession = await apiRequest(path, {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
  }, [])

  const value = useMemo(() => ({
    user: session?.user ?? null,
    accessToken: session?.accessToken ?? null,
    isAuthenticated: Boolean(session?.accessToken),
    isLoading,
    login: (credentials) => authenticate('/api/auth/login', credentials),
    register: (credentials) => authenticate('/api/auth/register', credentials),
    logout,
  }), [authenticate, isLoading, logout, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
