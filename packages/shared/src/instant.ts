import { z } from 'zod'

/** Instants travel as ISO strings; `parse` decodes to Date, `z.encode` writes the string. */
export const instant = z.codec(z.iso.datetime(), z.date(), {
  decode: (iso) => new Date(iso),
  encode: (date) => date.toISOString(),
})
