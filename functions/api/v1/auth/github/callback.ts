import type { PagesHandler } from '../../../../_shared/types'
import { cookie, createSession, error, readCookie, token, upsertUser } from '../../../../_shared/http'

interface GithubProfile { id: number; login: string; name?: string | null; email?: string | null }
interface GithubEmail { email: string; primary: boolean; verified: boolean }

export const onRequestGet: PagesHandler = async ({ request, env }) => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return error('GitHub 登录尚未配置', 503)
  const url = new URL(request.url)
  const state = url.searchParams.get('state') || ''
  const code = url.searchParams.get('code') || ''
  if (!state || !code || state !== readCookie(request, 'oauth_state')) return error('GitHub OAuth state 校验失败', 403)
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, state, redirect_uri: env.GITHUB_OAUTH_REDIRECT_URL || `${url.origin}/api/v1/auth/github/callback` }) })
  const tokenBody = await tokenResponse.json() as { access_token?: string; error?: string }
  if (!tokenResponse.ok || !tokenBody.access_token) return error(`GitHub 登录失败：${tokenBody.error || 'token exchange failed'}`, 502)
  const authHeaders = { Authorization: `Bearer ${tokenBody.access_token}`, Accept: 'application/vnd.github+json' }
  const profileResponse = await fetch('https://api.github.com/user', { headers: authHeaders })
  const profile = await profileResponse.json() as GithubProfile
  if (!profileResponse.ok || !profile.id) return error('无法读取 GitHub 账号信息', 502)
  let email = profile.email || ''
  if (!email) {
    const emailResponse = await fetch('https://api.github.com/user/emails', { headers: authHeaders })
    const emails = await emailResponse.json() as GithubEmail[]
    email = emails.find((item) => item.primary && item.verified)?.email || emails.find((item) => item.verified)?.email || ''
  }
  if (!email) return error('GitHub 账号没有可用的已验证邮箱', 422)
  const userId = await upsertUser(email, profile.name || profile.login, 'github', String(profile.id), env)
  const session = await createSession(userId, env)
  const target = new URL('/', env.PUBLIC_SITE_URL || url.origin)
  target.searchParams.set('auth', 'success')
  const headers = new Headers({ Location: target.toString() })
  headers.append('Set-Cookie', cookie('session', session, 60 * 60 * 24 * 30))
  headers.append('Set-Cookie', cookie('oauth_state', token(8), 0))
  return new Response(null, { status: 302, headers })
}
