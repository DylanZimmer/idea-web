import { describe, expect, it } from 'vitest'
import { normalizeReaderUrl, readerPath } from './reader-link'

describe('normalizeReaderUrl', () => {
  it('accepts public web URLs and adds https when missing', () => {
    expect(normalizeReaderUrl(' https://arxiv.org/pdf/1706.03762 ')).toBe(
      'https://arxiv.org/pdf/1706.03762',
    )
    expect(normalizeReaderUrl('arxiv.org/abs/1706.03762')).toBe('https://arxiv.org/abs/1706.03762')
  })

  it.each([
    '',
    'javascript:alert(1)',
    'file:///etc/passwd',
    'http://localhost:5173/',
    'http://127.0.0.1/',
    'http://2130706433/',
    'http://[::1]/',
    'http://169.254.169.254/latest',
    'https://user:pass@example.com/',
    'http://service.internal/',
  ])('rejects %s', (input) => {
    expect(normalizeReaderUrl(input)).toBeNull()
  })
})

describe('readerPath', () => {
  it('encodes the paper URL', () => {
    expect(readerPath('https://example.com/a?b=1&c=2')).toBe(
      '/reader?url=https%3A%2F%2Fexample.com%2Fa%3Fb%3D1%26c%3D2',
    )
  })
})
