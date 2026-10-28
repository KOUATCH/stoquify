/**
 * Enhanced Error Boundary Component for StockFlow
 *
 * Provides comprehensive error catching and handling for React components
 * with integration to the enterprise error handling system.
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { ErrorContext } from './types'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorId: string | null
  retryCount: number
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, retry: () => void) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  maxRetries?: number
  component?: string
  showErrorDetails?: boolean
}

/**
 * Enhanced Error Boundary with enterprise error handling
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private readonly maxRetries: number

  constructor(props: ErrorBoundaryProps) {
    super(props)

    this.maxRetries = props.maxRetries || 3
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to the enterprise error handling system
    this.logErrorToSystem(error, errorInfo)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  private async logErrorToSystem(error: Error, errorInfo: ErrorInfo) {
    try {
      // Import the error handler dynamically to avoid SSR issues
      const { errorHandler } = await import('./error-handler')

      await errorHandler.handle(error, {
        context: ErrorContext.CLIENT_COMPONENT,
        component: this.props.component || this.constructor.name,
        requestId: this.state.errorId || undefined,
        metadata: {
          componentStack: errorInfo.componentStack
        },
        includeStackTrace: true,
        includeBrowserInfo: true,
        includeUserContext: true,
        notifyAdmin: true,
        notifyUser: true,
        logLevel: 'error'
      })

      console.error('Error caught by ErrorBoundary:', {
        errorId: this.state.errorId,
        component: this.props.component,
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    } catch (handlingError) {
      // Fallback logging if error system fails
      console.error('Failed to log error to system:', handlingError)
      console.error('Original error:', error)
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorId: null,
        retryCount: prevState.retryCount + 1
      }))
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.handleRetry)
      }

      // Default error UI
      return (
        <ErrorFallbackComponent
          error={this.state.error!}
          errorId={this.state.errorId!}
          retryCount={this.state.retryCount}
          maxRetries={this.maxRetries}
          component={this.props.component}
          showErrorDetails={this.props.showErrorDetails}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Default error fallback component
 */
interface ErrorFallbackProps {
  error: Error
  errorId: string
  retryCount: number
  maxRetries: number
  component?: string
  showErrorDetails?: boolean
  onRetry: () => void
  onReset: () => void
  onReload: () => void
  onGoHome: () => void
}

function ErrorFallbackComponent({
  error,
  errorId,
  retryCount,
  maxRetries,
  component,
  showErrorDetails = process.env.NODE_ENV === 'development',
  onRetry,
  onReset,
  onReload,
  onGoHome
}: ErrorFallbackProps) {
  const canRetry = retryCount < maxRetries

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-red-200 dark:border-red-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 dark:bg-red-900/20 rounded-full w-fit">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-red-900 dark:text-red-100">
            Something went wrong
          </CardTitle>
          {component && (
            <p className="text-sm text-red-700 dark:text-red-300">
              Error in component: {component}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              We apologize for the inconvenience. An unexpected error has occurred.
            </p>
            {errorId && (
              <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                Error ID: {errorId}
              </p>
            )}
          </div>

          {showErrorDetails && (
            <details className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded border">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Bug className="inline h-4 w-4 mr-1" />
                Technical Details
              </summary>
              <div className="mt-2 text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                <strong>Error:</strong> {error.message}
                {error.stack && (
                  <>
                    <br /><br />
                    <strong>Stack Trace:</strong>
                    <br />
                    {error.stack}
                  </>
                )}
              </div>
            </details>
          )}

          <div className="flex flex-col gap-2 pt-4">
            {canRetry && (
              <Button
                onClick={onRetry}
                variant="default"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
              </Button>
            )}

            {!canRetry && (
              <p className="text-sm text-amber-600 dark:text-amber-400 text-center mb-2">
                Maximum retry attempts reached
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={onReset}
                variant="outline"
                size="sm"
              >
                Reset
              </Button>
              <Button
                onClick={onReload}
                variant="outline"
                size="sm"
              >
                Reload Page
              </Button>
            </div>

            <Button
              onClick={onGoHome}
              variant="ghost"
              size="sm"
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-500 text-center pt-2 border-t">
            If this problem persists, please contact support with the error ID above.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryConfig?: Omit<ErrorBoundaryProps, 'children'>
) {
  const componentName = WrappedComponent.displayName || WrappedComponent.name || 'Component'

  const WithErrorBoundaryComponent = (props: P) => {
    return (
      <ErrorBoundary
        component={componentName}
        {...errorBoundaryConfig}
      >
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${componentName})`

  return WithErrorBoundaryComponent
}

/**
 * Specialized error boundaries for different StockFlow features
 */

// Inventory operations error boundary
export const InventoryErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary
    component="InventorySystem"
    maxRetries={2}
    showErrorDetails={process.env.NODE_ENV === 'development'}
    fallback={(error, retry) => (
      <Card className="border-amber-200">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-4" />
          <h3 className="font-semibold text-amber-900 mb-2">Inventory System Error</h3>
          <p className="text-sm text-amber-700 mb-4">
            There was an issue with the inventory system. This may be temporary.
          </p>
          <Button onClick={retry} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )}
  >
    {children}
  </ErrorBoundary>
)

// POS operations error boundary
export const POSErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary
    component="POSSystem"
    maxRetries={5}
    showErrorDetails={false}
    fallback={(error, retry) => (
      <Card className="border-red-200">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <h3 className="font-semibold text-red-900 mb-2">POS System Error</h3>
          <p className="text-sm text-red-700 mb-4">
            The POS terminal encountered an error. Sales data is safe.
          </p>
          <div className="space-y-2">
            <Button onClick={retry} size="sm" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Restart Terminal
            </Button>
            <Button
              onClick={() => window.location.href = '/dashboard/pos-system'}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Reload POS
            </Button>
          </div>
        </CardContent>
      </Card>
    )}
  >
    {children}
  </ErrorBoundary>
)

// Financial operations error boundary
export const FinancialErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary
    component="FinancialSystem"
    maxRetries={1}
    showErrorDetails={process.env.NODE_ENV === 'development'}
    fallback={(error, retry) => (
      <Card className="border-purple-200">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-purple-500 mx-auto mb-4" />
          <h3 className="font-semibold text-purple-900 mb-2">Financial System Error</h3>
          <p className="text-sm text-purple-700 mb-4">
            There was an issue with financial calculations or reporting.
            All data is safe and no transactions were affected.
          </p>
          <div className="space-y-2">
            <Button onClick={retry} size="sm" variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <p className="text-xs text-purple-600">
              If this persists, please contact support immediately.
            </p>
          </div>
        </CardContent>
      </Card>
    )}
  >
    {children}
  </ErrorBoundary>
)
