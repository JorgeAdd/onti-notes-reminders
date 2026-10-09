/** The detail query of one note; the list lives under `['notes', …]`. */
export const noteKey = (id: string) => ['note', id] as const
