import FallbackLoading from '@/components/FallbackLoading'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import Preloader from '@/components/Preloader'
import OfflineBanner from '@/components/OfflineBanner'
import '@/assets/tokens/tokens.scss'
import '@/assets/scss/app.scss'
import '@/assets/scss/heritos-admin.css'
import '@/components/herit/herit-daily.css'
import { lazy, Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import heritApi from '@/helpers/heritApi'
import { recordSectionVisit } from '@/helpers/usage'
const VerticalNavigationBar = lazy(() => import('@/components/layout/VerticalNavigationBar/page'))
const TopNavigationBar = lazy(() => import('@/components/layout/TopNavigationBar/page'))

/** Staff screens are never indexed (BUILD-SPEC 4.6), even if a crawler gets past robots.txt. */
const useNoIndex = () => {
  useEffect(() => {
    let meta = document.head.querySelector('meta[name="robots"]')
    const created = !meta
    const before = meta?.getAttribute('content')
    if (created) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', 'noindex, nofollow')
    return () => {
      if (created) meta.remove()
      else if (before === null) meta.removeAttribute('content')
      else meta.setAttribute('content', before)
    }
  }, [])
}

/** Phase 7: count the section once per browser per day (no person stored; errors ignored). */
const useSectionUsage = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    recordSectionVisit(pathname, { send: heritApi.usage.hit })
  }, [pathname])
}

const AdminLayout = ({ children }) => {
  useNoIndex()
  useSectionUsage()
  return (
    <div className="wrapper">
      <Suspense fallback={<FallbackLoading />}>
        <TopNavigationBar />
      </Suspense>

      <Suspense fallback={<FallbackLoading />}>
        <VerticalNavigationBar />
      </Suspense>

      <div className="page-content">
        <div className="container-fluid">
          <OfflineBanner />
          <Suspense fallback={<Preloader />}>{children}</Suspense>
        </div>

        <Footer />
      </div>

      <BottomNav />
    </div>
  )
}
export default AdminLayout
