import { useState } from 'react'
import { Button, ButtonGroup } from 'react-bootstrap'

/**
 * The public page with the saved draft (?preview=1; the staff session lets
 * it read drafts) in a frame at phone or desktop width, plus "Open in tab".
 * Saving the draft first is the caller's job.
 */
const PreviewFrame = ({ path, version }) => {
  const [width, setWidth] = useState(390)
  if (!path) return <p className="text-muted small">Save the draft to preview it.</p>
  const url = `${path}${path.includes('?') ? '&' : '?'}preview=1`
  return (
    <div>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
        <ButtonGroup aria-label="Preview width">
          <Button variant={width === 390 ? 'dark' : 'outline-secondary'} aria-pressed={width === 390} onClick={() => setWidth(390)}>
            Phone
          </Button>
          <Button variant={width === 1280 ? 'dark' : 'outline-secondary'} aria-pressed={width === 1280} onClick={() => setWidth(1280)}>
            Desktop
          </Button>
        </ButtonGroup>
        <a href={url} target="_blank" rel="noopener noreferrer" className="small">
          Open in a new tab
        </a>
      </div>
      <div className="border rounded overflow-auto" style={{ maxWidth: '100%', background: 'var(--bs-tertiary-bg)' }}>
        <iframe
          key={`${url}-${version}`}
          title="Preview of the draft"
          src={url}
          style={{ width, height: 720, border: 0, display: 'block', background: 'var(--bs-body-bg)' }}
        />
      </div>
    </div>
  )
}

export default PreviewFrame
