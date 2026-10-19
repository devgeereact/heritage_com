import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner } from 'react-bootstrap'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import PageTitle from '@/components/PageTitle'
import PageHeader from '@/components/herit/PageHeader'
import LoadError from '@/components/herit/LoadError'
import SaveState from '@/components/herit/SaveState'
import heritApi from '@/helpers/heritApi'
import { useAuthContext } from '@/context/useAuthContext'
import { htmlToText, textToHtml } from '@/helpers/richText'
import { CONSENT_FIELDS, FIELDS, entityByPath, problemLabel } from '../components/cmsSchema'
import { thumbSrc } from '../components/media'
import MediaPicker from '../components/MediaPicker'
import PreviewFrame from '../components/PreviewFrame'
import CmsStatus from '../components/CmsStatus'

const OWNER = ['super_admin', 'admin', 'manager']
const ROLES = ['front', 'back', 'detail', 'process', 'other']
const ROLE_LABELS = { front: 'Front', back: 'Back', detail: 'Detail', process: 'In progress', other: 'Other' }

/** Stored content -> form values (rich text as simple formatting, lists as lines). */
const toForm = (entity, d = {}) => {
  const out = {}
  FIELDS[entity].forEach((f) => {
    const v = d?.[f.k]
    if (f.type === 'rich') out[f.k] = htmlToText(v || '')
    else if (f.type === 'list') out[f.k] = (v || []).join('\n')
    else if (f.type === 'images') out[f.k] = (v || []).map((i) => ({ media_id: i.media_id, alt: i.alt || '', role: i.role || 'other' }))
    else if (f.type === 'bool') out[f.k] = !!v
    else out[f.k] = v ?? ''
  })
  if (entity === 'project') {
    CONSENT_FIELDS.forEach((f) => (out[f.k] = !!d?.[f.k]))
    out.consent_note = d?.consent_note || ''
  }
  return out
}

/** Form values -> the data cms.php save_draft expects. */
const fromForm = (entity, form) => {
  const out = {}
  FIELDS[entity].forEach((f) => {
    const v = form[f.k]
    if (f.type === 'rich') out[f.k] = textToHtml(v)
    else if (f.type === 'list')
      out[f.k] = String(v || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    else if (f.type === 'media') out[f.k] = v || null
    else if (f.type === 'date' || f.type === 'service') out[f.k] = v || null
    else out[f.k] = v
  })
  if (entity === 'project') {
    CONSENT_FIELDS.forEach((f) => (out[f.k] = !!form[f.k]))
    out.consent_note = form.consent_note || ''
  }
  return out
}

const Confirm = ({ confirm, onCancel, onConfirm }) => (
  <Modal show={!!confirm} onHide={onCancel} aria-labelledby="cms-confirm-title">
    <Modal.Header closeButton>
      <Modal.Title id="cms-confirm-title" as="h2" className="h5">
        {confirm?.title}
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <p className="mb-2">{confirm?.text}</p>
      {confirm?.warnings && (
        <ul className="mb-0">
          {Object.entries(confirm.warnings).map(([k, v]) => (
            <li key={k}>{Array.isArray(v) ? v.join(', ') : String(v)}</li>
          ))}
        </ul>
      )}
    </Modal.Body>
    <Modal.Footer>
      <Button variant="outline-secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant={confirm?.danger ? 'danger' : 'primary'} onClick={onConfirm}>
        {confirm?.cta}
      </Button>
    </Modal.Footer>
  </Modal>
)

/** One form field, by type. */
const Field = ({ f, value, error, set, media, services, onPick }) => {
  const id = `cms-${f.k}`
  const len = typeof value === 'string' ? value.length : 0
  const help = [f.help, f.max && ['text', 'textarea'].includes(f.type) ? `${len} of ${f.max} characters.` : ''].filter(Boolean).join(' ')
  const label = (
    <Form.Label htmlFor={id}>
      {f.label}
      {f.required && <span className="text-muted"> (required to publish)</span>}
    </Form.Label>
  )
  if (f.type === 'bool') {
    return <Form.Check className="mb-3" id={id} type="checkbox" label={f.label} checked={!!value} onChange={(e) => set(f.k, e.target.checked)} />
  }
  if (f.type === 'media') {
    const m = value ? media[value] : null
    return (
      <div className="mb-3">
        <div className="form-label">{f.label}</div>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          {m ? (
            <img src={thumbSrc(m)} alt={m.alt_text || ''} width={96} height={96} className="rounded border" style={{ objectFit: 'cover' }} />
          ) : value ? (
            <span className="small">Image {value}</span>
          ) : (
            <span className="small text-muted">No image</span>
          )}
          <Button variant="outline-secondary" size="sm" onClick={() => onPick(f.k)}>
            {value ? 'Change image' : 'Choose image'}
          </Button>
          {value && (
            <Button variant="link" size="sm" onClick={() => set(f.k, '')}>
              Remove
            </Button>
          )}
        </div>
        {m && !(m.alt_text || '').trim() && <div className="small mt-1">This image has no alt text yet; add it under Website, Images.</div>}
        {f.help && <Form.Text>{f.help}</Form.Text>}
      </div>
    )
  }
  if (f.type === 'images') {
    const list = value || []
    const move = (i, d) => {
      const next = [...list]
      const [x] = next.splice(i, 1)
      next.splice(i + d, 0, x)
      set(f.k, next)
    }
    const upd = (i, k, v) =>
      set(
        f.k,
        list.map((x, j) => (j === i ? { ...x, [k]: v } : x)),
      )
    return (
      <fieldset className="mb-3">
        <legend className="form-label fs-6">{f.label}</legend>
        {list.length === 0 && <p className="small text-muted">No images yet.</p>}
        {list.map((img, i) => {
          const m = media[img.media_id]
          return (
            <div key={`${img.media_id}-${i}`} className="d-flex flex-wrap gap-2 align-items-start border rounded p-2 mb-2">
              {m ? (
                <img src={thumbSrc(m)} alt="" width={72} height={72} className="rounded" style={{ objectFit: 'cover' }} />
              ) : (
                <span className="small">Image {img.media_id}</span>
              )}
              <div className="flex-grow-1" style={{ minWidth: 200 }}>
                <Form.Label htmlFor={`${id}-alt-${i}`} className="small mb-1">
                  Alt text on this page {m?.alt_text ? '(empty uses the library text)' : '(required)'}
                </Form.Label>
                <Form.Control
                  id={`${id}-alt-${i}`}
                  size="sm"
                  maxLength={250}
                  value={img.alt}
                  onChange={(e) => upd(i, 'alt', e.target.value)}
                  placeholder={m?.alt_text || ''}
                />
                <Form.Label htmlFor={`${id}-role-${i}`} className="small mb-1 mt-2">
                  Shows
                </Form.Label>
                <Form.Select id={`${id}-role-${i}`} size="sm" value={img.role} onChange={(e) => upd(i, 'role', e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Form.Select>
              </div>
              <div className="d-flex flex-column gap-1">
                <Button variant="outline-secondary" size="sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move image ${i + 1} up`}>
                  Up
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={i === list.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={`Move image ${i + 1} down`}>
                  Down
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() =>
                    set(
                      f.k,
                      list.filter((_, j) => j !== i),
                    )
                  }
                  aria-label={`Remove image ${i + 1}`}>
                  Remove
                </Button>
              </div>
            </div>
          )
        })}
        {list.length < (f.max || 24) && (
          <Button variant="outline-secondary" size="sm" onClick={() => onPick(f.k)}>
            Add image
          </Button>
        )}
        {error && <div className="invalid-feedback d-block">{error}</div>}
      </fieldset>
    )
  }
  if (f.type === 'service') {
    return (
      <Form.Group className="mb-3">
        {label}
        <Form.Select id={id} value={value || ''} onChange={(e) => set(f.k, e.target.value)}>
          <option value="">No service</option>
          {services.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.title || s.slug}
              {s.status !== 'published' ? ' (not published)' : ''}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
    )
  }
  const multiline = ['textarea', 'rich', 'list'].includes(f.type)
  return (
    <Form.Group className="mb-3">
      {label}
      <Form.Control
        id={id}
        type={f.type === 'date' ? 'date' : 'text'}
        as={multiline ? 'textarea' : undefined}
        rows={f.type === 'rich' ? 10 : f.type === 'list' ? 6 : multiline ? 3 : undefined}
        maxLength={['text', 'textarea'].includes(f.type) ? f.max : undefined}
        value={value ?? ''}
        isInvalid={!!error}
        aria-describedby={help ? `${id}-help` : undefined}
        onChange={(e) => set(f.k, e.target.value)}
      />
      {help && <Form.Text id={`${id}-help`}>{help}</Form.Text>}
      <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
    </Form.Group>
  )
}

/** Website editor for one service, project, question, page or policy. */
const WebsiteEditPage = () => {
  const { section, ref } = useParams()
  const ent = entityByPath(section)
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const isOwner = OWNER.includes(user?.role)

  const [item, setItem] = useState(null)
  const [form, setForm] = useState(null)
  const [slug, setSlug] = useState('')
  const [dirty, setDirty] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [save, setSave] = useState({ state: null, error: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [problems, setProblems] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [picker, setPicker] = useState(null)
  const [media, setMedia] = useState({})
  const [services, setServices] = useState([])
  const [showPreview, setShowPreview] = useState(false)
  const [previewVersion, setPreviewVersion] = useState(0)

  const entity = ent?.entity
  const isNew = !!ent && !ent.keyed && ref === 'new'
  const name = ent?.keyed ? ent.keys[ref] : null

  const load = useCallback(async () => {
    if (!ent) return
    setLoadError(null)
    try {
      let it = null
      if (ent.keyed)
        it = await heritApi.cms
          .get(entity, { key: ref })
          .then((r) => r.item)
          .catch((e) => (e.status === 404 ? null : Promise.reject(e)))
      else if (!isNew && ent.slugged && !/^\d+$/.test(ref)) {
        // Opened by web address (the public site's Edit control knows the slug, not the id).
        const found = ((await heritApi.cms.list(entity)).items || []).find((i) => i.slug === ref)
        if (!found) {
          navigate(`/website/${section}`, { replace: true })
          return
        }
        navigate(`/website/${section}/${found.id}`, { replace: true })
        return
      } else if (!isNew) it = (await heritApi.cms.get(entity, { id: ref })).item
      setItem(it)
      setForm(toForm(entity, it?.editable))
      setSlug(it?.slug || '')
      setDirty(false)
      const [m, s] = await Promise.all([
        heritApi.cms.mediaList().catch(() => ({ items: [] })),
        entity === 'project' ? heritApi.cms.list('service').catch(() => ({ items: [] })) : { items: [] },
      ])
      setMedia(Object.fromEntries((m.items || []).map((x) => [x.id, x])))
      setServices(s.items || [])
    } catch (e) {
      setLoadError(e)
    }
  }, [ent, entity, ref, isNew, navigate, section])
  useEffect(() => {
    load()
  }, [load])

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return undefined
    const onLeave = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [dirty])

  const publicPath = useMemo(() => {
    if (!ent || !item?.id) return null
    return ent.publicPath(ent.keyed ? { key: ref } : item)
  }, [item, ent, ref])

  if (!ent || (ent.keyed && !ent.keys[ref])) return <Navigate to="/website" replace />

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setDirty(true)
  }

  const saveDraft = async () => {
    setSave({ state: 'saving', error: '' })
    setFieldErrors({})
    try {
      const body = { data: fromForm(entity, form) }
      if (item?.id) body.id = item.id
      else if (ent.keyed) body.key = ref
      if (ent.slugged && slug.trim() && !item?.slug_locked) body.slug = slug.trim()
      const r = await heritApi.cms.saveDraft(entity, body)
      setItem(r.item)
      setSlug(r.item.slug || '')
      setDirty(false)
      setSave({ state: 'saved', error: '' })
      setPreviewVersion((v) => v + 1)
      if (isNew) navigate(`/website/${section}/${r.item.id}`, { replace: true })
      return r.item
    } catch (e) {
      setFieldErrors(e.data?.errors || {})
      setSave({ state: 'failed', error: e.message })
      return null
    }
  }

  const publish = async (confirmLeak = false) => {
    setProblems(null)
    const it = dirty || !item?.id ? await saveDraft() : item
    if (!it) return
    setSave({ state: 'saving', error: '' })
    try {
      const r = await heritApi.cms.publish(entity, it.id, confirmLeak)
      setItem(r.item)
      setSave({ state: 'saved', error: '' })
      setPreviewVersion((v) => v + 1)
    } catch (e) {
      if (e.status === 422 && e.data?.problems) {
        setProblems(Object.entries(e.data.problems).map(([k, v]) => problemLabel(entity, k, v)))
        setSave({ state: 'failed', error: 'Not published yet; see the list above' })
      } else if (e.status === 409 && e.data?.warnings) {
        setSave({ state: null, error: '' })
        setConfirm({
          title: 'Check for private details',
          text: 'The text looks like it may contain a phone number, an email address or a job reference. Remove anything private, or publish if it is meant to be public.',
          warnings: e.data.warnings,
          cta: 'Publish anyway',
          run: () => publish(true),
        })
      } else {
        setSave({ state: 'failed', error: e.message })
      }
    }
  }

  const act = async (action) => {
    setSave({ state: 'saving', error: '' })
    try {
      const r = await heritApi.cms.act(action, entity, item.id)
      if (action === 'delete') {
        navigate(`/website/${section}`, { replace: true })
        return
      }
      setItem(r.item)
      setForm(toForm(entity, r.item.editable))
      setDirty(false)
      setSave({ state: 'saved', error: '' })
      setPreviewVersion((v) => v + 1)
    } catch (e) {
      setSave({ state: 'failed', error: e.message })
    }
  }

  const ask = (action) => {
    const texts = {
      unpublish: ['Unpublish?', 'Visitors will no longer see it. The content is kept and you can publish it again.', 'Unpublish', true],
      rollback: [
        'Go back to the earlier version?',
        'The website shows the version before the last publish. Doing this again switches back.',
        'Roll back',
        false,
      ],
      discard_draft: ['Discard the unpublished changes?', 'The draft is deleted and the published version stays as it is.', 'Discard changes', true],
      delete: ['Delete this item?', 'It has never been published, so it can be deleted. This cannot be undone.', 'Delete', true],
    }
    const [title, text, cta, danger] = texts[action]
    setConfirm({ title, text, cta, danger, run: () => act(action) })
  }

  const pickMedia = (m) => {
    setMedia((all) => ({ ...all, [m.id]: m }))
    if (picker.field === 'images') set('images', [...(form.images || []), { media_id: m.id, alt: '', role: 'other' }])
    else set(picker.field, m.id)
    setPicker(null)
  }

  const title = isNew ? `New ${ent.one}` : name || item?.title || ent.label
  const policyLocked = ent.ownerOnly && !isOwner

  return (
    <div className="hd">
      <PageTitle title={title} />
      <PageHeader title={title} back={{ to: `/website/${section}`, label: ent.label }} subtitle={<CmsStatus item={item} dirty={dirty} />} />
      {loadError && <LoadError what={`this ${ent.one}`} onRetry={load} error={loadError} />}
      {!form && !loadError && <Spinner animation="border" role="status" />}
      {form && (
        <Row className="g-3">
          <Col xl={showPreview ? 6 : 8}>
            {problems && (
              <Alert variant="warning" role="alert">
                <p className="fw-semibold mb-1">Not published yet. Fix these first:</p>
                <ul className="mb-0">
                  {problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </Alert>
            )}
            {policyLocked && <Alert variant="info">You can edit and save drafts. Only the owner can publish, unpublish or roll back a policy.</Alert>}
            <Card className="hd-card">
              <Card.Body>
                <Form
                  onSubmit={(e) => {
                    e.preventDefault()
                    saveDraft()
                  }}>
                  {ent.slugged && (
                    <Form.Group className="mb-3" controlId="cms-slug">
                      <Form.Label>Web address</Form.Label>
                      <Form.Control
                        value={slug}
                        disabled={item?.slug_locked}
                        isInvalid={!!fieldErrors.slug}
                        onChange={(e) => {
                          setSlug(e.target.value)
                          setDirty(true)
                        }}
                        placeholder="Made from the title when empty"
                      />
                      <Form.Text>
                        {item?.slug_locked ? 'Fixed once published, so links keep working.' : ent.publicPath({ slug: slug || 'your-title' })}
                      </Form.Text>
                      <Form.Control.Feedback type="invalid">{fieldErrors.slug}</Form.Control.Feedback>
                    </Form.Group>
                  )}
                  {FIELDS[entity].map((f) => (
                    <Field
                      key={f.k}
                      f={f}
                      value={form[f.k]}
                      error={fieldErrors[f.k]}
                      set={set}
                      media={media}
                      services={services}
                      onPick={(field) => setPicker({ field })}
                    />
                  ))}
                  {entity === 'project' && (
                    <fieldset className="border rounded p-3 mb-3">
                      <legend className="h6 w-auto px-1 mb-1">Consent (private, never shown on the website)</legend>
                      {CONSENT_FIELDS.map((c) => (
                        <Form.Check
                          key={c.k}
                          id={`cms-${c.k}`}
                          type="checkbox"
                          label={c.label}
                          checked={!!form[c.k]}
                          onChange={(e) => set(c.k, e.target.checked)}
                        />
                      ))}
                      <Form.Group className="mt-2" controlId="cms-consent-note">
                        <Form.Label>Consent note (optional)</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          maxLength={255}
                          value={form.consent_note}
                          onChange={(e) => set('consent_note', e.target.value)}
                        />
                        <Form.Text>How and when consent was given. Staff only.</Form.Text>
                      </Form.Group>
                    </fieldset>
                  )}
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <Button type="submit" variant={dirty ? 'primary' : 'outline-secondary'} disabled={save.state === 'saving'}>
                      Save draft
                    </Button>
                    {!policyLocked && (
                      <Button variant={dirty ? 'outline-primary' : 'primary'} onClick={() => publish(false)} disabled={save.state === 'saving'}>
                        {item?.status === 'published' ? 'Publish changes' : 'Publish'}
                      </Button>
                    )}
                    <Button variant="outline-secondary" onClick={() => setShowPreview((v) => !v)} aria-expanded={showPreview}>
                      {showPreview ? 'Hide preview' : 'Preview'}
                    </Button>
                    <SaveState state={save.state} error={save.error} />
                  </div>
                  {item?.id && (
                    <div className="d-flex flex-wrap gap-2 mt-3 pt-3 border-top">
                      {!policyLocked && item.status === 'published' && (
                        <Button variant="outline-secondary" size="sm" onClick={() => ask('unpublish')}>
                          Unpublish
                        </Button>
                      )}
                      {!policyLocked && item.has_prev && (
                        <Button variant="outline-secondary" size="sm" onClick={() => ask('rollback')}>
                          Roll back to the earlier version
                        </Button>
                      )}
                      {item.has_draft && item.live && (
                        <Button variant="outline-secondary" size="sm" onClick={() => ask('discard_draft')}>
                          Discard unpublished changes
                        </Button>
                      )}
                      {!item.published_at && !ent.keyed && (
                        <Button variant="outline-danger" size="sm" onClick={() => ask('delete')}>
                          Delete
                        </Button>
                      )}
                      {publicPath && item.status === 'published' && (
                        <Link to={publicPath} target="_blank" rel="noopener noreferrer" className="small align-self-center">
                          View on the website
                        </Link>
                      )}
                    </div>
                  )}
                </Form>
              </Card.Body>
            </Card>
          </Col>
          <Col xl={showPreview ? 6 : 4}>
            {showPreview ? (
              <Card className="hd-card">
                <Card.Body>
                  <h2 className="h6">Preview of the saved draft</h2>
                  {dirty && <p className="small text-muted">Save the draft to see your latest changes here.</p>}
                  <PreviewFrame path={publicPath} version={previewVersion} />
                </Card.Body>
              </Card>
            ) : (
              <Card className="hd-card">
                <Card.Body className="small">
                  <h2 className="h6">Writing tips</h2>
                  <ul className="ps-3 mb-0">
                    <li>Leave a blank line between paragraphs.</li>
                    <li>Start a line with &quot;- &quot; for a bullet list, or &quot;## &quot; for a heading.</li>
                    <li>Links: [link text](https://example.com).</li>
                    <li>Saving a draft never changes the website. Publish when it is ready.</li>
                    <li>Placeholder text such as [owner …], TODO or TBC blocks publishing.</li>
                  </ul>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      )}
      <MediaPicker show={!!picker} onPick={pickMedia} onClose={() => setPicker(null)} />
      <Confirm
        confirm={confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const run = confirm.run
          setConfirm(null)
          run()
        }}
      />
    </div>
  )
}

export default WebsiteEditPage
