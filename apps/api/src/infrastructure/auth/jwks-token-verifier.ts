import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'
import { UnauthorizedError } from '../../application/errors'
import type { TokenVerifier } from '../../application/ports'
import type { Identity } from '../../domain/identity'

const AUDIENCE = 'authenticated'

interface Options {
  issuer: string
  keys: JWTVerifyGetKey
}

/** Verifies Supabase access tokens: signature (JWKS), issuer, audience, expiry. */
export class JwksTokenVerifier implements TokenVerifier {
  constructor(private readonly options: Options) {}

  static forSupabase(supabaseUrl: string): JwksTokenVerifier {
    const issuer = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`
    const keys = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))
    return new JwksTokenVerifier({ issuer, keys })
  }

  async verify(token: string): Promise<Identity> {
    try {
      const { payload } = await jwtVerify(token, this.options.keys, {
        issuer: this.options.issuer,
        audience: AUDIENCE,
      })
      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        throw new UnauthorizedError('Token has no subject')
      }
      return {
        userId: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : null,
        claims: payload as Record<string, unknown>,
      }
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error
      throw new UnauthorizedError('Invalid token')
    }
  }
}
