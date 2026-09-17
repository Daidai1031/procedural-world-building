import { timingSafeEqual } from 'node:crypto'
import { setTimeout } from 'node:timers/promises'
import { COOKIE_NAME, clientIp, enforceLimit, preparePost, signSession, verifySession, unavailable } from './_shared.js'

export function passphraseMatches(candidate, expected) {
  const left = Buffer.from(typeof candidate === 'string' ? candidate : '')
  const right = Buffer.from(expected ?? '')
  return right.length > 0 && left.length === right.length && timingSafeEqual(left, right)
}

export default async function auth(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method === 'GET') { response.status(200).json({ authenticated: Boolean(await verifySession(request)) }); return }
  try {
    if (!preparePost(request, response)) return
    if (!await enforceLimit('auth', clientIp(request), response)) return
    if (!passphraseMatches(request.body.passphrase, process.env.TUTOR_PASSPHRASE)) {
      await setTimeout(600)
      response.status(401).json({ error: 'Unable to sign in.' })
      return
    }
    const token = await signSession()
    response.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=604800`)
    response.status(200).json({ authenticated: true })
  } catch { unavailable(response) }
}
