// @vitest-environment jsdom
import {
    vi,
    test,
    describe,
    beforeEach,
    afterEach,
    expect,
    Mock,
} from "vitest";
import "vitest-dom/extend-expect";

import { loader } from "../cache";
import * as collectModule from "~/analytics/collect";

describe("Cache route", () => {
    let handleCacheHeadersSpy: Mock;
    
    beforeEach(() => {
        // Mock the handleCacheHeaders function
        handleCacheHeadersSpy = vi.spyOn(collectModule, "handleCacheHeaders");
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("loader", () => {
        test("returns new visit for request with no If-Modified-Since header", async () => {
            // Setup the mock to return values for a new visit
            const mockDate = new Date();
            handleCacheHeadersSpy.mockReturnValueOnce({
                isVisit: true,
                isBounce: true,
                nextLastModifiedDate: mockDate,
            });

            // Create a request with no If-Modified-Since
            const request = new Request("http://localhost:3000/cache");
            
            // Call the loader
            const response = await loader({ request } as any);
            
            // Verify handleCacheHeaders was called with null
            expect(handleCacheHeadersSpy).toHaveBeenCalledWith(null);
            
            // Check response status
            expect(response.status).toBe(200);
            
            // Verify the content of the response
            const data = await response.json();
            expect(data).toEqual({
                v: true,
                b: true,
            });
            
            // Verify headers
            expect(response.headers.get("Content-Type")).toBe("application/json");
            expect(response.headers.get("Last-Modified")).toBe(mockDate.toUTCString());
            expect(response.headers.get("Cache-Control")).toBe("no-cache, must-revalidate");
        });

        test("handles request with If-Modified-Since header", async () => {
            // Setup the mock to return values for a returning visit
            const mockDate = new Date();
            handleCacheHeadersSpy.mockReturnValueOnce({
                isVisit: false,
                isBounce: false,
                nextLastModifiedDate: mockDate,
            });

            // Create a request with an If-Modified-Since header
            const ifModifiedSince = new Date(Date.now() - 60000).toUTCString(); // 1 minute ago
            const request = new Request("http://localhost:3000/cache", {
                headers: {
                    "If-Modified-Since": ifModifiedSince,
                },
            });
            
            // Call the loader
            const response = await loader({ request } as any);
            
            // Verify handleCacheHeaders was called with the correct header
            expect(handleCacheHeadersSpy).toHaveBeenCalledWith(ifModifiedSince);
            
            // Verify the content of the response
            const data = await response.json();
            expect(data).toEqual({
                v: false,
                b: false,
            });
        });

        test("updates Last-Modified header for bounce detection", async () => {
            // Setup the mock with specific next modified date
            const mockDate = new Date("2025-03-31T12:30:45Z");
            handleCacheHeadersSpy.mockReturnValueOnce({
                isVisit: false,
                isBounce: true, // A bounce but not a new visit
                nextLastModifiedDate: mockDate,
            });

            // Create a request with an older If-Modified-Since header
            const ifModifiedSince = new Date("2025-03-31T12:00:00Z").toUTCString();
            const request = new Request("http://localhost:3000/cache", {
                headers: {
                    "If-Modified-Since": ifModifiedSince,
                },
            });
            
            // Call the loader
            const response = await loader({ request } as any);
            
            // Verify the content shows a bounce but not a new visit
            const data = await response.json();
            expect(data).toEqual({
                v: false,
                b: true,
            });
            
            // Verify Last-Modified header is updated to the mockDate
            expect(response.headers.get("Last-Modified")).toBe(mockDate.toUTCString());
        });
    });
});
