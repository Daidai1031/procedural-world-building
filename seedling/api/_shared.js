import { randomUUID } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import Anthropic from '@anthropic-ai/sdk'

export const COOKIE_NAME = 'seedling_tutor'
export const GENERATION_MODEL = 'claude-haiku-4-5-20251001'
export const RATE_RULES = { auth: [5, '15 m'], translate: [20, '1 h'], chat: [40, '1 h'], daily: [800, '1 d'] }
let limiters

function sessionKey() {
  const key = Buffer.from(process.env.SESSION_SECRET ?? '', 'base64')
  if (key.length < 32) throw new Error('Session configuration unavailable')
  return key
}

export async function signSession() {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject('tutor').setJti(randomUUID()).setIssuedAt().setExpirationTime('7d').sign(sessionKey())
}

export async function verifySession(request) {
  const cookie = (request.headers.cookie ?? '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))
  if (!cookie) return null
  try {
    const { payload } = await jwtVerify(cookie.slice(COOKIE_NAME.length + 1), sessionKey(), { algorithms: ['HS256'], subject: 'tutor', maxTokenAge: '7d' })
    return typeof payload.jti === 'string' ? payload : null
  } catch { return null }
}

export function clientIp(request) {
  // Vercel overwrites x-vercel-forwarded-for at its trusted ingress.
  return String(request.headers['x-vercel-forwarded-for'] ?? request.socket?.remoteAddress ?? 'unknown').split(',')[0].trim()
}

export function getRateLimiters() {
  if (!limiters) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) throw new Error('Rate limiting unavailable')
    const redis = Redis.fromEnv()
    limiters = Object.fromEntries(Object.entries(RATE_RULES).map(([key, [count, duration]]) => [key, new Ratelimit({ redis, prefix: `seedling:${key}`, limiter: Ratelimit.fixedWindow(count, duration), timeout: 3000, ephemeralCache: false })]))
  }
  return limiters
}

export async function enforceLimit(name, identifier, response) {
  const result = await getRateLimiters()[name].limit(identifier)
  await result.pending
  if (result.reason === 'timeout') throw new Error('Rate limiting unavailable')
  if (result.success) return true
  response.setHeader('Retry-After', String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))))
  response.status(429).json({ error: name === 'daily' ? "The tutor is at today's limit." : 'Too many requests. Please try again later.' })
  return false
}

export function preparePost(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); response.status(405).json({ error: 'Use POST.' }); return false }
  const origin = request.headers.origin
  if (origin && new URL(origin).host !== request.headers.host) { response.status(403).json({ error: 'Request not allowed.' }); return false }
  if (!request.body || typeof request.body !== 'object' || Buffer.byteLength(JSON.stringify(request.body)) > 64000) { response.status(400).json({ error: 'Invalid request.' }); return false }
  return true
}

export function questionFrom(request) {
  const question = request.body?.question
  return typeof question === 'string' && question.trim() && question.length <= 2000 ? question.trim() : null
}

export function anthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 45000, maxRetries: 0 })
}

export function unavailable(response) {
  if (!response.headersSent) response.status(503).json({ error: 'Generated answers are unavailable right now. Course search still works.' })
  else response.end()
}
