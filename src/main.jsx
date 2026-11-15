import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'

// Task 33.5: the moderator queue is a separate, lazy-loaded page. The database (not this
// check) decides who can see anything on it.
// eslint-disable-next-line react-refresh/only-export-components
const ModerationPage = lazy(() => import('./components/ModerationPage.jsx'))
const isModerationRoute =
  typeof window !== 'undefined' && /^\/admin\/moderation\/?$/i.test(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isModerationRoute ? (
      <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#070810' }} />}>
        <ModerationPage />
      </Suspense>
    ) : (
      <App />
    )}
    <Analytics />
  </StrictMode>,
)
