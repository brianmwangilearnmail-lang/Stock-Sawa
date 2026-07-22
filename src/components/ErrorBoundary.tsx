/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App ErrorBoundary caught:', error, info);
    
    // Auto-reload on Vite chunk load errors (happens when deploying new versions)
    const isChunkLoadError = error?.message?.includes('Failed to fetch dynamically imported module');
    if (isChunkLoadError) {
      // Use sessionStorage to prevent infinite reload loops
      const hasReloaded = sessionStorage.getItem('chunk_reload_attempted');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload_attempted', 'true');
        window.location.reload();
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-black flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center space-y-5">
            <div className="h-16 w-16 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Something went wrong</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                The app hit an unexpected error. Your data is safe — tap below to recover.
              </p>
              {this.state.error && (
                <p className="text-[10px] font-mono text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 p-2 rounded-lg mt-2 text-left break-all">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <button
              onClick={this.handleRetry}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
