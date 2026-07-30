'use client';

import React from 'react';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Uncaught error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 m-4">
          <h2 className="font-semibold mb-2">Une erreur inattendue est survenue</h2>
          <p className="text-sm">Veuillez recharger la page ou contacter le support si le problème persiste.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
