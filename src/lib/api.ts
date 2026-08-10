import type { ApiResponse, Repeater, RepeaterInput } from '../types/repeater'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>
  if (!response.ok) throw new Error(body.error || body.message || `请求失败（${response.status}）`)
  return body.data as T
}

export function requestMagicLink(email: string) {
  return request<{ accepted: boolean }>('/api/v1/auth/email/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function startGithubLogin() {
  window.location.assign('/api/v1/auth/github/start')
}

export function submitRepeater(input: RepeaterInput) {
  return request<{ id: string; status: string }>('/api/v1/submissions', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getMySubmissions() {
  return request<Repeater[]>('/api/v1/submissions/me')
}
