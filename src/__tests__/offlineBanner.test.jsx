import { describe, it, expect, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import OfflineBanner from '@/components/OfflineBanner'
import { setOnline } from './helpers'

const goOffline = () => {
  setOnline(false)
  act(() => {
    window.dispatchEvent(new Event('offline'))
  })
}
const goOnline = () => {
  setOnline(true)
  act(() => {
    window.dispatchEvent(new Event('online'))
  })
}

describe('OfflineBanner', () => {
  it('shows nothing while the browser is online', () => {
    setOnline(true)
    render(<OfflineBanner />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the notice at once when the page opens offline', () => {
    setOnline(false)
    render(<OfflineBanner />)
    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent('You are offline.')
    expect(notice).toHaveTextContent('changes cannot be saved until you reconnect')
  })

  it('appears when the connection drops and goes when it returns', () => {
    setOnline(true)
    render(<OfflineBanner />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    goOffline()
    expect(screen.getByRole('status')).toHaveTextContent('You are offline.')

    goOnline()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('follows repeated drops and recoveries', () => {
    setOnline(true)
    render(<OfflineBanner />)
    goOffline()
    goOnline()
    goOffline()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('stops listening for connection changes once it is removed from the page', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<OfflineBanner />)
    const added = add.mock.calls.filter(([type]) => type === 'online' || type === 'offline')
    expect(added.map(([type]) => type).sort()).toEqual(['offline', 'online'])

    unmount()

    added.forEach(([type, handler]) => expect(remove).toHaveBeenCalledWith(type, handler))
  })
})
