import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap'
import PageTitle from '@/components/PageTitle'
import PageHeader from '@/components/herit/PageHeader'
import LoadError from '@/components/herit/LoadError'
import SaveState from '@/components/herit/SaveState'
import StatusChip from '@/components/herit/StatusChip'
import heritApi from '@/helpers/heritApi'
import { thumbSrc, uploadImage } from '../components/media'

const kb = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`)

/** One image: alt text and caption, saved on blur; delete when unused. */
const MediaCard = ({ m, onChanged }) => {
  const [alt, setAlt] = useState(m.alt_text || '')
  const [caption, setCaption] = useState(m.caption || '')
  const [save, setSave] = useState({ state: null, error: '' })

  const update = async () => {
    if (alt === (m.alt_text || '') && caption === (m.caption || '')) return
    setSave({ state: 'saving', error: '' })
    try {
      await heritApi.cms.mediaUpdate(m.id, { alt_text: alt, caption })
      setSave({ state: 'saved', error: '' })
    } catch (e) {
      setSave({ state: 'failed', error: e.message })
    }
  }
  const remove = async () => {
    setSave({ state: 'saving', error: '' })
    try {
      await heritApi.cms.mediaDelete(m.id)
      onChanged()
    } catch (e) {
      setSave({ state: 'failed', error: e.message })
    }
  }

  return (
    <Card className="hd-card h-100">
      <img src={thumbSrc(m)} alt={alt} className="card-img-top" style={{ aspectRatio: '4 / 3', objectFit: 'cover' }} loading="lazy" />
      <Card.Body>
        <div className="d-flex flex-wrap gap-2 mb-2 small">
          {m.in_use ? <StatusChip tone="ok">Used on the website</StatusChip> : <StatusChip tone="neutral">Not used</StatusChip>}
          {alt.trim().length < 5 && <StatusChip tone="warn">Needs alt text</StatusChip>}
          <span className="text-muted">
            {m.width} × {m.height} · {kb(m.bytes || 0)}
          </span>
        </div>
        <Form.Group className="mb-2" controlId={`media-alt-${m.id}`}>
          <Form.Label className="small">Alt text</Form.Label>
          <Form.Control size="sm" maxLength={250} value={alt} onChange={(e) => setAlt(e.target.value)} onBlur={update} />
        </Form.Group>
        <Form.Group className="mb-2" controlId={`media-cap-${m.id}`}>
          <Form.Label className="small">Caption (optional)</Form.Label>
          <Form.Control size="sm" maxLength={250} value={caption} onChange={(e) => setCaption(e.target.value)} onBlur={update} />
        </Form.Group>
        <div className="d-flex align-items-center gap-2">
          {!m.in_use && (
            <Button size="sm" variant="outline-danger" onClick={remove}>
              Delete
            </Button>
          )}
          <SaveState state={save.state} error={save.error} />
        </div>
      </Card.Body>
    </Card>
  )
}

/** Website images: upload with alt text, edit alt text and captions, delete unused ones. */
const WebsiteMediaPage = () => {
  const [items, setItems] = useState(null)
  const [maxMb, setMaxMb] = useState(8)
  const [error, setError] = useState(null)
  const [file, setFile] = useState(null)
  const [alt, setAlt] = useState('')
  const [upload, setUpload] = useState({ busy: false, error: '' })

  const load = useCallback(async () => {
    setError(null)
    try {
      const r = await heritApi.cms.mediaList()
      setItems(r.items || [])
      if (r.max_mb) setMaxMb(r.max_mb)
    } catch (e) {
      setError(e)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const submit = async (e) => {
    e.preventDefault()
    if (!file) return
    const formEl = e.currentTarget
    setUpload({ busy: true, error: '' })
    try {
      await uploadImage(file, alt)
      setFile(null)
      setAlt('')
      formEl.reset()
      setUpload({ busy: false, error: '' })
      load()
    } catch (err) {
      const msg = err.status === 413 ? `That image is larger than ${maxMb} MB.` : err.status === 415 ? 'Use a JPEG, PNG or WebP photo.' : err.message
      setUpload({ busy: false, error: msg })
    }
  }

  return (
    <div className="hd">
      <PageTitle title="Website images" />
      <PageHeader
        title="Images"
        back={{ to: '/website', label: 'Website' }}
        subtitle="Photos for the website. Location and camera details are removed when a photo is uploaded."
      />
      <Card className="hd-card mb-3">
        <Card.Body>
          <Form onSubmit={submit}>
            <h2 className="h6">Upload an image</h2>
            {upload.error && <Alert variant="danger">{upload.error}</Alert>}
            <Row className="g-2 align-items-end">
              <Col md={5}>
                <Form.Group controlId="media-file">
                  <Form.Label>Photo (JPEG, PNG or WebP, up to {maxMb} MB)</Form.Label>
                  <Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group controlId="media-alt">
                  <Form.Label>Describe the image (alt text)</Form.Label>
                  <Form.Control maxLength={250} value={alt} onChange={(e) => setAlt(e.target.value)} />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Button type="submit" className="w-100" disabled={!file || upload.busy}>
                  {upload.busy ? 'Uploading…' : 'Upload'}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
      {error && <LoadError what="the images" onRetry={load} error={error} />}
      {!items && !error && <Spinner animation="border" role="status" />}
      {items?.length === 0 && <p className="text-muted">No images yet.</p>}
      <Row className="g-3">
        {items?.map((m) => (
          <Col key={m.id} sm={6} lg={4} xl={3}>
            <MediaCard m={m} onChanged={load} />
          </Col>
        ))}
      </Row>
    </div>
  )
}

export default WebsiteMediaPage
