import IconifyIcon from '@/components/wrappers/IconifyIcon';

const fabricPanel = {
  backgroundColor: '#1B1742',
  backgroundImage: [
    'radial-gradient(circle at 50% 50%, rgba(250,199,117,0.85) 3%, transparent 4%)',
    'radial-gradient(circle at 50% 50%, transparent 11%, rgba(250,199,117,0.55) 12%, rgba(250,199,117,0.55) 16%, transparent 17%)',
    'radial-gradient(circle at 50% 50%, transparent 21%, rgba(241,239,232,0.55) 22%, rgba(241,239,232,0.55) 25%, transparent 26%)',
    'radial-gradient(circle at 0% 0%, transparent 21%, rgba(250,199,117,0.5) 22%, transparent 26%)',
    'radial-gradient(circle at 100% 100%, transparent 21%, rgba(250,199,117,0.5) 22%, transparent 26%)',
  ].join(','),
  backgroundSize: '64px 64px',
};

const meta = { fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.72rem', letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.85 };

const BrandSidePanel = ({
  heading = 'Wear your heritage.',
  body = 'One place to run the brand — tailoring, catalogue, orders, stock, customers, finance and more. Made in Ajuwon Market, for the world.',
}) => (
  <div className="d-flex flex-column h-100 justify-content-between p-5"
       style={{ ...fabricPanel, color: '#fff', position: 'relative' }}>
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(150deg, rgba(28,25,23,0.55), rgba(28,25,23,0.88))' }} />
    <div style={{ position: 'relative' }}>
      <div style={meta}>Herit Clothing · Est. Lagos</div>
    </div>
    <div style={{ position: 'relative' }}>
      <div style={{ width: '2.25rem', height: '3px', background: '#FAC775', borderRadius: '2px', marginBottom: '1.25rem' }} aria-hidden="true" />
      <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontStyle: 'italic', fontSize: '2.4rem', lineHeight: 1.15, color: '#fff', margin: 0 }}>
        {heading}
      </h1>
      <p style={{ marginTop: '1rem', maxWidth: '24rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>
        {body}
      </p>
    </div>
    <div style={{ position: 'relative', ...meta, letterSpacing: '0.14em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <IconifyIcon icon="solar:map-point-bold" /> Lagos, Nigeria
    </div>
  </div>
);

export default BrandSidePanel;
