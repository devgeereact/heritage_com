import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import BookPage from '@/app/(public)/site/BookPage'
import { mockFetch, jsonResponse } from './helpers'

// The page chrome (header, footer, site config) is not under test here.
vi.mock('@/app/(public)/site/SiteLayout', () => ({ default: ({ children }) => <div>{children}</div> }))

// The booking switch is read once per page load in production; here each test sets it.
const cfgState = vi.hoisted(() => ({ value: null }))
vi.mock('@/app/(public)/site/bookingConfig', () => ({ useBookingConfig: () => cfgState.value }))

const OPEN = {
  enabled: true,
  horizon_days: 30,
  types: [
    { type: 'consultation', duration_min: 30 },
    { type: 'fitting', duration_min: 45 },
  ],
}
const SLOT = { start: '2026-10-12T10:00:00+01:00', end: '2026-10-12T10:30:00+01:00' }

/** fetch mock: free times, the booking request and the privacy note's site config. */
const setup = ({ cfg = OPEN, request = () => jsonResponse({ message: 'We will confirm by WhatsApp.' }) } = {}) => {
  cfgState.value = cfg
  const fetchMock = mockFetch((url, init) => {
    if (url.includes('/booking.php?action=slots')) return jsonResponse({ slots: [SLOT] })
    if (url.includes('/booking.php?action=request')) return request(url, init)
    return jsonResponse({ nav: {} })
  })
  const requests = () => fetchMock.mock.calls.filter(([url]) => String(url).includes('action=request'))
  return { fetchMock, requests }
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <BookPage />
    </MemoryRouter>,
  )

/** Walk to the details step with a time chosen. */
const toDetails = async (user) => {
  await user.click(screen.getByRole('button', { name: 'Choose a time' }))
  await user.click(await screen.findByRole('button', { name: /at 10:00/ }))
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  return screen.findByRole('heading', { name: 'Your details' })
}

describe('public booking: availability of the page', () => {
  it('says online booking is not open yet, and points to the contact page, when the owner has it off', () => {
    setup({ cfg: { enabled: false } })
    renderPage()

    expect(screen.getByRole('heading', { name: 'Online booking is not open yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact')
    expect(screen.queryByRole('button', { name: 'Choose a time' })).not.toBeInTheDocument()
  })

  it('shows a loading message until the booking switch is known', () => {
    setup({ cfg: null })
    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    expect(screen.queryByRole('heading', { name: 'Online booking is not open yet' })).not.toBeInTheDocument()
  })
})

describe('public booking: the steps', () => {
  it('offers the visit types with their length and starts on the first', () => {
    setup()
    renderPage()

    expect(screen.getByRole('radio', { name: /Consultation/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Fitting/ })).not.toBeChecked()
    expect(screen.getByText('(45 minutes)')).toBeInTheDocument()
  })

  it('moves focus to each new step heading', async () => {
    setup()
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Choose a time' }))
    const timeHeading = await screen.findByRole('heading', { name: 'Choose a time' })
    await waitFor(() => expect(timeHeading).toHaveFocus())

    await user.click(await screen.findByRole('button', { name: /at 10:00/ }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    const detailsHeading = await screen.findByRole('heading', { name: 'Your details' })
    await waitFor(() => expect(detailsHeading).toHaveFocus())
  })

  it('cannot continue until a time is chosen, and shows the chosen time in Lagos time', async () => {
    setup()
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Choose a time' }))
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()

    await user.click(await screen.findByRole('button', { name: /at 10:00/ }))
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
    expect(screen.getByText(/Lagos time \(30 minutes\)/)).toBeInTheDocument()
  })

  it('asks for free times for the type that was chosen', async () => {
    const { fetchMock } = setup()
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('radio', { name: /Fitting/ }))
    await user.click(screen.getByRole('button', { name: 'Choose a time' }))

    await waitFor(() => {
      const slotCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('action=slots'))
      expect(slotCalls.length).toBeGreaterThan(0)
      expect(String(slotCalls.at(-1)[0])).toContain('type=fitting')
    })
  })
})

describe('public booking: details step', () => {
  it('focuses the name field first when nothing is filled in, and sends nothing', async () => {
    const { requests } = setup()
    const user = userEvent.setup()
    renderPage()
    await toDetails(user)

    await user.click(screen.getByRole('button', { name: 'Send request' }))

    expect(screen.getByLabelText(/Your name/)).toHaveFocus()
    expect(screen.getByText('Enter your name')).toBeInTheDocument()
    expect(screen.getByLabelText(/Your name/)).toHaveAttribute('aria-invalid', 'true')
    expect(requests()).toHaveLength(0)
  })

  it('focuses the phone field when the name is fine but there is no way to reply', async () => {
    const { requests } = setup()
    const user = userEvent.setup()
    renderPage()
    await toDetails(user)

    await user.type(screen.getByLabelText(/Your name/), 'Ada')
    await user.click(screen.getByRole('button', { name: 'Send request' }))

    expect(screen.getByLabelText(/Phone or WhatsApp/)).toHaveFocus()
    expect(screen.getByText('Give a phone number or an email so we can confirm')).toBeInTheDocument()
    expect(requests()).toHaveLength(0)
  })

  it('focuses the email field when the address looks wrong', async () => {
    const { requests } = setup()
    const user = userEvent.setup()
    renderPage()
    await toDetails(user)

    await user.type(screen.getByLabelText(/Your name/), 'Ada')
    await user.type(screen.getByLabelText(/Phone or WhatsApp/), '08031234567')
    await user.type(screen.getByLabelText(/^Email/), 'ada@')
    await user.click(screen.getByRole('button', { name: 'Send request' }))

    expect(screen.getByLabelText(/^Email/)).toHaveFocus()
    expect(screen.getByText('That email address looks wrong')).toBeInTheDocument()
    expect(requests()).toHaveLength(0)
  })

  it('sends the request with the chosen type and time, then confirms it is not yet booked', async () => {
    const { requests } = setup()
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('radio', { name: /Fitting/ }))
    await toDetails(user)

    await user.type(screen.getByLabelText(/Your name/), ' Ada Okafor ')
    await user.type(screen.getByLabelText(/Phone or WhatsApp/), '08031234567')
    await user.type(screen.getByLabelText(/Anything we should know/), 'Bringing my own cloth.')
    await user.click(screen.getByRole('button', { name: 'Send request' }))

    const done = await screen.findByText('Request sent, not yet confirmed.')
    await waitFor(() => expect(done.closest('[role="status"]')).toHaveFocus())
    expect(screen.getByText(/We will confirm by WhatsApp\./)).toBeInTheDocument()

    const body = JSON.parse(requests()[0][1].body)
    expect(body).toMatchObject({
      type: 'fitting',
      start: SLOT.start,
      name: 'Ada Okafor',
      phone: '08031234567',
      email: '',
      note: 'Bringing my own cloth.',
      hp_url: '',
    })
    expect(body.request_key).toMatch(/^[A-Za-z0-9_-]{16,64}$/)
  })

  it('reuses the same request key when a failed send is tried again', async () => {
    let attempt = 0
    const { requests } = setup({
      request: () => {
        attempt += 1
        return attempt === 1 ? jsonResponse({ error: 'Something went wrong on our side.' }, 500) : jsonResponse({ message: 'Done.' })
      },
    })
    const user = userEvent.setup()
    renderPage()
    await toDetails(user)

    await user.type(screen.getByLabelText(/Your name/), 'Ada')
    await user.type(screen.getByLabelText(/Phone or WhatsApp/), '08031234567')
    await user.click(screen.getByRole('button', { name: 'Send request' }))
    expect(await screen.findByText('Something went wrong on our side.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Send request' }))
    expect(await screen.findByText('Request sent, not yet confirmed.')).toBeInTheDocument()

    const keys = requests().map(([, init]) => JSON.parse(init.body).request_key)
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])
  })

  it('sends the visitor back to choose another time when the slot has just been taken (409)', async () => {
    setup({ request: () => jsonResponse({ error: 'That time is no longer free.' }, 409) })
    const user = userEvent.setup()
    renderPage()
    await toDetails(user)

    await user.type(screen.getByLabelText(/Your name/), 'Ada')
    await user.type(screen.getByLabelText(/Phone or WhatsApp/), '08031234567')
    await user.click(screen.getByRole('button', { name: 'Send request' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That time is no longer free. Please choose another time.')
    expect(await screen.findByRole('heading', { name: 'Choose a time' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  it.each([
    [503, 'Online requests have just closed. Please contact us instead.'],
    [429, 'Too many requests from this connection. Please try again later or contact us.'],
  ])('explains a %i answer in plain words and stays on the form', async (status, message) => {
    setup({ request: () => jsonResponse({ error: 'raw server text' }, status) })
    const user = userEvent.setup()
    renderPage()
    await toDetails(user)

    await user.type(screen.getByLabelText(/Your name/), 'Ada')
    await user.type(screen.getByLabelText(/Phone or WhatsApp/), '08031234567')
    await user.click(screen.getByRole('button', { name: 'Send request' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('heading', { name: 'Your details' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Your name/)).toHaveValue('Ada')
  })
})
