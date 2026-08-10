import type { PagesHandler } from '../../../_shared/types'
import { json, sessionUser } from '../../../_shared/http'

export const onRequestGet: PagesHandler = async ({ request, env }) => {
  const user = await sessionUser(request, env)
  return json({ data: { authenticated: Boolean(user), user } })
}
