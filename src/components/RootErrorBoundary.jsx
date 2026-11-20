import React from 'react';
import { trackClientError } from '../utils/analytics';

/**
 * Last line of defence around the whole site. Without it, any render crash unmounts React and
 * leaves only the page background: the "black screen" with nothing to go on. This shows what
 * broke, reports it to Pulse (client_error, where=root), and offers a reload.
 */
export default class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[RootErrorBoundary]', error, info?.componentStack);
    }
    const where = String(info?.componentStack || '')
      .split('\n')
      .map((l) => l.trim())
      .find(Boolean);
    trackClientError('root', `${error?.message || error}${where ? ` @ ${where}` : ''}`);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const message = String(error?.message || error || 'Unknown error').slice(0, 300);
    const btn = {
      minHeight: '44px',
      padding: '10px 18px',
      borderRadius: '12px',
      border: '1.5px solid #19f0ff',
      background: 'rgba(25, 240, 255, 0.16)',
      color: '#fff',
      fontWeight: 800,
      font: 'inherit',
      cursor: 'pointer'
    };
    return (
      <div
        role="alert"
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px 16px',
          background: '#07060f',
          color: '#e9e6ff',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: 440 }}>
          <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>📺⚡</div>
          <h1 style={{ fontSize: '1.15rem', margin: '0 0 8px', color: '#19f0ff' }}>Something broke loading the site</h1>
          <p style={{ margin: '0 0 14px', color: '#cbd5e1', lineHeight: 1.5 }}>
            Reloading usually fixes it. If it keeps happening, send a screenshot of this box.
          </p>
          <code
            data-testid="root-error-message"
            style={{
              display: 'block',
              margin: '0 0 16px',
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              color: '#ff8fb8',
              fontSize: '0.8rem',
              wordBreak: 'break-word',
              textAlign: 'left'
            }}
          >
            {message}
          </code>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" style={btn} onClick={() => window.location.reload()}>
              🔄 Reload
            </button>
            <button
              type="button"
              style={{ ...btn, borderColor: '#ff2e88', background: 'rgba(255, 46, 136, 0.16)' }}
              onClick={() => window.location.assign('/')}
            >
              🏠 Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
