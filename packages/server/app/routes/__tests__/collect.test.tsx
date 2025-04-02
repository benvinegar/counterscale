import { describe, test, expect, vi, beforeEach } from "vitest";
import { collectRequestHandler } from "../../analytics/collect";

// Mock environment variables
vi.mock("../../env.server", () => ({
    env: {
        WEB_COUNTER_AE: {
            writeDataPoint: vi.fn(),
        },
    },
}));

// Mock the writeDataPoint function to avoid analytics engine dependency
vi.mock("../../analytics/collect", async () => {
    const actual = await vi.importActual("../../analytics/collect");
    return {
        ...actual,
        writeDataPoint: vi.fn(),
    };
});

describe("collect endpoint", () => {
    let mockEnv: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockEnv = { 
            WEB_COUNTER_AE: {
                writeDataPoint: vi.fn()
            } 
        };
    });

    test("accepts v and b parameters and doesn't return caching headers", async () => {
        // Create a request with v and b parameters
        const requestWithVB = new Request(
            "https://example.com/collect?sid=test-site&p=/test&h=example.com&r=&v=1&b=1",
            { headers: new Headers() }
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
            { headers: new Headers() }
        );

        const response = await collectRequestHandler(requestWithInvalidVB, mockEnv);

        expect(response.status).toBe(200);
        
        // Even with invalid v and b, we should still not set Last-Modified
        // because we're using the v/b path, not the cache headers path
        expect(response.headers.get("Last-Modified")).toBeNull();
    });
});
