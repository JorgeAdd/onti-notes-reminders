import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type CryptoKey, type JWK } from 'jose'
import { beforeAll, describe, expect, it } from 'vitest'
import { UnauthorizedError } from '../src/application/errors'
import { JwksTokenVerifier } from '../src/infrastructure/auth/jwks-token-verifier'

const ISSUER = 'https://project-ref.supabase.co/auth/v1'
const JORGE = '7b0c5a2e-3f4d-4c1a-9e8b-2d6f0a1b3c4d'

let signingKey: CryptoKey
let otherKey: CryptoKey
let verifier: JwksTokenVerifier

beforeAll(async () => {
  const pair = await generateKeyPair('ES256')
  signingKey = pair.privateKey
  otherKey = (await generateKeyPair('ES256')).privateKey
  const jwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: 'key-1', alg: 'ES256' }
  verifier = new JwksTokenVerifier({ issuer: ISSUER, keys: createLocalJWKSet({ keys: [jwk] }) })
})

function token(overrides: { issuer?: string; audience?: string; expiresIn?: string | number; key?: CryptoKey; sub?: string } = {}) {
  return new SignJWT({ email: 'jorge@example.com', role: 'authenticated' })
    .setProtectedHeader({ alg: 'ES256', kid: 'key-1' })
    .setSubject(overrides.sub ?? JORGE)
    .setIssuer(overrides.issuer ?? ISSUER)
    .setAudience(overrides.audience ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(overrides.expiresIn ?? '1h')
    .sign(overrides.key ?? signingKey)
}

describe('JwksTokenVerifier', () => {
  it('returns the identity for a valid Supabase token', async () => {
    const identity = await verifier.verify(await token())
    expect(identity.userId).toBe(JORGE)
    expect(identity.email).toBe('jorge@example.com')
    expect(identity.claims.role).toBe('authenticated')
  })

  it.each([
    ['another issuer', { issuer: 'https://evil.example/auth/v1' }],
    ['another audience', { audience: 'anon' }],
    ['an expired token', { expiresIn: Math.floor(Date.now() / 1000) - 60 }],
    ['a key outside the JWKS', { key: undefined as unknown as CryptoKey }],
  ])('rejects %s', async (_label, overrides) => {
    const options = 'key' in overrides ? { key: otherKey } : overrides
    await expect(verifier.verify(await token(options))).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('rejects a tampered token', async () => {
    const [header, , signature] = (await token()).split('.')
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 'someone-else', iss: ISSUER, aud: 'authenticated' })).toString('base64url')
    await expect(verifier.verify(`${header}.${forgedPayload}.${signature}`)).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('rejects garbage', async () => {
    await expect(verifier.verify('not-a-jwt')).rejects.toBeInstanceOf(UnauthorizedError)
  })
})
