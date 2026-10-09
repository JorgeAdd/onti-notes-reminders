import { createHmac, timingSafeEqual } from 'node:crypto'
import { actionClaimsSchema, type ActionClaims } from '@onti/shared'
import type { ActionTokens } from '../../application/push-ports'

const SIGNATURE_BYTES = 32

/**
 * `base64url(JSON claims) + '.' + base64url(HMAC-SHA-256(secret, first segment))` (ADR-004).
 * The signature covers the exact text of the first segment, never a re-serialized object. Every
 * failure is `null`, so callers cannot tell a forged token from an expired one.
 */
export class HmacActionTokens implements ActionTokens {
  constructor(private readonly secret: string) {}

  sign(claims: ActionClaims): string {
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
    return `${payload}.${this.signature(payload).toString('base64url')}`
  }

  verify(token: string, now: Date): ActionClaims | null {
    const segments = token.split('.')
    if (segments.length !== 2) return null
    const [payload, signature] = segments as [string, string]

    const given = Buffer.from(signature, 'base64url')
    if (given.length !== SIGNATURE_BYTES) return null
    if (!timingSafeEqual(given, this.signature(payload))) return null

    let json: unknown
    try {
      json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    } catch {
      return null
    }
    const parsed = actionClaimsSchema.safeParse(json)
    if (!parsed.success || now.getTime() >= parsed.data.exp * 1000) return null
    return parsed.data
  }

  private signature(payload: string): Buffer {
    return createHmac('sha256', this.secret).update(payload).digest()
  }
}
