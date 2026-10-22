import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RetentionSettings from '@/app/(admin)/settings/components/RetentionSettings'
import { AuthProvider } from '@/context/useAuthContext'
import { mockFetch, jsonResponse, setStaffCookie } from './helpers'

vi.mock('@/components/wrappers/IconifyIcon', () => ({ default: () => null }))

// K-18 M1: retention periods delete data, so only the owner (super_admin) may
// change them. Everyone else with Settings access sees the values, read-only.
const renderAs = (role) => {
  setStaffCookie({ id: 1, name: 'Test', email: 'test@example.test', role })
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RetentionSettings />
      </AuthProvider>
    </MemoryRouter>,
  )
}

const settings = { retention_expired_tokens_days: '30', retention_audit_log_days: '' }

describe('data retention settings', () => {
  it('lets the owner edit and save the periods', async () => {
    const fetchMock = mockFetch((url, init) => jsonResponse(init.method === 'POST' ? { ok: true, saved: [] } : settings))
    const user = userEvent.setup()
    renderAs('super_admin')

    const field = await screen.findByLabelText(/Expired staff sign-in tokens/)
    expect(field).not.toBeDisabled()
    expect(field).toHaveValue(30)
    expect(screen.queryByTestId('retention-readonly')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save retention periods' }))
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(post).toBeTruthy()
    expect(JSON.parse(post[1].body).retention_expired_tokens_days).toBe('30')
  })

  it.each(['admin', 'manager'])('shows %s the periods read-only with no save button', async (role) => {
    const fetchMock = mockFetch(() => jsonResponse(settings))
    renderAs(role)

    const field = await screen.findByLabelText(/Expired staff sign-in tokens/)
    expect(field).toBeDisabled()
    expect(field).toHaveValue(30)
    expect(screen.getByTestId('retention-readonly')).toHaveTextContent('Only the owner can change these periods.')
    expect(screen.queryByRole('button', { name: 'Save retention periods' })).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })
})
