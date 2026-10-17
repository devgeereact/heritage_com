import { Component } from 'react';

// Last-resort screen for any render error, including a page chunk that no longer
// exists after a deploy. Plain markup and inline styles, because the failing
// route may be the one that loads the stylesheets. System colours stand in when
// the token layer is not loaded. No error detail is shown.
const isChunkError = (error) => /Loading chunk|dynamically imported module|Importing a module script failed/i.test(String(error?.message || error));

const wrap = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px',
  background: 'var(--hc-surface, Canvas)',
  color: 'var(--hc-text, CanvasText)',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
};
const btn = {
  minHeight: 44,
  padding: '10px 20px',
  border: '1px solid currentColor',
  borderRadius: 4,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center'
};

export default class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    // A stale chunk after a deploy: reload once to pick up the new build.
    if (isChunkError(error)) {
      try {
        if (!sessionStorage.getItem('herit_chunk_reload')) {
          sessionStorage.setItem('herit_chunk_reload', '1');
          window.location.reload();
        }
      } catch {
        /* storage blocked: the screen below still offers a reload */
      }
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main style={wrap}>
        <div style={{ maxWidth: 480 }} role="alert">
          <h1 style={{ fontSize: 28, lineHeight: 1.2, margin: '0 0 12px' }}>Something went wrong</h1>
          <p style={{ margin: '0 0 20px', lineHeight: 1.5 }}>
            This page could not open. Reload to try again. If it keeps happening, go to the home page.
          </p>
          <p style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: 0 }}>
            <button type="button" style={btn} onClick={() => window.location.reload()}>
              Reload
            </button>
            <a href="/" style={btn}>
              Home page
            </a>
          </p>
        </div>
      </main>
    );
  }
}
