import { Component } from "react";

/**
 * Top-level error boundary.  Wraps the entire router so a thrown error in
 * any page renders a fallback instead of crashing the whole app.
 *
 * Per-page boundaries can wrap sub-trees independently when fine-grained
 * recovery is needed (e.g. swap page failing shouldn't take down the
 * connected-wallet badge in the header).
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface to the JS console — production should swap this for a
    // telemetry sink (Sentry / Datadog / your own).
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    // Hard reload — the simplest reliable recovery when a render path is
    // poisoned.  Soft state reset alone often leaves the same render path
    // re-executing the same error.
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.error) {
      return (
        <div
          className="min-h-screen flex items-center justify-center bg-black text-white"
          data-testid="error-boundary-fallback"
        >
          <div className="max-w-md w-full mx-4 p-6 border border-[#FF8A00]/40 bg-black/60">
            <h2 className="text-[#FF8A00] text-lg font-bold tracking-[0.06em] uppercase mb-3">
              Something broke
            </h2>
            <p className="text-white/70 text-sm mb-4 leading-relaxed">
              The dApp hit an unexpected error and stopped rendering this
              view.  Reload to try again.  If it keeps happening, please
              report it.
            </p>
            <pre className="text-[10px] text-white/30 mb-5 overflow-auto max-h-32 whitespace-pre-wrap">
              {String(this.state.error?.message ?? this.state.error)}
            </pre>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 text-[10px] font-bold tracking-[0.08em] uppercase bg-[#FF8A00] text-black hover:opacity-80 cursor-pointer"
              data-testid="error-boundary-reload"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
