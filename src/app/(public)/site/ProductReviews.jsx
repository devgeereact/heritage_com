import { useCallback, useEffect, useState } from 'react';
import IconifyIcon from './ui/Icon';
import heritApi from '@/helpers/heritApi';

const field = {
  width: '100%', padding: '0.7rem 0.85rem', border: '1.5px solid var(--border)',
  borderRadius: 8, fontSize: '0.95rem', background: 'var(--background)', color: 'var(--foreground)',
  fontFamily: 'inherit', marginTop: '0.35rem',
};
const lbl = { fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted-foreground)' };

const Stars = ({ value, size = 16, onPick }) => (
  <span style={{ display: 'inline-flex', gap: 1, cursor: onPick ? 'pointer' : 'default' }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <IconifyIcon key={n} icon={n <= Math.round(value) ? 'solar:star-bold' : 'solar:star-linear'}
        onClick={onPick ? () => onPick(n) : undefined}
        style={{ color: 'var(--hc-accent)', fontSize: size }} />
    ))}
  </span>
);

const ProductReviews = ({ slug, productName }) => {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', rating: 5, title: '', body: '', photo_url: '' });
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [qa, setQa] = useState([]);
  const [qForm, setQForm] = useState({ name: '', body: '' });
  const [qDone, setQDone] = useState(false);

  const load = useCallback(async () => {
    try { setData(await heritApi.reviews.list(slug)); } catch { setData({ summary: { count: 0, average: 0 }, reviews: [] }); }
    try { setQa(await heritApi.reviews.qaList(slug)); } catch { setQa([]); }
  }, [slug]);
  useEffect(() => { load(); }, [load]);

  const askQuestion = async (e) => {
    e.preventDefault();
    if (!qForm.name.trim() || !qForm.body.trim()) return;
    try { await heritApi.reviews.submit({ product_slug: slug, product_name: productName, kind: 'question', name: qForm.name, body: qForm.body }); setQDone(true); setQForm({ name: '', body: '' }); }
    catch { setQDone(true); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || (!form.body.trim() && !form.title.trim())) { setErr('Add your name and a few words.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await heritApi.reviews.submit({ product_slug: slug, product_name: productName, ...form });
      setDone(r); setOpen(false);
    } catch (e2) { setErr(e2.message || 'Could not submit your review'); }
    finally { setBusy(false); }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const s = data?.summary;

  return (
    <div style={{ marginTop: '2.5rem' }}>
      <div className="hc-flex" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className="hc-h4" style={{ margin: 0 }}>Reviews</h3>
        {!open && !done && <button onClick={() => setOpen(true)} className="hc-btn hc-btn--ghost" style={{ cursor: 'pointer' }}>Write a review</button>}
      </div>

      {s && (
        <div className="hc-flex" style={{ gap: '0.6rem', alignItems: 'center', marginTop: '0.4rem' }}>
          <Stars value={s.average} size={18} />
          <span style={{ fontWeight: 600 }}>{s.average || '—'}</span>
          <span style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>{s.count} review{s.count === 1 ? '' : 's'}</span>
        </div>
      )}

      {done && (
        <div className="hc-card" style={{ padding: '1rem', marginTop: '1rem', background: 'var(--secondary)' }}>
          <IconifyIcon icon="solar:check-circle-bold" style={{ color: 'var(--hc-success)' }} /> Thank you! Your review is in — we&apos;ll publish it shortly{done.verified ? ' (verified purchase ✓)' : ''}.
        </div>
      )}

      {open && (
        <form onSubmit={submit} className="hc-card" style={{ padding: '1.25rem', marginTop: '1rem', display: 'grid', gap: '0.85rem' }}>
          <div>
            <span style={lbl}>Your rating</span>
            <div style={{ marginTop: '0.3rem' }}><Stars value={form.rating} size={26} onPick={(n) => setForm((f) => ({ ...f, rating: n }))} /></div>
          </div>
          <div className="hc-flex hc-wrap" style={{ gap: '0.85rem' }}>
            <label style={{ ...lbl, flex: '1 1 160px' }}>Name<input style={field} value={form.name} onChange={set('name')} /></label>
            <label style={{ ...lbl, flex: '1 1 160px' }}>Phone (for verified ✓)<input style={field} value={form.phone} onChange={set('phone')} placeholder="optional" /></label>
          </div>
          <label style={lbl}>Headline<input style={field} value={form.title} onChange={set('title')} placeholder="Beautiful piece" /></label>
          <label style={lbl}>Your review<textarea rows={3} style={field} value={form.body} onChange={set('body')} /></label>
          <label style={lbl}>Photo URL (optional)<input style={field} value={form.photo_url} onChange={set('photo_url')} placeholder="https://…" /></label>
          {err && <p style={{ color: 'var(--hc-danger)', margin: 0, fontSize: '0.85rem' }}>{err}</p>}
          <div className="hc-flex" style={{ gap: '0.5rem' }}>
            <button type="submit" className="hc-btn hc-btn--primary" disabled={busy} style={{ border: 'none' }}>{busy ? 'Sending…' : 'Submit review'}</button>
            <button type="button" className="hc-btn hc-btn--ghost" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gap: '1rem', marginTop: '1.25rem' }}>
        {data?.reviews?.length === 0 && !done && <p style={{ color: 'var(--muted-foreground)' }}>No reviews yet — be the first.</p>}
        {data?.reviews?.map((r) => (
          <div key={r.id} style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <div className="hc-flex" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div className="hc-flex" style={{ gap: '0.5rem', alignItems: 'center' }}>
                <Stars value={r.rating} />
                <strong>{r.author_name}</strong>
                {Number(r.verified) === 1 && <span style={{ fontSize: '0.72rem', color: 'var(--hc-success)', fontWeight: 600 }}><IconifyIcon icon="solar:verified-check-bold" /> Verified</span>}
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>{String(r.created_at).slice(0, 10)}</span>
            </div>
            {r.title && <div style={{ fontWeight: 600, marginTop: '0.4rem' }}>{r.title}</div>}
            {r.body && <p style={{ margin: '0.25rem 0 0' }}>{r.body}</p>}
            {r.photo_url && <img src={r.photo_url} alt="" style={{ maxWidth: 160, borderRadius: 8, marginTop: '0.5rem' }} />}
            {r.response && (
              <div style={{ marginTop: '0.6rem', padding: '0.6rem 0.85rem', background: 'var(--secondary)', borderRadius: 8 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)' }}>HERIT CLOTHING</span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem' }}>{r.response}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Q&A */}
      <div style={{ marginTop: '2rem' }}>
        <h3 className="hc-h4" style={{ marginBottom: '0.75rem' }}>Questions &amp; answers</h3>
        {qa.length === 0 && <p style={{ color: 'var(--muted-foreground)' }}>No questions yet — ask the first.</p>}
        <div style={{ display: 'grid', gap: '0.85rem' }}>
          {qa.map((q) => (
            <div key={q.id} style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <div><IconifyIcon icon="solar:question-circle-bold" style={{ color: 'var(--primary)' }} /> <strong>{q.question}</strong> <span style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>— {q.author_name}</span></div>
              {q.answer && <div style={{ marginTop: '0.3rem', paddingLeft: '1.2rem' }}><span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)' }}>HERIT</span> {q.answer}</div>}
            </div>
          ))}
        </div>
        {qDone ? (
          <p style={{ color: 'var(--hc-success)', marginTop: '0.75rem' }}><IconifyIcon icon="solar:check-circle-bold" /> Thanks — we&apos;ll answer shortly.</p>
        ) : (
          <form onSubmit={askQuestion} className="hc-card" style={{ padding: '1rem', marginTop: '1rem', display: 'grid', gap: '0.6rem' }}>
            <input style={field} placeholder="Your name" value={qForm.name} onChange={(e) => setQForm((f) => ({ ...f, name: e.target.value }))} />
            <textarea rows={2} style={field} placeholder="Ask about fit, fabric, sizing…" value={qForm.body} onChange={(e) => setQForm((f) => ({ ...f, body: e.target.value }))} />
            <div><button type="submit" className="hc-btn hc-btn--ghost">Ask a question</button></div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProductReviews;
