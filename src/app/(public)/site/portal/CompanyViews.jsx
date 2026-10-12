import { useState } from 'react'
import { Link } from 'react-router-dom'
import heritApi from '@/helpers/heritApi'
import { newRequestKey } from '@/helpers/requestKey'
import { fmtDate, fmtWhen, naira } from '@/helpers/format'
import { MessagesSection } from './sections'

// Phase 5 portal views. A company contact sees the job as lines and totals,
// the latest sample and payments; a wearer sees only their own garment. The
// server decides what each may see (portal.php); these only render it.

const Section = ({ id, title, children }) => (
  <section id={id} className="hp-card" aria-labelledby={`${id}-h`} style={{ scrollMarginTop: '5rem' }}>
    <h2 id={`${id}-h`}>{title}</h2>
    {children}
  </section>
)

const SAMPLE_LABEL = { submitted: 'Waiting for your decision', approved: 'Approved', changes_requested: 'Changes requested', withdrawn: 'Replaced by a newer sample' }

/** Approve or ask for changes, with an explicit confirm step (changes need a note). */
const SampleDecision = ({ job, guard, onChanged }) => {
  const [choice, setChoice] = useState(null)
  const [note, setNote] = useState('')
  const [state, setState] = useState({ busy: false, error: '', done: '' })
  const [key] = useState(newRequestKey)
  const s = job.sample
  const confirm = async () => {
    if (choice === 'changes' && !note.trim()) {
      setState({ busy: false, error: 'Say what should change.', done: '' })
      return
    }
    setState({ busy: true, error: '', done: '' })
    try {
      await guard(() => heritApi.client.sampleDecide({ ref: job.ref, sample_id: s.id, decision: choice, note, request_key: key }))
      setState({ busy: false, error: '', done: choice === 'approve' ? 'Thank you. The sample is approved.' : 'Thank you. Herit will make the changes and send a new sample.' })
      onChanged()
    } catch (e) {
      setState({ busy: false, error: e.message || 'That did not go through. Please try again.', done: '' })
    }
  }
  if (state.done) {
    return (
      <p className="hp-ok" role="status">
        {state.done}
      </p>
    )
  }
  if (!choice) {
    return (
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="hp-btn hp-btn--primary" onClick={() => setChoice('approve')}>
          Approve this sample
        </button>
        <button type="button" className="hp-btn" onClick={() => setChoice('changes')}>
          Ask for changes
        </button>
      </div>
    )
  }
  return (
    <div className="hp-stack" role="group" aria-labelledby="sample-confirm-h">
      <p id="sample-confirm-h">
        <strong>{choice === 'approve' ? `Approve sample version ${s.version}?` : `Ask for changes to sample version ${s.version}?`}</strong>{' '}
        {choice === 'approve' ? 'Production follows this sample.' : 'Herit will reply before anything else is made.'}
      </p>
      <label className="hp-label" htmlFor="sample-note">
        {choice === 'approve' ? 'Note (optional)' : 'What should change (required)'}
      </label>
      <textarea id="sample-note" className="hp-input" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      {state.error && (
        <p className="hp-error" role="alert">
          {state.error}
        </p>
      )}
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="hp-btn hp-btn--primary" disabled={state.busy} onClick={confirm}>
          {state.busy ? 'Sending…' : choice === 'approve' ? 'Yes, approve' : 'Send the changes'}
        </button>
        <button type="button" className="hp-btn" disabled={state.busy} onClick={() => setChoice(null)}>
          Go back
        </button>
      </div>
    </div>
  )
}

/** A company job for a company contact. */
export const CompanyJobDetail = ({ job, guard, onChanged }) => {
  const p = job.payment
  return (
    <div className="hp-stack">
      <Section id="progress" title="Progress">
        <dl className="hp-dl" style={{ marginBottom: '1rem' }}>
          <dt>Now</dt>
          <dd>{job.stage_label || 'In progress'}</dd>
          {job.promised_date && (
            <>
              <dt>Promised for</dt>
              <dd>{fmtDate(job.promised_date)}</dd>
            </>
          )}
          {job.po_number && (
            <>
              <dt>Your PO</dt>
              <dd>{job.po_number}</dd>
            </>
          )}
          <dt>Handed over</dt>
          <dd>
            {job.quantity_handed_over} of {job.quantity}
          </dd>
        </dl>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {(job.lines || []).map((l) => (
            <li key={l.description} className="hp-row" style={{ flexWrap: 'wrap' }}>
              <span style={{ minWidth: 0, flex: '1 1 14rem' }}>
                <strong style={{ display: 'block' }}>
                  {l.qty} × {l.description}
                </strong>
                <span className="hp-muted" style={{ display: 'block', fontSize: '.95rem' }}>
                  {l.qty_ready} ready · {l.qty_handed_over} handed over
                  {l.sizes
                    ? ` · sizes ${Object.entries(l.sizes)
                        .map(([s, n]) => `${s} × ${n}`)
                        .join(', ')}`
                    : ''}
                </span>
              </span>
              <progress max={l.qty} value={l.qty_ready} aria-label={`${l.description}: ${l.qty_ready} of ${l.qty} ready`} style={{ width: '8rem' }} />
            </li>
          ))}
        </ul>
        {(job.handovers || []).map((h, i) => (
          <p key={i} className="hp-help">
            {h.method === 'delivery' ? 'Delivery' : 'Collection'} of {h.quantity}: {h.status}
            {h.completed_at ? ` on ${fmtWhen(h.completed_at).split(',')[0]}` : ''}
          </p>
        ))}
      </Section>

      {job.sample && (
        <Section id="sample" title="Sample">
          <p>
            <strong>Version {job.sample.version}:</strong> {job.sample.description}
          </p>
          <p className="hp-muted">
            {SAMPLE_LABEL[job.sample.status] || job.sample.status}
            {job.sample.decided_at ? ` · ${fmtWhen(job.sample.decided_at).split(',')[0]}` : ''}
          </p>
          {job.can?.approve_sample && <SampleDecision job={job} guard={guard} onChanged={onChanged} />}
          {!job.can?.approve_sample && job.sample.status === 'submitted' && <p className="hp-help">Someone at your company with approval rights will decide on this sample.</p>}
        </Section>
      )}

      <Section id="messages" title="Messages">
        <MessagesSection jobRef={job.ref} guard={guard} />
      </Section>

      <Section id="payments" title="Payments">
        {p?.agreed ? (
          <dl className="hp-dl">
            <dt>Agreed price</dt>
            <dd>{naira(p.agreed)}</dd>
            <dt>Paid (confirmed)</dt>
            <dd>{naira(p.paid_verified)}</dd>
            {Number(p.balance) > 0 && (
              <>
                <dt>Left to pay</dt>
                <dd>{naira(p.balance)}</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="hp-help">The price is not agreed yet.</p>
        )}
        {(p?.receipts || []).map((r) => (
          <div key={r.receipt_no} className="hp-row">
            <span>
              {r.receipt_no} · {r.kind === 'refund' ? 'Refund' : 'Payment'}
              {r.received_on ? ` · ${fmtDate(r.received_on)}` : ''}
            </span>
            <strong>{naira(r.amount)}</strong>
          </div>
        ))}
      </Section>

      {job.quote && (
        <Section id="quote" title="Quote">
          <p>
            Quote {job.quote.number} · {naira(job.quote.total)}
            {job.quote.valid_until ? ` · valid until ${fmtDate(job.quote.valid_until)}` : ''}
          </p>
          {(job.quote.items || []).map((it, i) => (
            <div key={i} className="hp-row">
              <span>
                {it.qty} × {it.description}
              </span>
              <span>{naira(it.line_total)}</span>
            </div>
          ))}
        </Section>
      )}
      <div>
        <Link to="/account" className="hp-link">
          Back to your orders
        </Link>
      </div>
    </div>
  )
}

/** A wearer's own garment on a company order. */
export const WearerItemDetail = ({ item }) => (
  <div className="hp-stack">
    <Section id="garment" title="Your garment">
      <dl className="hp-dl">
        <dt>Garment</dt>
        <dd>
          {item.quantity > 1 ? `${item.quantity} × ` : ''}
          {item.description}
        </dd>
        <dt>Now</dt>
        <dd>{item.stage_label}</dd>
        {item.promised_date && (
          <>
            <dt>Promised for</dt>
            <dd>{fmtDate(item.promised_date)}</dd>
          </>
        )}
      </dl>
      <p className="hp-help">This garment is part of an order your organisation placed. Questions about the order go to your organisation&apos;s contact.</p>
    </Section>
    <div>
      <Link to="/account" className="hp-link">
        Back to your orders
      </Link>
    </div>
  </div>
)

/** Portal home: company orders this person follows, and garments they wear. */
export const CompanyLists = ({ data }) => (
  <>
    {(data.company_jobs || []).length > 0 && (
      <div className="hp-card">
        <h3>Company orders</h3>
        {data.company_jobs.map((j) => (
          <Link key={j.ref} to={`/account/jobs/${encodeURIComponent(j.ref)}`} className="hp-row">
            <span style={{ minWidth: 0 }}>
              <strong style={{ display: 'block' }}>
                {j.company}: {j.description}
              </strong>
              <span className="hp-muted" style={{ display: 'block', fontSize: '.95rem' }}>
                {j.stage_label || 'In progress'} · {j.quantity_handed_over} of {j.quantity} handed over
                {j.promised_date ? ` · promised ${fmtDate(j.promised_date)}` : ''}
              </span>
            </span>
          </Link>
        ))}
      </div>
    )}
    {(data.wearing || []).length > 0 && (
      <div className="hp-card">
        <h3>Your garments</h3>
        {data.wearing.map((w) => (
          <Link key={`${w.ref}-${w.item_id}`} to={`/account/jobs/${encodeURIComponent(w.ref)}`} className="hp-row">
            <span style={{ minWidth: 0 }}>
              <strong style={{ display: 'block' }}>{w.description}</strong>
              <span className="hp-muted" style={{ display: 'block', fontSize: '.95rem' }}>
                {w.stage_label}
                {w.promised_date ? ` · promised ${fmtDate(w.promised_date)}` : ''}
              </span>
            </span>
          </Link>
        ))}
      </div>
    )}
  </>
)
