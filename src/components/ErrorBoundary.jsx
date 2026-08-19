import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
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