import FallbackLoading from '@/components/FallbackLoading';
import LogoBox from '@/components/LogoBox';
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient';
import { getMenuItems } from '@/helpers/Manu';
import { filterMenuByRole } from '@/helpers/roles';
import { useAuthContext } from '@/context/useAuthContext';
import { Suspense } from 'react';
import AppMenu from './components/AppMenu';
import HoverMenuToggle from './components/HoverMenuToggle';
const VerticalNavigationBarPage = () => {
  const { user } = useAuthContext();
  const menuItems = filterMenuByRole(getMenuItems(), user?.role);
  return <div className="main-nav hc-ink">
      <LogoBox />
      <HoverMenuToggle />
      <SimplebarReactClient className="scrollbar" data-simplebar>
        <Suspense fallback={<FallbackLoading />}>
          <AppMenu menuItems={menuItems} />
        </Suspense>
      </SimplebarReactClient>
    </div>;
};
export default VerticalNavigationBarPage;