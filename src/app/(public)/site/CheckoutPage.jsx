import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import SiteLayout from './SiteLayout';
import { formatNgn } from './products';
import { useCart } from './cart';
import heritApi from '@/helpers/heritApi';

const DELIVERY = [
  { key: 'lagos', label: 'Lagos delivery', note: 'Free over ₦25,000, else ₦2,500' },
  { key: 'nigeria', label: 'Rest of Nigeria', note: '₦4,500, tracked courier' },
  { key: 'pickup', label: 'Pickup — Ajuwon Market', note: 'Collect from the studio, free' },
];
const PAYMENT = [
  { key: 'card', label: 'Pay by card', icon: 'solar:card-bold', note: 'Secure card payment' },
  { key: 'transfer', label: 'Bank transfer', icon: 'solar:banknote-2-bold', note: 'We send account details' },
  { key: 'cod', label: 'Pay on delivery', icon: 'solar:hand-money-bold', note: 'Cash when it arrives' },
];

const field = {
  width: '100%', padding: '0.7rem 0.85rem', border: '1.5px solid var(--border)',
  borderRadius: 8, fontSize: '0.95rem', background: 'var(--background)', color: 'var(--foreground)',
  fontFamily: 'inherit', marginTop: '0.35rem',
};
const lbl = { fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted-foreground)' };

const CheckoutPage = () => {
  const { items, subtotal, clear } = useCart();
  const [params] = useSearchParams();
  const verifyRef = params.get('verify');

  const [form, setForm] = useState({ customer: '', phone: '', email: '', ship_address: '', city: '', notes: '', gift_message: '' });
  const [delivery, setDelivery] = useState('lagos');
  const [payment, setPayment] = useState('card');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);     // {code, total, payment_method, provider}
  const [verifying, setVerifying] = useState(!!verifyRef);
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState(null); // {code, type, value, discount, free_ship, description}
  const [couponErr, setCouponErr] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [gift, setGift] = useState('');
  const [giftCard, setGiftCard] = useState(null);   // {code, balance}
  const [giftErr, setGiftErr] = useState('');
  const [creditBalance, setCreditBalance] = useState(0);
  const [useCredit, setUseCredit] = useState(false);
  const [referral, setReferral] = useState('');

  // Prefill a referral code captured from a share link (?ref=) by SiteLayout.
  useEffect(() => {
    try { const r = localStorage.getItem('herit_ref'); if (r) setReferral(r); } catch { /* ignore */ }
  }, []);

  // Abandoned-cart capture: once a usable phone is entered, save the basket so
  // staff can follow up if the order isn't completed. Debounced; best-effort.
  useEffect(() => {
    const digits = (form.phone || '').replace(/\D/g, '');
    if (digits.length < 10 || items.length === 0) return;
    const t = setTimeout(() => {
      heritApi.store.saveCart({
        phone: form.phone, name: form.customer, email: form.email, subtotal,
        items: items.map((l) => ({ name: l.name, size: l.size, qty: l.qty })),
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [form.phone, form.customer, form.email, items, subtotal]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const baseShipping = delivery === 'lagos' ? (subtotal >= 25000 ? 0 : 2500) : delivery === 'nigeria' ? 4500 : 0;
  const freeShip = !!applied?.free_ship;
  const shipping = freeShip ? 0 : baseShipping;
  const discount = applied && !applied.free_ship ? Number(applied.discount || 0) : 0;
  const afterCoupon = Math.max(0, subtotal + shipping - discount);
  const giftApplied = giftCard ? Math.min(Number(giftCard.balance || 0), afterCoupon) : 0;
  const afterGift = afterCoupon - giftApplied;
  const creditApplied = useCredit ? Math.min(creditBalance, afterGift) : 0;
  const total = Math.max(0, afterGift - creditApplied);

  // Look up store credit for the entered phone (privacy: returns a number only).
  useEffect(() => {
    const digits = (form.phone || '').replace(/\D/g, '');
    if (digits.length < 10) { setCreditBalance(0); setUseCredit(false); return; }
    let live = true;
    heritApi.store.creditBalance(form.phone)
      .then((r) => { if (live) setCreditBalance(Number(r.balance || 0)); })
      .catch(() => { if (live) setCreditBalance(0); });
    return () => { live = false; };
  }, [form.phone]);

  const applyGift = async () => {
    const code = gift.trim();
    if (!code) return;
    setGiftErr('');
    try {
      const r = await heritApi.store.giftCheck(code);
      if (r.ok) { setGiftCard(r); setGiftErr(''); }
      else { setGiftCard(null); setGiftErr(r.error || 'That gift card is not valid'); }
    } catch (e) { setGiftErr(e.message || 'Could not check that card'); }
  };

  const applyCoupon = async () => {
    const code = coupon.trim();
    if (!code) return;
    setCouponBusy(true); setCouponErr('');
    try {
      const r = await heritApi.store.validateCoupon(code, subtotal, baseShipping);
      if (r.ok) { setApplied(r); setCouponErr(''); }
      else { setApplied(null); setCouponErr(r.error || 'That code is not valid'); }
    } catch (e) {
      setCouponErr(e.message || 'Could not check that code');
    } finally { setCouponBusy(false); }
  };
  const removeCoupon = () => { setApplied(null); setCoupon(''); setCouponErr(''); };

  // Returning from a Flutterwave redirect (?verify=REF) — confirm and show result.
  useEffect(() => {
    if (!verifyRef) return;
    let live = true;
    heritApi.store.payVerify(verifyRef)
      .then((r) => { if (live) { setDone({ code: r.code, status: r.status, paid: r.ok }); clear(); } })
      .catch(() => { if (live) setError('We could not confirm that payment. If you were charged, contact us with your order code.'); })
      .finally(() => { if (live) setVerifying(false); });
    return () => { live = false; };
  }, [verifyRef]);   // eslint-disable-line react-hooks/exhaustive-deps

  const placeOrder = async () => {
    setError(null);
    if (!form.customer.trim()) return setError('Please enter your name.');
    if (!form.phone.trim()) return setError('Please enter a phone number.');
    if (delivery !== 'pickup' && !form.ship_address.trim()) return setError('Please enter a delivery address.');
    setBusy(true);
    try {
      const res = await heritApi.store.checkout({
        ...form, delivery, payment_method: payment,
        coupon: applied ? applied.code : '',
        gift_card: giftCard ? giftCard.code : '',
        use_credit: useCredit ? -1 : 0,
        referral_code: referral.trim(),
        source: (() => { try { return localStorage.getItem('herit_src') || ''; } catch { return ''; } })(),
        utm_campaign: (() => { try { return localStorage.getItem('herit_camp') || ''; } catch { return ''; } })(),
        items: items.map((l) => ({ slug: l.slug, size: l.size, qty: l.qty })),
      });
      // Card → try the gateway. If configured, hand off to its hosted page.
      if (payment === 'card') {
        const pay = await heritApi.store.payInit(res.code, form.email);
        if (pay.provider !== 'manual' && pay.authorization_url) {
          clear();
          window.location.href = pay.authorization_url;
          return;
        }
        // No gateway live yet — fall back to transfer instructions, order still placed.
        setDone({ code: res.code, total: res.total, payment_method: 'transfer', fallback: true });
        clear();
        return;
      }
      setDone({ code: res.code, total: res.total, payment_method: payment });
      clear();
    } catch (e) {
      const msg = /failed to fetch|networkerror/i.test(e.message || '')
        ? 'We couldn’t reach the store. Check your connection and try again.'
        : (e.message || 'Could not place the order. Please try again.');
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  // ---- Confirmation / verify states ----
  if (verifying) {
    return (
      <SiteLayout title="Confirming payment">
        <section className="hc-section hc-text-center"><div className="hc-container">
          <span className="hc-card-ico" style={{ margin: '0 auto 1rem' }}><IconifyIcon icon="solar:refresh-bold" /></span>
          <h1 className="hc-h2">Confirming your payment…</h1>
          <p className="hc-lead" style={{ margin: '1rem auto 0' }}>One moment while we check with the bank.</p>
        </div></section>
      </SiteLayout>
    );
  }

  if (done) {
    const paidNow = done.status === 'paid';
    return (
      <SiteLayout title="Order received">
        <section className="hc-section"><div className="hc-container" style={{ maxWidth: '40rem' }}>
          <div className="hc-card hc-text-center" style={{ padding: '3rem 2rem' }}>
            <span className="hc-card-ico" style={{ margin: '0 auto 1rem', background: 'var(--primary)', color: '#fff' }}>
              <IconifyIcon icon="solar:check-circle-bold" />
            </span>
            <h1 className="hc-h2">Thank you{form.customer ? `, ${form.customer.split(' ')[0]}` : ''}.</h1>
            <p className="hc-lead" style={{ margin: '0.75rem auto 0' }}>
              Your order <strong style={{ color: 'var(--primary)' }}>{done.code}</strong> is in.
            </p>

            <div className="hc-quote" style={{ textAlign: 'left', marginTop: '1.5rem', padding: '1.25rem' }}>
              {paidNow ? (
                <p style={{ margin: 0 }}>Payment confirmed — we&apos;re preparing your piece. You&apos;ll get tracking once it ships.</p>
              ) : done.payment_method === 'cod' ? (
                <p style={{ margin: 0 }}>Pay <strong>{formatNgn(done.total)}</strong> in cash when your order arrives. We&apos;ll call {form.phone} to arrange delivery.</p>
              ) : (
                <>
                  <p style={{ margin: 0 }}>{done.fallback ? 'Card payments are being set up — ' : ''}Pay <strong>{formatNgn(done.total)}</strong> by bank transfer to confirm:</p>
                  <p style={{ margin: '0.75rem 0 0', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 1.7 }}>
                    Herit Clothing<br />Send proof to <strong>hello@heritclothing.com</strong> or WhatsApp, quoting <strong>{done.code}</strong>. We&apos;ll share account details on contact.
                  </p>
                </>
              )}
            </div>
            <div className="hc-flex hc-wrap" style={{ gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <Link to="/shop" className="hc-btn hc-btn--primary">Keep shopping</Link>
              <Link to="/contact" className="hc-btn hc-btn--ghost">Contact us</Link>
            </div>
          </div>
        </div></section>
      </SiteLayout>
    );
  }

  // ---- Empty bag guard ----
  if (items.length === 0) {
    return (
      <SiteLayout title="Checkout">
        <section className="hc-section hc-text-center"><div className="hc-container">
          <span className="hc-card-ico" style={{ margin: '0 auto 1rem' }}><IconifyIcon icon="solar:bag-4-bold" /></span>
          <h1 className="hc-h2">Your bag is empty</h1>
          <p className="hc-lead" style={{ margin: '1rem auto 0' }}>Add a piece before checking out.</p>
          <Link to="/shop" className="hc-btn hc-btn--primary hc-mt-4">Browse the collection</Link>
        </div></section>
      </SiteLayout>
    );
  }

  // ---- Checkout form ----
  return (
    <SiteLayout title="Checkout">
      <section className="hc-pagehead"><div className="hc-container">
        <div className="hc-crumb"><Link to="/cart">Bag</Link> / <span>Checkout</span></div>
        <h1 className="hc-h1">Checkout.</h1>
        <p>A few details and your piece is on its way.</p>
      </div></section>

      <section className="hc-section"><div className="hc-container">
        <div className="hc-grid" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '2.5rem', alignItems: 'start' }}>
          {/* form */}
          <div className="hc-flex" style={{ flexDirection: 'column', gap: '1.5rem' }}>
            <div className="hc-card" style={{ padding: '1.5rem' }}>
              <span className="hc-card-badge">Your details</span>
              <div className="hc-grid hc-grid--2" style={{ gap: '1rem', marginTop: '1rem' }}>
                <label style={lbl}>Full name<input style={field} value={form.customer} onChange={set('customer')} placeholder="Ada Okafor" /></label>
                <label style={lbl}>Phone<input style={field} value={form.phone} onChange={set('phone')} placeholder="080…" /></label>
              </div>
              <label style={{ ...lbl, display: 'block', marginTop: '1rem' }}>Email<input style={field} type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" /></label>
            </div>

            <div className="hc-card" style={{ padding: '1.5rem' }}>
              <span className="hc-card-badge">Delivery</span>
              <div className="hc-flex" style={{ flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                {DELIVERY.map((d) => (
                  <button key={d.key} onClick={() => setDelivery(d.key)} style={optStyle(delivery === d.key)}>
                    <div><div style={{ fontWeight: 600 }}>{d.label}</div><div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{d.note}</div></div>
                    <IconifyIcon icon={delivery === d.key ? 'solar:check-circle-bold' : 'solar:record-linear'} style={{ color: delivery === d.key ? 'var(--primary)' : 'var(--border)' }} />
                  </button>
                ))}
              </div>
              {delivery !== 'pickup' && (
                <div className="hc-grid hc-grid--2" style={{ gap: '1rem', marginTop: '1rem' }}>
                  <label style={{ ...lbl, gridColumn: '1 / -1' }}>Address<input style={field} value={form.ship_address} onChange={set('ship_address')} placeholder="Street, area" /></label>
                  <label style={lbl}>City / town<input style={field} value={form.city} onChange={set('city')} placeholder="Lagos" /></label>
                </div>
              )}
            </div>

            <div className="hc-card" style={{ padding: '1.5rem' }}>
              <span className="hc-card-badge">Payment</span>
              <div className="hc-flex" style={{ flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                {PAYMENT.map((p) => (
                  <button key={p.key} onClick={() => setPayment(p.key)} style={optStyle(payment === p.key)}>
                    <div className="hc-flex" style={{ alignItems: 'center', gap: '0.7rem' }}>
                      <IconifyIcon icon={p.icon} style={{ fontSize: '1.3rem', color: 'var(--primary)' }} />
                      <div><div style={{ fontWeight: 600 }}>{p.label}</div><div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{p.note}</div></div>
                    </div>
                    <IconifyIcon icon={payment === p.key ? 'solar:check-circle-bold' : 'solar:record-linear'} style={{ color: payment === p.key ? 'var(--primary)' : 'var(--border)' }} />
                  </button>
                ))}
              </div>
              <label style={{ ...lbl, display: 'block', marginTop: '1rem' }}>Order note / gift message (optional)
                <textarea style={{ ...field, minHeight: 70, resize: 'vertical' }} value={form.gift_message} onChange={set('gift_message')} placeholder="Leave at the gate · or a note for the recipient" />
              </label>
            </div>
          </div>

          {/* summary */}
          <div className="hc-card" style={{ padding: '1.5rem', position: 'sticky', top: '6rem' }}>
            <span className="hc-card-badge">Your order</span>
            <div className="hc-flex" style={{ flexDirection: 'column', gap: '0.6rem', marginTop: '1rem' }}>
              {items.map((l) => (
                <div key={l.key} className="hc-flex" style={{ justifyContent: 'space-between', fontSize: '0.9rem', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--muted-foreground)' }}>{l.qty} × {l.name} <small>({l.size})</small></span>
                  <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatNgn(l.qty * l.priceNgn)}</span>
                </div>
              ))}
            </div>
            <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '1rem 0' }} />

            {/* Promo code */}
            {!applied ? (
              <div style={{ marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input style={{ ...field, marginTop: 0, textTransform: 'uppercase' }} placeholder="Promo code" value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }} />
                  <button type="button" className="hc-btn hc-btn--ghost" onClick={applyCoupon} disabled={couponBusy || !coupon.trim()} style={{ whiteSpace: 'nowrap' }}>
                    {couponBusy ? '…' : 'Apply'}
                  </button>
                </div>
                {couponErr && <p style={{ color: 'var(--destructive, #dc2626)', fontSize: '0.8rem', margin: '0.4rem 0 0' }}>{couponErr}</p>}
              </div>
            ) : (
              <div className="hc-flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', padding: '0.5rem 0.7rem', background: 'var(--secondary)', borderRadius: 8 }}>
                <span style={{ fontSize: '0.85rem' }}><IconifyIcon icon="solar:ticket-bold" /> <strong>{applied.code}</strong> applied{applied.free_ship ? ' · free delivery' : ''}</span>
                <button type="button" onClick={removeCoupon} style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><IconifyIcon icon="solar:close-circle-bold" /></button>
              </div>
            )}

            {/* Gift card */}
            {!giftCard ? (
              <div style={{ marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input style={{ ...field, marginTop: 0, textTransform: 'uppercase' }} placeholder="Gift card code" value={gift}
                    onChange={(e) => setGift(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyGift(); } }} />
                  <button type="button" className="hc-btn hc-btn--ghost" onClick={applyGift} disabled={!gift.trim()} style={{ whiteSpace: 'nowrap' }}>Apply</button>
                </div>
                {giftErr && <p style={{ color: 'var(--destructive, #dc2626)', fontSize: '0.8rem', margin: '0.4rem 0 0' }}>{giftErr}</p>}
              </div>
            ) : (
              <div className="hc-flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', padding: '0.5rem 0.7rem', background: 'var(--secondary)', borderRadius: 8 }}>
                <span style={{ fontSize: '0.85rem' }}><IconifyIcon icon="solar:gift-bold" /> <strong>{giftCard.code}</strong> · {formatNgn(giftCard.balance)} available</span>
                <button type="button" onClick={() => { setGiftCard(null); setGift(''); }} style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><IconifyIcon icon="solar:close-circle-bold" /></button>
              </div>
            )}

            {/* Store credit */}
            {creditBalance > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} />
                <span><IconifyIcon icon="solar:wallet-money-bold" /> Use my store credit ({formatNgn(creditBalance)})</span>
              </label>
            )}

            {/* Referral — first-time buyers only; both you and your friend earn credit */}
            <div style={{ marginBottom: '0.8rem' }}>
              <input style={{ ...field, marginTop: 0, textTransform: 'uppercase' }} placeholder="Referral code (optional)" value={referral} onChange={(e) => setReferral(e.target.value)} />
              {referral.trim() && <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', margin: '0.3rem 0 0' }}>New here? You and your friend each earn store credit once this order is paid.</p>}
            </div>

            <div className="hc-flex" style={{ justifyContent: 'space-between', fontSize: '0.9rem' }}><span style={{ color: 'var(--muted-foreground)' }}>Subtotal</span><span>{formatNgn(subtotal)}</span></div>
            {discount > 0 && <div className="hc-flex" style={{ justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.4rem', color: '#16794a' }}><span>Discount ({applied.code})</span><span>−{formatNgn(discount)}</span></div>}
            <div className="hc-flex" style={{ justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.4rem' }}><span style={{ color: 'var(--muted-foreground)' }}>Delivery</span><span>{shipping === 0 ? 'Free' : formatNgn(shipping)}</span></div>
            {giftApplied > 0 && <div className="hc-flex" style={{ justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.4rem', color: '#16794a' }}><span>Gift card</span><span>−{formatNgn(giftApplied)}</span></div>}
            {creditApplied > 0 && <div className="hc-flex" style={{ justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '0.4rem', color: '#16794a' }}><span>Store credit</span><span>−{formatNgn(creditApplied)}</span></div>}
            <div className="hc-flex" style={{ justifyContent: 'space-between', marginTop: '0.8rem', fontWeight: 700, fontSize: '1.1rem' }}><span>Total</span><span style={{ color: 'var(--primary)' }}>{formatNgn(total)}</span></div>

            {error && <p style={{ color: 'var(--destructive, #dc2626)', fontSize: '0.85rem', marginTop: '1rem' }}>{error}</p>}

            <button onClick={placeOrder} disabled={busy} className="hc-btn hc-btn--primary hc-mt-3" style={{ width: '100%', justifyContent: 'center', cursor: busy ? 'wait' : 'pointer', border: 'none', opacity: busy ? 0.7 : 1 }}>
              <IconifyIcon icon={busy ? 'solar:refresh-bold' : 'solar:lock-keyhole-minimalistic-bold'} />
              {busy ? 'Placing order…' : payment === 'card' ? `Pay ${formatNgn(total)}` : `Place order · ${formatNgn(total)}`}
            </button>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--muted-foreground)', marginTop: '0.75rem', textAlign: 'center', lineHeight: 1.5 }}>
              <IconifyIcon icon="solar:shield-check-bold" /> Secure checkout · your details stay private
            </p>
          </div>
        </div>
      </div></section>
    </SiteLayout>
  );
};

const optStyle = (on) => ({
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem',
  width: '100%', textAlign: 'left', padding: '0.8rem 1rem', cursor: 'pointer',
  borderRadius: 8, background: on ? 'var(--secondary)' : 'var(--background)',
  border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
});

export default CheckoutPage;
