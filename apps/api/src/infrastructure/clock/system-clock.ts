import type { Clock } from '../../application/ports'

/** The only place that reads the wall clock (CLAUDE.md rule 16). */
export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}
