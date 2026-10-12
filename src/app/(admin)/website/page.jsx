import { useCallback, useEffect, useState } from 'react'
import { Card, Col, Row, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageTitle from '@/components/PageTitle'
import PageHeader from '@/components/herit/PageHeader'
import LoadError from '@/components/herit/LoadError'
import StatusChip from '@/components/herit/StatusChip'
import heritApi from '@/helpers/heritApi'
import { ENTITIES } from './components/cmsSchema'

// Each missing business fact and what it hides on the website.
const MISSING = {
  business_name: ['Business name', 'the name in the footer and in search results (needed for the business details search engines read)'],
  business_phone: ['Phone', 'the phone link in the footer and on Contact'],
  business_whatsapp: ['WhatsApp number', 'the WhatsApp link in the footer and on Contact'],
  business_email: ['Email', 'the email link in the footer and on Contact'],
  business_area_text: ['Area you serve', 'the area line under the Home headline, in the footer and on Contact'],
  business_hours_text: ['Opening hours', 'the hours in the footer and on Contact'],
  socials: ['Social links', 'the social icons in the footer'],
}

const SECTIONS = [ENTITIES.page, ENTITIES.service, ENTITIES.project, ENTITIES.faq, ENTITIES.policy]

/** Website hub: what is missing from the profile, and what is published where. */
const WebsitePage = () => {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [profile, ...lists] = await Promise.all([heritApi.cms.profileGet(), ...SECTIONS.map((s) => heritApi.cms.list(s.entity))])
      const counts = {}
      SECTIONS.forEach((s, i) => {
        const items = lists[i].items || []
        counts[s.entity] = {
          total: s.keyed ? Object.keys(s.keys).length : items.length,
          published: items.filter((x) => x.status === 'published').length,
          drafts: items.filter((x) => x.has_draft).length,
        }
      })
      setData({ missing: profile.missing || [], counts })
    } catch (e) {
      setError(e)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="hd">
      <PageTitle title="Website" />
      <PageHeader
        title="Website"
        subtitle="Everything visitors see on the website. Drafts are private until you publish them; empty sections stay hidden."
      />
      {error && <LoadError what="the website overview" onRetry={load} error={error} />}
      {!data && !error && <Spinner animation="border" role="status" />}
      {data && (
        <Row className="g-3">
          <Col lg={5}>
            <Card className="hd-card h-100">
              <Card.Body>
                <h2 className="h5">Business details</h2>
                {data.missing.length === 0 ? (
                  <p className="mb-2">
                    <StatusChip tone="ok">Complete</StatusChip>
                  </p>
                ) : (
                  <>
                    <p className="mb-2">Not set yet, so hidden on the website:</p>
                    <ul className="ps-3">
                      {data.missing.map((k) => (
                        <li key={k} className="mb-1">
                          <strong>{MISSING[k]?.[0] || k}</strong>: hides {MISSING[k]?.[1] || 'part of the site'}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <Link to="/website/profile">Edit business details</Link>
                <span className="mx-2 text-muted">·</span>
                <Link to="/website/media">Images</Link>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={7}>
            <Card className="hd-card h-100">
              <Card.Body className="p-0">
                <h2 className="h5 p-3 mb-0 border-bottom">Content</h2>
                <ul className="list-unstyled mb-0">
                  {SECTIONS.map((s) => {
                    const c = data.counts[s.entity]
                    return (
                      <li key={s.entity} className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-bottom">
                        <div className="min-w-0">
                          <Link to={`/website/${s.path}`} className="fw-semibold">
                            {s.label}
                          </Link>
                          <div className="small text-muted">{s.intro}</div>
                        </div>
                        <span className="d-inline-flex flex-wrap gap-2">
                          <StatusChip tone={c.published ? 'ok' : 'neutral'}>
                            {c.published} of {c.total} published
                          </StatusChip>
                          {c.drafts > 0 && <StatusChip tone="warn">{c.drafts} with unpublished changes</StatusChip>}
                        </span>
                      </li>
                    )
                  })}
                  <li className="p-3">
                    <Link to="/content" className="fw-semibold">
                      Journal and testimonials
                    </Link>
                    <div className="small text-muted">
                      Journal posts show on the website only while the journal is switched on in Business details.
                    </div>
                  </li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  )
}

export default WebsitePage
