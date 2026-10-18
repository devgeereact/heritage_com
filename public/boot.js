/* HeritOS boot script, loaded before first paint from index.html. It lives in a
 * file, not inline, so the Content Security Policy can allow scripts from this
 * site only (K-23). Keep it small and free of dependencies. */
;(function () {
  // Public pages show no splash: hide it before first paint. The installable
  // app is the staff app, so only staff pages link the manifest (D-024, K-20).
  var publicPath =
    /^\/(?:$|about|services|work|how-it-works|company-orders|faqs|privacy|terms|shop|cart|checkout|gifting|contact|journal|track|account|access|book)(?:\/|$)/
  if (publicPath.test(location.pathname)) {
    document.documentElement.classList.add('hc-public-boot')
  } else {
    var manifest = document.createElement('link')
    manifest.rel = 'manifest'
    manifest.href = '/manifest.webmanifest'
    document.head.appendChild(manifest)
    document.title = 'HeritOS | Herit Clothing'
  }

  // Fade the staff splash once the app has rendered into #root. The app module
  // may already have rendered by the time this runs, so check before observing.
  function hideSplash() {
    var splash = document.getElementById('splash-screen')
    if (splash) splash.classList.add('remove')
  }
  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('root')
    if (!root) return
    if (root.childNodes.length) return hideSplash()
    var observer = new MutationObserver(function () {
      hideSplash()
      observer.disconnect()
    })
    observer.observe(root, { childList: true })
  })

  // Register the PWA service worker (production only; not on local hosts).
  if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {})
    })
  }
})()
