/** The detail query of one note; the list lives under `NOTES_KEYS` (`['notes', term, tag]`). */
export const noteKey = (id: string) => ['note', id] as const

/** Every All notes list query; a write invalidates them by this prefix. */
export const NOTES_KEYS = ['notes'] as const
