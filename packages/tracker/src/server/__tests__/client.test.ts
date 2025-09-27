import { describe, it, expect } from "vitest";
import { ServerClient } from "../client";
import type { ServerClientOpts } from "../types";

describe("ServerClient", () => {
    const basicOpts: ServerClientOpts = {
        siteId: "test-site",
        reporterUrl: "https://example.com/collect",
    };

    describe("constructor", () => {
        it("should initialize with basic required options", () => {
            const client = new ServerClient(basicOpts);

            expect(client.siteId).toBe("test-site");
            expect(client.reporterUrl).toBe("https://example.com/collect");
            expect(client.reportOnLocalhost).toBe(false);
            expect(client.userAgent).toBeUndefined();
            expect(client.timeout).toBe(1000);
        });

        it("should set reportOnLocalhost when provided", () => {
            const client = new ServerClient({
                ...basicOpts,
                reportOnLocalhost: true,
            });

            expect(client.reportOnLocalhost).toBe(true);
        });

        it("should set userAgent when provided", () => {
            const userAgent = "Custom-User-Agent/1.0";
            const client = new ServerClient({
                ...basicOpts,
                userAgent,
            });

            expect(client.userAgent).toBe(userAgent);
        });

        it("should set custom timeout when provided", () => {
            const client = new ServerClient({
                ...basicOpts,
                timeout: 5000,
            });

            expect(client.timeout).toBe(5000);
        });

        it("should set all options when provided", () => {
            const allOpts: ServerClientOpts = {
                siteId: "full-test-site",
                reporterUrl: "https://full-example.com/collect",
                reportOnLocalhost: true,
                userAgent: "Full-User-Agent/2.0",
                timeout: 3000,
            };

            const client = new ServerClient(allOpts);

            expect(client.siteId).toBe("full-test-site");
            expect(client.reporterUrl).toBe("https://full-example.com/collect");
            expect(client.reportOnLocalhost).toBe(true);
            expect(client.userAgent).toBe("Full-User-Agent/2.0");
            expect(client.timeout).toBe(3000);
        });
    });

    describe("cleanup", () => {
        it("should not throw when called", () => {
            const client = new ServerClient(basicOpts);

            expect(() => client.cleanup()).not.toThrow();
        });

        it("should be a no-op for server client", () => {
            const client = new ServerClient(basicOpts);

            client.cleanup();

            expect(client.siteId).toBe("test-site");
            expect(client.reporterUrl).toBe("https://example.com/collect");
        });
    });
});
