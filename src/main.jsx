import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'

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
const isModerationRoute = /^\/admin\/moderation\/?$/i.test(pathname)
const isPulseRoute = /^\/admin\/pulse\/?$/i.test(pathname)
const isLegalRoute = /^\/(?:rules|terms|privacy|takedown|contact)\/?$/i.test(pathname)
const isHallOfFameRoute = /^\/hall-of-fame\/?$/i.test(pathname)
const isUiKitRoute = Boolean(import.meta.env.DEV && UiKitPage && /^\/__ui\/?$/i.test(pathname))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isUiKitRoute ? (
      <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#07060f' }} />}>
        <UiKitPage />
      </Suspense>
    ) : isModerationRoute ? (
      <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#070810' }} />}>
        <ModerationPage />
      </Suspense>
    ) : isPulseRoute ? (
      <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#07060f' }} />}>
        <PulseReportPage />
      </Suspense>
    ) : isLegalRoute ? (
      <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#070810' }} />}>
        <LegalInfoPage pathname={pathname} />
      </Suspense>
    ) : isHallOfFameRoute ? (
      <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#070810' }} />}>
        <HallOfFamePage />
      </Suspense>
    ) : (
      <App />
    )}
    <Analytics />
  </StrictMode>,
)
