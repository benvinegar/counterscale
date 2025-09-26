import { describe, it, expect, vi, beforeEach } from "vitest";
import { trackPageview } from "../track";
import { ServerClient } from "../client";
import type { ServerTrackPageviewOpts } from "../types";

vi.mock("../request", () => ({
    makeRequest: vi.fn(),
}));

vi.mock("../../shared/utils", () => ({
    getHostnameAndPath: vi.fn(),
    getReferrer: vi.fn(),
    isLocalhostAddress: vi.fn(),
    getUtmParamsFromUrl: vi.fn(),
    mergeUtmParams: vi.fn(),
}));

vi.mock("../../shared/request", () => ({
    buildCollectRequestParams: vi.fn(),
}));

describe("trackPageview", () => {
    let client: ServerClient;

    beforeEach(() => {
        vi.clearAllMocks();
        client = new ServerClient({
            siteId: "test-site",
            reporterUrl: "https://example.com/collect",
        });
    });

    describe("URL validation", () => {
        it("should throw error when url is missing", async () => {
            await expect(
                trackPageview(client, {} as ServerTrackPageviewOpts),
            ).rejects.toThrow("url is required for server-side tracking");
        });

        it("should throw error for invalid URL", async () => {
            await expect(
                trackPageview(client, { url: "invalid-url" }),
            ).rejects.toThrow("Invalid URL: invalid-url");
        });

        it("should throw error when hostname is required for relative URL", async () => {
            await expect(
                trackPageview(client, { url: "/relative-path" }),
            ).rejects.toThrow(
                "hostname is required when tracking relative URLs",
            );
        });

        it("should handle relative URL with hostname", async () => {
            const { makeRequest } = await import("../request");
            const {
                getHostnameAndPath,
                getReferrer,
                isLocalhostAddress,
                getUtmParamsFromUrl,
                mergeUtmParams,
            } = await import("../../shared/utils");
            const { buildCollectRequestParams } = await import(
                "../../shared/request"
            );

            (getHostnameAndPath as any).mockReturnValue({
                hostname: "https://example.com",
                path: "/test",
            });
            (getReferrer as any).mockReturnValue("");
            (isLocalhostAddress as any).mockReturnValue(false);
            (getUtmParamsFromUrl as any).mockReturnValue({});
            (mergeUtmParams as any).mockReturnValue({});
            (buildCollectRequestParams as any).mockReturnValue({});

            await trackPageview(client, {
                url: "/test",
                hostname: "example.com",
            });

            expect(makeRequest).toHaveBeenCalled();
        });

        it("should use http protocol for localhost hostname", async () => {
            const {
                getHostnameAndPath,
                getReferrer,
                isLocalhostAddress,
                getUtmParamsFromUrl,
                mergeUtmParams,
            } = await import("../../shared/utils");
            const { buildCollectRequestParams } = await import(
                "../../shared/request"
            );

            (getHostnameAndPath as any).mockReturnValue({
                hostname: "http://localhost",
                path: "/test",
            });
            (getReferrer as any).mockReturnValue("");
            (isLocalhostAddress as any).mockReturnValue(true);
            (getUtmParamsFromUrl as any).mockReturnValue({});
            (mergeUtmParams as any).mockReturnValue({});
            (buildCollectRequestParams as any).mockReturnValue({});

            client.reportOnLocalhost = true;

            await trackPageview(client, {
                url: "/test",
                hostname: "localhost",
            });

            expect(getHostnameAndPath).toHaveBeenCalledWith(
                "http://localhost/test",
            );
        });
    });

    describe("localhost handling", () => {
        it("should skip tracking for localhost when reportOnLocalhost is false", async () => {
            const { makeRequest } = await import("../request");
            const { getHostnameAndPath, isLocalhostAddress } = await import(
                "../../shared/utils"
            );

            (getHostnameAndPath as any).mockReturnValue({
                hostname: "http://localhost",
                path: "/test",
            });
            (isLocalhostAddress as any).mockReturnValue(true);

            client.reportOnLocalhost = false;

            await trackPageview(client, {
                url: "http://localhost/test",
            });

            expect(makeRequest).not.toHaveBeenCalled();
        });

        it("should track localhost when reportOnLocalhost is true", async () => {
            const { makeRequest } = await import("../request");
            const {
                getHostnameAndPath,
                getReferrer,
                isLocalhostAddress,
                getUtmParamsFromUrl,
                mergeUtmParams,
            } = await import("../../shared/utils");
            const { buildCollectRequestParams } = await import(
                "../../shared/request"
            );

            (getHostnameAndPath as any).mockReturnValue({
                hostname: "http://localhost",
                path: "/test",
            });
            (getReferrer as any).mockReturnValue("");
            (isLocalhostAddress as any).mockReturnValue(true);
            (getUtmParamsFromUrl as any).mockReturnValue({});
            (mergeUtmParams as any).mockReturnValue({});
            (buildCollectRequestParams as any).mockReturnValue({});

            client.reportOnLocalhost = true;

            await trackPageview(client, {
                url: "http://localhost/test",
            });

            expect(makeRequest).toHaveBeenCalled();
        });
    });

    describe("UTM parameter handling", () => {
        it("should extract and merge UTM parameters", async () => {
            const {
                getHostnameAndPath,
                getReferrer,
                isLocalhostAddress,
                getUtmParamsFromUrl,
                mergeUtmParams,
            } = await import("../../shared/utils");
            const { buildCollectRequestParams } = await import(
                "../../shared/request"
            );

            const urlUtmParams = { us: "url-source" };
            const optsUtmParams = { us: "opts-source", um: "opts-medium" };
            const mergedParams = { us: "opts-source", um: "opts-medium" };

            (getHostnameAndPath as any).mockReturnValue({
                hostname: "https://example.com",
                path: "/test",
            });
            (getReferrer as any).mockReturnValue("");
            (isLocalhostAddress as any).mockReturnValue(false);
            (getUtmParamsFromUrl as any).mockReturnValue(urlUtmParams);
            (mergeUtmParams as any).mockReturnValue(mergedParams);
            (buildCollectRequestParams as any).mockReturnValue({});

            await trackPageview(client, {
                url: "https://example.com/test?utm_source=url-source",
                utmSource: "opts-source",
                utmMedium: "opts-medium",
            });

            expect(getUtmParamsFromUrl).toHaveBeenCalledWith(
                "https://example.com/test?utm_source=url-source",
            );
            expect(mergeUtmParams).toHaveBeenCalledWith(
                urlUtmParams,
                optsUtmParams,
            );
            expect(buildCollectRequestParams).toHaveBeenCalledWith(
                "test-site",
                "https://example.com",
                "/test",
                "",
                mergedParams,
                "1",
            );
        });

        it("should handle all UTM parameters from options", async () => {
            const {
                getHostnameAndPath,
                getReferrer,
                isLocalhostAddress,
                getUtmParamsFromUrl,
                mergeUtmParams,
            } = await import("../../shared/utils");

            (getHostnameAndPath as any).mockReturnValue({
                hostname: "https://example.com",
                path: "/test",
            });
            (getReferrer as any).mockReturnValue("");
            (isLocalhostAddress as any).mockReturnValue(false);
            (getUtmParamsFromUrl as any).mockReturnValue({});
            (mergeUtmParams as any).mockReturnValue({});

            await trackPageview(client, {
                url: "https://example.com/test",
                utmSource: "source",
                utmMedium: "medium",
                utmCampaign: "campaign",
                utmTerm: "term",
                utmContent: "content",
            });

            expect(mergeUtmParams).toHaveBeenCalledWith(
                {},
                {
                    us: "source",
                    um: "medium",
                    uc: "campaign",
                    ut: "term",
                    uco: "content",
                },
            );
        });
    });

    describe("request building", () => {
        it("should build request with correct parameters", async () => {
            const { makeRequest } = await import("../request");
            const {
                getHostnameAndPath,
                getReferrer,
                isLocalhostAddress,
                getUtmParamsFromUrl,
                mergeUtmParams,
            } = await import("../../shared/utils");
            const { buildCollectRequestParams } = await import(
                "../../shared/request"
            );

            const requestParams = {
                p: "/test",
                h: "https://example.com",
                r: "https://referrer.com",
                sid: "test-site",
                ht: "1",
            };

            (getHostnameAndPath as any).mockReturnValue({
                hostname: "https://example.com",
                path: "/test",
            });
            (getReferrer as any).mockReturnValue("https://referrer.com");
            (isLocalhostAddress as any).mockReturnValue(false);
            (getUtmParamsFromUrl as any).mockReturnValue({});
            (mergeUtmParams as any).mockReturnValue({});
            (buildCollectRequestParams as any).mockReturnValue(requestParams);

            await trackPageview(client, {
                url: "https://example.com/test",
                referrer: "https://referrer.com/page",
            });

            expect(buildCollectRequestParams).toHaveBeenCalledWith(
                "test-site",
                "https://example.com",
                "/test",
                "https://referrer.com",
                {},
                "1",
            );

            expect(makeRequest).toHaveBeenCalledWith(
                "https://example.com/collect",
                requestParams,
                1000,
            );
        });

        it("should use client timeout", async () => {
            const { makeRequest } = await import("../request");
            const {
                getHostnameAndPath,
                getReferrer,
                isLocalhostAddress,
                getUtmParamsFromUrl,
                mergeUtmParams,
            } = await import("../../shared/utils");
            const { buildCollectRequestParams } = await import(
                "../../shared/request"
            );

            (getHostnameAndPath as any).mockReturnValue({
                hostname: "https://example.com",
                path: "/test",
            });
            (getReferrer as any).mockReturnValue("");
            (isLocalhostAddress as any).mockReturnValue(false);
            (getUtmParamsFromUrl as any).mockReturnValue({});
            (mergeUtmParams as any).mockReturnValue({});
            (buildCollectRequestParams as any).mockReturnValue({});

            client.timeout = 5000;

            await trackPageview(client, {
                url: "https://example.com/test",
            });

            expect(makeRequest).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Object),
                5000,
            );
        });
    });
});
