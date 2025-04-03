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

    test("accepts ht parameter and doesn't return Last-Modified header", async () => {
        // Create a request with ht parameter
        const requestWithHt = new Request(
            "https://example.com/collect?sid=test-site&p=/test&h=example.com&r=&ht=1",
            { headers: new Headers() },
        );

        const response = await collectRequestHandler(requestWithHt, mockEnv);

        // Verify standard headers
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("image/gif");
        expect(response.headers.get("Cache-Control")).toBe("no-cache");
        expect(response.headers.get("Pragma")).toBe("no-cache");

        // The key assertion: Last-Modified header should NOT be present when ht is provided
        expect(response.headers.get("Last-Modified")).toBeNull();
    });

    test("handles invalid ht parameter", async () => {
        // Create a request with invalid ht parameter
        const requestWithInvalidHt = new Request(
            "https://example.com/collect?sid=test-site&p=/test&h=example.com&r=&ht=invalid",
            { headers: new Headers() },
        );

        const response = await collectRequestHandler(
            requestWithInvalidHt,
            mockEnv,
        );

        expect(response.status).toBe(200);

        // Even with invalid ht, we should NOT set Last-Modified
        // because we're still using the ht parameter path
        expect(response.headers.get("Last-Modified")).toBeNull();
    });

    test("falls back to cache headers when hits is not provided", async () => {
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
