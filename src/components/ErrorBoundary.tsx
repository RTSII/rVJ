import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallbackUI?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component that catches React errors and displays a fallback UI.
 * Prevents the entire app from crashing when a component fails.
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console for debugging
        console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);

        // Update state with error details
        this.setState({
            error,
            errorInfo,
        });

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);
    }

    handleReset = () => {
        // Reset error state and try to re-render
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback UI if provided
            if (this.props.fallbackUI) {
                return this.props.fallbackUI;
            }

            // Default error UI
            return (
                <div className="min-h-[400px] w-full flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-card border border-destructive/20 rounded-lg p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-destructive/10 rounded-lg">
                                <AlertCircle className="h-6 w-6 text-destructive" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Something went wrong</h3>
                                <p className="text-sm text-muted-foreground">
                                    An error occurred while rendering this component
                                </p>
                            </div>
                        </div>

                        {/* Error details (collapsed by default in production) */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground mb-2">
                                    Error details
                                </summary>
                                <div className="bg-muted rounded p-3 space-y-2 font-mono">
                                    <div>
                                        <span className="text-destructive font-semibold">Error:</span>
                                        <pre className="mt-1 whitespace-pre-wrap break-words">
                                            {this.state.error.toString()}
                                        </pre>
                                    </div>
                                    {this.state.errorInfo && (
                                        <div>
                                            <span className="text-destructive font-semibold">Stack:</span>
                                            <pre className="mt-1 whitespace-pre-wrap break-words max-h-[200px] overflow-auto">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}

                        <div className="flex gap-2">
                            <Button
                                onClick={this.handleReset}
                                className="flex-1"
                                variant="default"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Try Again
                            </Button>
                            <Button
                                onClick={() => window.location.reload()}
                                variant="outline"
                                className="flex-1"
                            >
                                Reload Page
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
