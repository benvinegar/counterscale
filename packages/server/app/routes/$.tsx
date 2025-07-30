import { Link } from "react-router";
import { Button } from "~/components/ui/button";

// The $ filename is a special convention in React Router for catch-all routes
export const path = "*";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <h2 className="text-xl font-medium text-gray-700 mb-8">Oops! Page Not Found</h2>
      <Button asChild variant="default" size="lg">
        <Link to="/">Return Home</Link>
      </Button>
    </div>
  );
} 