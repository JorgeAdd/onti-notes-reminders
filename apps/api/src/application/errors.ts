export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/** The request is well formed but its content is not acceptable (HTTP 400). */
export class ValidationError extends Error {
  constructor(message = 'Invalid request') {
    super(message)
    this.name = 'ValidationError'
  }
}

/** The resource does not exist or is not the caller's, which look the same (HTTP 404, R15). */
export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

/** `due_at_changed`: a notification action whose `due_at` no longer matches the note (replayed or stale tap). */
export type ConflictReason = 'not_open' | 'no_reminder' | 'due_at_changed'

/** The note is not in a state that allows the action (HTTP 409). */
export class ConflictError extends Error {
  constructor(readonly reason: ConflictReason) {
    super(`Conflict: ${reason}`)
    this.name = 'ConflictError'
  }
}
