import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap'
import PageTitle from '@/components/PageTitle'
import PageHeader from '@/components/herit/PageHeader'
import LoadError from '@/components/herit/LoadError'
import SaveState from '@/components/herit/SaveState'
import ErrorSummary from '@/components/herit/ErrorSummary'
import heritApi from '@/helpers/heritApi'
import { useAuthContext } from '@/context/useAuthContext'

const OWNER = ['super_admin', 'admin', 'manager']

const TEXT = [
  { k: 'business_name', label: 'Business name', max: 120, auto: 'organization' },
  { k: 'business_phone', label: 'Phone', max: 30, type: 'tel', auto: 'tel', help: 'As visitors should dial it, for example 0803 000 0000.' },
  { k: 'business_whatsapp', label: 'WhatsApp number', max: 30, type: 'tel', help: 'Full number; a Nigerian 0… number is saved as 234….' },
  { k: 'business_email', label: 'Email', max: 190, type: 'email', auto: 'email' },
  { k: 'business_area_text', label: 'Area you serve', max: 300, help: 'For example: Lekki and Victoria Island, Lagos.' },
  { k: 'business_hours_text', label: 'Opening hours', max: 300, help: 'For example: Monday to Saturday, 10am to 6pm.' },
  { k: 'business_address', label: 'Address (optional)', max: 300, area: true },
]

const SOCIALS = [
  { k: 'instagram', label: 'Instagram', eg: 'https://instagram.com/yourname' },
  { k: 'facebook', label: 'Facebook', eg: 'https://facebook.com/yourpage' },
  { k: 'tiktok', label: 'TikTok', eg: 'https://tiktok.com/@yourname' },
  { k: 'x', label: 'X', eg: 'https://x.com/yourname' },
  { k: 'youtube', label: 'YouTube', eg: 'https://youtube.com/@yourname' },
  { k: 'linkedin', label: 'LinkedIn', eg: 'https://linkedin.com/company/yourname' },
]

/** Business details that drive the footer, Contact, the actions and search data. Owner saves. */
/** A phone or WhatsApp number that looks made up: a run 1 to 9 or one digit repeated (K-32). */
const looksLikePlaceholder = (key, v) => {
  if (key !== 'business_phone' && key !== 'business_whatsapp') return false
  const d = String(v || '').replace(/\D/g, '')
  return d.length > 0 && (d.includes('123456789') || /(\d)\1{6,}/.test(d))
}

const WebsiteProfilePage = () => {
  const { user } = useAuthContext()
  const isOwner = OWNER.includes(user?.role)
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)
  const [errors, setErrors] = useState({})
  const [save, setSave] = useState({ state: null, error: '' })

  const load = useCallback(async () => {
    setError(null)
    try {
      const r = await heritApi.cms.profileGet()
      const p = r.profile || {}
      setForm({ ...p, socials: { ...(p.socials || {}) } })
    } catch (e) {
      setError(e)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setSocial = (k, v) => setForm((f) => ({ ...f, socials: { ...f.socials, [k]: v } }))

  const submit = async (e) => {
    e.preventDefault()
    setErrors({})
    setSave({ state: 'saving', error: '' })
    try {
      const r = await heritApi.cms.profileSave(form)
      setForm({ ...r.profile, socials: { ...(r.profile.socials || {}) } })
      setSave({ state: 'saved', error: '' })
    } catch (err) {
      setErrors(err.data?.errors || {})
      setSave({ state: 'failed', error: err.message })
    }
  }

  const labelled = Object.fromEntries(
    Object.entries(errors).map(([k, v]) => {
      const t = TEXT.find((x) => x.k === k)?.label || SOCIALS.find((x) => `socials.${x.k}` === k)?.label || k
      return [k, `${t}: ${v}`]
    }),
  )

  return (
    <div className="hd">
      <PageTitle title="Business details" />
      <PageHeader
        title="Business details"
        back={{ to: '/website', label: 'Website' }}
        subtitle="Empty details are not shown on the website. Nothing is filled in for you."
      />
      {error && <LoadError what="the business details" onRetry={load} error={error} />}
      {!form && !error && <Spinner animation="border" role="status" />}
      {form && (
        <Form onSubmit={submit} noValidate>
          {!isOwner && <Alert variant="info">Only the owner can change the business details.</Alert>}
          <ErrorSummary errors={labelled} />
          <fieldset disabled={!isOwner}>
            <Row className="g-3">
              <Col lg={7}>
                <Card className="hd-card">
                  <Card.Body>
                    <h2 className="h5">Contact and location</h2>
                    {TEXT.map((f) => (
                      <Form.Group key={f.k} className="mb-3" controlId={`bp-${f.k}`}>
                        <Form.Label>{f.label}</Form.Label>
                        <Form.Control
                          as={f.area ? 'textarea' : undefined}
                          rows={f.area ? 2 : undefined}
                          type={f.type || 'text'}
                          autoComplete={f.auto}
                          maxLength={f.max}
                          value={form[f.k] || ''}
                          isInvalid={!!errors[f.k]}
                          onChange={(e) => set(f.k, e.target.value)}
                        />
                        {f.help && <Form.Text>{f.help}</Form.Text>}
                        {looksLikePlaceholder(f.k, form[f.k]) && (
                          <div className="hd-warnline" role="note">
                            This number reads like a placeholder. Check it before visitors try to call or message it.
                          </div>
                        )}
                        <Form.Control.Feedback type="invalid">{errors[f.k]}</Form.Control.Feedback>
                      </Form.Group>
                    ))}
                    <Form.Check
                      id="bp-address-public"
                      type="checkbox"
                      label="Show the address on the website"
                      checked={form.business_address_public === '1'}
                      onChange={(e) => set('business_address_public', e.target.checked ? '1' : '0')}
                    />
                    <Form.Text>Off by default. When off, the area you serve is shown instead.</Form.Text>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={5}>
                <Card className="hd-card mb-3">
                  <Card.Body>
                    <h2 className="h5">Social links</h2>
                    <p className="small text-muted">Use the full https link to your own page. Links to other sites are refused.</p>
                    {SOCIALS.map((s) => (
                      <Form.Group key={s.k} className="mb-3" controlId={`bp-social-${s.k}`}>
                        <Form.Label>{s.label}</Form.Label>
                        <Form.Control
                          type="url"
                          inputMode="url"
                          placeholder={s.eg}
                          value={form.socials[s.k] || ''}
                          isInvalid={!!errors[`socials.${s.k}`]}
                          onChange={(e) => setSocial(s.k, e.target.value)}
                        />
                        <Form.Control.Feedback type="invalid">{errors[`socials.${s.k}`]}</Form.Control.Feedback>
                      </Form.Group>
                    ))}
                  </Card.Body>
                </Card>
                <Card className="hd-card">
                  <Card.Body>
                    <h2 className="h5">Journal</h2>
                    <Form.Check
                      id="bp-journal"
                      type="switch"
                      label="Show the journal on the website"
                      checked={form.journal_enabled === '1'}
                      onChange={(e) => set('journal_enabled', e.target.checked ? '1' : '0')}
                    />
                    <Form.Text>Published posts appear only while this is on.</Form.Text>
                  </Card.Body>
                </Card>
                <Card className="hd-card mt-3" aria-labelledby="bp-footer-preview">
                  <Card.Body className="p-0">
                    <h2 id="bp-footer-preview" className="h5 px-3 pt-3">
                      How the footer shows it
                    </h2>
                    <div className="hd-footer-preview hc-ink">
                      <b>{form.business_name || 'Business name'}</b>
                      {form.business_address && ['1', true, 1].includes(form.business_address_public) && (
                        <span>
                          {String(form.business_address)
                            .split(',')
                            .map((x) => x.trim())
                            .filter(Boolean)
                            .map((x) => (
                              <span key={x} className="d-block">
                                {x}
                              </span>
                            ))}
                        </span>
                      )}
                      {form.business_email && <span>{form.business_email}</span>}
                      {form.socials?.instagram && <span>@{String(form.socials.instagram).replace(/\/+$/, '').split('/').pop()}</span>}
                      {form.business_whatsapp && <span>WhatsApp +{String(form.business_whatsapp).replace(/\D/g, '')}</span>}
                      {form.business_phone && <span>{form.business_phone}</span>}
                      {!form.business_hours_text && <small>Opening hours are not set, so they are not shown.</small>}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
            <div className="d-flex gap-2 align-items-center mt-3">
              <Button type="submit" disabled={save.state === 'saving'}>
                Save business details
              </Button>
              <SaveState state={save.state} error={save.error} />
            </div>
          </fieldset>
        </Form>
      )}
    </div>
  )
}

export default WebsiteProfilePage
