'use client';

import React from 'react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  eventId: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, eventId: null };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const eventId = Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    });
    this.setState({ eventId });
    console.error('[ErrorBoundary] Unhandled error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-2xl font-bold text-primary">Ocurrió un error inesperado</h2>
            <p className="text-neutral-500">
              El equipo ha sido notificado. Por favor recarga la página.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, eventId: null })}
              className="px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 transition-opacity"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
