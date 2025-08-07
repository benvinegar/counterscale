import { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction, Form, useActionData, useLoaderData, useNavigation, redirect } from "react-router";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { getUser, login, isAuthEnabled } from "~/lib/auth";

export const meta: MetaFunction = () => {
    return [
        { title: "Counterscale: Web Analytics" },
        { name: "description", content: "Counterscale: Web Analytics" },
    ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
    const env = context.cloudflare.env;
    const user = await getUser(request, env);
    const authEnabled = isAuthEnabled(env);
    
    // Return auth status to conditionally render the login form
    return { user, authEnabled };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const env = context.cloudflare.env;
    
    // If auth is disabled, this action shouldn't be called, but handle it gracefully
    if (!isAuthEnabled(env)) {
        return redirect("/dashboard");
    }
    
    const formData = await request.formData();
    const password = formData.get("password");

    if (typeof password !== "string" || !password) {
        return { error: "Password is required" };
    }

    try {
        return await login(request, password, env);
    } catch {
        return { error: "Invalid password" };
    }
}

export default function Index() {
    const { user, authEnabled } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = ["submitting", "loading"].includes(navigation.state);

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
                    {!authEnabled 
                        ? "Access your analytics dashboard." 
                        : user?.authenticated 
                            ? "Continue to access your analytics dashboard." 
                            : "Enter your password to access the dashboard"
                    }
                    </p>
                </div>
                
                {/* When auth is disabled or user is already authenticated, show dashboard button */}
                {(!authEnabled || user?.authenticated) ? (
                    <Button asChild className="w-full">
                        <a href="/dashboard">Go to Dashboard</a>
                    </Button>
                ) : (
                    /* When auth is enabled and user is not authenticated, show login form */
                    <Form method="post" className="space-y-4">
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                required
                                disabled={isSubmitting}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="Enter your password"
                            />
                        </div>
                        {actionData?.error && (
                            <div className="text-red-600 text-sm">{actionData.error}</div>
                        )}
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? "Signing In..." : "Sign In"}
                        </Button>
                    </Form>
                )}
            </Card>
        </div>
    );
}
