import { useCallback, useEffect, useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';
import { fmtDate, fmtUtc, METHOD_LABELS, naira, GARMENT_LABELS } from '@/helpers/format';
import LoadError from '@/components/herit/LoadError';

const TITLES = { quote: 'Quote', invoice: 'Invoice', receipt: 'Receipt', measurements: 'Measurement sheet' };
const KIND = { payment: 'Payment', refund: 'Refund', reversal: 'Reversal', adjustment: 'Adjustment', opening: 'Opening balance' };

/**
 * Printable A4 documents. Quote, invoice and receipt come from
 * tailoring.php?action=document (every figure computed by the server); the
 * measurement sheet comes from measurements.php. The app chrome is hidden in
 * print; empty business details are simply left out (nothing invented).
 */
const PrintPage = () => {
  const { doc, id } = useParams();
  const [params] = useSearchParams();
  const ref = params.get('ref');
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [business, setBusiness] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (doc === 'measurements') {
        const [s, cfg] = await Promise.all([heritApi.measurements.get(id), heritApi.store.config().catch(() => ({}))]);
        setD(s); setBusiness({ store_name: cfg?.store_name });
      } else {
        const r = await heritApi.tailoring.document(id, doc, ref);
        setD(r); setBusiness(r.business);
      }
    } catch (e) { setError(e); }
  }, [doc, id, ref]);
  useEffect(() => { load(); }, [load]);

  if (!TITLES[doc]) return <div className="hd"><p>Unknown document. <Link to="/today">Back to Today</Link></p></div>;
  if (error) return <div className="hd"><LoadError what={`this ${TITLES[doc].toLowerCase()}`} error={error} onRetry={load} /></div>;
  if (!d) return <div className="hd text-center py-5"><Spinner role="status" /></div>;

  const b = business || {};
  const back = doc === 'measurements' ? `/clients/${d.customer_id}?tab=measurements` : `/jobs/${id}?tab=${doc === 'quote' ? 'quote' : 'payments'}`;
  return (
    <div className="hd">
      <PageTitle title={`${TITLES[doc]} ${d.number || ''}`} />
      <div className="d-flex justify-content-between align-items-center gap-2 mb-3 d-print-none">
        <Link to={back}>Back</Link>
        <Button variant="primary" onClick={() => window.print()}>Print or save as PDF</Button>
      </div>
      <article className="hd-print border rounded">
        <header className="d-flex justify-content-between flex-wrap gap-3 mb-4">
          <div>
            <div className="fw-bold fs-5">{b.store_name || 'Herit Clothing'}</div>
            {b.business_address && <div className="small" style={{ whiteSpace: 'pre-line' }}>{b.business_address}</div>}
            {[b.business_phone, b.business_email].filter(Boolean).length > 0 && <div className="small">{[b.business_phone, b.business_email].filter(Boolean).join(' · ')}</div>}
          </div>
          <div className="text-end">
            <h1>{TITLES[doc]}</h1>
            {d.number && <div className="fw-semibold tnum">{d.number}</div>}
            {d.issued_on && <div className="small">Issued {fmtDate(d.issued_on)}</div>}
          </div>
        </header>

        {doc === 'measurements' ? <MeasurementSheet s={d} /> : (
          <>
            <section className="d-flex justify-content-between flex-wrap gap-3 mb-3">
              <div>
                <div className="small text-uppercase fw-semibold">For</div>
                <div>{d.client.name}{d.client.company_name ? `, ${d.client.company_name}` : ''}</div>
                <div className="small">{[d.client.client_ref, d.client.phone, d.client.email].filter(Boolean).join(' · ')}</div>
              </div>
              <div className="text-end small">
                <div>Job {d.job.code}</div>
                <div>{GARMENT_LABELS[d.job.garment_type] || d.job.garment_type}{d.job.quantity > 1 ? ` × ${d.job.quantity}` : ''}{d.job.description ? ` · ${d.job.description}` : ''}</div>
                {d.job.due_date && <div>Promised {fmtDate(d.job.due_date)}</div>}
              </div>
            </section>

            {doc === 'quote' && <QuoteBody q={d.quote} policy={b.deposit_policy_text} />}
            {doc === 'invoice' && <InvoiceBody d={d} />}
            {doc === 'receipt' && <ReceiptBody d={d} />}
          </>
        )}
        {b.business_hours_text && <footer className="small mt-4 pt-2 border-top">{b.business_hours_text}</footer>}
      </article>
    </div>
  );
};

const Lines = ({ items }) => (
  <table className="mb-3">
    <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Amount</th></tr></thead>
    <tbody>
      {items.map((it, i) => (
        <tr key={i}>
          <td>{it.description}</td>
          <td className="num">{Number(it.qty)}</td>
          <td className="num">{it.unit_price != null ? naira(it.unit_price) : ''}</td>
          <td className="num">{naira(it.line_total)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const Totals = ({ rows }) => (
  <table className="ms-auto mb-3" style={{ maxWidth: 340 }}>
    <tbody>{rows.filter(Boolean).map(([l, v, strong]) => <tr key={l}><td className={strong ? 'fw-bold' : ''}>{l}</td><td className={`num ${strong ? 'fw-bold' : ''}`}>{v}</td></tr>)}</tbody>
  </table>
);

const QuoteBody = ({ q, policy }) => (
  <>
    <Lines items={q.items} />
    <Totals rows={[
      ['Subtotal', naira(q.subtotal)],
      Number(q.delivery_charge) > 0 && ['Delivery', naira(q.delivery_charge)],
      Number(q.discount) > 0 && ['Discount', `−${naira(q.discount)}`],
      ['Total', naira(q.total), true],
      q.deposit_required && ['Deposit to start', naira(q.deposit_required)],
    ]} />
    <dl className="small mb-0">
      {q.promised_date && <><dt>Ready by</dt><dd>{fmtDate(q.promised_date)}</dd></>}
      {q.valid_until && <><dt>Valid until</dt><dd>{fmtDate(q.valid_until)}</dd></>}
      {q.fabric_responsibility && <><dt>Fabric</dt><dd>{{ client: 'Supplied by you', herit: 'Supplied by Herit', mixed: 'Shared, as agreed' }[q.fabric_responsibility]}</dd></>}
      {q.fitting_allowance && <><dt>Fittings</dt><dd>{q.fitting_allowance}</dd></>}
      {q.exclusions && <><dt>Not included</dt><dd style={{ whiteSpace: 'pre-line' }}>{q.exclusions}</dd></>}
      {policy && <><dt>Deposit</dt><dd style={{ whiteSpace: 'pre-line' }}>{policy}</dd></>}
      {q.terms && <><dt>Terms</dt><dd style={{ whiteSpace: 'pre-line' }}>{q.terms}</dd></>}
    </dl>
  </>
);

const InvoiceBody = ({ d }) => {
  const t = d.totals;
  return (
    <>
      {d.quote_number && <p className="small">Based on quote {d.quote_number}.</p>}
      <Lines items={d.lines} />
      <Totals rows={[
        ['Total', naira(t.price), true],
        ['Paid', naira(t.paid_verified)],
        Number(t.awaiting_verification) !== 0 && ['Awaiting confirmation', naira(t.awaiting_verification)],
        ['Balance due', naira(t.balance), true],
        Number(t.credit) > 0 && ['Credit', naira(t.credit)],
      ]} />
      {d.entries?.length > 0 && (
        <>
          <div className="small fw-semibold mb-1">Payments</div>
          <table className="small">
            <tbody>
              {d.entries.map((e) => (
                <tr key={e.id}>
                  <td>{fmtDate(e.received_on)}</td>
                  <td>{KIND[e.kind] || e.kind} · {METHOD_LABELS[e.method] || e.method}{e.reversed_by_id ? ' (reversed)' : ''}{!e.verified && e.kind !== 'reversal' ? ' (not yet confirmed)' : ''}</td>
                  <td>{e.receipt_no}</td>
                  <td className="num">{naira(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
};

const ReceiptBody = ({ d }) => {
  const e = d.entry;
  return (
    <>
      {e.reversed && <p className="fw-bold">This entry was reversed and no longer counts.</p>}
      <Totals rows={[
        [e.kind === 'refund' ? 'Amount refunded' : 'Amount received', naira(Math.abs(Number(e.amount))), true],
        ['Method', METHOD_LABELS[e.method] || e.method],
        e.external_ref && ['Reference', e.external_ref],
        ['Date', fmtDate(e.received_on)],
        ['Status', e.reversed ? 'Reversed' : e.verified ? 'Confirmed' : 'Awaiting confirmation'],
      ]} />
      <Totals rows={[
        ['Job total', naira(d.totals.price)],
        ['Paid to date', naira(d.totals.paid_verified)],
        ['Balance due', naira(d.totals.balance), true],
      ]} />
    </>
  );
};

const MeasurementSheet = ({ s }) => {
  const fields = (s.fields?.length ? s.fields : Object.keys(s.vals || {}).map((k) => ({ key: k, label: k.replace(/_/g, ' ') })))
    .filter((f) => !f.hidden || s.vals?.[f.key] !== undefined);
  return (
    <>
      <section className="mb-3">
        <div className="fw-semibold">{s.client_name} <span className="small">{s.client_ref}</span></div>
        <div className="small">{s.template_label} · set #{s.id} · taken {fmtDate(s.taken_at) || 'date unknown'}{s.approved_at ? ` · approved ${fmtUtc(s.approved_at, { time: false })}` : ''}</div>
        <div className="fw-semibold mt-2">{s.unit === 'unknown' ? 'Unit not confirmed' : `All values in ${s.unit === 'cm' ? 'centimetres (cm)' : 'inches (in)'}`}</div>
        {s.status !== 'approved' && <div className="fw-bold mt-1">Status: {s.status === 'pending' ? 'not yet approved' : s.status.replace(/_/g, ' ')}</div>}
      </section>
      <table className="mb-3">
        <thead><tr><th>Measurement</th><th className="num">Value</th></tr></thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.key}><td className="text-capitalize">{f.label}</td><td className="num">{s.vals?.[f.key] !== undefined ? `${s.vals[f.key]} ${s.unit === 'unknown' ? '' : s.unit}` : '—'}</td></tr>
          ))}
        </tbody>
      </table>
      {s.fit_preference && <p className="small mb-1">Fit: {s.fit_preference}</p>}
      {s.notes && <p className="small mb-0">Notes: {s.notes}</p>}
    </>
  );
};

export default PrintPage;
