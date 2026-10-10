import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useLayoutContext } from '@/context/useLayoutContext';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
const LeftSideBarToggle = () => {
  const {
    menu: {
      size
    },
    changeMenu: {
      size: changeMenuSize
    },
    toggleBackdrop
  } = useLayoutContext();
  const pathname = useLocation();
  const isFirstRender = useRef(true);
  const handleMenuSize = () => {
    // On mobile the sidebar is an off-canvas overlay — just toggle it.
    if (size === 'hidden') { toggleBackdrop(); return; }
    // On desktop, collapse to the condensed rail and expand back. Covers the
    // default 'sm-hover-active' state too (previously a no-op, so the hamburger
    // did nothing from a fresh load).
    if (size === 'condensed') changeMenuSize('sm-hover-active');
    else changeMenuSize('condensed');
  };
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    } else if (size === 'hidden' && document.documentElement.classList.contains('sidebar-enable')) {
      // Close the phone sidebar after navigating, but never open it: links in
      // pages and the bottom navigation also change the route.
      toggleBackdrop();
    }
  }, [pathname]);
  return <div className="topbar-item">
      <button type="button" onClick={handleMenuSize} className="button-toggle-menu me-2">
        <IconifyIcon icon="solar:hamburger-menu-broken" className="fs-24 align-middle" />
      </button>
    </div>;
};
export default LeftSideBarToggle;