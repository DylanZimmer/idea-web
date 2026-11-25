/**
 * Clean up a URL for the reader. Shared by the browser and the server, which
 * refuses anything that is not a public web address.
 */
export function normalizeReaderUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed || trimmed.length > 2_000) return null

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^[^/:]+:\d+(\/|$)/.test(trimmed)
  let url: URL
  try {
    url = new URL(hasScheme ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()
  const isIpAddress = host.startsWith('[') || /^\d+(\.\d+){3}$/.test(host)
  const isLocalName = !host.includes('.') || /\.(local|localhost|internal|test)$/.test(host)
  if (!['http:', 'https:'].includes(url.protocol)) return null
  if (url.username || url.password || isIpAddress || isLocalName) return null
  return url.toString()
}

/** The title, when known, becomes the reader's tab name before the paper loads. */
export function readerPath(url: string, title?: string | null): string {
  const params = new URLSearchParams({ url })
  const name = title?.trim()
  if (name) params.set('title', name.slice(0, 300))
  return `/reader?${params}`
}
