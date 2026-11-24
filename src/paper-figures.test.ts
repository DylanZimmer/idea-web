import { describe, expect, it } from 'vitest'
import { addFigures, figureLinks } from './paper-figures'

const text = [
  '# A paper',
  '',
  'Intro text.',
  '',
  'Figure 1: The model architecture.',
  '',
  'More text.',
  '',
  'Figure 2: (left) One part. (right) Another part.',
  '',
  'End.',
].join('\n')

describe('addFigures', () => {
  it('puts each figure above its caption when there is one image per figure', () => {
    const result = addFigures(text, ['https://arxiv.org/html/1/Figures/a.png', 'https://arxiv.org/html/1/Figures/b.png'])
    const lines = result.split('\n')
    const first = lines.indexOf('![Figure 1: The model architecture.](https://arxiv.org/html/1/Figures/a.png)')
    const second = lines.indexOf(
      '![Figure 2: (left) One part. (right) Another part.](https://arxiv.org/html/1/Figures/b.png)',
    )
    expect(first).toBeGreaterThan(-1)
    expect(lines[first + 2]).toBe('Figure 1: The model architecture.')
    expect(lines[second + 2]).toBe('Figure 2: (left) One part. (right) Another part.')
    expect(result).not.toContain('## Figures')
  })

  it('lists the images in a Figures section when they do not match the captions one to one', () => {
    const result = addFigures(text, ['https://x.org/a.png', 'https://x.org/b.png', 'https://x.org/c.png'])
    expect(result.startsWith(text)).toBe(true)
    expect(result).toContain('## Figures')
    expect(result.match(/!\[/g)).toHaveLength(3)
  })

  it('leaves the text unchanged without usable images', () => {
    expect(addFigures(text, undefined)).toBe(text)
    expect(addFigures(text, [])).toBe(text)
    expect(addFigures(text, ['https://x.org/site-logo.png', 'javascript:alert(1)', 42])).toBe(text)
  })

  it('counts a repeated caption for the same figure once', () => {
    const repeated = `${text}\n\nFigure 1: The model architecture.`
    const result = addFigures(repeated, ['https://x.org/a.png', 'https://x.org/b.png'])
    expect(result).not.toContain('## Figures')
    expect(result.match(/!\[/g)).toHaveLength(2)
  })
})

describe('figureLinks', () => {
  it('moves arXiv PDF figure addresses to the HTML version, and drops duplicates', () => {
    expect(
      figureLinks([
        'https://arxiv.org/pdf/1706.03762v7/Figures/ModalNet-21.png',
        'https://arxiv.org/pdf/1706.03762v7/Figures/ModalNet-21.png',
      ]),
    ).toEqual(['https://arxiv.org/html/1706.03762v7/Figures/ModalNet-21.png'])
  })

  it('escapes characters that would break the image syntax', () => {
    expect(addFigures('Figure 1: A.', ['https://x.org/fig (1).png'])).toContain('(https://x.org/fig%20%281%29.png)')
  })

  it('keeps only image files that are not page furniture', () => {
    expect(
      figureLinks(['https://x.org/f1.jpg', 'https://x.org/page.html', 'https://x.org/icons/menu.svg', 'https://x.org/f2.webp?v=2']),
    ).toEqual(['https://x.org/f1.jpg', 'https://x.org/f2.webp?v=2'])
  })
})
