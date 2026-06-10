import { useState } from 'react'
import './App.css'

function App() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = (e) => {
    e.preventDefault()
    if (!email) return
    // TODO: wire to api.php endpoint to persist signups
    setSubmitted(true)
    setEmail('')
  }

  return (
    <main className="coming-soon">
      <div className="aurora" aria-hidden="true" />

      <header className="cs-header">
        <span className="brand">Heritage</span>
      </header>

      <section className="cs-hero">
        <span className="eyebrow">Launching soon</span>
        <h1>
          Something timeless
          <br />
          is on the way.
        </h1>
        <p className="lede">
          We're crafting a new home for your story. Be the first to know when
          Heritage goes live.
        </p>

        {submitted ? (
          <p className="cs-thanks" role="status">
            You're on the list — we'll be in touch.
          </p>
        ) : (
          <>
            <form className="cs-form" onSubmit={onSubmit}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                aria-label="Email address"
              />
              <button type="submit">Notify me</button>
            </form>
            <p className="cs-note">No spam. One email when we launch.</p>
          </>
        )}
      </section>

      <footer className="cs-footer">
        <span>© {new Date().getFullYear()} Heritage</span>
      </footer>
    </main>
  )
}

export default App
