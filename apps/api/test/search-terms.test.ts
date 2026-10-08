import { describe, expect, it } from 'vitest'
import { searchTerms } from '../src/domain/search-terms'

describe('searchTerms', () => {
  it('lowercases and splits on punctuation and spaces', () => {
    expect(searchTerms('Staging, URL.')).toEqual(['staging', 'url'])
    expect(searchTerms('client-a/web')).toEqual(['client', 'a', 'web'])
  })

  it('drops repeated terms, keeping the first occurrence', () => {
    expect(searchTerms('Stag stag STAG release stag')).toEqual(['stag', 'release'])
  })

  it('keeps the first 8 terms', () => {
    expect(searchTerms('a b c d e f g h i j')).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
  })

  it('gives no terms for an empty, blank or punctuation-only query', () => {
    expect(searchTerms(undefined)).toEqual([])
    expect(searchTerms('')).toEqual([])
    expect(searchTerms('   ')).toEqual([])
    expect(searchTerms('???')).toEqual([])
  })

  it('normalizes accents to NFC so composed and decomposed forms agree', () => {
    const composed = 'café'
    const decomposed = 'café'
    expect(searchTerms(decomposed)).toEqual([composed])
    expect(searchTerms(composed)).toEqual([composed])
  })

  it('keeps letters and digits of any script', () => {
    expect(searchTerms('Año 2026 日本語')).toEqual(['año', '2026', '日本語'])
  })

  it.each([`'`, '"', '\\', '&', '|', '!', ':', '(', ')', '<', '>', '-', '<->', ':*'])(
    'turns the operator character %s into a separator',
    (operator) => {
      expect(searchTerms(`a${operator}b`)).toEqual(['a', 'b'])
      expect(searchTerms(operator)).toEqual([])
    },
  )

  it('reduces a hostile query to plain words', () => {
    expect(searchTerms(`staging' | !:* (`)).toEqual(['staging'])
  })
})
