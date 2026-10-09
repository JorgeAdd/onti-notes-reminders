/** R14 / C10 · note bodies render the basic subset; raw HTML is text; links are allowlisted. */
import { render, screen } from '@testing-library/react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MarkdownBody, { markdownSchema } from '../src/features/note/MarkdownBody'
import { NoteBody } from '../src/features/note/NoteBody'

const IMG = '<img src=x onerror=alert(1)>'
const FORBIDDEN = 'script, iframe, svg, img, style, object, embed, form, input, link, meta'

afterEach(() => vi.restoreAllMocks())

describe('react-markdown default config (the premise C10 relies on)', () => {
  it('already turns raw HTML into literal text without rehype-raw', () => {
    const { container } = render(<ReactMarkdown>{IMG}</ReactMarkdown>)
    expect(container.textContent).toContain(IMG)
    expect(container.querySelector('img')).toBeNull()
  })
})

describe('MarkdownBody: the basic subset (R14)', () => {
  it('renders bold, italic, a list, inline code and a fenced block', () => {
    const body = '**b** and *i*\n\n- one\n- two\n\nuse `c` here\n\n```\nblock\n```\n'
    const { container } = render(<MarkdownBody body={body} />)
    expect(container.querySelector('strong')?.textContent).toBe('b')
    expect(container.querySelector('em')?.textContent).toBe('i')
    expect(container.querySelectorAll('ul > li')).toHaveLength(2)
    expect(container.querySelector('p code')?.textContent).toBe('c')
    expect(container.querySelector('pre > code')?.textContent).toBe('block\n')
  })

  it('keeps the view to one h1: headings in a body render as bold paragraphs', () => {
    const { container } = render(<MarkdownBody body={'# Big\n\n### Small'} />)
    expect(container.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull()
    expect(screen.getByText('Big').tagName).toBe('P')
    expect(screen.getByText('Small')).toBeInTheDocument()
  })

  it('renders an empty body as nothing', () => {
    const { container } = render(<MarkdownBody body="" />)
    expect(container.textContent).toBe('')
  })
})

describe('C10 layer (a): raw HTML is text and nothing runs', () => {
  it('shows <img src=x onerror=alert(1)> literally, with no element and no handler', () => {
    const alert = vi.fn()
    vi.stubGlobal('alert', alert)
    const { container } = render(<MarkdownBody body={IMG} />)
    expect(screen.getByText(IMG)).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[onerror]')).toBeNull()
    expect(alert).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})

const HOSTILE: [string, string][] = [
  ['javascript: link', '[x](javascript:alert(1))'],
  ['mixed-case javascript:', '[x](JaVaScRiPt:alert(1))'],
  ['tab inside javascript:', '[x](java\tscript:alert(1))'],
  ['data: link', '[x](data:text/html;base64,PHNjcmlwdD4=)'],
  ['vbscript: link', '[x](vbscript:msgbox(1))'],
  ['ftp: link', '[x](ftp://example.com/a)'],
  ['irc: link', '[x](irc://example.com/room)'],
  ['xmpp: link', '[x](xmpp:a@example.com)'],
  ['relative link', '[x](/settings)'],
  ['protocol-relative link', '[x](//evil.example/a)'],
  ['script tag', '<script>alert(1)</script>'],
  ['iframe tag', '<iframe src="https://evil.example"></iframe>'],
  ['svg onload', '<svg onload=alert(1)>'],
  ['raw anchor', '<a href="javascript:alert(1)">x</a>'],
  ['entity-encoded javascript:', '[x](&#106;avascript:alert(1))'],
  ['reference-style link', '[x][r]\n\n[r]: javascript:alert(1)'],
  ['image syntax', '![x](https://example.com/a.png)'],
  ['image with a javascript: source', '![x](javascript:alert(1))'],
  ['autolink-style javascript:', '<javascript:alert(1)>'],
]

describe('C10 layer (b): the hostile table', () => {
  it.each(HOSTILE)('%s creates no forbidden element, handler or unsafe anchor', (_label, body) => {
    const { container } = render(<MarkdownBody body={body} />)
    expect(container.querySelectorAll(FORBIDDEN)).toHaveLength(0)
    for (const element of container.querySelectorAll('*')) {
      for (const attribute of element.getAttributeNames()) {
        expect(attribute.startsWith('on')).toBe(false)
      }
    }
    for (const anchor of container.querySelectorAll('a')) {
      expect(anchor.getAttribute('href')).toMatch(/^(https?:|mailto:)/i)
      expect(anchor.getAttribute('rel')).toBe('noopener noreferrer')
    }
  })

  it.each([
    ['javascript:', '[x](javascript:alert(1))'],
    ['irc:', '[x](irc://example.com/room)'],
    ['data:', '[x](data:text/plain,hi)'],
    ['a relative path', '[x](/settings)'],
  ])('keeps the text of a blocked link visible: %s', (_label, body) => {
    const { container } = render(<MarkdownBody body={body} />)
    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent).toContain('x')
  })

  it('renders image syntax as nothing (not even the alt text)', () => {
    const { container } = render(<MarkdownBody body="![alt text](https://example.com/a.png)" />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).not.toContain('alt text')
  })

  it.each([
    ['https:', '[a](https://example.com/path?q=1)', 'https://example.com/path?q=1'],
    ['http:', '[a](http://example.com)', 'http://example.com'],
    ['mailto:', '[a](mailto:jorge@example.com)', 'mailto:jorge@example.com'],
  ])('turns an %s link into an anchor with rel and target', (_label, body, href) => {
    const { container } = render(<MarkdownBody body={body} />)
    const anchor = container.querySelector('a')!
    expect(anchor.getAttribute('href')).toBe(href)
    expect(anchor.getAttribute('rel')).toBe('noopener noreferrer')
    expect(anchor.getAttribute('target')).toBe('_blank')
    expect(anchor.textContent).toBe('a')
  })

  it('does not auto-link a bare URL (CommonMark only, no GFM)', () => {
    const { container } = render(<MarkdownBody body="see https://example.com now" />)
    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent).toBe('see https://example.com now')
  })
})

describe('C10 layer (c): the sanitizer is a second lock', () => {
  const element = (
    tagName: string,
    properties: Record<string, string>,
    children: unknown[] = [],
  ) => ({
    type: 'element' as const,
    tagName,
    properties,
    children,
  })

  it('strips <img> and a javascript: href from a hast tree on its own', () => {
    const tree = {
      type: 'root' as const,
      children: [
        element('p', {}, [
          element('img', { src: 'x', onError: 'alert(1)' }),
          element('a', { href: 'javascript:alert(1)', onClick: 'alert(2)' }, [
            { type: 'text', value: 'x' },
          ]),
          element('a', { href: 'https://example.com' }, [{ type: 'text', value: 'ok' }]),
        ]),
      ],
    }
    const clean = JSON.stringify(rehypeSanitize(markdownSchema)(tree as never))
    expect(clean).not.toContain('"img"')
    expect(clean).not.toContain('javascript')
    expect(clean).not.toMatch(/onclick|onerror/i)
    expect(clean).toContain('https://example.com')
  })

  it('allows only http, https and mailto hrefs', () => {
    expect(markdownSchema.protocols?.href).toEqual(['http', 'https', 'mailto'])
    expect(markdownSchema.tagNames).not.toContain('img')
  })
})

describe('NoteBody: lazy markdown with a plain-text fallback', () => {
  it('shows the body as plain text while the renderer loads, then renders markdown', async () => {
    const { container } = render(<NoteBody body={'**bold** text\nsecond line'} />)
    expect(container.textContent).toBe('**bold** text\nsecond line')
    expect(container.querySelector('strong')).toBeNull()
    expect((await screen.findByText('bold')).tagName).toBe('STRONG')
  })

  it('renders hostile HTML as text on both paths', async () => {
    const { container } = render(<NoteBody body={IMG} />)
    expect(container.querySelector('img')).toBeNull()
    await screen.findByText(IMG)
    expect(container.querySelector('img')).toBeNull()
  })
})
