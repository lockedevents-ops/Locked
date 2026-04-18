import Link from 'next/link';
import { Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-neutral-100 px-4 py-16">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-10 text-center border border-neutral-200">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Search className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-extrabold text-primary mb-2">404</h1>
          <h2 className="text-xl font-semibold text-neutral-800 mb-2">Oops! Page not found</h2>
        </div>
        <p className="text-neutral-600 mb-10">
          Sorry, we couldn’t find the page you’re looking for. It may have been removed, renamed, or did not exist.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/pages/discover"
            className="px-6 py-3 border border-primary text-primary rounded-lg font-medium hover:bg-primary/10 transition-colors"
          >
            Discover Events
          </Link>
        </div>
      </div>
      <div className="mt-8 text-neutral-400 text-sm">
        If you think this is a mistake, please <a href="mailto:support@example.com" className="underline">contact support</a>.
      </div>
    </div>
  );
}