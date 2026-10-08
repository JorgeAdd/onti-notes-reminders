import type { TodayResponse } from '@onti/shared'
import { messages } from '../../messages'
import { calendarDayLabel } from './format'

/** R4, R12 · the header of a page, "{n} notes" when filtered: "4 things today", "3 left today" or "1 thing on Thu 8". */
export function pageTitle(page: TodayResponse): string {
  if (page.tag !== null) {
    const onPage =
      page.carried.reduce((sum, group) => sum + group.items.length, 0) + page.rail.length
    return messages.filter.header(onPage + page.others.length)
  }
  if (page.isToday) return messages.today.header(page.openCount, page.anyDoneToday)
  return messages.day.header(page.openCount, calendarDayLabel(page.date, page.timezone))
}
