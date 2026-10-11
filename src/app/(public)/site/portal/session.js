import heritApi from '@/helpers/heritApi';

// Customer portal session helpers. The token itself lives in sessionStorage
// (heritApi.client); this only carries a one-off notice to the access screen.
const NOTICE = 'herit_portal_notice';

export const EXPIRED = 'Your sign-in has ended. Enter your reference again and we will send you a new code.';

export const endSession = (notice) => {
  heritApi.client.clearToken();
  try { if (notice) sessionStorage.setItem(NOTICE, notice); } catch { /* ignore */ }
};

export const takeNotice = () => {
  try { const n = sessionStorage.getItem(NOTICE); sessionStorage.removeItem(NOTICE); return n || ''; } catch { return ''; }
};

export const signedIn = () => !!heritApi.client.token();
