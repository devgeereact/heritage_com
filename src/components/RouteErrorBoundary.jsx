import { Component } from 'react'
import './OfflineBanner.css'

/**
 * Catches a page that fails to open, most often because its code cannot
 * download while offline (A16), so the app shows a plain message with Try
 * again instead of a blank screen. The router keys it by path, so moving to
 * another page clears it. Detail stays in the console.
 */
class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('A page could not open:', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    return (
      <main className="hc-crash" role="alert">
        <h1>This page could not open</h1>
        <p>
          {offline
            ? 'You are offline, and this page has not been loaded on this device yet. Try again once the connection is back.'
            : 'Something went wrong while opening it. Try again, and if it keeps happening, reload the app.'}
        </p>
        <div className="hc-crash-actions">
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
          <button type="button" className="is-quiet" onClick={() => window.history.back()}>
            Go back
          </button>
        </div>
      </main>
    )
  }
}

export default RouteErrorBoundary
