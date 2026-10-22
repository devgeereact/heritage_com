import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, Col, Row, Spinner, Table } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import PageTitle from '@/components/PageTitle'
import heritApi from '@/helpers/heritApi'
import { fmtDate } from '@/helpers/format'
import { ROLE_LABELS } from '@/helpers/roles'
import { MENU_ITEMS } from '@/assets/data/menu-items'
import LoadError from '@/components/herit/LoadError'
import StatusChip from '@/components/herit/StatusChip'

// Phase 7 (learn and simplify): the owner's evidence for what to keep, fix or
// remove. Read-only; review.php answers super_admin only. Every card says what
// its numbers mean and what they do not prove.

const WINDOWS = [30, 90]
const flat = (items) => items.flatMap((i) => (i.children ? flat(i.children) : [i]))
const SECTION_LABELS = Object.fromEntries(flat(MENU_ITEMS).filter((i) => i.url).map((i) => [i.key, i.label]))
const sectionLabel = (k) => SECTION_LABELS[k] || k
const pct = (rate) => (rate === null || rate === undefined ? 'No enquiries yet' : `${Math.round(rate * 100)}%`)
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp messages' },
  { key: 'reminders', label: 'Job reminders (WhatsApp)' },
  { key: 'email', label: 'Emails' },
  { key: 'portal_messages', label: 'Messages to the client portal' },
]

/** A card with a heading, its content and a short note on what it means. */
const ReviewCard = ({ id, title, children, note }) => (
  <Card className="hd-card h-100" aria-labelledby={`rv-${id}`}>
    <Card.Body>
      <h2 className="h5" id={`rv-${id}`}>
        {title}
      </h2>
      {children}
      <p className="small text-muted mb-0 mt-3" data-testid={`note-${id}`}>
        {note}
      </p>
    </Card.Body>
  </Card>
)

const Figure = ({ label, value }) => (
  <div>
    <div className="small text-muted">{label}</div>
    <div className="fs-4 fw-semibold tnum">{value}</div>
  </div>
)

const EnquiriesCard = ({ e, days }) => (
  <ReviewCard
    id="enquiries"
    title="Enquiry conversion"
    note="Of the enquiries that arrived in this window, how many have become a job so far. Recent enquiries may still convert, so the rate for the last few weeks tends to rise. It does not say why an enquiry did not go ahead."
  >
    {!e.available ? (
      <p className="mb-0">Conversion is not recorded on this database yet (Phase 2 schema). {plural(e.created, 'enquiry', 'enquiries')} arrived in the last {days} days.</p>
    ) : e.created === 0 ? (
      <p className="mb-0">No enquiries arrived in the last {days} days.</p>
    ) : (
      <div className="d-flex flex-wrap gap-4">
        <Figure label="Enquiries" value={e.created} />
        <Figure label="Became a job" value={e.converted} />
        <Figure label="Rate" value={pct(e.rate)} />
        <Figure label="Median days to convert" value={e.median_days_to_convert === null ? 'None yet' : e.median_days_to_convert} />
      </div>
    )}
  </ReviewCard>
)

const OverdueCard = ({ o }) => (
  <ReviewCard
    id="overdue"
    title="Overdue jobs now"
    note="Open jobs whose due date has passed, as on Today. Jobs without a due date are not here, and a late job may already be agreed with the client. Showing the oldest 20."
  >
    {o.count === 0 ? (
      <p className="mb-0">No open job is past its due date.</p>
    ) : (
      <>
        <p className="mb-2">
          <StatusChip tone="bad">{plural(o.count, 'job')} late</StatusChip>
        </p>
        <Table responsive size="sm" className="mb-0 align-middle">
          <thead>
            <tr>
              <th scope="col">Job</th>
              <th scope="col">Client</th>
              <th scope="col">Due</th>
              <th scope="col" className="text-end">Days late</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((j) => (
              <tr key={j.id}>
                <td className="text-nowrap">
                  <Link to={`/jobs/${j.id}`}>{j.code}</Link>
                </td>
                <td>{j.client_name || 'Unknown client'}</td>
                <td className="text-nowrap">{fmtDate(j.due_date)}</td>
                <td className="text-end tnum">{j.days_overdue}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        {o.more > 0 && <p className="small mb-0 mt-2">And {o.more} more. <Link to="/jobs?due=overdue">See all overdue jobs</Link></p>}
      </>
    )}
  </ReviewCard>
)

const RefusalsCard = ({ r, days }) => {
  const rows = r.items.filter((x) => x.count > 0)
  return (
    <ReviewCard
      id="refusals"
      title="Refused attempts"
      note="Refused sign-ins, codes and checks, from the audit log. Many refusals in a short time can mean someone guessing. Failed emails are in Messages sent and failed."
    >
      {rows.length === 0 ? (
        <p className="mb-0">Nothing was refused in the last {days} days.</p>
      ) : (
        <Table responsive size="sm" className="mb-0">
          <tbody>
            {rows.map((x) => (
              <tr key={x.action}>
                <td>{x.label}</td>
                <td className="text-end tnum">{x.count}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </ReviewCard>
  )
}

const FailedSavesCard = ({ f, days }) => (
  <ReviewCard
    id="failed-saves"
    title="Failed saves"
    note="Saves the server could not finish: two people changing the same record at once, or a server error. Counted from the day this was switched on (19 October 2026), with the screen and action but no person. Forms that ask you to correct a field are not counted. A few are normal; a steady number on one screen is worth looking at."
  >
    {!f || !f.available ? (
      <p className="mb-0">Not counted yet on this server.</p>
    ) : f.total === 0 ? (
      <p className="mb-0">No failed saves in the last {days} days.</p>
    ) : (
      <>
        <Table responsive size="sm" className="mb-2">
          <tbody>
            {f.kinds.map((k) => (
              <tr key={k.kind}>
                <td>{k.label}</td>
                <td className="text-end tnum">{k.count}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        {f.endpoints.length > 0 && (
          <Table responsive size="sm" className="mb-0">
            <thead>
              <tr>
                <th scope="col">Where</th>
                <th scope="col" className="text-end">
                  Count
                </th>
              </tr>
            </thead>
            <tbody>
              {f.endpoints.map((e) => (
                <tr key={`${e.endpoint}|${e.action}`}>
                  <td>
                    <code>{e.endpoint}</code>
                    {e.action ? ` (${e.action})` : ''}
                  </td>
                  <td className="text-end tnum">{e.count}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </>
    )}
  </ReviewCard>
)

const NotificationsCard = ({ n }) => (
  <ReviewCard
    id="notifications"
    title="Messages sent and failed"
    note="Sent means the provider accepted it, not that the client read it. Other is mostly WhatsApp click-to-send links, which the system cannot confirm, and messages still queued."
  >
    <Table responsive size="sm" className="mb-0">
      <thead>
        <tr>
          <th scope="col">Channel</th>
          <th scope="col" className="text-end">Sent</th>
          <th scope="col" className="text-end">Failed</th>
          <th scope="col" className="text-end">Other</th>
        </tr>
      </thead>
      <tbody>
        {CHANNELS.map(({ key, label }) => {
          const c = n[key]
          return (
            <tr key={key}>
              <td>{label}</td>
              {c?.available ? (
                <>
                  <td className="text-end tnum">{c.sent}</td>
                  <td className="text-end tnum">{c.failed > 0 ? <StatusChip tone="bad">{c.failed}</StatusChip> : 0}</td>
                  <td className="text-end tnum">{c.other}</td>
                </>
              ) : (
                <td colSpan={3} className="text-end text-muted">
                  Not set up
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </Table>
  </ReviewCard>
)

const UsageCard = ({ u, days }) => (
  <ReviewCard
    id="usage"
    title="Section use"
    note={`Counts one visit per section per browser per day; no names are stored. A section nobody opened is a candidate to simplify, not proof that nobody needs it: seasonal tools can be quiet for weeks.${u.counting_since ? ` Counting started on ${fmtDate(u.counting_since)}.` : ''}`}
  >
    {!u.available ? (
      <p className="mb-0">Section counting is not set up on this database yet (schema_phase31.sql).</p>
    ) : (
      <>
        {u.sections.length === 0 ? (
          <p>No visits counted in the last {days} days.</p>
        ) : (
          <Table responsive size="sm" className="align-middle">
            <thead>
              <tr>
                <th scope="col">Section</th>
                <th scope="col" className="text-end">Visits</th>
                <th scope="col">By role</th>
              </tr>
            </thead>
            <tbody>
              {u.sections.map((s) => (
                <tr key={s.section}>
                  <td>{sectionLabel(s.section)}</td>
                  <td className="text-end tnum">{s.hits}</td>
                  <td className="small">
                    {Object.entries(s.roles)
                      .map(([role, n]) => `${ROLE_LABELS[role] || role} ${n}`)
                      .join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <h3 className="h6 mt-3">Not opened in the last {days} days</h3>
        {u.zero_hit_sections.length === 0 ? (
          <p className="mb-0">Every section was opened at least once.</p>
        ) : (
          <p className="mb-0" data-testid="zero-hit">
            {u.zero_hit_sections.map(sectionLabel).join(', ')}
          </p>
        )}
      </>
    )}
  </ReviewCard>
)

/** Owner review (super_admin): evidence for Phase 7 decisions. */
const ReviewPage = () => {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState(null)

  // Only the latest request may update the page: switching 90 then 30 quickly
  // must not leave the slower 90-day answer on screen (or a blank page).
  const latest = useRef(0)
  const load = useCallback(async () => {
    const id = ++latest.current
    setState('loading')
    setError(null)
    try {
      const answer = await heritApi.review.summary(days)
      if (id !== latest.current) return
      setData(answer)
      setState('ready')
    } catch (e) {
      if (id !== latest.current) return
      setError(e)
      setState('error')
    }
  }, [days])
  useEffect(() => {
    load()
  }, [load])

  const ready = state === 'ready' && data && data.days === days

  return (
    <div className="hd">
      <PageTitle title="Owner review" />
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <h1 className="hd-title">Owner review</h1>
          <div className="text-muted">
            What is working and what is not, from your own records.
            {ready ? ` ${fmtDate(data.from)} to ${fmtDate(data.to)}, Lagos.` : ''}
          </div>
        </div>
        <div className="hd-seg" role="group" aria-label="Time window">
          {WINDOWS.map((w) => (
            <button key={w} type="button" aria-pressed={w === days} onClick={() => setDays(w)}>
              Last {w} days
            </button>
          ))}
        </div>
      </div>

      {state === 'loading' && (
        <div className="text-center py-5">
          <Spinner role="status" />
          <div className="visually-hidden">Loading</div>
        </div>
      )}
      {state === 'error' && <LoadError what="the review" error={error} onRetry={load} />}

      {ready && (
        <Row className="g-3">
          <Col xs={12} lg={6}>
            <EnquiriesCard e={data.enquiries} days={days} />
          </Col>
          <Col xs={12} lg={6}>
            <OverdueCard o={data.overdue_jobs} />
          </Col>
          <Col xs={12} lg={6}>
            <NotificationsCard n={data.notifications} />
          </Col>
          <Col xs={12} lg={6}>
            <RefusalsCard r={data.refusals} days={days} />
          </Col>
          <Col xs={12} lg={6}>
            <FailedSavesCard f={data.failed_saves} days={days} />
          </Col>
          <Col xs={12}>
            <UsageCard u={data.usage} days={days} />
          </Col>
        </Row>
      )}
    </div>
  )
}

export default ReviewPage
