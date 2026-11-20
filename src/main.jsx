import './utils/installStorageGuard.js'
import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'
import RootErrorBoundary from './components/RootErrorBoundary.jsx'

// Task 33.5, 33.11 & 33.15: moderator queue, legal pages, and daily caption Hall of Fame lazy-loaded.
// eslint-disable-next-line react-refresh/only-export-components
const ModerationPage = lazy(() => import('./components/ModerationPage.jsx'))
// eslint-disable-next-line react-refresh/only-export-components
const PulseReportPage = lazy(() => import('./components/PulseReportPage.jsx'))
// eslint-disable-next-line react-refresh/only-export-components
const LegalInfoPage = lazy(() => import('./components/LegalInfoPage.jsx'))
// eslint-disable-next-line react-refresh/only-export-components
const HallOfFamePage = lazy(() => import('./components/HallOfFamePage.jsx'))
const UiKitPage = import.meta.env.DEV ? lazy(() => import('./components/UiKitPage.jsx')) : null
const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'
// Owner-friendly aliases: /admin, /administrator, /moderator, /moderation, /administrator/moderator …
const isModerationRoute =
  /^\/(?:admin(?:istrator)?(?:\/(?:moderation|moderator|mod|queue))?|moderat(?:ion|or))\/?$/i.test(pathname)
const isPulseRoute = /^\/admin\/pulse\/?$/i.test(pathname)
const isLegalRoute = /^\/(?:rules|terms|privacy|takedown|contact)\/?$/i.test(pathname)
const isHallOfFameRoute = /^\/hall-of-fame\/?$/i.test(pathname)
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
    ) : (
      <App />
    )}
    </RootErrorBoundary>
    <Analytics />
  </StrictMode>,
)
