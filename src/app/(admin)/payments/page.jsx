import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Spinner } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';
import { fmtDate, METHOD_LABELS, naira, STAGE_LABELS } from '@/helpers/format';
import LoadError from '@/components/herit/LoadError';
import PageHeader from '@/components/herit/PageHeader';
import RecordPaymentModal from '@/components/herit/RecordPaymentModal';
import SaveState from '@/components/herit/SaveState';
import StatusChip from '@/components/herit/StatusChip';

const TABS = [['due', 'Balances due'], ['verify', 'To verify'], ['recent', 'Recent'], ['credits', 'Credits and refunds']];
const KIND = { payment: 'Payment', refund: 'Refund', reversal: 'Reversal', adjustment: 'Adjustment', opening: 'Opening balance' };

/** Tailoring money across jobs (owner). Retail payments and expenses stay in Finance. */
const PaymentsPage = () => {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'due';
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);
  const [payFor, setPayFor] = useState(null);
  const [save, setSave] = useState({ state: null, error: '' });
  const [verifiedMethods, setVerifiedMethods] = useState(['cash']);

  const load = useCallback(async () => {
    setState((s) => (s === 'ready' ? s : 'loading'));
    try {
      let r;
      if (tab === 'due') r = await heritApi.ledger.due();
      else if (tab === 'credits') r = await heritApi.ledger.credits();
      else if (tab === 'verify') r = await heritApi.ledger.list({ verified: 0 });
      else r = await heritApi.ledger.list({});
      setData(r); setState('ready');
    } catch (e) { setError(e); setState('error'); }
  }, [tab]);
  useEffect(() => { setData(null); setState('loading'); load(); }, [load]);
  useEffect(() => { heritApi.tailoring.meta().then((m) => m?.verified_methods && setVerifiedMethods(m.verified_methods)).catch(() => {}); }, []);

  const verify = async (e) => {
    setSave({ state: 'saving', error: '' });
    try { await heritApi.ledger.verify(e.id); setSave({ state: 'saved', error: '' }); load(); }
    catch (err) { setSave({ state: 'failed', error: err.message }); }
  };

  const items = tab === 'due' || tab === 'credits' ? data?.items || [] : data?.entries || [];
  return (
    <div className="hd">
      <PageTitle title="Payments" />
      <PageHeader
        title="Payments"
        subtitle={<>Tailoring jobs only. Shop sales and expenses are in <Link to="/finance">Finance</Link>.</>}
      />
      <nav className="hd-tabs mb-3" aria-label="Payments views">
        {TABS.map(([k, l]) => (
          <Button key={k} variant="outline-secondary" className={k === tab ? 'active' : ''} aria-current={k === tab ? 'page' : undefined} onClick={() => setParams({ tab: k })}>{l}</Button>
        ))}
      </nav>

      {state === 'loading' && <div className="text-center py-5"><Spinner role="status" /></div>}
      {state === 'error' && <LoadError what="payments" error={error} onRetry={load} />}
      {state === 'ready' && (
        <>
          {(tab === 'due' || tab === 'credits') && (
            <p className="mb-2">Total {tab === 'due' ? 'to collect' : 'owed back'}: <span className="money fw-semibold">{naira(data.total)}</span></p>
          )}
          {tab === 'verify' && <p className="mb-2 text-muted">Check each one against your bank or POS, then verify it. Only verified payments count.</p>}
          <Card className="hd-card">
            {items.length === 0 ? (
              <Card.Body className="text-muted">
                {tab === 'due' ? 'No balances to collect.' : tab === 'verify' ? 'Nothing waiting for verification.' : tab === 'credits' ? 'No client has paid more than the price.' : 'No payments recorded yet.'}
              </Card.Body>
            ) : (tab === 'due' || tab === 'credits') ? items.map((j) => (
              <div key={j.id} className="hd-row flex-wrap">
                <Link to={`/jobs/${j.id}?tab=payments`} className="hd-row-main text-reset text-decoration-none" style={{ minHeight: 44 }}>
                  <span className="hd-row-title d-block">{j.client_name} · {j.code}</span>
                  <span className="hd-row-sub d-block">{STAGE_LABELS[j.job_stage] || j.job_stage}{j.due_date ? ` · promised ${fmtDate(j.due_date)}` : ''} · price {naira(j.price)}</span>
                </Link>
                <span className="money fw-semibold">{naira(tab === 'due' ? j.balance : j.credit)}</span>
                {tab === 'due' && <Button size="sm" variant="outline-secondary" onClick={() => setPayFor(j)}>Record payment</Button>}
              </div>
            )) : items.map((e) => (
              <div key={e.id} className="hd-row flex-wrap">
                <Link to={`/jobs/${e.job_id}?tab=payments`} className="hd-row-main text-reset text-decoration-none" style={{ minHeight: 44 }}>
                  <span className="hd-row-title d-block">{e.client_name} · {KIND[e.kind] || e.kind} <span className="money">{naira(e.amount)}</span></span>
                  <span className="hd-row-sub d-block">{e.code} · {METHOD_LABELS[e.method] || e.method}{e.external_ref ? ` · ${e.external_ref}` : ''} · {fmtDate(e.received_on)} · {e.receipt_no}</span>
                </Link>
                {e.reversed_by_id ? <StatusChip tone="neutral">Reversed</StatusChip> : e.kind === 'reversal' ? null : e.verified ? <StatusChip tone="ok">Verified</StatusChip> : (
                  <Button size="sm" variant="primary" onClick={() => verify(e)} disabled={save.state === 'saving'}>Verify</Button>
                )}
              </div>
            ))}
          </Card>
          <SaveState state={save.state} error={save.error} />
        </>
      )}

      <RecordPaymentModal show={!!payFor} onHide={() => setPayFor(null)} job={payFor || {}} verifiedMethods={verifiedMethods} onSaved={load} />
    </div>
  );
};

export default PaymentsPage;
