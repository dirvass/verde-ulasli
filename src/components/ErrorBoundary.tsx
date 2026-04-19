import React from "react";

type Props = { children: React.ReactNode };
type State = { err: Error | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    // Surface to analytics/error reporting when available — never throw from here.
    if (typeof window !== "undefined") {
      const w = window as unknown as { posthog?: { captureException?: (e: Error, ctx?: unknown) => void } };
      try { w.posthog?.captureException?.(err, { componentStack: info.componentStack }); } catch { /* swallow */ }
    }
  }

  reset = () => this.setState({ err: null });

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div role="alert" style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "48px 24px",
        background: "#0E1A16",
        color: "#EBE8E1",
        fontFamily: "'Playfair Display', Georgia, serif",
        textAlign: "center",
      }}>
        <div style={{ letterSpacing: "6px", color: "#C3A564", fontSize: "12px", fontWeight: 600, marginBottom: 18 }}>
          VERDE · ULAŞLI
        </div>
        <h1 style={{ fontSize: "32px", fontWeight: 400, marginBottom: 10 }}>Something went wrong.</h1>
        <p style={{ fontFamily: "Inter, sans-serif", color: "rgba(235,232,225,0.7)", fontSize: "14px", maxWidth: 480, marginBottom: 22 }}>
          The page could not render. We have been notified. You can try again, or return to the homepage.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={this.reset}
            style={{
              padding: "10px 20px",
              border: "1px solid #C3A564",
              background: "transparent",
              color: "#C3A564",
              fontFamily: "Inter, sans-serif",
              letterSpacing: "2px",
              textTransform: "uppercase",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >Try again</button>
          <a
            href="/"
            style={{
              padding: "10px 20px",
              background: "#C3A564",
              color: "#0E1A16",
              fontFamily: "Inter, sans-serif",
              letterSpacing: "2px",
              textTransform: "uppercase",
              fontSize: "11px",
              textDecoration: "none",
            }}
          >Home</a>
        </div>
      </div>
    );
  }
}
