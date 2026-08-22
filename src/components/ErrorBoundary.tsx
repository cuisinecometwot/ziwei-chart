import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-state" role="alert">
          <p>Đã xảy ra lỗi khi lập lá số. / An error occurred while generating the chart.</p>
          <pre>{String(this.state.error)}</pre>
          <button className="btn-primary" onClick={() => this.setState({ error: null })}>
            Thử lại / Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}