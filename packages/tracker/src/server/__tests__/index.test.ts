import { describe, it, expect, beforeEach, vi } from "vitest";
import * as serverTracker from "../index";
import { ServerClient } from "../client";

vi.mock("../request");
vi.mock("../track");

describe("Server Tracker Index", () => {
    beforeEach(() => {
        serverTracker.cleanup();
        vi.clearAllMocks();
    });

    describe("init", () => {
        it("should initialize the client", () => {
            const opts = {
                siteId: "test-site",
                reporterUrl: "https://example.com/collect",
            };

            serverTracker.init(opts);

            expect(serverTracker.isInitialized()).toBe(true);
            expect(serverTracker.getInitializedClient()).toBeInstanceOf(
                ServerClient,
            );
        });

        it("should not reinitialize if already initialized", () => {
            const opts = {
                siteId: "test-site",
                reporterUrl: "https://example.com/collect",
            };

            serverTracker.init(opts);
            const firstClient = serverTracker.getInitializedClient();

            serverTracker.init(opts);
            const secondClient = serverTracker.getInitializedClient();

            expect(firstClient).toBe(secondClient);
        });
    });

    describe("isInitialized", () => {
        it("should return false when not initialized", () => {
            expect(serverTracker.isInitialized()).toBe(false);
        });

        it("should return true when initialized", () => {
            serverTracker.init({
                siteId: "test-site",
                reporterUrl: "https://example.com/collect",
            });

            expect(serverTracker.isInitialized()).toBe(true);
        });
    });

    describe("getInitializedClient", () => {
        it("should return undefined when not initialized", () => {
            expect(serverTracker.getInitializedClient()).toBeUndefined();
        });

        it("should return the client when initialized", () => {
            serverTracker.init({
                siteId: "test-site",
                reporterUrl: "https://example.com/collect",
            });

            const client = serverTracker.getInitializedClient();
            expect(client).toBeInstanceOf(ServerClient);
            expect(client?.siteId).toBe("test-site");
        });
    });

    describe("trackPageview", () => {
        it("should throw error when not initialized", () => {
            expect(() => {
                serverTracker.trackPageview({
                    url: "https://example.com/page",
                });
            }).toThrow("You must call init() before calling trackPageview().");
        });

        it("should call track function when initialized", async () => {
            const { trackPageview: mockTrackPageview } = await import(
                "../track"
            );

            serverTracker.init({
                siteId: "test-site",
                reporterUrl: "https://example.com/collect",
            });

            const opts = { url: "https://example.com/page" };
            await serverTracker.trackPageview(opts);

            expect(mockTrackPageview).toHaveBeenCalledWith(
                serverTracker.getInitializedClient(),
                opts,
            );
        });
    });

    describe("cleanup", () => {
        it("should be no-op when not initialized", () => {
            expect(() => serverTracker.cleanup()).not.toThrow();
        });

        it("should cleanup and reset client", () => {
            serverTracker.init({
                siteId: "test-site",
                reporterUrl: "https://example.com/collect",
            });

            expect(serverTracker.isInitialized()).toBe(true);

            serverTracker.cleanup();

            expect(serverTracker.isInitialized()).toBe(false);
            expect(serverTracker.getInitializedClient()).toBeUndefined();
        });
    });
});
