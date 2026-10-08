/** The only place the web reads the device clock (CLAUDE.md rule 16; ESLint enforces it). */

/** `skew = server now − device time when the response arrived` (Decision 6). */
export function skewOf(serverNow: Date, receivedAtMs: number): number {
  return serverNow.getTime() - receivedAtMs
}

/** Device time shifted by the skew, so labels agree with the server's page membership. */
export function timeWithSkew(skewMs: number): Date {
  return new Date(Date.now() + skewMs)
}
