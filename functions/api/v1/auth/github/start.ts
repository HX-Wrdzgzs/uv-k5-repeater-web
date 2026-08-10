import type { PagesHandler } from '../../../../_shared/types'
import { cookie, error, token } from '../../../../_shared/http'

export const onRequestGet: PagesHandler = async ({ request, env }) => {
  if (!env.GITHUB_CLIENT_ID) return error('GitHub 登录尚未配置', 503)
  const state = token(24)
  const redirect = env.GITHUB_OAUTH_REDIRECT_URL || `${new URL(request.url).origin}/api/v1/auth/github/callback`
  const target = new URL('https://github.com/login/oauth/authorize')
  target.searchParams.set('client_id', env.GITHUB_CLIENT_ID)
  target.searchParams.set('redirect_uri', redirect)
  target.searchParams.set('scope', 'read:user user:email')
  target.searchParams.set('state', state)
  return new Response(null, { status: 302, headers: { Location: target.toString(), 'Set-Cookie': cookie('oauth_state', state, 600) } })
}
