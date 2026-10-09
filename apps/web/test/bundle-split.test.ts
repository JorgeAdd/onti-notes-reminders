/** ADR-002 · the markdown libraries live only in the lazy chunk [static scan of src/**]. */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..', 'src')

const sources = (dir = SRC): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.(ts|tsx)$/.test(path) ? [path] : []
  })

const read = (path: string) => readFileSync(path, 'utf8')
const name = (path: string) => relative(SRC, path)

describe('bundle split', () => {
  const files = sources()

  it('only MarkdownBody.tsx imports react-markdown and rehype-sanitize', () => {
    const importers = files
      .filter((path) => /['"](react-markdown|rehype-[\w-]+|remark-[\w-]+)['"]/.test(read(path)))
      .map(name)
    expect(importers).toEqual(['features/note/MarkdownBody.tsx'])
  })

  it('reaches MarkdownBody only through a dynamic import()', () => {
    const importers = files.filter((path) => /MarkdownBody['"]/.test(read(path)))
    expect(importers.map(name)).toEqual(['features/note/NoteBody.tsx'])
    const source = read(importers[0]!)
    expect(source).toMatch(/lazy\(\s*\(\)\s*=>\s*import\(['"]\.\/MarkdownBody['"]\)\s*\)/)
    expect(source).not.toMatch(/^import[^\n]*MarkdownBody/m)
  })

  it('uses no raw-HTML or GFM plugin (C10, R14)', () => {
    const source = read(join(SRC, 'features/note/MarkdownBody.tsx'))
    expect(source).not.toMatch(/rehype-raw|remark-gfm/)
  })
})
