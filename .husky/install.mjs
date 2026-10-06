// Install git hooks for local development only.
// Skipped in CI, production installs and environments without husky
// (e.g. `npm ci --omit=dev` on Vercel/Railway).
if (process.env.CI === 'true' || process.env.NODE_ENV === 'production' || process.env.HUSKY === '0') {
  process.exit(0)
}
try {
  const husky = (await import('husky')).default
  const result = husky()
  if (result) console.log(`husky: ${result}`)
} catch {
  console.log('husky: not installed, git hooks skipped')
}
