// @vitest-environment jsdom
import { vi, test, describe, beforeEach, afterEach, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "vitest-dom/extend-expect";
import { ErrorBoundary } from "../dashboard";

vi.mock("react-router", async () => {
    const actual = await vi.importActual("react-router");
    return {
        ...actual,
        useRouteError: vi.fn(),
        useSearchParams: vi.fn(),
        isRouteErrorResponse: vi.fn(),
    };
});

const { useRouteError, useSearchParams, isRouteErrorResponse } = await import(
    "react-router"
);

describe("Dashboard ErrorBoundary", () => {
    const originalLocation = global.window?.location;
    const mockReload = vi.fn();

    beforeEach(() => {
        Object.defineProperty(global.window, "location", {
            value: {
                reload: mockReload,
                href: "",
            },
            writable: true,
        });

        vi.mocked(useSearchParams).mockReturnValue([
            new URLSearchParams("site=example.com&interval=7d"),
        ] as any);
    });

    afterEach(() => {
        cleanup();
        mockReload.mockClear();
        vi.clearAllMocks();
        if (originalLocation) {
            global.window.location = originalLocation;
        }
    });

    describe("RouteErrorResponse handling", () => {
        test("displays configuration error for missing CF_ACCOUNT_ID (501)", () => {
            const error = {
                status: 501,
                data: "Missing credentials: CF_ACCOUNT_ID is not set.",
            };

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(true);

            render(<ErrorBoundary />);

            expect(screen.getByText("Configuration Error")).toBeInTheDocument();
            expect(
                screen.getByText(
                    "Missing Cloudflare Account ID configuration.",
                ),
            ).toBeInTheDocument();
            expect(
                screen.getByText(
                    "Please ensure CF_ACCOUNT_ID is properly configured in your environment variables.",
                ),
            ).toBeInTheDocument();
            expect(screen.queryByText("Try Again")).not.toBeInTheDocument();
            // Configuration errors are not actionable, so no buttons should be shown
            expect(
                screen.queryByText("Back to Dashboard"),
            ).not.toBeInTheDocument();
        });

        test("displays configuration error for missing CF_BEARER_TOKEN (501)", () => {
            const error = {
                status: 501,
                data: "Missing credentials: CF_BEARER_TOKEN is not set.",
            };

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(true);

            render(<ErrorBoundary />);

            expect(screen.getByText("Configuration Error")).toBeInTheDocument();
            expect(
                screen.getByText(
                    "Missing Cloudflare Bearer Token configuration.",
                ),
            ).toBeInTheDocument();
            expect(
                screen.getByText(
                    "Please ensure CF_BEARER_TOKEN is properly configured in your environment variables.",
                ),
            ).toBeInTheDocument();
            expect(screen.queryByText("Try Again")).not.toBeInTheDocument();
        });

        test("displays server error for 500 status", () => {
            const error = {
                status: 500,
                data: "Internal server error",
            };

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(true);

            render(<ErrorBoundary />);

            expect(screen.getByText("Server Error")).toBeInTheDocument();
            expect(
                screen.getByText("The server encountered an internal error."),
            ).toBeInTheDocument();
            expect(
                screen.getByText(
                    "This is likely a temporary issue. Please try again in a few moments.",
                ),
            ).toBeInTheDocument();
            expect(screen.getByText("Try Again")).toBeInTheDocument();
        });

        test("displays not found error for 404 status", () => {
            const error = {
                status: 404,
                data: "Not found",
            };

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(true);

            render(<ErrorBoundary />);

            expect(screen.getByText("Not Found")).toBeInTheDocument();
            expect(
                screen.getByText("The requested resource could not be found."),
            ).toBeInTheDocument();
            expect(
                screen.getByText(
                    "Please check the URL or try navigating back to the dashboard.",
                ),
            ).toBeInTheDocument();
            expect(screen.queryByText("Try Again")).not.toBeInTheDocument();
        });

        test("displays access denied error for 403 status", () => {
            const error = {
                status: 403,
                data: "Forbidden",
            };

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(true);

            render(<ErrorBoundary />);

            expect(screen.getByText("Access Denied")).toBeInTheDocument();
            expect(
                screen.getByText(
                    "You don't have permission to access this resource.",
                ),
            ).toBeInTheDocument();
            expect(
                screen.getByText(
                    "Please check your authentication status or contact an administrator.",
                ),
            ).toBeInTheDocument();
        });

        test("displays generic error for other HTTP status codes", () => {
            const error = {
                status: 400,
                data: "Bad request",
                statusText: "Bad Request",
            };

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(true);

            render(<ErrorBoundary />);

            expect(screen.getByText("Error 400")).toBeInTheDocument();
            expect(screen.getByText("Bad request")).toBeInTheDocument();
            expect(
                screen.getByText(
                    "Please try refreshing the page or contact support if the issue persists.",
                ),
            ).toBeInTheDocument();
            expect(screen.getByText("Try Again")).toBeInTheDocument();
        });
    });

    describe("Error object handling", () => {
        test("displays Analytics Engine error", () => {
            const error = new Error(
                "Failed to fetch data from Analytics Engine",
            );

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(false);

            render(<ErrorBoundary />);

            expect(
                screen.getByText("Analytics Engine Error"),
            ).toBeInTheDocument();
            expect(
                screen.getByText(
                    "Failed to connect to Cloudflare Analytics Engine.",
                ),
            ).toBeInTheDocument();
            expect(
                screen.getByText(
                    "This could be due to network issues or Analytics Engine being temporarily unavailable. Please try again in a few moments.",
                ),
            ).toBeInTheDocument();
            expect(screen.getByText("Try Again")).toBeInTheDocument();
        });

        test("displays authentication error", () => {
            const error = new Error("Authentication failed: invalid token");

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(false);

            render(<ErrorBoundary />);

            expect(
                screen.getByText("Authentication Error"),
            ).toBeInTheDocument();
            expect(
                screen.getByText("Authentication failed: invalid token"),
            ).toBeInTheDocument();
            expect(
                screen.getByText(
                    "Please check your credentials and try logging in again.",
                ),
            ).toBeInTheDocument();
            expect(screen.queryByText("Try Again")).not.toBeInTheDocument();
        });

        test("displays invalid interval error", () => {
            const error = new Error("Invalid interval provided");

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(false);

            render(<ErrorBoundary />);

            expect(screen.getByText("Invalid Time Range")).toBeInTheDocument();
            expect(
                screen.getByText(
                    "The selected time interval is not supported.",
                ),
            ).toBeInTheDocument();
            expect(
                screen.getByText(
                    "Please select a different time range from the dropdown.",
                ),
            ).toBeInTheDocument();
        });

        test("displays generic application error", () => {
            const error = new Error("Something went wrong");

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(false);

            render(<ErrorBoundary />);

            expect(screen.getByText("Application Error")).toBeInTheDocument();
            expect(
                screen.getByText("Something went wrong"),
            ).toBeInTheDocument();
            expect(
                screen.getByText(
                    "Please try refreshing the page or contact support if the issue persists.",
                ),
            ).toBeInTheDocument();
            expect(screen.getByText("Try Again")).toBeInTheDocument();
        });
    });

    describe("Context display", () => {
        test("shows context information when available", () => {
            const error = new Error("Test error");

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(false);
            vi.mocked(useSearchParams).mockReturnValue([
                new URLSearchParams("site=example.com&interval=30d"),
            ] as any);

            render(<ErrorBoundary />);

            expect(
                screen.getByText("Context when error occurred:"),
            ).toBeInTheDocument();
            expect(screen.getByText("example.com")).toBeInTheDocument();
            expect(screen.getByText("30d")).toBeInTheDocument();
        });

        test("hides context when showContext is false", () => {
            const error = {
                status: 501,
                data: "Missing credentials: CF_ACCOUNT_ID is not set.",
            };

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(true);

            render(<ErrorBoundary />);

            expect(
                screen.queryByText("Context when error occurred:"),
            ).not.toBeInTheDocument();
        });
    });

    describe("Button interactions", () => {
        test("Try Again button reloads the page", () => {
            const error = new Error("Test error");

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(false);

            render(<ErrorBoundary />);

            const tryAgainButton = screen.getByText("Try Again");
            fireEvent.click(tryAgainButton);

            expect(mockReload).toHaveBeenCalledTimes(1);
        });

        test("Back to Dashboard button navigates to dashboard", () => {
            const error = new Error("Test error");

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(false);

            render(<ErrorBoundary />);

            const backButton = screen.getByText("Back to Dashboard");
            fireEvent.click(backButton);

            expect(global.window.location.href).toBe("/dashboard");
        });
    });

    describe("Edge cases", () => {
        test("handles null error gracefully", () => {
            vi.mocked(useRouteError).mockReturnValue(null);
            vi.mocked(isRouteErrorResponse).mockReturnValue(false);

            render(<ErrorBoundary />);

            expect(screen.getByText("Dashboard Error")).toBeInTheDocument();
            expect(
                screen.getByText(
                    "An unexpected error occurred while loading the dashboard.",
                ),
            ).toBeInTheDocument();
        });

        test("handles Response error without data", () => {
            const error = {
                status: 500,
                data: null,
                statusText: "Internal Server Error",
            };

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(true);

            render(<ErrorBoundary />);

            expect(screen.getByText("Server Error")).toBeInTheDocument();
        });

        test("displays warning emoji and proper UI structure", () => {
            const error = new Error("Test error");

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(false);

            const { container } = render(<ErrorBoundary />);

            expect(screen.getByText("⚠️")).toBeInTheDocument();
            expect(container.querySelector(".max-w-2xl")).toBeInTheDocument();
            expect(
                screen.getByRole("button", { name: "Try Again" }),
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", { name: "Back to Dashboard" }),
            ).toBeInTheDocument();
        });

        test("logs error to console", () => {
            const consoleSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});
            const error = new Error("Test error for logging");

            vi.mocked(useRouteError).mockReturnValue(error);
            vi.mocked(isRouteErrorResponse).mockReturnValue(false);

            render(<ErrorBoundary />);

            expect(consoleSpy).toHaveBeenCalledWith("Dashboard Error:", error);

            consoleSpy.mockRestore();
        });
    });
});
