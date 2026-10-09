import type { ReactNode } from 'react'
import ReactMarkdown, { type Components, type Options } from 'react-markdown'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import styles from './MarkdownBody.module.css'

/**
 * The only file that imports the markdown libraries (ADR-002); the note view reaches it through
 * a dynamic import, so none of this is in the main chunk. CommonMark only: no GFM and no
 * raw-HTML plugin, so raw HTML never becomes an element and shows as literal text (R14, C10).
 */

interface HastNode {
  type: string
  children?: HastNode[]
}

/**
 * react-markdown keeps raw HTML as `raw` nodes and turns them into text only AFTER the rehype
 * plugins run, while the sanitizer drops unknown nodes: without this step the text would vanish
 * instead of showing literally. It runs first, so the sanitizer only ever sees text.
 */
const rawToText = () => (tree: HastNode) => {
  const walk = (node: HastNode) => {
    if (node.type === 'raw') node.type = 'text'
    node.children?.forEach(walk)
  }
  walk(tree)
}

const LINK_SCHEMES = ['http:', 'https:', 'mailto:']

/** The sanitizer is the second lock: no `img`, and only http, https and mailto hrefs. */
export const markdownSchema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter((tag) => tag !== 'img'),
  protocols: { ...defaultSchema.protocols, href: ['http', 'https', 'mailto'] },
}

/** Anything but an absolute http, https or mailto URL becomes empty (relative included). */
export const urlTransform: NonNullable<Options['urlTransform']> = (url) => {
  try {
    return LINK_SCHEMES.includes(new URL(url).protocol) ? url : ''
  } catch {
    return ''
  }
}

/** The view has one `h1` (the title): a heading inside a body is a bold paragraph. */
const heading = ({ children }: { children?: ReactNode }) => (
  <p className={styles.heading}>{children}</p>
)

const components: Components = {
  a: ({ href, children }) =>
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
  h1: heading,
  h2: heading,
  h3: heading,
  h4: heading,
  h5: heading,
  h6: heading,
}

export default function MarkdownBody({ body }: { body: string }) {
  return (
    <div className={styles.body}>
      <ReactMarkdown
        rehypePlugins={[rawToText, [rehypeSanitize, markdownSchema]]}
        disallowedElements={['img']}
        urlTransform={urlTransform}
        components={components}
      >
        {body}
      </ReactMarkdown>
    </div>
  )
}
