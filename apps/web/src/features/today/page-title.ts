import type { TodayResponse } from '@onti/shared'
import { messages } from '../../messages'
import { calendarDayLabel } from './format'

/** R4 · the header of a page: "4 things today", "3 left today" or "1 thing on Thu 8". */
export function pageTitle(page: TodayResponse): string {
  if (page.isToday) return messages.today.header(page.openCount, page.anyDoneToday)
  return messages.day.header(page.openCount, calendarDayLabel(page.date, page.timezone))
}
