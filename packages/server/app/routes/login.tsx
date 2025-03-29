import { useState, useEffect } from "react";
import { redirect, useActionData, Form } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import {
    createToken,
    getTokenFromCookies,
    verifyToken,
} from "~/lib/auth";

export async function loader({
    request,
    context,
}: LoaderFunctionArgs) {
    // Check if user is already authenticated
    const token = getTokenFromCookies(request);
    if (token) {
        try {
            const jwtSecret = context.cloudflare.env.JWT_SECRET;
            if (jwtSecret && (await verifyToken(token, jwtSecret))) {
                // User is already authenticated, redirect to dashboard
                return redirect("/dashboard");
            }
        } catch {
            // Token verification failed, continue to login page
        }
    }

    return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" },
    });
}

export async function action({
    request,
    context,
}: ActionFunctionArgs) {
    const formData = await request.formData();
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    // Get credentials from environment
    const adminUsername = context.cloudflare.env.ADMIN_USERNAME;
    const adminPassword = context.cloudflare.env.ADMIN_PASSWORD;
    const jwtSecret =
        // NOTE: you must specify this value for deployment
        context.cloudflare.env.JWT_SECRET || "dev_secret_key_for_testing";

    // Validate environment variables
    if (!adminUsername || !adminPassword || !jwtSecret) {
        console.error(
            "Missing required environment variables for authentication",
        );
        return new Response(
            JSON.stringify({ error: "Server configuration error" }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }

    // Validate credentials
    if (username !== adminUsername || password !== adminPassword) {
        return new Response(
            JSON.stringify({ error: "Invalid username or password" }),
            {
                status: 401,
                headers: { "Content-Type": "application/json" },
            },
        );
    }

    // Create JWT token
    const token = await createToken(username, jwtSecret);

    // Create a redirect response with the auth cookie
    return redirect("/dashboard", {
        headers: {
            "Set-Cookie": `counterscale_session=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${24 * 60 * 60}`,
        },
    });
}

export default function Login() {
    const actionData = useActionData<typeof action>() as
        | { error?: string }
        | undefined;
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Reset isSubmitting when actionData changes
    useEffect(() => {
        if (actionData) {
            setIsSubmitting(false);
        }
    }, [actionData]);

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">
                        Counterscale Admin
                    </CardTitle>
                    <CardDescription>
                        Enter your credentials to access the dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form method="post" onSubmit={() => setIsSubmitting(true)}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label
                                    htmlFor="username"
                                    className="text-sm font-medium"
                                >
                                    Username
                                </label>
                                <Input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                            <div className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium"
                                >
                                    Password
                                </label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                            {actionData?.error && (
                                <div className="text-red-500 text-sm">
                                    {actionData.error}
                                </div>
                            )}
                        </div>
                        <CardFooter className="flex justify-end pt-6 px-0">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Signing in..." : "Sign in"}
                            </Button>
                        </CardFooter>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
