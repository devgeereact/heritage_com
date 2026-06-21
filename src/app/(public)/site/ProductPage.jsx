import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import SiteLayout from './SiteLayout';
import { useCatalogue, formatNgn } from './products';
import { useCart } from './cart';
import heritApi from '@/helpers/heritApi';
import ProductReviews from './ProductReviews';

const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

const NotFoundPiece = () => (
  <SiteLayout title="Piece not found">
    <section className="hc-section hc-text-center">
      <div className="hc-container">
        <div className="hc-kicker hc-text-center" style={{ justifyContent: 'center' }}>404</div>
        <h1 className="hc-h2 hc-mt-2">This thread leads nowhere.</h1>
        <p className="hc-lead" style={{ margin: '1rem auto 0' }}>Let&apos;s get you back to the collection.</p>
        <Link to="/shop" className="hc-btn hc-btn--primary hc-mt-4">Back to the shop</Link>
      </div>
    </section>
  </SiteLayout>
);

const ProductPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const { products, getProduct, ready } = useCatalogue();
  const product = getProduct(slug);
  const [size, setSize] = useState('M');
  const [storyOpen, setStoryOpen] = useState(true);
  const [added, setAdded] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notify, setNotify] = useState({ name: '', phone: '' });
  const [notifyDone, setNotifyDone] = useState(false);
  const [saved, setSaved] = useState(false);

  // Reflect whether this piece is already wishlisted (signed-in customers only).
  useEffect(() => {
    if (!heritApi.portal.token() || !slug) return;
    let live = true;
    heritApi.portal.wishlist().then((w) => { if (live) setSaved((w || []).some((x) => x.product_slug === slug)); }).catch(() => {});
    return () => { live = false; };
  }, [slug]);

  if (!product) {
    // Still loading the live catalogue? wait before deciding it's a 404.
    if (!ready) return <SiteLayout title="Loading…"><section className="hc-section hc-text-center"><div className="hc-container">Loading…</div></section></SiteLayout>;
    return <NotFoundPiece />;
  }

  const chosenSize = product.type === 'Accessories' ? 'One size' : size;
  const addToCart = () => {
    add({ slug: product.slug, name: product.name, fabric: product.fabric, size: chosenSize, priceNgn: product.priceNgn, tile: product.tile });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };
  const buyNow = () => { addToCart(); navigate('/cart'); };
  const toggleSave = async () => {
    if (!heritApi.portal.token()) { navigate('/account'); return; }
    try { const r = await heritApi.portal.wishlistToggle(product.slug, product.name); setSaved(r.saved); } catch { /* ignore */ }
  };
  const joinWaitlist = async () => {
    if (!notify.phone.trim()) return;
    try {
      await heritApi.store.waitlistJoin({
        product: product.name, slug: product.slug, size: chosenSize,
        name: notify.name, phone: notify.phone,
      });
      setNotifyDone(true);
    } catch { setNotifyDone(true); /* fail soft — don't block the customer */ }
  };

  const related = products.filter((p) => p.slug !== product.slug).slice(0, 4);

  return (
    <SiteLayout title={`${product.name} — ${product.fabric}`}>
      <div className="hc-marquee">
        <span>★ Free Lagos delivery over ₦25,000</span>
        <span>★ Ships worldwide, tracked</span>
        <span>★ 14-day returns</span>
      </div>

      <section className="hc-section">
        <div className="hc-container">
          <div className="hc-crumb hc-mt-1" style={{ marginBottom: '1.5rem' }}>
            <Link to="/">Home</Link> / <Link to="/shop">Shop</Link> / <span style={{ color: 'var(--primary)' }}>{product.name}</span>
          </div>

          <div className="hc-grid hc-grid--2" style={{ gap: '3rem', alignItems: 'start' }}>
            {/* media */}
            <div>
              <div className={`hc-tile ${product.tile}`} style={{ aspectRatio: '4 / 5' }}>
                {product.premium && <span className="hc-tile-tag">Premium</span>}
              </div>
              <div className="hc-swatch-note hc-mt-3">
                <span className={`hc-tile ${product.tile}`} aria-hidden="true" />
                <span>
                  Real <strong>{product.fabric}</strong> cloth — colour and pattern vary slightly
                  from piece to piece, because each one is cut and finished by hand.
                </span>
              </div>
            </div>

            {/* info */}
            <div>
              <div className="hc-kicker">{product.fabric}</div>
              <h1 className="hc-h2 hc-mt-2">{product.name}</h1>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1.4rem', color: 'var(--primary)', marginTop: '0.75rem' }}>
                {formatNgn(product.priceNgn)} <span style={{ color: 'var(--muted-foreground)', fontWeight: 400, fontSize: '0.95rem' }}>· approx ${product.priceUsd}</span>
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--muted-foreground)', marginTop: '0.3rem' }}>
                Free Lagos delivery over ₦25,000
              </p>

              <p className="hc-lead hc-mt-3">{product.short}</p>

              {/* size */}
              <div className="hc-mt-4">
                <div className="hc-chip-label">
                  Size {product.type === 'Accessories' && '· one size'}
                </div>
                <div className="hc-chip-group">
                  {(product.type === 'Accessories' ? ['One size'] : SIZES).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`hc-chip hc-size ${size === s || product.type === 'Accessories' ? 'is-active' : ''}`}
                    >{s}</button>
                  ))}
                </div>
              </div>

              <div className="hc-flex hc-wrap hc-mt-4" style={{ gap: '0.8rem' }}>
                <button onClick={buyNow} className="hc-btn hc-btn--primary" style={{ cursor: 'pointer', border: 'none' }}>
                  <IconifyIcon icon="solar:bag-4-bold" /> Add to bag · {formatNgn(product.priceNgn)}
                </button>
                <button onClick={addToCart} className="hc-btn hc-btn--ghost" style={{ cursor: 'pointer' }}>
                  <IconifyIcon icon={added ? 'solar:check-circle-bold' : 'solar:cart-plus-bold'} /> {added ? 'Added' : 'Keep shopping'}
                </button>
                <button onClick={toggleSave} className="hc-btn hc-btn--ghost" style={{ cursor: 'pointer' }} title="Save to wishlist">
                  <IconifyIcon icon={saved ? 'solar:heart-bold' : 'solar:heart-linear'} style={{ color: saved ? 'var(--primary)' : 'inherit' }} /> {saved ? 'Saved' : 'Save'}
                </button>
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--muted-foreground)', marginTop: '0.6rem' }}>
                Or <Link to="/contact" style={{ color: 'var(--primary)' }}>ask about this piece on WhatsApp</Link> — bespoke sizing welcome.
                {!notifyOpen && !notifyDone && <> · <button onClick={() => setNotifyOpen(true)} style={{ border: 0, background: 'none', padding: 0, color: 'var(--primary)', cursor: 'pointer', font: 'inherit' }}>Notify me on restock</button></>}
              </p>

              {notifyOpen && !notifyDone && (
                <div className="hc-flex hc-wrap" style={{ gap: '0.5rem', marginTop: '0.4rem', maxWidth: 420 }}>
                  <input placeholder="Your name" value={notify.name} onChange={(e) => setNotify((n) => ({ ...n, name: e.target.value }))}
                    style={{ flex: '1 1 140px', padding: '0.55rem 0.7rem', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--background)', color: 'var(--foreground)', font: 'inherit' }} />
                  <input placeholder="Phone / WhatsApp" value={notify.phone} onChange={(e) => setNotify((n) => ({ ...n, phone: e.target.value }))}
                    style={{ flex: '1 1 140px', padding: '0.55rem 0.7rem', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--background)', color: 'var(--foreground)', font: 'inherit' }} />
                  <button onClick={joinWaitlist} className="hc-btn hc-btn--primary" style={{ cursor: 'pointer', border: 'none' }} disabled={!notify.phone.trim()}>Notify me</button>
                </div>
              )}
              {notifyDone && (
                <p style={{ fontSize: '0.8rem', color: '#16794a', marginTop: '0.4rem' }}>
                  <IconifyIcon icon="solar:check-circle-bold" /> You&apos;re on the list — we&apos;ll message you when it&apos;s back.
                </p>
              )}

              {/* reassurance */}
              <ul className="hc-check hc-mt-4">
                <li><IconifyIcon icon="solar:check-circle-bold" /> Made in Lagos</li>
                <li><IconifyIcon icon="solar:check-circle-bold" /> Ships worldwide, tracked</li>
                <li><IconifyIcon icon="solar:check-circle-bold" /> 14-day returns on unworn items</li>
              </ul>

              {/* the story — expandable */}
              <div className="hc-quote hc-mt-4" style={{ padding: '1.5rem' }}>
                <button
                  onClick={() => setStoryOpen((v) => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'space-between', padding: 0 }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--primary)' }}>The story of this cloth</span>
                  <IconifyIcon icon={storyOpen ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} style={{ color: 'var(--primary)' }} />
                </button>
                {storyOpen && <p style={{ fontSize: '1rem', fontWeight: 400, lineHeight: 1.65, marginTop: '1rem', color: 'var(--muted-foreground)' }}>{product.story}</p>}
              </div>
            </div>
          </div>

          {/* details / fit / care */}
          <div className="hc-grid hc-grid--3 hc-mt-4" style={{ marginTop: '3rem' }}>
            <div className="hc-card">
              <span className="hc-card-badge">Details &amp; fit</span>
              <ul className="hc-check" style={{ marginTop: '0.75rem' }}>
                <li><IconifyIcon icon="solar:tag-bold" /> Fabric: {product.material}</li>
                <li><IconifyIcon icon="solar:ruler-bold" /> Fit: {product.fit}</li>
                <li><IconifyIcon icon="solar:user-bold" /> {product.model}</li>
              </ul>
            </div>
            <div className="hc-card">
              <span className="hc-card-badge">Care</span>
              <p className="hc-card-desc" style={{ marginTop: '0.75rem' }}>
                Hand-wash cold or gentle machine cycle, inside out. Dry in shade to keep the colours
                rich. Warm iron on reverse.
              </p>
            </div>
            <div className="hc-card hc-card--feature">
              <span className="hc-card-badge">Gifting</span>
              <p className="hc-card-desc" style={{ marginTop: '0.75rem' }}>
                Every piece comes with the story of its fabric. Add a handwritten note and branded
                wrap at checkout.
              </p>
              <Link to="/gifting" className="hc-card-link">Gift this piece <IconifyIcon icon="solar:arrow-right-linear" /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* reviews */}
      <section className="hc-section" style={{ paddingTop: 0 }}>
        <div className="hc-container" style={{ maxWidth: 820 }}>
          <ProductReviews slug={product.slug} productName={product.name} />
        </div>
      </section>

      {/* related */}
      <section className="hc-section hc-section--paper">
        <div className="hc-container">
          <div className="hc-head">
            <div className="hc-kicker">More to wear</div>
            <h2 className="hc-h2">From the same collection.</h2>
          </div>
          <div className="hc-grid hc-grid--4">
            {related.map((p) => (
              <Link to={`/shop/${p.slug}`} key={p.slug} className="hc-product">
                <div className={`hc-tile ${p.tile} hc-product-media`}>
                  {p.premium && <span className="hc-tile-tag">Premium</span>}
                </div>
                <div className="hc-product-body">
                  <span className="hc-product-fab">{p.fabric}</span>
                  <span className="hc-product-name">{p.name}</span>
                  <span className="hc-product-price">{formatNgn(p.priceNgn)} <small>· ${p.priceUsd}</small></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};

export default ProductPage;
