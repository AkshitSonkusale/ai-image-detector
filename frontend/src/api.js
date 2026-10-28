/**
 * API client for the FastAPI backend.
 *
 * In development Vite proxies /api → localhost:8000.
 * In production set VITE_API_URL to the Hugging Face Space URL.
 */

const BASE = import.meta.env.VITE_API_URL || '/api'

export async function predictImage(file) {
  const form = new FormData()
  form.append('file', file)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000) // HF cold-start can be slow

  try {
    const res = await fetch(`${BASE}/predict`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })

    if (!res.ok) {
      let detail = `Server error ${res.status}`
      try {
        const body = await res.json()
        detail = body.detail || detail
      } catch {}
      throw new Error(detail)
    }

    return await res.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        'Request timed out. The backend may be waking up (Hugging Face Spaces cold start can take ~30 s). Please try again.',
      )
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

export async function healthCheck() {
  const res = await fetch(`${BASE}/health`)
  if (!res.ok) throw new Error('Backend unreachable')
  return res.json()
}
