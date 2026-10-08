import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { AuthContainer } from '../src/features/auth/AuthContainer'
import { AuthForm } from '../src/features/auth/AuthForm'
import { messages } from '../src/messages'

const signInWithPassword = vi.fn<(credentials: unknown) => Promise<unknown>>()
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: { signInWithPassword: (credentials: unknown) => signInWithPassword(credentials) },
  },
}))

const formProps = {
  mode: 'signIn',
  busy: false,
  notice: null,
  error: null,
  onSubmit: () => undefined,
  onToggleMode: () => undefined,
} as const

beforeEach(() => signInWithPassword.mockReset())

it('shows the session-expired message as a status when the session ended', () => {
  render(<AuthForm {...formProps} expired />)
  expect(screen.getByRole('status')).toHaveTextContent(messages.auth.sessionExpired)
})

it('shows no status for an ordinary sign-in', () => {
  render(<AuthForm {...formProps} expired={false} />)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

it('clears the session-expired message on the next sign-in attempt', async () => {
  signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login' } })
  render(<AuthContainer expired />)
  expect(screen.getByRole('status')).toHaveTextContent(messages.auth.sessionExpired)

  fireEvent.change(screen.getByLabelText(messages.auth.email), { target: { value: 'a@b.co' } })
  fireEvent.change(screen.getByLabelText(messages.auth.password), {
    target: { value: 'password1' },
  })
  fireEvent.click(screen.getByRole('button', { name: messages.auth.signIn }))

  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invalid login'))
  expect(screen.queryByText(messages.auth.sessionExpired)).not.toBeInTheDocument()
})
