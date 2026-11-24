import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PaperMarkdown } from './PaperMarkdown'

const render = (markdown: string, baseUrl?: string) =>
  renderToStaticMarkup(<PaperMarkdown markdown={markdown} baseUrl={baseUrl} />)

describe('PaperMarkdown figures', () => {
  it('resolves relative figure addresses against the paper page', () => {
    const html = render('![Figure 1](x1.png)', 'https://arxiv.org/html/1706.03762v7/')
    expect(html).toContain('src="https://arxiv.org/html/1706.03762v7/x1.png"')
  })

  it('keeps absolute figure addresses', () => {
    expect(render('![Fig](https://cdn.example.org/f.png)', 'https://example.org/p')).toContain(
      'src="https://cdn.example.org/f.png"',
    )
  })

  it('refuses non-web addresses and keeps the caption', () => {
    const html = render('![Caption](javascript:alert(1))', 'https://example.org/p')
    expect(html).not.toContain('<img')
    expect(html).toContain('Caption')
  })

  it('leaves in-page references as text', () => {
    expect(render('See [1](#bib1).', 'https://example.org/p')).not.toContain('<a')
  })
})
