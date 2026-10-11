import { useEffect, useRef, useState } from 'react';
import heritApi from '@/helpers/heritApi';

/**
 * Exchange a single-use invite from Herit for a session at once and take the
 * secret out of the address bar. Returns none, working, ok or failed.
 */
export const useRedeemInvite = (invite, onDone) => {
  const ran = useRef(false);
  const [state, setState] = useState(invite ? 'working' : 'none');
  useEffect(() => {
    if (!invite || ran.current) return;
    ran.current = true;
    try { window.history.replaceState(null, '', '/account'); } catch { /* ignore */ }
    heritApi.access.redeem(invite)
      .then((r) => { heritApi.client.setToken(r.token); setState('ok'); onDone?.(true); })
      .catch(() => { setState('failed'); onDone?.(false); });
  }, [invite, onDone]);
  return state;
};
