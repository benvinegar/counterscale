import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "../request";
import type { CollectRequestParams } from "../../shared/types";

// Mock fetch and buildCollectUrl
global.fetch = vi.fn();
global.AbortController = vi.fn().mockImplementation(() => ({
    signal: {},
    abort: vi.fn(),
}));
global.setTimeout = vi.fn().mockImplementation((fn) => {
    return 123; // Mock timeout ID
});
global.clearTimeout = vi.fn();

vi.mock("../../shared/request", () => ({
    buildCollectUrl: vi.fn(),
}));

describe("makeRequest", () => {
    const mockFetch = fetch as vi.MockedFunction<typeof fetch>;
    const mockAbort = vi.fn();
    const mockAbortController = {
        signal: {},
        abort: mockAbort,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (global.AbortController as any).mockReturnValue(mockAbortController);
    });

    it("should make a GET request with correct headers", async () => {
        const { buildCollectUrl } = await import("../../shared/request");
        const mockBuildCollectUrl = buildCollectUrl as vi.MockedFunction<
            typeof buildCollectUrl
        >;

        const fullUrl = "https://example.com/collect?p=/test&h=example.com";
        mockBuildCollectUrl.mockReturnValue(fullUrl);

        mockFetch.mockResolvedValue({
            text: vi.fn().mockResolvedValue("ok"),
        } as any);

        const url = "https://example.com/collect";
        const params: CollectRequestParams = {
            p: "/test",
            h: "example.com",
            r: "",
            sid: "test-site",
        };

        await makeRequest(url, params);

        expect(mockBuildCollectUrl).toHaveBeenCalledWith(url, params, true);
        expect(mockFetch).toHaveBeenCalledWith(fullUrl, {
            method: "GET",
            headers: {
                "Content-Type": "text/plain",
                "User-Agent": "Counterscale-Tracker-Server/3.2.0",
            },
            signal: mockAbortController.signal,
        });
    });

    it("should set up timeout and clear it on success", async () => {
        const { buildCollectUrl } = await import("../../shared/request");
        const mockBuildCollectUrl = buildCollectUrl as vi.MockedFunction<
            typeof buildCollectUrl
        >;

        mockBuildCollectUrl.mockReturnValue("https://example.com/collect");
        mockFetch.mockResolvedValue({
            text: vi.fn().mockResolvedValue("ok"),
        } as any);

        const timeout = 2000;
        await makeRequest("https://example.com/collect", {} as any, timeout);

        expect(global.setTimeout).toHaveBeenCalledWith(
            expect.any(Function),
            timeout,
        );
        expect(global.clearTimeout).toHaveBeenCalledWith(123);
    });

    it("should use default timeout when not specified", async () => {
        const { buildCollectUrl } = await import("../../shared/request");
        const mockBuildCollectUrl = buildCollectUrl as vi.MockedFunction<
            typeof buildCollectUrl
        >;

        mockBuildCollectUrl.mockReturnValue("https://example.com/collect");
        mockFetch.mockResolvedValue({
            text: vi.fn().mockResolvedValue("ok"),
        } as any);

        await makeRequest("https://example.com/collect", {} as any);

        expect(global.setTimeout).toHaveBeenCalledWith(
            expect.any(Function),
            1000,
        );
    });

    it("should consume response text", async () => {
        const { buildCollectUrl } = await import("../../shared/request");
        const mockBuildCollectUrl = buildCollectUrl as vi.MockedFunction<
            typeof buildCollectUrl
        >;

        mockBuildCollectUrl.mockReturnValue("https://example.com/collect");
        const mockText = vi.fn().mockResolvedValue("response body");
        mockFetch.mockResolvedValue({
            text: mockText,
        } as any);

        await makeRequest("https://example.com/collect", {} as any);

        expect(mockText).toHaveBeenCalled();
    });

    it("should not throw on fetch error", async () => {
        const { buildCollectUrl } = await import("../../shared/request");
        const mockBuildCollectUrl = buildCollectUrl as vi.MockedFunction<
            typeof buildCollectUrl
        >;

        mockBuildCollectUrl.mockReturnValue("https://example.com/collect");
        mockFetch.mockRejectedValue(new Error("Network error"));

        await expect(
            makeRequest("https://example.com/collect", {} as any),
        ).resolves.not.toThrow();
    });

    it("should not throw on timeout", async () => {
        const { buildCollectUrl } = await import("../../shared/request");
        const mockBuildCollectUrl = buildCollectUrl as vi.MockedFunction<
            typeof buildCollectUrl
        >;

        mockBuildCollectUrl.mockReturnValue("https://example.com/collect");
        mockFetch.mockImplementation(
            () => new Promise((_, reject) => reject(new Error("Timeout"))),
        );

        await expect(
            makeRequest("https://example.com/collect", {} as any),
        ).resolves.not.toThrow();
    });

    it("should set up abort controller", async () => {
        const { buildCollectUrl } = await import("../../shared/request");
        const mockBuildCollectUrl = buildCollectUrl as vi.MockedFunction<
            typeof buildCollectUrl
        >;

        mockBuildCollectUrl.mockReturnValue("https://example.com/collect");
        mockFetch.mockResolvedValue({
            text: vi.fn().mockResolvedValue("ok"),
        } as any);

        await makeRequest("https://example.com/collect", {} as any);

        expect(global.AbortController).toHaveBeenCalled();
    });
});
