/** The renderer chunk fails to load: the body stays readable as plain text and nothing throws. */
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NoteBody } from '../src/features/note/NoteBody'

vi.mock('../src/features/note/MarkdownBody', () => {
  throw new Error('Failed to fetch dynamically imported module')
})

afterEach(() => vi.restoreAllMocks())

describe('NoteBody when the markdown chunk fails', () => {
  it('falls back to the plain body and does not throw', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { container } = render(<NoteBody body={'**bold** and `code`'} />)
    // The failed import is caught by the boundary, which swaps in the same plain body.
    await screen.findByText('**bold** and `code`')
    expect(container.querySelector('strong')).toBeNull()
    expect(container.textContent).toBe('**bold** and `code`')
  })
})
