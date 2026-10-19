import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ReviewPage from '@/app/(admin)/review/page'
import { mockFetch, jsonResponse, setOnline } from './helpers'

vi.mock('@/components/wrappers/IconifyIcon', () => ({ default: () => null }))
vi.mock('@/components/PageTitle', () => ({ default: () => null }))

// Phase 7: the owner review page over review.php (mocked fetch).

const none = { available: true, sent: 0, failed: 0, other: 0, total: 0, by_status: {} }
const summary = (days, over = {}) => ({
  days,
  from: days === 30 ? '2026-09-20' : '2026-07-22',
  to: '2026-10-19',
  timezone: 'Africa/Lagos',
  enquiries: { available: true, created: 12, converted: 3, rate: 0.25, median_days_to_convert: 4.5, timed: 3 },
  overdue_jobs: {
    count: 23,
    items: [{ id: 8, code: 'HC-0008', client_name: 'Test Client 06', due_date: '2026-10-14', days_overdue: 5 }],
    more: 22,
  },
  refusals: {
    available: true,
    total: 4,
    items: [
      { action: 'login_fail_ip', label: 'Staff sign-in refused (wrong email or password)', count: 4 },
      { action: 'pin_login_fail', label: 'Staff PIN sign-in refused', count: 0 },
    ],
  },
  notifications: {
    whatsapp: { ...none, sent: 6, failed: 2, other: 5, total: 13 },
    reminders: none,
    email: { ...none, sent: 270, total: 270 },
    portal_messages: { ...none, available: false },
  },
  usage: {
    available: true,
    counting_since: '2026-10-19',
    sections: [{ section: 'jobs', hits: 7, roles: { super_admin: 2, tailor: 5 } }],
    zero_hit_sections: ['stock', 'weather'],
  },
  ...over,
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <ReviewPage />
    </MemoryRouter>,
  )

const daysOf = (url) => Number(new URL(url).searchParams.get('days'))

describe('owner review page', () => {
  it('shows each card with its numbers and a note on what it means', async () => {
    const fetchMock = mockFetch((url) => jsonResponse(summary(daysOf(url))))
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()

    expect(await screen.findByRole('heading', { name: 'Enquiry conversion' })).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/review\.php\?action=summary&days=30$/)
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText('4.5')).toBeInTheDocument()

    // Overdue: the job links to its page, the rest is counted.
    expect(screen.getByRole('link', { name: 'HC-0008' })).toHaveAttribute('href', '/jobs/8')
    expect(screen.getByText('23 jobs late')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See all overdue jobs' })).toHaveAttribute('href', '/jobs?due=overdue')

    // Refusals: only actions with a count are listed.
    expect(screen.getByText('Staff sign-in refused (wrong email or password)')).toBeInTheDocument()
    expect(screen.queryByText('Staff PIN sign-in refused')).not.toBeInTheDocument()

    // Notifications: a channel without its table says so instead of showing zeros.
    const portal = screen.getByText('Messages to the client portal').closest('tr')
    expect(within(portal).getByText('Not set up')).toBeInTheDocument()

    // Usage: per section with roles, and the sections nobody opened, by their menu labels.
    const jobs = screen.getByText('Jobs').closest('tr')
    expect(within(jobs).getByText('7')).toBeInTheDocument()
    expect(within(jobs).getByText('Super Admin 2, Tailor 5')).toBeInTheDocument()
    expect(screen.getByTestId('zero-hit')).toHaveTextContent('Inventory, Weather & Ops')

    // Every card explains itself.
    ;['enquiries', 'overdue', 'refusals', 'notifications', 'usage'].forEach((id) =>
      expect(screen.getByTestId(`note-${id}`).textContent.length).toBeGreaterThan(40),
    )
    expect(screen.getByTestId('note-usage')).toHaveTextContent('not proof')
    expect(screen.getByTestId('note-refusals')).toHaveTextContent('does not record failed saves')
  })

  it('switches to 90 days and asks the server again', async () => {
    const fetchMock = mockFetch((url) => jsonResponse(summary(daysOf(url))))
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Enquiry conversion' })
    const btn30 = screen.getByRole('button', { name: 'Last 30 days' })
    const btn90 = screen.getByRole('button', { name: 'Last 90 days' })
    expect(btn30).toHaveAttribute('aria-pressed', 'true')

    await user.click(btn90)
    await screen.findByText(/22 Jul 2026 to/)
    expect(btn90).toHaveAttribute('aria-pressed', 'true')
    expect(daysOf(fetchMock.mock.calls.at(-1)[0])).toBe(90)
  })

  it('keeps the latest choice when an older, slower answer arrives last', async () => {
    const pending = []
    mockFetch((url) => {
      const days = daysOf(url)
      if (days === 30 && pending.length === 0) return jsonResponse(summary(30))
      return new Promise((done) => pending.push({ days, done }))
    })
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { name: 'Enquiry conversion' })

    await user.click(screen.getByRole('button', { name: 'Last 90 days' }))
    await user.click(screen.getByRole('button', { name: 'Last 30 days' }))
    expect(pending.map((p) => p.days)).toEqual([90, 30])

    // The 30-day answer lands first, then the stale 90-day one.
    pending[1].done(jsonResponse(summary(30)))
    await screen.findByRole('heading', { name: 'Enquiry conversion' })
    pending[0].done(jsonResponse(summary(90)))
    await new Promise((r) => setTimeout(r, 20))

    expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Enquiry conversion' })).toBeInTheDocument()
    expect(screen.queryByText(/22 Jul 2026 to/)).toBeNull()
  })

  it('shows plain empty states', async () => {
    mockFetch((url) =>
      jsonResponse(
        summary(daysOf(url), {
          enquiries: { available: true, created: 0, converted: 0, rate: null, median_days_to_convert: null, timed: 0 },
          overdue_jobs: { count: 0, items: [], more: 0 },
          refusals: { available: true, total: 0, items: [{ action: 'login_fail_ip', label: 'x', count: 0 }] },
          usage: { available: true, counting_since: null, sections: [], zero_hit_sections: [] },
        }),
      ),
    )
    renderPage()
    expect(await screen.findByText('No enquiries arrived in the last 30 days.')).toBeInTheDocument()
    expect(screen.getByText('No open job is past its due date.')).toBeInTheDocument()
    expect(screen.getByText('Nothing was refused in the last 30 days.')).toBeInTheDocument()
    expect(screen.getByText('No visits counted in the last 30 days.')).toBeInTheDocument()
  })

  it('says when section counting is not set up yet', async () => {
    mockFetch((url) => jsonResponse(summary(daysOf(url), { usage: { available: false, counting_since: null, sections: [], zero_hit_sections: [] } })))
    renderPage()
    expect(await screen.findByText(/Section counting is not set up/)).toBeInTheDocument()
  })

  it('shows the load error with Retry, and recovers', async () => {
    let fail = true
    mockFetch((url) => (fail ? jsonResponse({ error: 'Server error' }, 500) : jsonResponse(summary(daysOf(url)))))
    const user = userEvent.setup()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderPage()
    expect(await screen.findByText(/We could not load the review just now/)).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: 'Enquiry conversion' })).toBeInTheDocument()
  })

  it('says offline in plain words when the connection is down', async () => {
    setOnline(false)
    mockFetch(() => {
      throw new TypeError('Failed to fetch')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderPage()
    expect(await screen.findByText(/You are offline, so the review cannot load/)).toBeInTheDocument()
  })

  it('shows the plain error for a 403 without any data', async () => {
    mockFetch(() => jsonResponse({ error: 'Forbidden' }, 403))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderPage()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Enquiry conversion' })).not.toBeInTheDocument()
  })
})
