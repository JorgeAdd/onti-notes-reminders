/** The IANA zone the browser reports (e.g. "America/Mexico_City"). */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
