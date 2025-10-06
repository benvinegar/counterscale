import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    isLocalhostAddress,
    getHostnameAndPath,
    getReferrer,
    getUtmParamsFromUrl,
    getUtmParamsFromBrowserUrl,
    mergeUtmParams,
    queryParamStringify,
} from "../utils";

describe("Shared Utils", () => {
    describe("isLocalhostAddress", () => {
        it("should return true for localhost", () => {
            expect(isLocalhostAddress("localhost")).toBe(true);
        });

        it("should return true for 127.0.0.1", () => {
            expect(isLocalhostAddress("127.0.0.1")).toBe(true);
        });

        it("should return true for IPv6 localhost", () => {
            expect(isLocalhostAddress("::1")).toBe(true);
        });

        it("should return true for variations of 127.x.x.x", () => {
            expect(isLocalhostAddress("127.1")).toBe(true);
            expect(isLocalhostAddress("127.0.1")).toBe(true);
            expect(isLocalhostAddress("127.1.2.3")).toBe(true);
        });

        it("should return false for external addresses", () => {
            expect(isLocalhostAddress("example.com")).toBe(false);
            expect(isLocalhostAddress("192.168.1.1")).toBe(false);
            expect(isLocalhostAddress("8.8.8.8")).toBe(false);
            expect(isLocalhostAddress("")).toBe(false);
        });
    });

    describe("getHostnameAndPath", () => {
        describe("server mode (useBrowserDOM = false)", () => {
            it("should parse full URL correctly", () => {
                const result = getHostnameAndPath("https://example.com/path");

                expect(result.hostname).toBe("https://example.com");
                expect(result.path).toBe("/path");
            });

            it("should handle URLs with query parameters", () => {
                const result = getHostnameAndPath(
                    "https://example.com/path?query=value",
                );

                expect(result.hostname).toBe("https://example.com");
                expect(result.path).toBe("/path");
            });

            it("should handle URLs with ports", () => {
                const result = getHostnameAndPath("http://localhost:3000/path");

                expect(result.hostname).toBe("http://localhost");
                expect(result.path).toBe("/path");
            });

            it("should handle root path", () => {
                const result = getHostnameAndPath("https://example.com/");

                expect(result.hostname).toBe("https://example.com");
                expect(result.path).toBe("/");
            });
        });

        describe("browser mode (useBrowserDOM = true)", () => {
            let mockDocument: any;

            beforeEach(() => {
                mockDocument = {
                    createElement: vi.fn().mockReturnValue({
                        href: "",
                        protocol: "",
                        hostname: "",
                        pathname: "",
                    }),
                };
                (global as any).document = mockDocument;
            });

            afterEach(() => {
                delete (global as any).document;
            });

            it("should use DOM element for parsing when available", () => {
                const mockAnchor = {
                    href: "",
                    protocol: "https:",
                    hostname: "example.com",
                    pathname: "/path",
                };
                mockDocument.createElement.mockReturnValue(mockAnchor);

                const result = getHostnameAndPath(
                    "https://example.com/path",
                    true,
                );

                expect(mockDocument.createElement).toHaveBeenCalledWith("a");
                expect(mockAnchor.href).toBe("https://example.com/path");
                expect(result.hostname).toBe("https://example.com");
                expect(result.path).toBe("/path");
            });

            it("should fall back to URL constructor when document not available", () => {
                delete (global as any).document;

                const result = getHostnameAndPath(
                    "https://example.com/path",
                    true,
                );

                expect(result.hostname).toBe("https://example.com");
                expect(result.path).toBe("/path");
            });
        });
    });

    describe("getReferrer", () => {
        it("should return empty string for empty referrer", () => {
            const result = getReferrer("https://example.com", "");

            expect(result).toBe("");
        });

        it("should return empty string for same-hostname referrer", () => {
            const result = getReferrer(
                "https://example.com",
                "https://example.com/previous-page",
            );

            expect(result).toBe("");
        });

        it("should return referrer without query params for external referrer", () => {
            const result = getReferrer(
                "https://example.com",
                "https://google.com/search?q=test",
            );

            expect(result).toBe("https://google.com/search");
        });

        it("should handle referrer without query params", () => {
            const result = getReferrer(
                "https://example.com",
                "https://google.com/search",
            );

            expect(result).toBe("https://google.com/search");
        });

        it("should handle partial hostname matches", () => {
            const result = getReferrer(
                "https://app.example.com",
                "https://example.com/page",
            );

            expect(result).toBe("https://example.com/page");
        });
    });

    describe("getUtmParamsFromUrl", () => {
        it("should extract all UTM parameters", () => {
            const url =
                "https://example.com/page?utm_source=google&utm_medium=cpc&utm_campaign=summer&utm_term=shoes&utm_content=ad1";

            const result = getUtmParamsFromUrl(url);

            expect(result).toEqual({
                us: "google",
                um: "cpc",
                uc: "summer",
                ut: "shoes",
                uco: "ad1",
            });
        });

        it("should handle partial UTM parameters", () => {
            const url =
                "https://example.com/page?utm_source=google&utm_medium=cpc";

            const result = getUtmParamsFromUrl(url);

            expect(result).toEqual({
                us: "google",
                um: "cpc",
            });
        });

        it("should return empty object for URL without UTM parameters", () => {
            const url = "https://example.com/page";

            const result = getUtmParamsFromUrl(url);

            expect(result).toEqual({});
        });

        it("should return empty object for invalid URL", () => {
            const result = getUtmParamsFromUrl("invalid-url");

            expect(result).toEqual({});
        });

        it("should ignore empty UTM parameter values", () => {
            const url = "https://example.com/page?utm_source=&utm_medium=cpc";

            const result = getUtmParamsFromUrl(url);

            expect(result).toEqual({
                um: "cpc",
            });
        });
    });

    describe("getUtmParamsFromBrowserUrl", () => {
        it("should extract UTM parameters from path with query string", () => {
            const url = "/page?utm_source=google&utm_medium=cpc";

            const result = getUtmParamsFromBrowserUrl(url);

            expect(result).toEqual({
                us: "google",
                um: "cpc",
            });
        });

        it("should return empty object for path without query string", () => {
            const url = "/page";

            const result = getUtmParamsFromBrowserUrl(url);

            expect(result).toEqual({});
        });

        it("should handle complex query strings", () => {
            const url =
                "/page?other=value&utm_source=facebook&another=param&utm_campaign=test";

            const result = getUtmParamsFromBrowserUrl(url);

            expect(result).toEqual({
                us: "facebook",
                uc: "test",
            });
        });

        it("should ignore empty UTM values", () => {
            const url = "/page?utm_source=&utm_medium=email&utm_campaign=";

            const result = getUtmParamsFromBrowserUrl(url);

            expect(result).toEqual({
                um: "email",
            });
        });
    });

    describe("mergeUtmParams", () => {
        it("should merge multiple UTM parameter objects", () => {
            const first = { us: "google", um: "cpc" };
            const second = { um: "email", uc: "summer" };
            const third = { uc: "winter", ut: "shoes" };

            const result = mergeUtmParams(first, second, third);

            expect(result).toEqual({
                us: "google",
                um: "email",
                uc: "winter",
                ut: "shoes",
            });
        });

        it("should handle empty objects", () => {
            const result = mergeUtmParams({}, { us: "google" }, {});

            expect(result).toEqual({
                us: "google",
            });
        });

        it("should return empty object when no parameters provided", () => {
            const result = mergeUtmParams();

            expect(result).toEqual({});
        });

        it("should override values with later objects (right-to-left precedence)", () => {
            const first = { us: "google", um: "cpc" };
            const second = { us: "facebook", uc: "summer" };

            const result = mergeUtmParams(first, second);

            expect(result).toEqual({
                us: "facebook",
                um: "cpc",
                uc: "summer",
            });
        });
    });

    describe("queryParamStringify", () => {
        it("should convert object to query string", () => {
            const obj = {
                name: "value",
                another: "test",
            };

            const result = queryParamStringify(obj);

            expect(result).toBe("?name=value&another=test");
        });

        it("should handle URL encoding", () => {
            const obj = {
                "key with spaces": "value with spaces",
                special: "value&with=special*chars",
            };

            const result = queryParamStringify(obj);

            expect(result).toBe(
                "?key%20with%20spaces=value%20with%20spaces&special=value%26with%3Dspecial*chars",
            );
        });

        it("should filter undefined values", () => {
            const obj = {
                defined: "value",
                undefined: undefined,
                another: "test",
            };

            const result = queryParamStringify(obj);

            expect(result).toBe("?defined=value&another=test");
        });

        it("should filter empty strings when filterEmpty is true", () => {
            const obj = {
                notEmpty: "value",
                empty: "",
                another: "test",
            };

            const result = queryParamStringify(obj, true);

            expect(result).toBe("?notEmpty=value&another=test");
        });

        it("should keep empty strings when filterEmpty is false", () => {
            const obj = {
                notEmpty: "value",
                empty: "",
            };

            const result = queryParamStringify(obj, false);

            expect(result).toBe("?notEmpty=value&empty=");
        });

        it("should return '?' for empty object", () => {
            const result = queryParamStringify({});

            expect(result).toBe("?");
        });

        it("should handle object with only undefined values", () => {
            const obj = {
                undefined1: undefined,
                undefined2: undefined,
            };

            const result = queryParamStringify(obj);

            expect(result).toBe("?");
        });
    });
});
