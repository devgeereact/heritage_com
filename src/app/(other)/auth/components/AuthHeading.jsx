const AuthHeading = ({ kicker, title, sub }) => (
  <div className="mb-4">
    {kicker && (
      <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--herit-ink-muted)', marginBottom: '0.4rem' }}>
        {kicker}
      </div>
    )}
    <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 600, fontSize: 'clamp(1.7rem, 2.6vw, 2.1rem)', letterSpacing: '-0.02em', lineHeight: 1.1, position: 'relative', display: 'inline-block', paddingBottom: '0.25rem' }}>
      {title}
      <span aria-hidden="true" style={{ position: 'absolute', left: 0, bottom: '-0.25rem', width: '2rem', height: '2px', background: 'var(--herit-accent)', borderRadius: '2px' }} />
    </h1>
    {sub && <p className="text-muted mt-3 mb-0" style={{ maxWidth: '28rem' }}>{sub}</p>}
  </div>
);

export default AuthHeading;
