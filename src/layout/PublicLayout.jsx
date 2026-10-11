import { Suspense, useLayoutEffect } from 'react';
import { useLayoutContext } from '@/context/useLayoutContext';
import '@/assets/tokens/tokens.scss';

/**
 * Public website shell. Loads only the token layer here (each page brings
 * site.css and the UI kit through SiteLayout); the admin CSS (Bootstrap,
 * Larkon, heritos-admin.css) never loads on public routes.
 *
 * The public site is always light: while a public route is open the page
 * carries data-hc-public and data-bs-theme="light", and the admin theme is
 * restored on the way out (LayoutProvider respects data-hc-public).
 */
const PublicLayout = ({ children }) => {
  const { themeMode } = useLayoutContext();

  useLayoutEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-hc-public', '');
    html.setAttribute('data-bs-theme', 'light');
    document.querySelector('#splash-screen')?.classList.add('remove');
    return () => {
      html.removeAttribute('data-hc-public');
      html.setAttribute('data-bs-theme', themeMode || 'light');
    };
  }, [themeMode]);

  return <Suspense fallback={<div className="hc hc-page" aria-busy="true" />}>{children}</Suspense>;
};

export default PublicLayout;
