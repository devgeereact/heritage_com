import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import SiteLayout from './SiteLayout';
import { PRODUCTS, formatNgn } from './products';

const FABRICS = ['All', 'Ankara', 'Adire', 'Aso-Oke', 'Mixed'];
const TYPES = ['All', 'Shirts', 'Dresses', 'Sets', 'Accessories'];
const OCCASIONS = ['All', 'Everyday', 'Owambe', 'Gift'];

const matchFabric = (p, f) => f === 'All' || p.fabric.toLowerCase().startsWith(f.toLowerCase());

const Chips = ({ label, options, value, onChange }) => (
  <div>
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.66rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>{label}</div>
    <div className="hc-flex hc-wrap" style={{ gap: '0.4rem' }}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className="hc-nav-link"
          style={{
            border: '2px solid var(--foreground)',
            background: value === o ? 'var(--primary)' : 'transparent',
            color: value === o ? '#fff' : 'var(--foreground)',
            cursor: 'pointer',
          }}
        >{o}</button>
      ))}
    </div>
  </div>
);

const ShopPage = () => {
  const [fabric, setFabric] = useState('All');
  const [type, setType] = useState('All');
  const [occasion, setOccasion] = useState('All');

  const filtered = useMemo(
    () => PRODUCTS.filter((p) =>
      matchFabric(p, fabric) &&
      (type === 'All' || p.type === type) &&
      (occasion === 'All' || p.occasion === occasion)
    ),
    [fabric, type, occasion]
  );

  return (
    <SiteLayout title="Shop">
      <section className="hc-pagehead">
        <div className="hc-container">
          <div className="hc-crumb"><Link to="/">Home</Link> / <span>Shop</span></div>
          <h1 className="hc-h1">Heritage you can live in.</h1>
          <p>Browse contemporary pieces in Ankara, Adire and more — each one made to last and
            worn with pride. Prices in Naira; approximate USD shown for international orders.</p>
        </div>
      </section>

      {/* filters */}
      <section className="hc-section--tight" style={{ background: '#d6d6d6', borderBottom: '2px solid #1f1f1f' }}>
        <div className="hc-container">
          <div className="hc-grid hc-grid--3">
            <Chips label="Fabric" options={FABRICS} value={fabric} onChange={setFabric} />
            <Chips label="Type" options={TYPES} value={type} onChange={setType} />
            <Chips label="Occasion" options={OCCASIONS} value={occasion} onChange={setOccasion} />
          </div>
        </div>
      </section>

      {/* grid */}
      <section className="hc-section">
        <div className="hc-container">
          <div className="hc-flex" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
              {filtered.length} {filtered.length === 1 ? 'piece' : 'pieces'}
            </div>
            {(fabric !== 'All' || type !== 'All' || occasion !== 'All') && (
              <button
                className="hc-card-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => { setFabric('All'); setType('All'); setOccasion('All'); }}
              >
                Clear filters <IconifyIcon icon="solar:close-circle-linear" />
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="hc-card hc-text-center" style={{ padding: '4rem 2rem' }}>
              <span className="hc-card-ico" style={{ margin: '0 auto 1rem' }}><IconifyIcon icon="solar:hanger-2-bold" /></span>
              <h3>Nothing here yet</h3>
              <p className="hc-card-desc" style={{ maxWidth: '28rem', margin: '0.5rem auto 0' }}>
                New pieces are on the cutting table. Join the family to hear first, or clear the
                filters to see the full collection.
              </p>
              <Link to="/contact" className="hc-btn hc-btn--primary hc-mt-4">Join the family</Link>
            </div>
          ) : (
            <div className="hc-grid hc-grid--4">
              {filtered.map((p) => (
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
          )}
        </div>
      </section>

      {/* reassurance */}
      <section className="hc-section--tight hc-section--dark">
        <div className="hc-container">
          <div className="hc-grid hc-grid--3" style={{ textAlign: 'center' }}>
            {[
              { i: 'solar:map-point-bold', t: 'Made in Lagos', d: 'Cut and sewn in Ajuwon Market' },
              { i: 'solar:delivery-bold', t: 'Ships worldwide', d: 'Tracked, with branded packaging' },
              { i: 'solar:restart-bold', t: '14-day returns', d: 'Unworn items in original condition' },
            ].map((r) => (
              <div key={r.t}>
                <span className="hc-card-ico" style={{ margin: '0 auto 0.75rem' }}><IconifyIcon icon={r.i} /></span>
                <h4 style={{ color: '#fff' }}>{r.t}</h4>
                <p style={{ color: '#c4c4c4', marginTop: '0.3rem', fontSize: '0.92rem' }}>{r.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};

export default ShopPage;
