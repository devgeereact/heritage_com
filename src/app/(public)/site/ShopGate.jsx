import { useAuthContext } from '@/context/useAuthContext'
import { LoadingPage, NotFoundPage } from './cmsBlocks'
import { useStoreConfig } from './storeConfig'

/**
 * The retail shop (shop, product, bag, checkout, gifting) opens only while an
 * admin has switched it on in Store & Channels. Signed-in staff can still
 * preview it. Otherwise these URLs show the noindex not-found page, so a
 * deferred feature is off rather than only hidden (launch gate, qa/LAUNCH-CHECKLIST.md).
 * store.php refuses retail writes on the server while the shop is off.
 */
const ShopGate = ({ children }) => {
  const cfg = useStoreConfig()
  const { isAuthenticated } = useAuthContext()
  if (isAuthenticated) return children
  if (cfg === null) return <LoadingPage title="Shop" />
  if (cfg.shop_enabled !== true) return <NotFoundPage title="Page not found" />
  return children
}

export default ShopGate
