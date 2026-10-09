import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolve, tokens } from './css-tokens'

const WEB = join(__dirname, '..')
const PUBLIC = join(WEB, 'public')
const read = (path: string) => readFileSync(path, 'utf8')

interface Manifest {
  name: string
  short_name: string
  start_url: string
  scope: string
  display: string
  theme_color: string
  background_color: string
  icons: { src: string; sizes: string; type: string; purpose?: string }[]
}
const manifest = () => JSON.parse(read(join(PUBLIC, 'manifest.webmanifest'))) as Manifest

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
function pngSize(file: string) {
  const bytes = readFileSync(file)
  return {
    signature: [...bytes.subarray(0, 8)],
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  }
}

describe('manifest.webmanifest', () => {
  it('names the app and starts at the root in standalone mode (iOS 16.4+ home screen)', () => {
    expect(manifest()).toMatchObject({
      name: 'Notes + Reminders',
      short_name: 'Notes',
      start_url: '/',
      scope: '/',
      display: 'standalone',
    })
  })

  it('lists 192 and 512 px icons that exist and have exactly the declared size', () => {
    const { icons } = manifest()
    expect(icons.map((icon) => icon.sizes).sort()).toEqual(['192x192', '512x512'])
    for (const icon of icons) {
      const file = join(PUBLIC, icon.src)
      expect(existsSync(file), icon.src).toBe(true)
      const { signature, width, height } = pngSize(file)
      expect(signature).toEqual(PNG_SIGNATURE)
      expect(icon.type).toBe('image/png')
      expect(`${width}x${height}`).toBe(icon.sizes)
    }
  })

  it('has a 180 px apple touch icon', () => {
    const { signature, width, height } = pngSize(join(PUBLIC, 'icons', 'apple-touch-icon.png'))
    expect(signature).toEqual(PNG_SIGNATURE)
    expect([width, height]).toEqual([180, 180])
  })

  // The manifest cannot read CSS variables, so the one raw-hex exception to rule 8 is pinned here.
  it('uses the light-mode page color for the theme and the splash background', () => {
    const { root } = tokens()
    const page = resolve('var(--color-page)', root).toLowerCase()
    expect(page).toMatch(/^#[0-9a-f]{6}$/)
    expect(manifest().theme_color.toLowerCase()).toBe(page)
    expect(manifest().background_color.toLowerCase()).toBe(page)
  })
})

describe('index.html', () => {
  const html = read(join(WEB, 'index.html'))

  it('links the manifest and the apple touch icon', () => {
    expect(html).toMatch(/<link rel="manifest" href="\/manifest\.webmanifest"/)
    expect(html).toMatch(/<link rel="apple-touch-icon" href="\/icons\/apple-touch-icon\.png"/)
  })

  it('sets the browser theme color to the manifest value', () => {
    const color = /<meta name="theme-color" content="(#[0-9a-fA-F]{6})"/.exec(html)?.[1]
    expect(color?.toLowerCase()).toBe(manifest().theme_color.toLowerCase())
  })
})

describe('vercel.json', () => {
  const config = JSON.parse(read(join(WEB, '..', '..', 'vercel.json'))) as {
    headers?: { source: string; headers: { key: string; value: string }[] }[]
    rewrites: { source: string; destination: string }[]
  }

  it('serves /sw.js with no-cache so an update is found on the next load', () => {
    const rule = config.headers?.find((entry) => entry.source === '/sw.js')
    expect(rule?.headers).toContainEqual({ key: 'Cache-Control', value: 'no-cache' })
  })

  it('keeps the single-page rewrite unchanged', () => {
    expect(config.rewrites).toEqual([{ source: '/(.*)', destination: '/index.html' }])
  })
})
