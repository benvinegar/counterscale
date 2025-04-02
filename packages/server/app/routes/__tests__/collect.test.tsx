import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { collectRequestHandler } from "../../analytics/collect";

const originalTZ = process.env.TZ;

describe("collect endpoint", () => {
    let mockEnv: any;

    beforeEach(() => {
        // Set timezone to EST for all tests
        process.env.TZ = "EST";
        vi.clearAllMocks();
        mockEnv = {
            WEB_COUNTER_AE: {
                writeDataPoint: vi.fn(),
            },
        };
    });

    afterEach(() => {
        // Restore the original timezone
        process.env.TZ = originalTZ;
    });

    test("accepts v and b parameters and doesn't return caching headers", async () => {
        // Create a request with v and b parameters
        const requestWithVB = new Request(
            "https://example.com/collect?sid=test-site&p=/test&h=example.com&r=&v=1&b=1",
            { headers: new Headers() },
        );

        const response = await collectRequestHandler(requestWithVB, mockEnv);

        // Verify standard headers
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("image/gif");
        expect(response.headers.get("Cache-Control")).toBe("no-cache");
        expect(response.headers.get("Pragma")).toBe("no-cache");

        // The key assertion: Last-Modified header should NOT be present when v and b are provided
        expect(response.headers.get("Last-Modified")).toBeNull();
    });

    test("handles invalid v and b parameters", async () => {
        // Create a request with invalid v and b parameters
        const requestWithInvalidVB = new Request(
            "https://example.com/collect?sid=test-site&p=/test&h=example.com&r=&v=invalid&b=invalid",
            { headers: new Headers() },
        );

        const response = await collectRequestHandler(
            requestWithInvalidVB,
            mockEnv,
        );

        expect(response.status).toBe(200);

        // Even with invalid v and b, we should still not set Last-Modified
        // because we're using the v/b path, not the cache headers path
        expect(response.headers.get("Last-Modified")).toBeNull();
    });

    test("falls back to cache headers when v and b are not provided", async () => {
        // Use a fixed date for testing
        const initialDate = new Date("2025-04-01T12:00:00Z");
        const initialDateString = initialDate.toUTCString();

        // Create a request without v and b parameters but with If-Modified-Since header
        const headers = new Headers();
        headers.set("If-Modified-Since", initialDateString);

        const requestWithoutVB = new Request(
            "https://example.com/collect?sid=test-site&p=/test&h=example.com&r=",
            { headers },
        );

        const response = await collectRequestHandler(requestWithoutVB, mockEnv);

        expect(response.status).toBe(200);

        // The key assertion: Last-Modified header should be present when v and b are not provided
        const lastModified = response.headers.get("Last-Modified") || "";
        expect(lastModified).not.toBeNull();

        // Parse the returned date
        const returnedDate = new Date(lastModified);

        // The Last-Modified date should be set to midnight + 1 second in EST timezone
        expect(returnedDate.getUTCHours()).toBe(5); // 00:00 EST is 05:00 UTC (midnight)
        expect(returnedDate.getMinutes()).toBe(0);
        expect(returnedDate.getSeconds()).toBe(1); // 1 second indicates already visited
        expect(returnedDate.getMilliseconds()).toBe(0);

        // Also verify it's a future date from our initial date
        expect(returnedDate.getTime()).toBeGreaterThan(initialDate.getTime());
    });
});
