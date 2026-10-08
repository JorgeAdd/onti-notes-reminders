import { z } from 'zod'
import { instant } from './instant'

const todayItemSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  tags: z.array(z.object({ name: z.string().min(1), slug: z.string().min(1) })),
  dueAt: instant,
  originalDueAt: instant,
  snoozeCount: z.number().int().nonnegative(),
  doneAt: instant.nullable(),
})

/** GET /today — the day page as the server decides it (R1–R5); the client decides how time reads. */
export const todayResponseSchema = z.object({
  now: instant,
  timezone: z.string().min(1),
  window: z.object({ start: instant, end: instant }),
  openCount: z.number().int().nonnegative(),
  anyDoneToday: z.boolean(),
  otherCount: z.number().int().nonnegative(),
  carried: z.array(z.object({ day: instant, items: z.array(todayItemSchema) })),
  rail: z.array(todayItemSchema),
})

export type TodayItem = z.output<typeof todayItemSchema>
export type TodayResponse = z.output<typeof todayResponseSchema>
