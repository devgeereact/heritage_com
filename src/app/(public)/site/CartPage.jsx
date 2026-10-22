import { Link } from 'react-router-dom';
import IconifyIcon from './ui/Icon';
import SiteLayout from './SiteLayout';
import { formatNgn } from './products';
import { useCart } from './cart';

const CartPage = () => {
  const { items, subtotal, setQty, remove } = useCart();

  return (
    <SiteLayout title="Your bag" noindex>
      <section className="hc-pagehead">
        <div className="hc-container">
          <div className="hc-crumb"><Link to="/shop">Shop</Link> / <span>Your bag</span></div>
          <h1 className="hc-h1">Your bag.</h1>
          <p>{items.length === 0 ? 'Nothing here yet.' : `${items.length} ${items.length === 1 ? 'piece' : 'pieces'} ready when you are.`}</p>
        </div>
      </section>

      <section className="hc-section">
        <div className="hc-container">
          {items.length === 0 ? (
            <div className="hc-card hc-text-center" style={{ padding: '4rem 2rem', maxWidth: '34rem', margin: '0 auto' }}>
              <span className="hc-card-ico" style={{ margin: '0 auto 1rem' }}><IconifyIcon icon="solar:bag-4-bold" /></span>
              <h3>Your bag is empty</h3>
              <p className="hc-card-desc" style={{ margin: '0.5rem auto 0', maxWidth: '24rem' }}>
                Find a piece that carries your heritage — each one made to last and worn with pride.
              </p>
              <Link to="/shop" className="hc-btn hc-btn--primary hc-mt-4">Browse the collection</Link>
            </div>
          ) : (
            <div className="hc-grid" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '2.5rem', alignItems: 'start' }}>
              {/* lines */}
              <div className="hc-flex" style={{ flexDirection: 'column', gap: '1rem' }}>
                {items.map((l) => (
                  <div key={l.key} className="hc-card hc-flex" style={{ gap: '1rem', alignItems: 'center', padding: '1rem' }}>
                    <div className={`hc-tile ${l.tile}`} style={{ width: 84, height: 100, flexShrink: 0, borderRadius: 8 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="hc-product-fab">{l.fabric}</div>
                      <div className="hc-product-name" style={{ marginTop: 2 }}>{l.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--muted-foreground)', marginTop: 2 }}>Size {l.size}</div>
                      <button onClick={() => remove(l.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', fontSize: '0.78rem', padding: '0.3rem 0 0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <IconifyIcon icon="solar:trash-bin-trash-linear" /> Remove
                      </button>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="hc-flex" style={{ alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Decrease" style={qtyBtn}>−</button>
                        <span style={{ minWidth: '1.5rem', textAlign: 'center', fontWeight: 600 }}>{l.qty}</span>
                        <button onClick={() => setQty(l.key, l.qty + 1)} aria-label="Increase" style={qtyBtn}>+</button>
                      </div>
                      <div className="hc-product-price" style={{ marginTop: '0.5rem' }}>{formatNgn(l.qty * l.priceNgn)}</div>
                    </div>
                  </div>
                ))}
                <Link to="/shop" className="hc-card-link" style={{ marginTop: '0.5rem' }}>
                  <IconifyIcon icon="solar:arrow-left-linear" /> Keep shopping
                </Link>
              </div>

              {/* summary */}
              <div className="hc-card hc-card--stitch" style={{ padding: '1.5rem', position: 'sticky', top: '6rem' }}>
                <span className="hc-card-badge">Order summary</span>
                <div className="hc-flex" style={{ justifyContent: 'space-between', marginTop: '1.25rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--muted-foreground)' }}>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>{formatNgn(subtotal)}</span>
                </div>
                <div className="hc-flex" style={{ justifyContent: 'space-between', marginTop: '0.6rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--muted-foreground)' }}>Delivery</span>
                  <span style={{ color: 'var(--muted-foreground)' }}>Calculated at checkout</span>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '0.75rem', lineHeight: 1.5 }}>
                  Delivery and payment options are confirmed at checkout.
                </p>
                <Link to="/checkout" className="hc-btn hc-btn--primary hc-mt-3" style={{ width: '100%', justifyContent: 'center' }}>
                  <IconifyIcon icon="solar:lock-keyhole-minimalistic-bold" /> Checkout
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
};

const qtyBtn = {
  width: 28, height: 28, borderRadius: 6, border: '1.5px solid var(--border)',
  background: 'var(--background)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

export default CartPage;
