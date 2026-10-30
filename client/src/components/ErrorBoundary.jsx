import React, { Component } from 'react';
import { Button } from './Button';
import { AlertCircle, RotateCcw, Layers } from 'lucide-react';

/**
 * Friendly ErrorBoundary component to catch and display game errors gracefully
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[HAPPY DROP ERROR BOUNDARY]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[calc(100dvh-80px)] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-rose-100 text-coral-pink flex items-center justify-center mb-4 shadow-soft">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-heading font-black text-navy mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-xs text-navy/70 mb-6 leading-relaxed">
            The game ran into an unexpected hiccup. Don't worry, your progress is safely saved!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <Button
              variant="primary"
              onClick={this.handleReset}
              className="!py-3 !px-5 font-bold text-sm min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" /> Try Again
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = '/levels';
              }}
              className="!py-3 !px-5 font-bold text-sm min-h-[44px]"
            >
              <Layers className="w-4 h-4 mr-1.5 text-sky-blue" /> Back to Levels
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
