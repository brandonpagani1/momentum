const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const validationMessage = body?.errors && Object.values(body.errors).flat()[0]
    throw new Error(validationMessage || body?.title || 'Something went wrong. Please try again.')
  }

  return response.status === 204 ? null : response.json()
}
