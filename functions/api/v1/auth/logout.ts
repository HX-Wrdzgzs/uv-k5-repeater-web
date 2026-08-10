import type { PagesHandler } from '../../../_shared/types'
import { cookie, json, readCookie, sha256 } from '../../../_shared/http'

export const onRequestPost: PagesHandler = async ({ request, env }) => {
  const value = readCookie(request, 'session')
  if (value) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(value)).run()
  return json({ data: { loggedOut: true } }, 200, { 'Set-Cookie': cookie('session', '', 0) })
}
