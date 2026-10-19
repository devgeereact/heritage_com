import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SiteContactForm from '@/app/(public)/site/SiteContactForm'
import { API_BASE } from '@/context/constants'
import { mockFetch, jsonResponse, setOnline } from './helpers'

/**
 * fetch mock for this form: contact.php answers as the test says, and the
 * site config the privacy note asks for gets a harmless answer.
 */
const setup = (contactAnswer = () => jsonResponse({ ok: true })) => {
  const fetchMock = mockFetch((url, init) => {
    if (url.includes('/contact.php')) return contactAnswer(url, init)
    return jsonResponse({ nav: {} })
  })
  const contactCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).includes('/contact.php'))
  return { fetchMock, contactCalls }
}

const renderForm = (props) =>
  render(
    <MemoryRouter>
      <SiteContactForm {...props} />
    </MemoryRouter>,
  )

const sentBody = (calls) => JSON.parse(calls[0][1].body)

describe('public enquiry form: checking before sending', () => {
  it('lists what is missing in a summary that takes focus, and sends nothing', async () => {
    const { contactCalls } = setup()
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /Send enquiry/ }))

    const summary = await screen.findByRole('alert')
    expect(summary).toHaveTextContent('Please check the form')
    await waitFor(() => expect(summary).toHaveFocus())
    expect(within(summary).getByRole('link', { name: 'Enter your name.' })).toHaveAttribute('href', '#cf-name')
    expect(within(summary).getByRole('link', { name: /Enter a phone number or an email address/ })).toHaveAttribute('href', '#cf-phone')
    expect(contactCalls()).toHaveLength(0)
  })

  it('marks each invalid field and ties its message to it for screen readers', async () => {
    setup()
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /Send enquiry/ }))

    const name = screen.getByLabelText(/^Name/)
    expect(name).toHaveAttribute('aria-invalid', 'true')
    const described = name.getAttribute('aria-describedby')
    expect(document.getElementById(described)).toHaveTextContent('Enter your name.')
    // A field that is fine carries no invalid flag.
    expect(screen.getByLabelText(/Message/)).not.toHaveAttribute('aria-invalid')
  })

  it('accepts an email alone as the way to reply', async () => {
    const { contactCalls } = setup()
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/^Name/), 'Ada')
    await user.type(screen.getByLabelText(/^Email/), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: /Send enquiry/ }))

    await waitFor(() => expect(contactCalls()).toHaveLength(1))
  })

  it('rejects a malformed email', async () => {
    const { contactCalls } = setup()
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/^Name/), 'Ada')
    await user.type(screen.getByLabelText(/^Email/), 'ada@')
    await user.click(screen.getByRole('button', { name: /Send enquiry/ }))

    expect(await screen.findByRole('link', { name: 'Check the email address.' })).toHaveAttribute('href', '#cf-email')
    expect(contactCalls()).toHaveLength(0)
  })

  it('does not accept a name made only of spaces', async () => {
    const { contactCalls } = setup()
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/^Name/), '   ')
    await user.type(screen.getByLabelText(/^Phone/), '08031234567')
    await user.click(screen.getByRole('button', { name: /Send enquiry/ }))

    expect(await screen.findByRole('link', { name: 'Enter your name.' })).toBeInTheDocument()
    expect(contactCalls()).toHaveLength(0)
  })
})

describe('public enquiry form: sending', () => {
  it('posts trimmed values with the type contact.php stores, then takes focus to the thank-you panel', async () => {
    const { contactCalls } = setup()
    const user = userEvent.setup()
    renderForm({ responseTime: 'within a day' })

    await user.type(screen.getByLabelText(/^Name/), '  Ada Okafor ')
    await user.type(screen.getByLabelText(/^Phone/), ' 0803 123 4567 ')
    await user.selectOptions(screen.getByLabelText('What is it about?'), 'bespoke')
    await user.type(screen.getByLabelText(/^Piece or fabric/), 'Ankara agbada')
    await user.type(screen.getByLabelText(/^Message/), 'Needed by December.')
    await user.click(screen.getByRole('button', { name: /Send enquiry/ }))

    const panel = await screen.findByRole('status')
    expect(panel).toHaveTextContent('Message received')
    expect(panel).toHaveTextContent('We will reply within a day')
    expect(panel).toHaveTextContent('Nothing is booked or priced until we agree it.')
    await waitFor(() => expect(panel).toHaveFocus())

    const [url, init] = contactCalls()[0]
    expect(url).toBe(`${API_BASE}/contact.php`)
    expect(init.method).toBe('POST')
    expect(sentBody(contactCalls())).toEqual({
      name: 'Ada Okafor',
      phone: '0803 123 4567',
      email: '',
      company: '',
      type: 'bespoke',
      interest: 'Ankara agbada',
      message: 'Needed by December.',
      website_url_confirm: '',
    })
  })

  it('sends the enquiry without any Authorization header, as a public call', async () => {
    const { contactCalls } = setup()
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/^Name/), 'Ada')
    await user.type(screen.getByLabelText(/^Phone/), '08031234567')
    await user.click(screen.getByRole('button', { name: /Send enquiry/ }))

    await waitFor(() => expect(contactCalls()).toHaveLength(1))
    expect(Object.keys(contactCalls()[0][1].headers).map((k) => k.toLowerCase())).not.toContain('authorization')
  })

  it('files an order-in-progress question as a general enquiry and says what it was about', async () => {
    const { contactCalls } = setup()
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/^Name/), 'Ada')
    await user.type(screen.getByLabelText(/^Phone/), '08031234567')
    await user.selectOptions(screen.getByLabelText('What is it about?'), 'order')
    await user.type(screen.getByLabelText(/^Message/), 'Is it ready?')
    await user.click(screen.getByRole('button', { name: /Send enquiry/ }))

    await waitFor(() => expect(contactCalls()).toHaveLength(1))
    const body = sentBody(contactCalls())
    expect(body.type).toBe('general')
    expect(body.message).toBe('About: An order already in progress\nIs it ready?')
  })

  it('maps a company order to the wholesale type and shows the company field only then', async () => {
    const { contactCalls } = setup()
    const user = userEvent.setup()
    renderForm()
    expect(screen.queryByLabelText(/^Company or organisation/)).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('What is it about?'), 'company')
    await user.type(screen.getByLabelText(/^Company or organisation/), 'Lagos Legal LLP')
    await user.type(screen.getByLabelText(/^Name/), 'Ada')
    await user.type(screen.getByLabelText(/^Email/), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: /Send enquiry/ }))

    await waitFor(() => expect(contactCalls()).toHaveLength(1))
    expect(sentBody(contactCalls())).toMatchObject({ type: 'wholesale', company: 'Lagos Legal LLP' })
  })

  it('shows the server message, keeps what was typed and lets the visitor try again', async () => {
    let attempt = 0
    const { contactCalls } = setup(() => {
      attempt += 1
      return attempt === 1 ? jsonResponse({ error: 'Too many messages from this connection. Please try again later.' }, 429) : jsonResponse({ ok: true })
    })
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/^Name/), 'Ada')
    await user.type(screen.getByLabelText(/^Phone/), '08031234567')
    await user.type(screen.getByLabelText(/^Message/), 'Hello there')
    await user.click(screen.getByRole('button', { name: /Send enquiry/ }))

    expect(await screen.findByText('Too many messages from this connection. Please try again later.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Name/)).toHaveValue('Ada')
    expect(screen.getByLabelText(/^Message/)).toHaveValue('Hello there')
    expect(screen.getByRole('button', { name: /Send enquiry/ })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /Send enquiry/ }))
    expect(await screen.findByText('Message received')).toBeInTheDocument()
    expect(contactCalls()).toHaveLength(2)
  })

  it('says so when the device is offline, sends nothing and keeps the typed text', async () => {
    setOnline(false)
    const { contactCalls } = setup()
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/^Name/), 'Ada')
    await user.type(screen.getByLabelText(/^Phone/), '08031234567')
    await user.click(screen.getByRole('button', { name: /Send enquiry/ }))

    expect(await screen.findByText('You are offline, so nothing was saved. Reconnect and try again.')).toBeInTheDocument()
    expect(contactCalls()).toHaveLength(0)
    expect(screen.getByLabelText(/^Name/)).toHaveValue('Ada')
  })

  it('disables the button and announces progress while sending, so it cannot be sent twice', async () => {
    let release
    const { contactCalls } = setup(() => new Promise((resolve) => { release = () => resolve(jsonResponse({ ok: true })) }))
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/^Name/), 'Ada')
    await user.type(screen.getByLabelText(/^Phone/), '08031234567')
    await user.click(screen.getByRole('button', { name: /Send enquiry/ }))

    const sending = await screen.findByRole('button', { name: /Sending/ })
    expect(sending).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Sending your message.')).toBeInTheDocument()
    await user.click(sending)
    expect(contactCalls()).toHaveLength(1)

    release()
    expect(await screen.findByText('Message received')).toBeInTheDocument()
  })

  it('starts a fresh, empty form from "Send another"', async () => {
    setup()
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/^Name/), 'Ada')
    await user.type(screen.getByLabelText(/^Phone/), '08031234567')
    await user.click(screen.getByRole('button', { name: /Send enquiry/ }))
    await user.click(await screen.findByRole('button', { name: 'Send another' }))

    expect(screen.getByLabelText(/^Name/)).toHaveValue('')
    expect(screen.getByLabelText(/^Phone/)).toHaveValue('')
  })

  it('passes a filled honeypot through unchanged so the server can discard the message', async () => {
    const { contactCalls } = setup()
    const user = userEvent.setup()
    const { container } = renderForm()

    await user.type(screen.getByLabelText(/^Name/), 'Bot')
    await user.type(screen.getByLabelText(/^Phone/), '08031234567')
    await user.type(container.querySelector('#cf-hp'), 'http://spam.example')
    await user.click(screen.getByRole('button', { name: /Send enquiry/ }))

    await waitFor(() => expect(contactCalls()).toHaveLength(1))
    expect(sentBody(contactCalls()).website_url_confirm).toBe('http://spam.example')
  })
})

describe('public enquiry form: preselected subject', () => {
  it('starts on the subject the link asked for and fills the piece field', () => {
    setup()
    renderForm({ defaultType: 'fitting', defaultInterest: 'Senator suit' })

    expect(screen.getByLabelText('What is it about?')).toHaveValue('fitting')
    expect(screen.getByLabelText(/^Piece or fabric/)).toHaveValue('Senator suit')
  })

  it('offers gifting only while the shop is on, unless a link asked for it', () => {
    setup()
    const { unmount } = renderForm({ shopOn: false })
    expect(screen.queryByRole('option', { name: 'Gifting' })).not.toBeInTheDocument()
    unmount()

    const { unmount: again } = renderForm({ shopOn: true })
    expect(screen.getByRole('option', { name: 'Gifting' })).toBeInTheDocument()
    again()

    renderForm({ shopOn: false, defaultType: 'gifting' })
    expect(screen.getByLabelText('What is it about?')).toHaveValue('gifting')
  })

  it('falls back to "something else" for an unknown subject', () => {
    setup()
    renderForm({ defaultType: 'nonsense' })
    expect(screen.getByLabelText('What is it about?')).toHaveValue('general')
  })
})
