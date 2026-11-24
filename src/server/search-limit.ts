/**
 * Per-user search limit, stored in the app's RecordRoom Durable Object.
 *
 * A Durable Object handles these reads and writes one request at a time, so
 * simultaneous searches cannot all pass the check. Record tools cannot give
 * that guarantee because their query and create are separate operations.
 */

import type { Env } from '../../worker.js'

export const SEARCH_LIMIT = 3
export const SEARCH_WINDOW_MS = 2 * 60 * 60 * 1000
/** Each paper loaded in the reader is a paid text extraction, over the same window. */
export const READ_LIMIT = 20

/** Only requests built in this file use this host; browsers cannot reach it. */
export const SEARCH_LIMIT_HOST = 'search-limit.internal'

export type SearchReservation =
  | { allowed: true; reservedAt: number }
  | { allowed: false; retryAt: number }

type LimitStorage = Pick<DurableObjectStorage, 'get' | 'put'>

interface LimitRequest {
  operation: 'reserve' | 'release'
  userId: string
  reservedAt?: number
  limit?: number
}

const storageKey = (userId: string) => `search-limit:${userId}`

/** A rolling window: each search stops counting 2 hours after it started. */
export function evaluateSearchLimit(
  timestamps: number[],
  now: number,
  limit = SEARCH_LIMIT,
): { active: number[]; reservation: SearchReservation } {
  const active = timestamps.filter((time) => now - time < SEARCH_WINDOW_MS).sort((a, b) => a - b)
  if (active.length >= limit) {
    return {
      active,
      reservation: {
        allowed: false,
        retryAt: active[active.length - limit] + SEARCH_WINDOW_MS,
      },
    }
  }
  return { active: [...active, now], reservation: { allowed: true, reservedAt: now } }
}

export async function handleSearchLimitRequest(
  storage: LimitStorage,
  request: Request,
  now = Date.now(),
): Promise<Response> {
  const { operation, userId, reservedAt, limit } = (await request.json()) as LimitRequest
  const key = storageKey(userId)
  const timestamps = (await storage.get<number[]>(key)) ?? []

  if (operation === 'release') {
    const index = timestamps.indexOf(reservedAt as number)
    if (index >= 0) {
      timestamps.splice(index, 1)
      await storage.put(key, timestamps)
    }
    return Response.json({ ok: true })
  }

  const { active, reservation } = evaluateSearchLimit(timestamps, now, limit)
  await storage.put(key, active)
  return Response.json(reservation)
}

async function callSearchLimit(env: Env, body: LimitRequest): Promise<Response> {
  const room = env.RECORD_ROOMS.get(env.RECORD_ROOMS.idFromName(`app:${env.DEEPSPACE_APP_ID}`))
  const response = await room.fetch(`https://${SEARCH_LIMIT_HOST}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Search limit request failed (${response.status})`)
  return response
}

export async function reserveSearch(env: Env, userId: string): Promise<SearchReservation> {
  const response = await callSearchLimit(env, { operation: 'reserve', userId })
  return response.json() as Promise<SearchReservation>
}

export async function reserveRead(env: Env, userId: string): Promise<SearchReservation> {
  const response = await callSearchLimit(env, {
    operation: 'reserve',
    userId: `read:${userId}`,
    limit: READ_LIMIT,
  })
  return response.json() as Promise<SearchReservation>
}

export async function releaseRead(env: Env, userId: string, reservedAt: number): Promise<void> {
  await callSearchLimit(env, { operation: 'release', userId: `read:${userId}`, reservedAt })
}

/** Give the search back when it failed or found nothing. */
export async function releaseSearch(env: Env, userId: string, reservedAt: number): Promise<void> {
  await callSearchLimit(env, { operation: 'release', userId, reservedAt })
}
