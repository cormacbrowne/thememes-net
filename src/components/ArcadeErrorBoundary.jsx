import React from 'react';
import { isChunkLoadError } from '../utils/lazyWithRetry';

export default class ArcadeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '', retryNonce: 0 };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected arcade cabinet display glitch.'
    };
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[ArcadeErrorBoundary]', error, info);
    }
  }

  handleRetry = () => {
    if (typeof window !== 'undefined' && isChunkLoadError({ message: this.state.errorMessage })) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('_cb', String(Date.now()));
        window.location.replace(url.toString());
        return;
      } catch {
        window.location.reload();
        return;
      }
    }
    this.setState((prev) => ({
      hasError: false,
      errorMessage: '',
      retryNonce: prev.retryNonce + 1
    }));
  };

  render() {
    if (!this.state.hasError) {
      return <React.Fragment key={this.state.retryNonce}>{this.props.children}</React.Fragment>;
    }

    const { onReturnHome, title = 'ARCADE SIGNAL INTERRUPTED' } = this.props;
    return (
      <div
        role="alert"
        style={{
          minHeight: '55dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          background:
            'radial-gradient(circle at 50% 25%, rgba(255, 42, 133, 0.22), rgba(7, 8, 22, 0.96) 70%)'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            borderRadius: '18px',
            border: '2px solid rgba(0, 243, 255, 0.72)',
            background: 'linear-gradient(160deg, rgba(16, 10, 36, 0.96), rgba(9, 12, 26, 0.98))',
            boxShadow: '0 0 28px rgba(255, 42, 133, 0.28), 0 0 40px rgba(0, 243, 255, 0.16)',
            padding: '22px 20px',
            textAlign: 'center',
            color: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          <div style={{ fontSize: '2.1rem', marginBottom: '8px' }}>📺⚡</div>
          <h2
            style={{
              margin: '0 0 8px',
              fontSize: '1.05rem',
              letterSpacing: '0.08em',
              color: '#00f3ff',
              textTransform: 'uppercase',
              textShadow: '0 0 10px rgba(0, 243, 255, 0.65)'
            }}
          >
            {title}
          </h2>
          <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.45 }}>
            {this.state.errorMessage}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={this.handleRetry}
              style={{
                minHeight: '44px',
                padding: '10px 18px',
                borderRadius: '12px',
                border: '1.5px solid #00f3ff',
                background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.26), rgba(168, 85, 247, 0.3))',
                color: '#ffffff',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              🔄 Reboot Cabinet
            </button>
            {typeof onReturnHome === 'function' && (
              <button
                type="button"
                onClick={() => {
                  this.handleRetry();
                  onReturnHome();
                }}
                style={{
                  minHeight: '44px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1.5px solid #ff2a85',
                  background: 'linear-gradient(135deg, rgba(255, 42, 133, 0.3), rgba(88, 28, 135, 0.35))',
                  color: '#ffffff',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                🕹️ Back to Lobby
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
