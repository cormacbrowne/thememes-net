import './utils/installStorageGuard.js'
import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.jsx'
import RootErrorBoundary from './components/RootErrorBoundary.jsx'
import { initAnalytics } from './lib/analytics'
import { trackReturnVisitOnce } from './utils/analytics.js'

// Task 33.5, 33.11 & 33.15: moderator queue, legal pages, and daily caption Hall of Fame lazy-loaded.
// eslint-disable-next-line react-refresh/only-export-components
const ModerationPage = lazy(() => import('./components/ModerationPage.jsx'))
// eslint-disable-next-line react-refresh/only-export-components
const PulseReportPage = lazy(() => import('./components/PulseReportPage.jsx'))
// eslint-disable-next-line react-refresh/only-export-components
const AdminBattlesPage = lazy(() => import('./components/AdminBattlesPage.jsx'))
// eslint-disable-next-line react-refresh/only-export-components
const AdminHousePage = lazy(() => import('./components/AdminHousePage.jsx'))
// eslint-disable-next-line react-refresh/only-export-components
const AdminSocialKitPage = lazy(() => import('./components/AdminSocialKitPage.jsx'))
// eslint-disable-next-line react-refresh/only-export-components
const LegalInfoPage = lazy(() => import('./components/LegalInfoPage.jsx'))
// eslint-disable-next-line react-refresh/only-export-components
const HallOfFamePage = lazy(() => import('./components/HallOfFamePage.jsx'))
// eslint-disable-next-line react-refresh/only-export-components
const YearInMemesPage = lazy(() => import('./components/YearInMemesPage.jsx'))
const UiKitPage = import.meta.env.DEV ? lazy(() => import('./components/UiKitPage.jsx')) : null
const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'
// Owner-friendly aliases: /admin, /administrator, /moderator, /moderation, /administrator/moderator …
const isModerationRoute =
  /^\/(?:admin(?:istrator)?(?:\/(?:moderation|moderator|mod|queue))?|moderat(?:ion|or))\/?$/i.test(pathname)
const isPulseRoute = /^\/admin\/pulse\/?$/i.test(pathname)
const isBattleAdminRoute = /^\/admin\/battles\/?$/i.test(pathname)
const isSocialAdminRoute = /^\/admin\/social\/?$/i.test(pathname)
const isHouseAdminRoute = /^\/admin\/house\/?$/i.test(pathname)
const isLegalRoute = /^\/(?:rules|terms|privacy|takedown|contact)\/?$/i.test(pathname)
const isHallOfFameRoute = /^\/hall-of-fame\/?$/i.test(pathname)
const isYearInMemesRoute = /^\/year-in-memes\/?$/i.test(pathname)
const isUiKitRoute = Boolean(import.meta.env.DEV && UiKitPage && /^\/__ui\/?$/i.test(pathname))

// Plan 1.3: the home page's static HTML portal is already lit when React takes over, so the
// React sign must not replay its power-on flicker.
if (typeof window !== 'undefined') {
  window.__TM_STATIC_PORTAL_SHOWN = Boolean(document.querySelector('[data-tm-static-portal]'))
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
    {isUiKitRoute ? (
      <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#07060f' }} />}>
        <UiKitPage />
      </Suspense>
    ) : isModerationRoute ? (
      <Suspense fallback={<div style={{ minHeight: '100dvh', background: 'var(--tm-night-0)' }} />}>
        <ModerationPage />
      </Suspense>
    ) : isBattleAdminRoute ? (
      <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#07060f' }} />}>
        <AdminBattlesPage />
      </Suspense>
    ) : isHouseAdminRoute ? (
      <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#07060f' }} />}>
        <AdminHousePage />
      </Suspense>
    ) : isSocialAdminRoute ? (
      <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#07060f' }} />}>
        <AdminSocialKitPage />
      </Suspense>
    ) : isPulseRoute ? (
      <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#07060f' }} />}>
        <PulseReportPage />
      </Suspense>
    ) : isLegalRoute ? (
      <Suspense fallback={<div style={{ minHeight: '100dvh', background: 'var(--tm-night-0)' }} />}>
        <LegalInfoPage pathname={pathname} />
      </Suspense>
    ) : isHallOfFameRoute ? (
      <Suspense fallback={<div style={{ minHeight: '100dvh', background: 'var(--tm-night-0)' }} />}>
        <HallOfFamePage />
      </Suspense>
    ) : isYearInMemesRoute ? (
      <Suspense fallback={<div style={{ minHeight: '100dvh', background: 'var(--tm-night-0)' }} />}>
        <YearInMemesPage />
      </Suspense>
    ) : (
      <App />
    )}
    </RootErrorBoundary>
    {/* Vercel Web Analytics (page views, incl. SPA route changes) + Speed Insights. Production
        builds only: there they load same-origin from /_vercel/*, so the CSP needs no extra host.
        In dev they would load debug scripts from va.vercel-scripts.com instead. */}
    {import.meta.env.PROD && <Analytics />}
    {import.meta.env.PROD && <SpeedInsights sampleRate={0.5} />}
  </StrictMode>,
)

// Plan 1.4: analytics start after the first screen is up (never on the critical path).
if (typeof window !== 'undefined') {
  const startAnalytics = () => {
    initAnalytics()
    trackReturnVisitOnce()
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(startAnalytics, { timeout: 4000 })
  else window.setTimeout(startAnalytics, 2000)
}
