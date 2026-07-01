"use client";

import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class SharedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[SharedErrorBoundary] caught error:", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <h1 className="mb-4 text-2xl font-bold text-slate-800">
            Error cargando documentos
          </h1>
          <p className="text-sm text-slate-600">
            Se produjo un error inesperado. Revisa la consola para más detalles.
          </p>
          {this.state.error && (
            <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-red-50 p-3 text-xs text-red-700">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
