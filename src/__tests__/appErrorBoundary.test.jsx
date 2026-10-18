import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AppErrorBoundary from '@/components/AppErrorBoundary'
import { setOnline } from './helpers'

const NOT_OPENED = 'You are offline, and this page has not been opened on this device yet. Reload once the connection is back.'
const GENERAL = 'This page could not open. Reload to try again. If it keeps happening, go to the home page.'

const Throws = ({ error }) => {
  throw error
}

const renderFailing = (error) => {
  // React logs caught render errors; keep the test output readable.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  render(
    <AppErrorBoundary resetKey="/somewhere">
      <Throws error={error} />
    </AppErrorBoundary>,
  )
  return screen.getByRole('alert')
}

const chunkError = () => new TypeError('Failed to fetch dynamically imported module: https://heritclothing.com/assets/Page-abc123.js')

describe('AppErrorBoundary: the offline sentence', () => {
  it('says the page was not opened on this device when a page chunk failed to load offline', () => {
    setOnline(false)
    expect(renderFailing(chunkError())).toHaveTextContent(NOT_OPENED)
  })

  it('gives the general text for an ordinary render error offline', () => {
    setOnline(false)
    const alert = renderFailing(new Error('Cannot read properties of undefined'))
    expect(alert).toHaveTextContent(GENERAL)
    expect(alert).not.toHaveTextContent('not been opened on this device')
  })

  it('gives the general text for an ordinary render error online', () => {
    setOnline(true)
    expect(renderFailing(new Error('boom'))).toHaveTextContent(GENERAL)
  })

  it('gives the general text for a chunk error online, and reloads once for the new build', () => {
    setOnline(true)
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    expect(renderFailing(chunkError())).toHaveTextContent(GENERAL)
    expect(sessionStorage.getItem('herit_chunk_reload')).toBe('1')
  })
})
