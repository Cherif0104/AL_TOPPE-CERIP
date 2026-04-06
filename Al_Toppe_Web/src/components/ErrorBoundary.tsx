import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message || 'Erreur inconnue' };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Une erreur a bloqué l’affichage</h1>
          <p className="text-sm text-gray-600 mb-4 max-w-md text-center">{this.state.message}</p>
          <button
            type="button"
            className="px-4 py-2 bg-[#006666] text-white rounded-md"
            onClick={() => {
              try {
                localStorage.removeItem('altoppe_user');
                localStorage.removeItem('altoppe_access_token');
                localStorage.removeItem('altoppe_refresh_token');
              } catch {
                /* ignore */
              }
              window.location.reload();
            }}
          >
            Vider la session locale et recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
