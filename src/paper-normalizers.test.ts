import { describe, expect, it } from 'vitest'
import { cleanText, normalizeCrossref, normalizeOpenAlex, normalizeSemanticScholar } from './paper-normalizers'

describe('cleanText', () => {
  it('decodes named and numeric entities', () => {
    expect(cleanText('Theory &amp; Practice &#38; More &#x26; Still &lt;3 &quot;quoted&quot;')).toBe(
      'Theory & Practice & More & Still <3 "quoted"',
    )
  })

  it('removes markup without splitting words, and decodes after stripping tags', () => {
    expect(cleanText('H<sub>2</sub>O in <i>vivo</i>')).toBe('H2O in vivo')
    expect(cleanText('<jats:p>One</jats:p><jats:p>Two</jats:p>')).toBe('One Two')
    expect(cleanText('a &lt;b&gt; tag')).toBe('a <b> tag')
  })

  it('leaves unknown entities alone', () => {
    expect(cleanText('Fish &chips; &amp')).toBe('Fish &chips; &amp')
  })
})

describe('normalizers decode titles, authors and journals', () => {
  it('OpenAlex', () => {
    const paper = normalizeOpenAlex(
      {
        id: 'W1',
        title: 'Rings &amp; Modules',
        authorships: [{ author: { display_name: 'A &amp; B' } }],
        primary_location: { source: { display_name: 'Algebra &amp; Number Theory' } },
      },
      1,
    )
    expect([paper.title, paper.authors, paper.journal]).toEqual(['Rings & Modules', ['A & B'], 'Algebra & Number Theory'])
  })

  it('Crossref', () => {
    const paper = normalizeCrossref(
      { DOI: '10.1/x', title: ['Graphs &amp; <i>Groups</i>'], 'container-title': ['Proc. &amp; Trans.'] },
      1,
    )
    expect([paper.title, paper.journal]).toEqual(['Graphs & Groups', 'Proc. & Trans.'])
  })

  it('Semantic Scholar', () => {
    const paper = normalizeSemanticScholar({ paperId: 'p', title: 'Sets &amp; Logic', authors: [{ name: 'C' }] }, 1)
    expect(paper.title).toBe('Sets & Logic')
  })
})
