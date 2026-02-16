import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4">
      <FileQuestion className="w-24 h-24 text-blue-500 mb-6" />
      <h1 className="text-6xl font-bold text-gray-800">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mt-4 mb-2">Page Not Found</h2>
      <p className="text-gray-500 mb-8 max-w-sm">
        Oops! The page you are looking for does not exist. It might have been moved or deleted.
      </p>
      <Link href="/en" className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-300">
        Return to Homepage
      </Link>
    </div>
  );
}
