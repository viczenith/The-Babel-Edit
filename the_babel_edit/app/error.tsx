'use client'; // Error components must be Client components

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 text-center px-4">
      <AlertTriangle className="w-24 h-24 text-red-500 mb-6" />
      <h1 className="text-4xl font-bold text-red-800">Something went wrong!</h1>
      <p className="text-red-600 mt-4 mb-8 max-w-md">
        {`We've encountered an unexpected issue. Please try again.`}
      </p>
      
      {/* Optional: Display error message in development */}
      {process.env.NODE_ENV === 'development' && (
        <details className="bg-white p-4 rounded-lg border border-red-200 text-left max-w-xl w-full mb-6">
          <summary className="font-semibold text-red-700 cursor-pointer">Error Details</summary>
          <pre className="mt-2 text-sm text-red-600 whitespace-pre-wrap break-all">
            {error.message}
          </pre>
        </details>
      )}

      <button
        onClick={() => reset()}
        className="bg-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors duration-300"
      >
        Try Again
      </button>
    </div>
  );
}
