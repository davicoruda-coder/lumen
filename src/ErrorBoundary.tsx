import React, { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', backgroundColor: '#fee2e2', color: '#991b1b', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>SISTEMA CRASHOU (React Error)</h1>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{this.state.error?.toString()}</h2>
          <pre style={{ overflowX: 'auto', marginTop: '1rem', padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }}>
            {this.state.error?.stack}
          </pre>
          {this.state.errorInfo && (
            <pre style={{ overflowX: 'auto', marginTop: '1rem', padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }}>
              {this.state.errorInfo.componentStack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
