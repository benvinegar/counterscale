/*eslint @typescript-eslint/no-explicit-any: 0 */
import { Mock, describe, expect, test, vi, beforeEach } from "vitest";
import httpMocks from "node-mocks-http";

import { collectRequestHandler } from "../collect";
import { AnalyticsEngineDataset } from "@cloudflare/workers-types";

const defaultRequestParams = generateRequestParams({
    "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36",
});

function generateRequestParams(headers: Record<string, string>) {
    return {
        method: "GET",
        url:
            "https://example.com/user/42?" +
            new URLSearchParams({
                sid: "example",
                h: "example.com",
                p: "/post/123",
                r: "https://google.com",
                nv: "1",
                ns: "1",
            }).toString(),
        headers: {
            get: (_header: string) => {
                return headers[_header];
            },
        },
        // Cloudflare-specific request properties
        cf: {
            country: "US",
        },
    };
}

describe("collectRequestHandler", () => {
    beforeEach(() => {
        // default time is just middle of the day
        vi.setSystemTime(new Date("2024-01-18T09:33:02").getTime());
    });

    test("invokes writeDataPoint with transformed params", () => {
        const env = {
            WEB_COUNTER_AE: {
                writeDataPoint: vi.fn(),
            } as AnalyticsEngineDataset,
        } as Env;

        // @ts-expect-error - we're mocking the request object
        const request = httpMocks.createRequest(defaultRequestParams);

        collectRequestHandler(request as any, env);

        const writeDataPoint = env.WEB_COUNTER_AE.writeDataPoint;
        expect(env.WEB_COUNTER_AE.writeDataPoint).toHaveBeenCalled();

        // verify data shows up in the right place
        expect((writeDataPoint as Mock).mock.calls[0][0]).toEqual({
            blobs: [
                "example.com", // host
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36", // ua string
                "/post/123", // url
                "US", // country
                "https://google.com", // referrer
                "Chrome", // browser name
                "",
                "example", // site id
            ],
            doubles: [
                1, // new visitor
                1, // new session
            ],
            indexes: [
                "example", // site id is index
            ],
        });
    });

    test("if-modified-since is absent", () => {
        const env = {
            WEB_COUNTER_AE: {
                writeDataPoint: vi.fn(),
            } as AnalyticsEngineDataset,
        } as Env;

        // @ts-expect-error - we're mocking the request object
        const request = httpMocks.createRequest(generateRequestParams({}));

        collectRequestHandler(request as any, env);

        const writeDataPoint = env.WEB_COUNTER_AE.writeDataPoint;
        expect((writeDataPoint as Mock).mock.calls[0][0]).toHaveProperty(
            "doubles",
            [
                1, // new visitor
                1, // new session
            ],
        );
    });

    test("if-modified-since is within 30 minutes", () => {
        const env = {
            WEB_COUNTER_AE: {
                writeDataPoint: vi.fn(),
            } as AnalyticsEngineDataset,
        } as Env;

        const request = httpMocks.createRequest(
            // @ts-expect-error - we're mocking the request object
            generateRequestParams({
                "if-modified-since": new Date(
                    Date.now() - 5 * 60 * 1000, // 5 mins ago
                ).toUTCString(),
            }),
        );

        collectRequestHandler(request as any, env);

        const writeDataPoint = env.WEB_COUNTER_AE.writeDataPoint;
        expect((writeDataPoint as Mock).mock.calls[0][0]).toHaveProperty(
            "doubles",
            [
                0, // NOT a new visitor
                0, // NOT a new session
            ],
        );
    });

    test("if-modified since is within 30 minutes but over day boundary", () => {
        const env = {
            WEB_COUNTER_AE: {
                writeDataPoint: vi.fn(),
            } as AnalyticsEngineDataset,
        } as Env;

        // intentionally set system time as 00:15:00
        // if the user last visited ~30 minutes ago, that occurred during
        // the prior day, so this should be considered a new visit
        vi.setSystemTime(new Date("2024-01-18T00:15:00").getTime());

        const request = httpMocks.createRequest(
            // @ts-expect-error - we're mocking the request object
            generateRequestParams({
                "if-modified-since": new Date(
                    Date.now() - 25 * 60 * 1000, // 25 minutes ago
                ).toUTCString(),
            }),
        );

        collectRequestHandler(request as any, env);

        const writeDataPoint = env.WEB_COUNTER_AE.writeDataPoint;
        expect((writeDataPoint as Mock).mock.calls[0][0]).toHaveProperty(
            "doubles",
            [
                1, // new visitor because a new day began
                0, // NOT a new session because continuation of earlier session (< 30 mins)
                // (session logic doesn't care if a new day began or not)
            ],
        );
    });

    test("if-modified-since is over 30 days ago", () => {
        const env = {
            WEB_COUNTER_AE: {
                writeDataPoint: vi.fn(),
            } as AnalyticsEngineDataset,
        } as Env;

        const request = httpMocks.createRequest(
            // @ts-expect-error - we're mocking the request object
            generateRequestParams({
                "if-modified-since": new Date(
                    Date.now() - 31 * 24 * 60 * 60 * 1000, // 31 days ago
                ).toUTCString(),
            }),
        );

        collectRequestHandler(request as any, env);

        const writeDataPoint = env.WEB_COUNTER_AE.writeDataPoint;
        expect((writeDataPoint as Mock).mock.calls[0][0]).toHaveProperty(
            "doubles",
            [
                1, // new visitor because > 30 days passed
                1, // new session because > 30 minutes passed
            ],
        );
    });

    test("if-modified-since was yesterday", () => {
        const env = {
            WEB_COUNTER_AE: {
                writeDataPoint: vi.fn(),
            } as AnalyticsEngineDataset,
        } as Env;

        const request = httpMocks.createRequest(
            // @ts-expect-error - we're mocking the request object
            generateRequestParams({
                "if-modified-since": new Date(
                    Date.now() - 24 * 60 * 60 * 1000, // 24 hours ago
                ).toUTCString(),
            }),
        );

        collectRequestHandler(request as any, env);

        const writeDataPoint = env.WEB_COUNTER_AE.writeDataPoint;
        expect((writeDataPoint as Mock).mock.calls[0][0]).toHaveProperty(
            "doubles",
            [
                1, // new visitor because > 24 hours passed
                1, // new session because > 30 minutes passed
            ],
        );
    });

    test("a PATCH request should return 405", () => {
        const env = {
            WEB_COUNTER_AE: {
                writeDataPoint: vi.fn(),
            } as AnalyticsEngineDataset,
        } as Env;

        const request = httpMocks.createRequest({
            method: "PATCH",
            url: "https://example.com",
            // Cloudflare-specific request properties
            cf: {
                country: "US",
            },
        });

        const response = collectRequestHandler(request as any, env);

        expect(response.status).toBe(405);
        expect(response.statusText).toBe("Method not allowed");
    });
});
