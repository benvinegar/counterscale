import { Link } from "react-router";
import { LineChart, PieChart, BarChart3 } from "lucide-react";

// The $ filename is a special convention in React Router for catch-all routes
export const path = "*";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="text-center px-4 py-8 max-w-md mx-auto">
        {/* Animated charts section */}
        <div className="mb-8 flex justify-center gap-4 items-center">
          <LineChart className="w-12 h-12 text-blue-400 animate-bounce" style={{ animationDelay: "0s" }} />
          <PieChart className="w-16 h-16 text-orange-500 animate-bounce" style={{ animationDelay: "0.2s" }} />
          <BarChart3 className="w-12 h-12 text-green-400 animate-bounce" style={{ animationDelay: "0.4s" }} />
        </div>
        
        <h1 className="text-7xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">Oops! Page Not Found</h2>
        <p className="text-gray-600 mb-8 text-lg">
          Looks like these charts can&apos;t find what you&apos;re looking for!
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
} 