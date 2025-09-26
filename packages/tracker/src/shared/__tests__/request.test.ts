import { describe, it, expect, vi } from "vitest";
import { buildCollectRequestParams, buildCollectUrl } from "../request";
import type { UtmParams, CollectRequestParams } from "../types";

vi.mock("../utils", () => ({
    queryParamStringify: vi.fn(),
}));

describe("Shared Request Utils", () => {
    describe("buildCollectRequestParams", () => {
        it("should build basic request parameters", () => {
            const result = buildCollectRequestParams(
                "test-site",
                "https://example.com",
                "/path",
                "https://referrer.com",
            );

            expect(result).toEqual({
                p: "/path",
                h: "https://example.com",
                r: "https://referrer.com",
                sid: "test-site",
            });
        });

        it("should include hit type when provided", () => {
            const result = buildCollectRequestParams(
                "test-site",
                "https://example.com",
                "/path",
                "https://referrer.com",
                {},
                "1",
            );

            expect(result).toEqual({
                p: "/path",
                h: "https://example.com",
                r: "https://referrer.com",
                sid: "test-site",
                ht: "1",
            });
        });

        it("should merge UTM parameters", () => {
            const utmParams: UtmParams = {
                us: "google",
                um: "cpc",
                uc: "summer",
            };

            const result = buildCollectRequestParams(
                "test-site",
                "https://example.com",
                "/path",
                "",
                utmParams,
            );

            expect(result).toEqual({
                p: "/path",
                h: "https://example.com",
                r: "",
                sid: "test-site",
                us: "google",
                um: "cpc",
                uc: "summer",
            });
        });

        it("should handle empty UTM parameters", () => {
            const result = buildCollectRequestParams(
                "test-site",
                "https://example.com",
                "/path",
                "",
                {},
            );

            expect(result).toEqual({
                p: "/path",
                h: "https://example.com",
                r: "",
                sid: "test-site",
            });
        });

        it("should handle undefined UTM parameters", () => {
            const result = buildCollectRequestParams(
                "test-site",
                "https://example.com",
                "/path",
                "",
            );

            expect(result).toEqual({
                p: "/path",
                h: "https://example.com",
                r: "",
                sid: "test-site",
            });
        });

        it("should include all parameters when all are provided", () => {
            const utmParams: UtmParams = {
                us: "facebook",
                um: "social",
                uc: "winter",
                ut: "boots",
                uco: "ad2",
            };

            const result = buildCollectRequestParams(
                "full-site",
                "https://full-example.com",
                "/full-path",
                "https://full-referrer.com",
                utmParams,
                "2",
            );

            expect(result).toEqual({
                p: "/full-path",
                h: "https://full-example.com",
                r: "https://full-referrer.com",
                sid: "full-site",
                ht: "2",
                us: "facebook",
                um: "social",
                uc: "winter",
                ut: "boots",
                uco: "ad2",
            });
        });
    });

    describe("buildCollectUrl", () => {
        it("should build URL with query parameters", async () => {
            const { queryParamStringify } = await import("../utils");
            const mockQueryParamStringify =
                queryParamStringify as vi.MockedFunction<
                    typeof queryParamStringify
                >;

            mockQueryParamStringify.mockReturnValue("?p=test&h=example");

            const params: CollectRequestParams = {
                p: "/test",
                h: "https://example.com",
                r: "",
                sid: "test-site",
            };

            const result = buildCollectUrl(
                "https://collect.example.com",
                params,
            );

            expect(mockQueryParamStringify).toHaveBeenCalledWith(params, false);
            expect(result).toBe("https://collect.example.com?p=test&h=example");
        });

        it("should pass filterEmpty parameter to queryParamStringify", async () => {
            const { queryParamStringify } = await import("../utils");
            const mockQueryParamStringify =
                queryParamStringify as vi.MockedFunction<
                    typeof queryParamStringify
                >;

            mockQueryParamStringify.mockReturnValue("?p=test&h=example");

            const params: CollectRequestParams = {
                p: "/test",
                h: "https://example.com",
                r: "",
                sid: "test-site",
            };

            buildCollectUrl("https://collect.example.com", params, true);

            expect(mockQueryParamStringify).toHaveBeenCalledWith(params, true);
        });

        it("should handle empty base URL", async () => {
            const { queryParamStringify } = await import("../utils");
            const mockQueryParamStringify =
                queryParamStringify as vi.MockedFunction<
                    typeof queryParamStringify
                >;

            mockQueryParamStringify.mockReturnValue("?p=test");

            const params: CollectRequestParams = {
                p: "/test",
                h: "https://example.com",
                r: "",
                sid: "test-site",
            };

            const result = buildCollectUrl("", params);

            expect(result).toBe("?p=test");
        });

        it("should handle complex parameters", async () => {
            const { queryParamStringify } = await import("../utils");
            const mockQueryParamStringify =
                queryParamStringify as vi.MockedFunction<
                    typeof queryParamStringify
                >;

            const complexQuery =
                "?p=%2Fpath&h=https%3A//example.com&us=google&um=cpc";
            mockQueryParamStringify.mockReturnValue(complexQuery);

            const params: CollectRequestParams = {
                p: "/path",
                h: "https://example.com",
                r: "",
                sid: "test-site",
                us: "google",
                um: "cpc",
            };

            const result = buildCollectUrl(
                "https://api.example.com/collect",
                params,
            );

            expect(result).toBe(
                `https://api.example.com/collect${complexQuery}`,
            );
        });
    });
});
