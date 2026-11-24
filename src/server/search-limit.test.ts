import { describe, expect, it } from 'vitest'
import {
  evaluateSearchLimit,
  handleSearchLimitRequest,
  SEARCH_WINDOW_MS,
} from './search-limit'

const request = (body: unknown) =>
  new Request('https://search-limit.internal/', { method: 'POST', body: JSON.stringify(body) })

function memoryStorage() {
  const values = new Map<string, unknown>()
  return {
    get: async (key: string) => values.get(key),
    put: async (key: string, value: unknown) => {
      values.set(key, value)
    },
  } as unknown as Pick<DurableObjectStorage, 'get' | 'put'>
}

describe('evaluateSearchLimit', () => {
  it('allows 3 searches and blocks the 4th until the oldest expires', () => {
    const now = 10 * SEARCH_WINDOW_MS
    const { reservation } = evaluateSearchLimit([now - 3000, now - 2000, now - 1000], now)
    expect(reservation).toEqual({ allowed: false, retryAt: now - 3000 + SEARCH_WINDOW_MS })
    expect(evaluateSearchLimit([now - 2000, now - 1000], now).reservation.allowed).toBe(true)
  })

  it('stops counting a search exactly 2 hours later', () => {
    const now = 10 * SEARCH_WINDOW_MS
    const old = now - SEARCH_WINDOW_MS
    const { active, reservation } = evaluateSearchLimit([old, now - 2000, now - 1000], now)
    expect(reservation.allowed).toBe(true)
    expect(active).not.toContain(old)
  })
})

describe('handleSearchLimitRequest', () => {
  it('tracks users separately and returns released searches', async () => {
    const storage = memoryStorage()
    const reserve = async (userId: string, now: number) =>
      (await handleSearchLimitRequest(storage, request({ operation: 'reserve', userId }), now)).json()

    await reserve('a', 1)
    await reserve('a', 2)
    await reserve('a', 3)
    expect(await reserve('a', 4)).toMatchObject({ allowed: false })
    expect(await reserve('b', 4)).toMatchObject({ allowed: true })

    await handleSearchLimitRequest(
      storage,
      request({ operation: 'release', userId: 'a', reservedAt: 3 }),
      5,
    )
    expect(await reserve('a', 6)).toMatchObject({ allowed: true })
  })
})
