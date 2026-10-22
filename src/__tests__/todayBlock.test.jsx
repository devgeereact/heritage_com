import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TodayBlock from '@/app/(admin)/today/components/TodayBlock'

vi.mock('@/components/wrappers/IconifyIcon', () => ({ default: () => null }))

// K-07 L4: the block shows five rows, so the footer counts what is not on screen,
// not the server's `more` (which only counts what it left out of its list of 20).
const rows = (n) => Array.from({ length: n }, (_, i) => ({ key: `r${i}`, to: `/jobs/${i}`, title: `Row ${i}` }))
const renderBlock = (props) =>
  render(
    <MemoryRouter>
      <TodayBlock id="t" title="Test" icon="x" empty="Nothing here." {...props} />
    </MemoryRouter>,
  )

describe('Today block footer', () => {
  it('shows no footer when every row is on screen', () => {
    renderBlock({ count: 3, more: 0, items: [], rows: rows(3), seeAll: '/jobs' })
    expect(screen.getAllByRole('link')).toHaveLength(3)
    expect(screen.queryByText(/more/)).not.toBeInTheDocument()
  })

  it('counts the rows past the first five, even when the server left none out', () => {
    // 8 items, server list not capped (more 0): 3 are hidden by the five-row view.
    renderBlock({ count: 8, more: 0, rows: rows(8), seeAll: '/jobs' })
    expect(screen.getAllByRole('link').filter((a) => a.textContent.startsWith('Row'))).toHaveLength(5)
    expect(screen.getByRole('link', { name: 'And 3 more. See all 8' })).toHaveAttribute('href', '/jobs')
  })

  it('counts everything not shown when the server capped its list', () => {
    // 25 items, server sent 20 (more 5), five shown: 20 hidden, not 5.
    renderBlock({ count: 25, more: 5, rows: rows(20), seeAll: '/jobs' })
    expect(screen.getByRole('link', { name: 'And 20 more. See all 25' })).toBeInTheDocument()
  })

  it('says how many more without a link when the block has no full list', () => {
    renderBlock({ count: 7, more: 0, rows: rows(7) })
    expect(screen.getByText('And 2 more')).toBeInTheDocument()
  })

  it('never shows a negative number when the count is behind the rows', () => {
    renderBlock({ count: 2, more: 0, rows: rows(4), seeAll: '/jobs' })
    expect(screen.queryByText(/more/)).not.toBeInTheDocument()
  })

  it('uses rowTotal for a block whose count is of something else (unread messages per job)', () => {
    // 30 unread messages over 7 jobs: server lists 7 jobs, more 0; five shown, two jobs hidden.
    renderBlock({ count: 30, more: 0, rowTotal: 7 + 0, rows: rows(7), seeAll: '/messages' })
    expect(screen.getByRole('link', { name: 'And 2 more. See all 30' })).toHaveAttribute('href', '/messages')
  })

  it('shows the empty line and no footer when the count is 0', () => {
    renderBlock({ count: 0, rows: [] })
    expect(screen.getByText('Nothing here.')).toBeInTheDocument()
    expect(screen.queryByText(/more/)).not.toBeInTheDocument()
  })
})
