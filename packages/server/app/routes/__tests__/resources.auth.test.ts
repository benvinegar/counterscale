import { describe, expect, test, vi } from "vitest";

const AUTH_REQUIRED = new Error("auth required");

vi.mock("~/lib/auth", () => ({
    requireAuth: vi.fn(async () => {
        throw AUTH_REQUIRED;
    }),
}));

// Every dashboard data route must refuse to answer before the login check
// passes; a route added without the guard would serve analytics publicly.
const routes = import.meta.glob<{
    loader: (args: unknown) => Promise<unknown>;
}>("../resources.*.tsx");

describe("resource routes require authentication", () => {
    test("covers every resource route", () => {
        expect(Object.keys(routes).length).toBeGreaterThan(0);
    });

    test.each(Object.keys(routes))("%s", async (path) => {
        const { loader } = await routes[path]();
        const request = new Request(
            "https://example.com/resources/x?site=test&interval=7d",
        );
        await expect(
            loader({
                request,
                context: { cloudflare: { env: {} } },
                params: {},
            }),
        ).rejects.toBe(AUTH_REQUIRED);
    });
});
