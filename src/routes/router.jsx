import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { appRoutes, authRoutes, publicRoutes, redirectRoutes } from '@/routes/index';
import { useAuthContext } from '@/context/useAuthContext';
import { canAccessPath, roleHome } from '@/helpers/roles';
import OfflineBanner from '@/components/OfflineBanner';
import RouteErrorBoundary from '@/components/RouteErrorBoundary';

// Layouts are lazy so each route group loads only its own CSS: public pages
// never download Bootstrap, Larkon or heritos-admin.css (Phase 4, A23).
const PublicLayout = lazy(() => import('@/layout/PublicLayout'));
const AuthLayout = lazy(() => import('@/layout/AuthLayout'));
const AdminLayout = lazy(() => import('@/layout/AdminLayout'));
const AppRouter = props => {
  const {
    isAuthenticated,
    user
  } = useAuthContext();
  const { pathname } = useLocation();
  return <><OfflineBanner /><RouteErrorBoundary key={pathname}><Suspense fallback={null}><Routes>
      {(publicRoutes || []).map((route, idx) => <Route key={idx + route.name} path={route.path} element={<PublicLayout {...props}>{route.element}</PublicLayout>} />)}

      {(authRoutes || []).map((route, idx) => <Route key={idx + route.name} path={route.path} element={<AuthLayout {...props}>{route.element}</AuthLayout>} />)}

      {(redirectRoutes || []).map((route) => <Route key={route.name} path={route.path} element={route.element} />)}

      {(appRoutes || []).map((route, idx) => {
      let element;
      if (!isAuthenticated) {
        element = <Navigate to={{
          pathname: '/auth/sign-in',
          search: 'redirectTo=' + encodeURIComponent(window.location.pathname + window.location.search)
        }} />;
      } else if (!canAccessPath(user?.role, route.path)) {
        // Authenticated but this role can't use this section — send them home.
        element = <Navigate to={roleHome(user?.role)} replace />;
      } else {
        element = <AdminLayout {...props}>{route.element}</AdminLayout>;
      }
      return <Route key={idx + route.name} path={route.path} element={element} />;
    })}
    </Routes></Suspense></RouteErrorBoundary></>;
};
export default AppRouter;