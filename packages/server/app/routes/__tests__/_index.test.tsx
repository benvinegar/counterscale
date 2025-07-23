// @vitest-environment jsdom
import { test, describe, expect } from "vitest";
import "vitest-dom/extend-expect";

import { createRoutesStub } from "react-router";
import { render, screen, waitFor } from "@testing-library/react";

import Index from "../_index";

describe("Index route", () => {
    test("renders index route", async () => {
        const RemixStub = createRoutesStub([
            {
                path: "/",
                Component: Index,
                loader: () => ({ user: null }),
            },
        ]);

        const { container } = render(<RemixStub />);

        // Check if component renders at all
        expect(container).toBeInTheDocument();
        
        // Wait for content to load
        await waitFor(() => {
            expect(screen.getByText("Welcome to Counterscale")).toBeInTheDocument();
        });

        expect(
            screen.getByText("Enter your password to access the dashboard"),
        ).toBeInTheDocument();

        expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    test("renders authenticated state", async () => {
        const RemixStub = createRoutesStub([
            {
                path: "/",
                Component: Index,
                loader: () => ({ user: { authenticated: true } }),
            },
        ]);

        render(<RemixStub />);

        await waitFor(() => {
            expect(screen.getByText("Welcome to Counterscale")).toBeInTheDocument();
        });

        expect(
            screen.getByText("Continue to access your analytics dashboard."),
        ).toBeInTheDocument();

        expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();

        expect(
            screen.getByRole("link", { name: "Go to Dashboard" }),
        ).toHaveAttribute("href", "/dashboard");
    });
});
