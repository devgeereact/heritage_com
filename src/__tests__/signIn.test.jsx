import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import Cookies from 'js-cookie'
import SignIn from '@/app/(other)/auth/sign-in/components/SignIn'
import { AuthProvider } from '@/context/useAuthContext'
import { NotificationProvider } from '@/context/useNotificationContext'
import { API_BASE } from '@/context/constants'
import { mockFetch, jsonResponse, setOnline, setStaffCookie } from './helpers'

// Iconify fetches icon data over the network; the icons are decoration here.
vi.mock('@/components/wrappers/IconifyIcon', () => ({ default: () => null }))

const Where = () => {
  const { pathname, search } = useLocation()
  return <p data-testid="where">{pathname + search}</p>
}

const renderSignIn = (entry = '/auth/sign-in') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/auth/sign-in" element={<SignIn />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </MemoryRouter>,
  )

const session = () => {
  const raw = Cookies.get('_LARKON_AUTH_KEY_')
  return raw ? JSON.parse(raw) : null
}

const fillAndSubmit = async (user, email = 'dev@heritclothing.com', password = 'correct horse') => {
  if (email) await user.type(screen.getByLabelText('Email'), email)
  if (password) await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign In' }))
}

describe('staff sign-in form: validation', () => {
  it('asks for both fields and sends nothing when the form is empty', async () => {
    const fetchMock = mockFetch()
    const user = userEvent.setup()
    renderSignIn()

    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Please enter your email')).toBeInTheDocument()
    expect(screen.getByText('Please enter your password')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Email')).toHaveClass('is-invalid')
  })

  it('asks only for the password when the email is filled in', async () => {
    const fetchMock = mockFetch()
    const user = userEvent.setup()
    renderSignIn()

    await fillAndSubmit(user, 'dev@heritclothing.com', '')

    expect(await screen.findByText('Please enter your password')).toBeInTheDocument()
    expect(screen.queryByText('Please enter your email')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not send a request for an address that is not an email', async () => {
    const fetchMock = mockFetch()
    const user = userEvent.setup()
    renderSignIn()

    await fillAndSubmit(user, 'not-an-email', 'whatever')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByTestId('where')).not.toBeInTheDocument()
  })
})

describe('staff sign-in form: server answers', () => {
  it('shows the server message for a wrong password and stays on the form without a session', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ error: 'Email or password is wrong.' }, 401))
    const user = userEvent.setup()
    renderSignIn()

    await fillAndSubmit(user)

    expect(await screen.findByText('Email or password is wrong.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(session()).toBeNull()
    expect(screen.queryByTestId('where')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled()
  })

  it('posts the typed email and password to the login action', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ error: 'no' }, 401))
    const user = userEvent.setup()
    renderSignIn()

    await fillAndSubmit(user, 'dev@heritclothing.com', 's3cret!')

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_BASE}/auth.php?action=login`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ email: 'dev@heritclothing.com', password: 's3cret!' })
  })

  it('stores the session and goes to the role home on success', async () => {
    mockFetch(() => jsonResponse({ token: 'tok-123', user: { id: 1, email: 'dev@heritclothing.com', role: 'manager' } }))
    const user = userEvent.setup()
    renderSignIn()

    await fillAndSubmit(user)

    expect(await screen.findByTestId('where')).toHaveTextContent('/today')
    // The session keeps the token and the user fields at the top level (older Larkon screens read session.email).
    expect(session()).toMatchObject({ token: 'tok-123', email: 'dev@heritclothing.com', role: 'manager', user: { id: 1 } })
    expect(await screen.findByText('Signed in to HeritOS. Redirecting...')).toBeInTheDocument()
  })

  it('sends a tailor to the jobs page', async () => {
    mockFetch(() => jsonResponse({ token: 't', user: { role: 'tailor' } }))
    const user = userEvent.setup()
    renderSignIn()

    await fillAndSubmit(user)

    expect(await screen.findByTestId('where')).toHaveTextContent('/jobs')
  })

  it('returns to the page the user was sent from when their role may open it', async () => {
    mockFetch(() => jsonResponse({ token: 't', user: { role: 'manager' } }))
    const user = userEvent.setup()
    renderSignIn('/auth/sign-in?redirectTo=/payments')

    await fillAndSubmit(user)

    expect(await screen.findByTestId('where')).toHaveTextContent('/payments')
  })

  it('ignores a redirect to a page the role may not open and uses the role home instead', async () => {
    mockFetch(() => jsonResponse({ token: 't', user: { role: 'tailor' } }))
    const user = userEvent.setup()
    renderSignIn('/auth/sign-in?redirectTo=/payments')

    await fillAndSubmit(user)

    expect(await screen.findByTestId('where')).toHaveTextContent('/jobs')
  })

  it('tells the user when the server cannot be reached, and sets no session', async () => {
    mockFetch(() => {
      throw new TypeError('Failed to fetch')
    })
    const user = userEvent.setup()
    renderSignIn()

    await fillAndSubmit(user)

    expect(await screen.findByText('Could not reach the server, so this may not have been saved. Check your connection, then check before trying again.')).toBeInTheDocument()
    expect(session()).toBeNull()
  })

  it('refuses to sign in while the device is offline, before any request is made', async () => {
    setOnline(false)
    const fetchMock = mockFetch()
    const user = userEvent.setup()
    renderSignIn()

    await fillAndSubmit(user)

    expect(await screen.findByText('You are offline, so nothing was saved. Reconnect and try again.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('disables the button while the request is in flight', async () => {
    let release
    mockFetch(() => new Promise((resolve) => { release = () => resolve(jsonResponse({ error: 'Email or password is wrong.' }, 401)) }))
    const user = userEvent.setup()
    renderSignIn()

    await fillAndSubmit(user)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign In' })).toBeDisabled())
    release()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled())
  })
})

describe('staff PIN sign-in', () => {
  const openPin = async (user) => {
    await user.click(screen.getByRole('button', { name: /Sign in with staff PIN/ }))
    return screen.getByPlaceholderText('4–6 digit PIN')
  }

  it('keeps Unlock disabled until the PIN has four digits, and ignores non-digits', async () => {
    renderSignIn()
    const user = userEvent.setup()
    const field = await openPin(user)

    await user.type(field, '12ab3')
    expect(field).toHaveValue('123')
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeDisabled()

    await user.type(field, '4')
    expect(field).toHaveValue('1234')
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeEnabled()
  })

  it('signs in with a correct PIN and goes to the role home', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ token: 'pin-tok', user: { role: 'employee', email: 'stall@heritclothing.com' } }))
    renderSignIn()
    const user = userEvent.setup()
    const field = await openPin(user)

    await user.type(field, '4821')
    await user.click(screen.getByRole('button', { name: 'Unlock' }))

    expect(await screen.findByTestId('where')).toHaveTextContent('/enquiries')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_BASE}/auth.php?action=pin_login`)
    expect(JSON.parse(init.body)).toEqual({ pin: '4821' })
    expect(session()).toMatchObject({ token: 'pin-tok', role: 'employee' })
  })

  it('shows the server message for a wrong PIN and clears the field', async () => {
    mockFetch(() => jsonResponse({ error: 'That PIN was not recognised.' }, 401))
    renderSignIn()
    const user = userEvent.setup()
    const field = await openPin(user)

    await user.type(field, '0000')
    await user.click(screen.getByRole('button', { name: 'Unlock' }))

    expect(await screen.findByText('That PIN was not recognised.')).toBeInTheDocument()
    expect(field).toHaveValue('')
    expect(session()).toBeNull()
  })
})

describe('staff session cookie', () => {
  it('starts signed in when a session cookie from an earlier visit exists', () => {
    setStaffCookie({ token: 'abc', role: 'manager' })
    renderSignIn()
    // The provider reads the cookie on mount; the form itself still renders.
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    expect(session()).toMatchObject({ token: 'abc' })
  })

  // AuthProvider sits above AppErrorBoundary, so a throw while reading the cookie
  // would blank the app. A cookie that is not valid JSON is dropped instead.
  it('survives a session cookie that is not valid JSON', () => {
    document.cookie = '_LARKON_AUTH_KEY_=%7Bnot-json; path=/'
    expect(() => renderSignIn()).not.toThrow()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    expect(Cookies.get('_LARKON_AUTH_KEY_')).toBeUndefined()
  })

  it('drops a session cookie that is valid JSON but not a profile', () => {
    document.cookie = `_LARKON_AUTH_KEY_=${encodeURIComponent('"just a string"')}; path=/`
    expect(() => renderSignIn()).not.toThrow()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    expect(Cookies.get('_LARKON_AUTH_KEY_')).toBeUndefined()
  })
})
