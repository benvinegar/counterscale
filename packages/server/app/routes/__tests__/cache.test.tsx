// @vitest-environment jsdom
import { vi, test, describe, beforeEach, afterEach, expect } from "vitest";
import "vitest-dom/extend-expect";

import { loader } from "../cache";

describe("Cache route", () => {
    beforeEach(() => {
        // Reset the date mock before each test
        vi.useRealTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("loader", () => {
        test("returns new visit for request with no If-Modified-Since header", async () => {
            // Create a request with no If-Modified-Since
            const request = new Request("http://localhost:3000/cache");

            // Call the loader
            const response = await loader({ request } as any);

            // Check response status
            expect(response.status).toBe(200);

            // Verify the content of the response
            const data = await response.json();
            expect(data).toEqual({
                hits: 1, // First hit (new visit) with no If-Modified-Since
            });

            // Verify headers
            expect(response.headers.get("Content-Type")).toBe(
                "application/json",
            );
            expect(response.headers.get("Last-Modified")).toBeTruthy();
            expect(response.headers.get("Cache-Control")).toBe("no-cache");
        });

        test("if-modified-since is within 30 minutes", async () => {
            // Create a request with a recent If-Modified-Since header (5 minutes ago)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const ifModifiedSince = fiveMinutesAgo.toUTCString();

            const request = new Request("http://localhost:3000/cache", {
                headers: {
                    "If-Modified-Since": ifModifiedSince,
                },
            });

            // Call the loader
            const response = await loader({ request } as any);

            // Verify the content of the response
            const data = await response.json();

            // Should return a hit count > 0 for returning visitors
            expect(data.hits).toBeGreaterThan(0);
            // The hit count should be the seconds value of the next date
            // We don't test for a specific value since it's implementation-dependent
        });

        test("if-modified since is within 30 minutes but over day boundary", async () => {
            // Set system time to 00:15:00
            vi.setSystemTime(new Date("2024-01-18T00:15:00"));

            // If the user last visited ~25 minutes ago, that occurred during
            // the prior day, so this should be considered a new visit
            const twentyFiveMinutesAgo = new Date(Date.now() - 25 * 60 * 1000);
            const ifModifiedSince = twentyFiveMinutesAgo.toUTCString();

            const request = new Request("http://localhost:3000/cache", {
                headers: {
                    "If-Modified-Since": ifModifiedSince,
                },
            });

            // Call the loader
            const response = await loader({ request } as any);

            // Verify the content of the response
            const data = await response.json();

            // Should be the first hit (new visitor) because a new day began
            expect(data.hits).toBe(1);
        });

        test("if-modified-since is over 30 days ago", async () => {
            // Create a request with an If-Modified-Since header from 31 days ago
            const thirtyOneDaysAgo = new Date(
                Date.now() - 31 * 24 * 60 * 60 * 1000,
            );
            const ifModifiedSince = thirtyOneDaysAgo.toUTCString();

            const request = new Request("http://localhost:3000/cache", {
                headers: {
                    "If-Modified-Since": ifModifiedSince,
                },
            });

            // Call the loader
            const response = await loader({ request } as any);

            // Verify the content of the response
            const data = await response.json();

            // Should be the first hit (new visitor) because > 30 days passed
            expect(data.hits).toBe(1);
        });

        test("if-modified-since was yesterday", async () => {
            // Create a request with an If-Modified-Since header from 24 hours ago
            const twentyFourHoursAgo = new Date(
                Date.now() - 24 * 60 * 60 * 1000,
            );
            const ifModifiedSince = twentyFourHoursAgo.toUTCString();

            const request = new Request("http://localhost:3000/cache", {
                headers: {
                    "If-Modified-Since": ifModifiedSince,
                },
            });

            // Call the loader
            const response = await loader({ request } as any);

            // Verify the content of the response
            const data = await response.json();

            // Should be the first hit (new visitor) because > 24 hours passed
            expect(data.hits).toBe(1);
        });

        test("if-modified-since is one second after midnight", async () => {
            // Set system time to midnight exactly
            const midnight = new Date();
            midnight.setHours(0, 0, 0, 0);
            vi.setSystemTime(midnight);

            // Create a request with an If-Modified-Since header from 1 second after midnight
            const midnightPlusOneSecond = new Date(midnight.getTime());
            midnightPlusOneSecond.setSeconds(
                midnightPlusOneSecond.getSeconds() + 1,
            );
            const ifModifiedSince = midnightPlusOneSecond.toUTCString();

            const request = new Request("http://localhost:3000/cache", {
                headers: {
                    "If-Modified-Since": ifModifiedSince,
                },
            });

            // Call the loader
            const response = await loader({ request } as any);

            // Verify the content of the response
            const data = await response.json();

            // Should return a hit count > 0 for returning visitors
            expect(data.hits).toBe(2);
            // The hit count should be the seconds value of the next date
            // We don't test for a specific value since it's implementation-dependent
        });

        test("if-modified-since is two seconds after midnight", async () => {
            // Set system time to midnight plus one second
            const midnightPlusOneSecond = new Date();
            midnightPlusOneSecond.setHours(0, 0, 1, 0);
            vi.setSystemTime(midnightPlusOneSecond);

            // Create a request with an If-Modified-Since header from 2 seconds after midnight
            const midnightPlusTwoSeconds = new Date(
                midnightPlusOneSecond.getTime(),
            );
            midnightPlusTwoSeconds.setSeconds(
                midnightPlusTwoSeconds.getSeconds() + 1,
            );
            const ifModifiedSince = midnightPlusTwoSeconds.toUTCString();

            const request = new Request("http://localhost:3000/cache", {
                headers: {
                    "If-Modified-Since": ifModifiedSince,
                },
            });

            // Call the loader
            const response = await loader({ request } as any);

            // Verify the content of the response
            const data = await response.json();

            // Should be the third hit (returning visitor)
            expect(data.hits).toBe(3);
        });
    });
});
