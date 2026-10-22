import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Col, Row, Spinner } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import PageTitle from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import heritApi from '@/helpers/heritApi'
import { useAuthContext } from '@/context/useAuthContext'
import {
  fmtDate,
  fmtUtc,
  fmtTime,
  fmtWhen,
  naira,
  GARMENT_LABELS,
  METHOD_LABELS,
  ENQUIRY_LABELS,
  APPT_TYPE_LABELS,
  CHANGE_KIND_LABELS,
  daysFromToday,
  TZ,
} from '@/helpers/format'
import LoadError from '@/components/herit/LoadError'
import StatusChip, { ApptChip, StageChip } from '@/components/herit/StatusChip'
import InviteModal from '@/components/herit/InviteModal'
import NewEnquiryModal from '@/app/(admin)/enquiries/components/NewEnquiryModal'
import NewOrderModal from '@/app/(admin)/tailoring/components/NewOrderModal'
import TodayBlock from './components/TodayBlock'
import RollNumber from '@/components/herit/RollNumber'

/** Lagos time-of-day greeting with the first name, as in the approved prototype. */
const greeting = (name) => {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const first = (name || '').trim().split(/\s+/)[0]
  return first ? `${part}, ${first}` : part
}

const garment = (j) => `${GARMENT_LABELS[j.garment_type] || j.garment_type || 'Job'}${j.quantity > 1 ? ` × ${j.quantity}` : ''}`
const jobRow = (j, extra = {}) => ({
  key: `j${j.id}`,
  to: `/jobs/${j.id}`,
  title: `${j.client_name} · ${garment(j)}`,
  sub: j.code,
  ...extra,
})
const ago = (ymd) => {
  const d = daysFromToday(ymd)
  if (d === null) return ''
  if (d === 0) return 'today'
  if (d < 0) return `${-d} day${d === -1 ? '' : 's'} late`
  return `in ${d} day${d === 1 ? '' : 's'}`
}

const TodayPage = () => {
  const { user } = useAuthContext()
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState(null)
  const [showEnquiry, setShowEnquiry] = useState(false)
  const [showJob, setShowJob] = useState(false)
  const [invite, setInvite] = useState(null)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setState((s) => (s === 'ready' ? s : 'loading'))
    try {
      setData(await heritApi.today())
      setState('ready')
    } catch (e) {
      setError(e)
      setState('error')
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const b = (k) => data?.[k] || { count: 0, items: [] }

  const blocks = data
    ? [
        {
          id: 'overdue',
          title: 'Overdue',
          icon: 'solar:danger-triangle-bold',
          tone: 'bad',
          seeAll: '/jobs?due=overdue',
          empty: 'Nothing is late. Check jobs due soon below.',
          ...b('overdue'),
          rows: b('overdue').items.map((j) => jobRow(j, { right: <StatusChip tone="bad">{ago(j.due_date)}</StatusChip> })),
        },
        {
          id: 'appointments',
          title: 'Appointments today',
          icon: 'solar:calendar-bold',
          seeAll: '/appointments',
          empty: 'Nothing booked today. Book from Appointments.',
          ...b('appointments_today'),
          // Before the Phase 3 schema is imported, this block still lists jobs with a fitting today.
          rows: b('appointments_today').items.map((a) =>
            a.type
              ? {
                  key: `a${a.id}`,
                  to: `/appointments?id=${a.id}`,
                  title: `${a.all_day ? 'All day' : fmtTime(a.starts_at_local)} · ${APPT_TYPE_LABELS[a.type] || a.type}${a.client_name ? ` · ${a.client_name}` : ''}`,
                  sub: a.job_code || (a.all_day ? 'Whole day' : `until ${fmtTime(a.ends_at_local)}`),
                  right: a.status === 'requested' ? <ApptChip status={a.status} /> : null,
                }
              : jobRow(a, { right: <StageChip stage={a.job_stage} label={a.stage_label} /> }),
          ),
        },
        {
          id: 'appt_requests',
          title: 'Appointment requests',
          icon: 'solar:calendar-add-bold',
          seeAll: '/appointments?tab=requests',
          empty: 'No requests waiting.',
          ...b('appointment_requests'),
          rows: b('appointment_requests').items.map((a) => ({
            key: `ar${a.id}`,
            to: `/appointments?tab=requests&id=${a.id}`,
            title: `${a.client_name || 'Someone'} · ${APPT_TYPE_LABELS[a.type] || a.type}`,
            sub: `Asks for ${fmtWhen(a.starts_at_local)}`,
            right: <StatusChip tone="warn">To confirm</StatusChip>,
          })),
        },
        {
          id: 'messages',
          title: 'Unread messages',
          icon: 'solar:chat-unread-bold',
          seeAll: '/messages',
          empty: 'No unread messages from clients.',
          ...b('messages_unread'),
          // The count is of messages, the rows are jobs: the full list has items plus what the server left out.
          rowTotal: b('messages_unread').items.length + (Number(b('messages_unread').more) || 0),
          rows: b('messages_unread').items.map((m) => ({
            key: `mu${m.job_id}`,
            to: `/jobs/${m.job_id}?tab=messages`,
            title: m.client_name,
            sub: `${m.job_code} · ${fmtWhen(m.last_at_local)}`,
            right: (
              <StatusChip tone="warn" icon="solar:chat-unread-bold">
                {m.unread} new
              </StatusChip>
            ),
          })),
        },
        {
          id: 'changes',
          title: 'Change requests',
          icon: 'solar:pen-new-square-bold',
          seeAll: '/messages?tab=changes',
          empty: 'No change requests waiting.',
          ...b('change_requests'),
          rows: b('change_requests').items.map((c) => ({
            key: `cr${c.id}`,
            to: `/jobs/${c.job_id}?tab=messages`,
            title: `${c.client_name} · ${CHANGE_KIND_LABELS[c.kind] || c.kind}`,
            sub: `${c.job_code} · ${fmtUtc(c.created_at, { time: false })}`,
          })),
        },
        {
          id: 'access',
          title: 'Clients waiting for an access link',
          icon: 'solar:key-bold',
          empty: 'No client is waiting for a link.',
          ...b('access_requests'),
          rows: b('access_requests').items.map((r) => ({
            key: `ac${r.id}`,
            title: r.client_name,
            sub: `No email for a code · asked ${fmtUtc(r.created_at)}`,
            right: (
              <StatusChip tone="warn" icon="solar:link-bold">
                Send link
              </StatusChip>
            ),
            onClick: () => setInvite({ challengeId: r.id, clientName: r.client_name }),
          })),
        },
        {
          id: 'feedback',
          title: 'Feedback to follow up',
          icon: 'solar:star-bold',
          seeAll: '/messages?tab=feedback',
          empty: 'No low ratings to follow up.',
          ...b('feedback_follow_up'),
          rows: b('feedback_follow_up').items.map((f) => ({
            key: `fb${f.id}`,
            to: '/messages?tab=feedback',
            title: `${f.client_name} · ${f.rating ? `${f.rating} of 5` : 'no rating'}`,
            sub: f.job_code,
          })),
        },
        {
          id: 'next',
          title: 'Next actions due',
          icon: 'solar:checklist-minimalistic-bold',
          seeAll: '/jobs?next=due',
          empty: 'No follow-ups due. Add a next action on a job when you promise something.',
          ...b('next_actions'),
          rows: b('next_actions').items.map((j) => jobRow(j, { sub: `${j.next_action || 'Next action'} · ${fmtDate(j.next_action_date)}` })),
        },
        {
          id: 'ready',
          title: 'Ready to hand over',
          icon: 'solar:bag-check-bold',
          seeAll: '/jobs?stage=ready',
          empty: 'Nothing waiting for collection.',
          ...b('ready'),
          rows: b('ready').items.map((j) =>
            jobRow(j, {
              right:
                j.handed_over_qty > 0 ? (
                  <span className="small text-muted">
                    {j.handed_over_qty} of {j.quantity} out
                  </span>
                ) : null,
            }),
          ),
        },
        {
          id: 'due',
          title: 'Due in the next 7 days',
          icon: 'solar:clock-circle-bold',
          seeAll: '/jobs?due=week',
          empty: 'No promised dates this week.',
          ...b('due_soon'),
          rows: b('due_soon').items.map((j) => jobRow(j, { right: <span className="small">{fmtDate(j.due_date, { withYear: false })}</span> })),
        },
        {
          id: 'enquiries',
          title: 'Enquiries to answer',
          icon: 'solar:inbox-line-bold',
          seeAll: '/enquiries',
          empty: 'No new enquiries. Add one when someone calls or messages.',
          ...b('enquiries'),
          rows: b('enquiries').items.map((e) => ({
            key: `e${e.id}`,
            to: `/enquiries/${e.id}`,
            title: e.name,
            sub:
              e.status === 'new'
                ? `New · ${fmtUtc(e.created_at, { time: false })}`
                : `${ENQUIRY_LABELS[e.status] || e.status} · follow up ${fmtDate(e.next_follow_up)}`,
          })),
        },
        {
          id: 'stage_review',
          title: 'Old jobs to confirm',
          icon: 'solar:question-circle-bold',
          seeAll: '/jobs?review=1',
          empty: 'No old jobs need checking.',
          ...b('stage_review'),
          rows: b('stage_review').items.map((j) => jobRow(j, { sub: `${j.code} · was marked done. Ready or collected?` })),
        },
        {
          id: 'measurements',
          title: 'Measurements to approve',
          icon: 'solar:ruler-bold',
          empty: 'No measurements waiting.',
          ...b('measurements_pending'),
          rows: b('measurements_pending').items.map((s) => ({
            key: `m${s.id}`,
            to: `/clients/${s.customer_id}?tab=measurements`,
            title: s.client_name,
            sub: `${s.template_key} · ${s.source === 'customer' ? 'sent by the client' : 'entered in the workshop'}`,
          })),
        },
        {
          id: 'unverified',
          title: 'Payments to verify',
          icon: 'solar:shield-check-bold',
          seeAll: '/payments?tab=verify',
          empty: 'All recorded payments are verified.',
          total: data.unverified_payments?.count ? naira(data.unverified_payments.total_unverified) : null,
          ...b('unverified_payments'),
          rows: b('unverified_payments').items.map((p) => ({
            key: `p${p.id}`,
            to: `/jobs/${p.job_id}?tab=payments`,
            title: `${p.client_name} · ${naira(p.amount)}`,
            sub: `${METHOD_LABELS[p.method] || p.method}${p.external_ref ? ` · ${p.external_ref}` : ''} · ${fmtDate(p.received_on)}`,
          })),
        },
        {
          id: 'balances',
          title: 'Balances to collect',
          icon: 'solar:wallet-money-bold',
          seeAll: '/payments',
          empty: 'No balances outstanding.',
          total: data.balances?.count ? naira(data.balances.total_balance) : null,
          ...b('balances'),
          rows: b('balances').items.map((j) => jobRow(j, { right: <span className="money">{naira(j.balance)}</span> })),
        },
        {
          id: 'credits',
          title: 'Credit or refund due',
          icon: 'solar:hand-money-bold',
          seeAll: '/payments?tab=credits',
          empty: 'No client has paid more than the price.',
          total: data.credits?.count ? naira(data.credits.total_credit) : null,
          ...b('credits'),
          rows: b('credits').items.map((j) => jobRow(j, { right: <span className="money">{naira(j.credit)}</span> })),
        },
      ]
    : []

  // Blocks with work come first; empty ones keep their place after.
  const ordered = [...blocks.filter((x) => x.count > 0), ...blocks.filter((x) => x.count === 0)]
  const nothing = data && blocks.every((x) => x.count === 0)

  // Summary tiles: the same counts as the blocks below, as a first glance.
  const blockOf = (id) => blocks.find((x) => x.id === id) || { count: 0 }
  const tiles = data
    ? [
        {
          id: 'due',
          label: 'Due this week',
          value: blockOf('due').count,
          sub: 'Promised in the next 7 days',
          icon: 'solar:clock-circle-bold',
          tone: 'bad',
          to: '/jobs?due=week',
        },
        {
          id: 'ready',
          label: 'Ready to hand over',
          value: blockOf('ready').count,
          sub: 'Waiting for collection',
          icon: 'solar:bag-check-bold',
          tone: 'ok',
          to: '/jobs?stage=ready',
        },
        {
          id: 'balances',
          label: 'Balances to collect',
          value: naira(data.balances?.total_balance || 0),
          sub: `${blockOf('balances').count} open job${blockOf('balances').count === 1 ? '' : 's'}`,
          icon: 'solar:wallet-money-bold',
          tone: 'amber',
          to: '/payments',
        },
        {
          id: 'enquiries',
          label: 'Enquiries to answer',
          value: blockOf('enquiries').count,
          sub: 'New or due a follow-up',
          icon: 'solar:inbox-line-bold',
          tone: 'info',
          to: '/enquiries',
        },
      ]
    : []

  return (
    <div className="hd">
      <PageTitle title="Today" />
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <h1 className="hd-title">{greeting(user?.name)}</h1>
          <div className="text-muted">
            {data ? `Today, ${fmtDate(data.date)}` : ' '}
            {data ? ' · Lagos' : ''}
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline-secondary" onClick={() => setShowEnquiry(true)}>
            <IconifyIcon icon="solar:inbox-in-bold" className="me-1" aria-hidden="true" /> Add enquiry
          </Button>
          <Button variant="primary" onClick={() => setShowJob(true)}>
            <IconifyIcon icon="solar:add-circle-bold" className="me-1" aria-hidden="true" /> Add job
          </Button>
        </div>
      </div>

      {state === 'loading' && (
        <div className="text-center py-5">
          <Spinner role="status" />
          <div className="visually-hidden">Loading</div>
        </div>
      )}
      {state === 'error' && <LoadError what="today's list" error={error} onRetry={load} />}

      {state === 'ready' && nothing && (
        <div className="hd-card border rounded p-4 mb-3">
          <h2 className="h5">You are all caught up.</h2>
          <p className="mb-0 text-muted">When a client gets in touch, add the enquiry so it shows here.</p>
        </div>
      )}

      {state === 'ready' && tiles.length > 0 && (
        <div className="hd-stats" aria-label="Summary">
          {tiles.map((t) => (
            <Link key={t.id} to={t.to} className="hd-stat">
              <span className="hd-stat-top">
                <span>{t.label}</span>
                <span className={`hd-stat-ic hd-stat-ic--${t.tone}`} aria-hidden="true">
                  <IconifyIcon icon={t.icon} />
                </span>
              </span>
              <b className="hd-stat-value tnum">
                <RollNumber value={t.value} />
              </b>
              <span className="hd-stat-sub">{t.sub}</span>
            </Link>
          ))}
        </div>
      )}

      {state === 'ready' && (
        <>
          {/* Blocks with work get their own card; the empty ones share one compact
              "All clear" card, so the page is not a wall of zeros. */}
          {ordered.some((x) => x.count > 0) && (
            <Row className="g-3 mb-3">
              {ordered
                .filter((x) => x.count > 0)
                .map((blk) => (
                  <Col key={blk.id} xs={12} lg={6}>
                    <TodayBlock {...blk} />
                  </Col>
                ))}
            </Row>
          )}
          {ordered.some((x) => x.count === 0) && (
            <Card className="hd-card" as="section" aria-labelledby="tb-clear">
              <Card.Header className="d-flex align-items-center justify-content-between gap-2 py-2">
                <h2 id="tb-clear" className="h6 mb-0 d-flex align-items-center gap-2">
                  <IconifyIcon icon="solar:check-circle-bold" aria-hidden="true" className="text-success" />
                  All clear
                </h2>
                <span className="small text-muted">Nothing waiting in these lists</span>
              </Card.Header>
              <ul className="hd-clear-list">
                {ordered
                  .filter((x) => x.count === 0)
                  .map((blk) => (
                    <li key={blk.id}>
                      <IconifyIcon icon={blk.icon} aria-hidden="true" />
                      <span>
                        <b>{blk.title}</b>
                        <span>{blk.empty}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <NewEnquiryModal show={showEnquiry} onHide={() => setShowEnquiry(false)} onCreated={(id) => navigate(`/enquiries/${id}`)} />
      <InviteModal
        show={!!invite}
        onHide={() => {
          setInvite(null)
          load()
        }}
        challengeId={invite?.challengeId}
        clientName={invite?.clientName}
      />
      <NewOrderModal show={showJob} onHide={() => setShowJob(false)} onCreated={(r) => (r?.id ? navigate(`/jobs/${r.id}`) : load())} />
    </div>
  )
}

export default TodayPage
