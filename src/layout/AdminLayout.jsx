import FallbackLoading from '@/components/FallbackLoading';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import Preloader from '@/components/Preloader';
import '@/components/herit/herit-daily.css';
import { lazy, Suspense } from 'react';
const VerticalNavigationBar = lazy(() => import('@/components/layout/VerticalNavigationBar/page'));
const TopNavigationBar = lazy(() => import('@/components/layout/TopNavigationBar/page'));
const AdminLayout = ({
  children
}) => {
  return <div className="wrapper">
      <Suspense fallback={<FallbackLoading />}>
        <TopNavigationBar />
      </Suspense>

      <Suspense fallback={<FallbackLoading />}>
        <VerticalNavigationBar />
      </Suspense>

      <div className="page-content">
        <div className="container-fluid">
          <Suspense fallback={<Preloader />}>{children}</Suspense>
        </div>

        <Footer />
      </div>

      <BottomNav />
    </div>;
};
export default AdminLayout;
