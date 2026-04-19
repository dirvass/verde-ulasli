import React from "react";

type Props = { children: React.ReactNode };
type State = { err: Error | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    if (typeof window !== "undefined") {
      const w = window as unknown as { posthog?: { captureException?: (e: Error, ctx?: unknown) => void } };
      try { w.posthog?.captureException?.(err, { componentStack: info.componentStack }); } catch { /* swallow */ }
    }
  }

  reset = () => this.setState({ err: null });

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="err-screen" role="alert">
        <div className="err-screen__brand">VERDE · ULAŞLI</div>
        <h1 className="err-screen__title">Something went wrong.</h1>
        <p className="err-screen__body">
          The page could not render. We have been notified. You can try again, or return to the homepage.
        </p>
        <div className="err-screen__actions">
          <button type="button" className="err-screen__btn err-screen__btn--ghost" onClick={this.reset}>
            Try again
          </button>
          <a className="err-screen__btn err-screen__btn--primary" href="/">Home</a>
        </div>
      </div>
    );
  }
}
