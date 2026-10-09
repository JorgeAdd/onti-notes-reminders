import { messages } from '../../messages'
import type { KeyHint } from '../today/keys'

export type HelpSectionId = 'capture' | 'days' | 'note' | 'find'

export interface HelpRow {
  id: string
  /** `event.key` values the row documents; empty on touch. Used by tests, never shown. */
  keys: readonly string[]
  line: string
  detail?: string
}

export interface HelpSection {
  id: HelpSectionId
  title: string
  rows: HelpRow[]
}

interface RowDef {
  section: HelpSectionId
  keys: readonly string[]
  line: string
  detail?: string
}

const { keys: hints } = messages.statusline
const { detail } = messages.help

/** One row per `KeyHint`, so a new hint fails `tsc` until it is placed here. The line is the statusline's. */
export const HINT_ROWS: Record<KeyHint, RowDef> = {
  capture: { section: 'capture', keys: ['c'], line: hints.capture },
  days: { section: 'days', keys: ['[', ']'], line: hints.days },
  today: { section: 'days', keys: ['t'], line: hints.today, detail: detail.today },
  move: { section: 'note', keys: ['j', 'k'], line: hints.move },
  done: { section: 'note', keys: ['x'], line: hints.done },
  undo: { section: 'note', keys: ['z'], line: hints.undo },
  snooze: { section: 'note', keys: ['s'], line: hints.snooze, detail: detail.snooze },
  hour: { section: 'note', keys: ['h'], line: hints.hour },
  tomorrow: { section: 'note', keys: ['t'], line: hints.tomorrow },
  cancel: { section: 'note', keys: ['Escape'], line: hints.cancel, detail: detail.cancel },
  edit: { section: 'note', keys: ['e'], line: hints.edit, detail: detail.edit },
  search: { section: 'find', keys: ['/'], line: hints.search, detail: detail.search },
  tags: {
    section: 'find',
    keys: ['#', 'Tab', 'Enter'],
    line: hints.tags,
    detail: messages.filter.hint,
  },
  clear: { section: 'find', keys: ['Escape'], line: hints.clear },
}

/** Keys that have no statusline hint: the capture bar's esc and the note view's delete. */
const EXTRA_ROWS: Record<string, RowDef> = {
  captureCancel: {
    section: 'capture',
    keys: ['Escape'],
    line: messages.help.captureCancel,
    detail: detail.captureCancel,
  },
  delete: {
    section: 'note',
    keys: ['d', 'Enter', 'Escape'],
    line: messages.note.hints.delete,
    detail: detail.delete,
  },
}

const SECTIONS: HelpSectionId[] = ['capture', 'days', 'note', 'find']

const row = (id: string, def: RowDef): HelpRow => ({
  id,
  keys: def.keys,
  line: def.line,
  ...(def.detail === undefined ? {} : { detail: def.detail }),
})

const keyRows = (id: HelpSectionId): HelpRow[] =>
  [...Object.entries(HINT_ROWS), ...Object.entries(EXTRA_ROWS)]
    .filter(([, def]) => def.section === id)
    .map(([rowId, def]) => row(rowId, def))

const touchRows = (id: HelpSectionId): HelpRow[] =>
  messages.help.touch[id].map((line, i) => ({ id: `${id}-touch-${i}`, keys: [], line }))

/** The four sections in roadmap order; on touch the key rows are replaced by the touch lines. */
export function buildHelp(touch: boolean): HelpSection[] {
  return SECTIONS.map((id) => ({
    id,
    title: messages.help.sections[id],
    rows: touch ? touchRows(id) : keyRows(id),
  }))
}

/** Every key the help documents (test input for the coverage check). */
export function helpKeys(sections: HelpSection[] = buildHelp(false)): Set<string> {
  return new Set(sections.flatMap((s) => s.rows.flatMap((r) => r.keys)))
}
