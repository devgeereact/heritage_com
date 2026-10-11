import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import heritApi from '@/helpers/heritApi'
import { thumbSrc, uploadImage } from './media'

/**
 * Choose a website image, or upload a new one (with alt text) and choose it.
 * `onPick(media)` gets the media record; `onClose()` closes without a choice.
 */
const MediaPicker = ({ show, onPick, onClose }) => {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [file, setFile] = useState(null)
  const [alt, setAlt] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const r = await heritApi.cms.mediaList()
      setItems(r.items || [])
    } catch (e) {
      setError(e.message)
      setItems([])
    }
  }, [])
  useEffect(() => {
    if (show) load()
  }, [show, load])

  const upload = async (e) => {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const m = await uploadImage(file, alt)
      setFile(null)
      setAlt('')
      onPick(m)
    } catch (err) {
      setError(err.status === 413 ? 'That image is too large.' : err.status === 415 ? 'Use a JPEG, PNG or WebP photo.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal show={show} onHide={onClose} size="lg" scrollable aria-labelledby="media-picker-title">
      <Modal.Header closeButton>
        <Modal.Title id="media-picker-title" as="h2" className="h5">
          Choose an image
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={upload} className="border rounded p-3 mb-3">
          <h3 className="h6">Upload a new image</h3>
          <Form.Group className="mb-2" controlId="mp-file">
            <Form.Label>Photo (JPEG, PNG or WebP)</Form.Label>
            <Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Form.Group>
          <Form.Group className="mb-2" controlId="mp-alt">
            <Form.Label>Describe the image (alt text)</Form.Label>
            <Form.Control value={alt} maxLength={250} onChange={(e) => setAlt(e.target.value)} />
            <Form.Text>What a visitor who cannot see it should know, at least 5 characters. Needed before publishing.</Form.Text>
          </Form.Group>
          <Button type="submit" disabled={!file || busy}>
            {busy ? 'Uploading…' : 'Upload and choose'}
          </Button>
        </Form>
        <h3 className="h6">Library</h3>
        {items === null && <Spinner animation="border" size="sm" role="status" />}
        {items?.length === 0 && <p className="text-muted">No images yet.</p>}
        <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {items?.map((m) => (
            <button key={m.id} type="button" className="btn btn-outline-secondary p-1 text-start" onClick={() => onPick(m)}>
              <img src={thumbSrc(m)} alt="" className="w-100 rounded" style={{ aspectRatio: '1', objectFit: 'cover' }} loading="lazy" />
              <span className="d-block small mt-1 text-truncate">{m.alt_text || 'No alt text yet'}</span>
            </button>
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default MediaPicker
