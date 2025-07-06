import { MetaFunction } from "react-router";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

export const meta: MetaFunction = () => {
    return [
        { title: "Counterscale: Web Analytics" },
        { name: "description", content: "Counterscale: Web Analytics" },
    ];
};

export default function Index() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <img
                src="/counterscale-logo.webp"
                alt="CounterScale Logo"
                className="w-72"
            />
            <Card className="w-full max-w-md p-8 text-center">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Welcome to Counterscale
                    </h1>
                    <p className="text-gray-600">
                        Continue to access your analytics dashboard.
                    </p>
                </div>
                <Button asChild className="w-full">
                    <a href="/dashboard">Go to Dashboard</a>
                </Button>
            </Card>
        </div>
    );
}
