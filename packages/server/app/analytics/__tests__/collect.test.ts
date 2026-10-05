/*eslint @typescript-eslint/no-explicit-any: 0 */
import { Mock, describe, expect, test, vi, beforeEach } from "vitest";
import type { AnalyticsEngineDataset } from "@cloudflare/workers-types";
import httpMocks from "node-mocks-http";

import { collectRequestHandler } from "../collect";

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
                us: "google",
                um: "search",
                uc: "summer_sale",
                ut: "running_shoes",
                uco: "ad1",
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
    test("returns 400 when siteId is missing", () => {
        const env = {
            WEB_COUNTER_AE: {
                writeDataPoint: vi.fn(),
            } as AnalyticsEngineDataset,
        } as Env;

        const request = generateRequestParams({
            "user-agent":
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36",
        });
        request.url =
            "https://example.com/user/42?" +
            new URLSearchParams({
                h: "example.com",
                p: "/post/123",
                r: "https://google.com",
                nv: "1",
                ns: "1",
            }).toString();

        const response = collectRequestHandler(request as any, env);
        expect(response.status).toBe(400);
        expect(env.WEB_COUNTER_AE.writeDataPoint).not.toHaveBeenCalled();
    });

    test("returns 400 when siteId is empty string", () => {
        const env = {
            WEB_COUNTER_AE: {
                writeDataPoint: vi.fn(),
            } as AnalyticsEngineDataset,
        } as Env;

        const request = generateRequestParams({
            "user-agent":
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36",
        });
        request.url =
            "https://example.com/user/42?" +
            new URLSearchParams({
                sid: "",
                h: "example.com",
                p: "/post/123",
                r: "https://google.com",
                nv: "1",
                ns: "1",
            }).toString();

        const response = collectRequestHandler(request as any, env);
        expect(response.status).toBe(400);
        expect(env.WEB_COUNTER_AE.writeDataPoint).not.toHaveBeenCalled();
    });

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

        collectRequestHandler(request as any, env, {
            country: "US",
        });

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
                "51.x.x.x", // browser version
                "desktop", // device type
                "google", // utm_source
                "search", // utm_medium
                "summer_sale", // utm_campaign
                "running_shoes", // utm_term
                "ad1", // utm_content
            ],
            doubles: [
                1, // new visitor
                0, // DEAD COLUMN (was session)
                1, // new visit, so bounce
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
                0, // DEAD COLUMN (was session)
                1, // new visit, so bounce
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
                0, // DEAD COLUMN (was session)
                0, // NOT first or second visit
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
                0, // DEAD COLUMN (was session)
                1, // new visitor so bounce counted
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
                0, // DEAD COLUMN (was session)
                1, // new visitor so bounce
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
                0, // DEAD COLUMN (was session)
                1, // new visitor so bounce
            ],
        );
    });

    test("if-modified-since is one second after midnight", () => {
        const env = {
            WEB_COUNTER_AE: {
                writeDataPoint: vi.fn(),
            } as AnalyticsEngineDataset,
        } as Env;

        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);

        vi.setSystemTime(midnight.getTime());

        const midnightPlusOneSecond = new Date(midnight.getTime());
        midnightPlusOneSecond.setSeconds(
            midnightPlusOneSecond.getSeconds() + 1,
        );

        const request = httpMocks.createRequest(
            // @ts-expect-error - we're mocking the request object
            generateRequestParams({
                "if-modified-since": midnightPlusOneSecond.toUTCString(),
            }),
        );

        collectRequestHandler(request as any, env);

        const writeDataPoint = env.WEB_COUNTER_AE.writeDataPoint;
        expect((writeDataPoint as Mock).mock.calls[0][0]).toHaveProperty(
            "doubles",
            [
                0, // NOT a new visitor
                0, // DEAD COLUMN (was session)
                -1, // First visit after the initial visit so decrement bounce
            ],
        );
    });

    test("if-modified-since is two seconds after midnight", () => {
        const env = {
            WEB_COUNTER_AE: {
                writeDataPoint: vi.fn(),
            } as AnalyticsEngineDataset,
        } as Env;

        const midnightPlusOneSecond = new Date();
        midnightPlusOneSecond.setHours(0, 0, 1, 0);

        vi.setSystemTime(midnightPlusOneSecond.getTime());

        const midnightPlusTwoSeconds = new Date(
            midnightPlusOneSecond.getTime(),
        );
        midnightPlusTwoSeconds.setSeconds(
            midnightPlusTwoSeconds.getSeconds() + 1,
        );

        const request = httpMocks.createRequest(
            // @ts-expect-error - we're mocking the request object
            generateRequestParams({
                "if-modified-since": midnightPlusTwoSeconds.toUTCString(),
            }),
        );

        collectRequestHandler(request as any, env);

        const writeDataPoint = env.WEB_COUNTER_AE.writeDataPoint;
        expect((writeDataPoint as Mock).mock.calls[0][0]).toHaveProperty(
            "doubles",
            [
                0, // NOT a new visitor
                0, // DEAD COLUMN (was session)
                0, // After the second visit so no bounce
            ],
        );
    });

    test("handles UTM parameters correctly", () => {
        const env = {
            WEB_COUNTER_AE: {
                writeDataPoint: vi.fn(),
            } as AnalyticsEngineDataset,
        } as Env;

        const request = generateRequestParams({
            "user-agent":
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36",
        });

        collectRequestHandler(request as any, env, {
            country: "US",
        });

        const writeDataPoint = env.WEB_COUNTER_AE.writeDataPoint;
        expect(env.WEB_COUNTER_AE.writeDataPoint).toHaveBeenCalled();

        const blobs = (writeDataPoint as Mock).mock.calls[0][0].blobs;
        expect(blobs[10]).toBe("google"); // utm_source
        expect(blobs[11]).toBe("search"); // utm_medium
        expect(blobs[12]).toBe("summer_sale"); // utm_campaign
        expect(blobs[13]).toBe("running_shoes"); // utm_term
        expect(blobs[14]).toBe("ad1"); // utm_content
    });

    test("handles missing UTM parameters gracefully", () => {
        const env = {
            WEB_COUNTER_AE: {
                writeDataPoint: vi.fn(),
            } as AnalyticsEngineDataset,
        } as Env;

        const request = generateRequestParams({
            "user-agent":
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36",
        });
        // Remove UTM parameters from URL
        request.url = request.url
            .replace(/&us=[^&]*/, "")
            .replace(/&um=[^&]*/, "")
            .replace(/&uc=[^&]*/, "")
            .replace(/&ut=[^&]*/, "")
            .replace(/&uco=[^&]*/, "");

        collectRequestHandler(request as any, env, {
            country: "US",
        });

        const writeDataPoint = env.WEB_COUNTER_AE.writeDataPoint;
        expect(env.WEB_COUNTER_AE.writeDataPoint).toHaveBeenCalled();

        const blobs = (writeDataPoint as Mock).mock.calls[0][0].blobs;
        expect(blobs[10]).toBe(""); // utm_source (empty)
        expect(blobs[11]).toBe(""); // utm_medium (empty)
        expect(blobs[12]).toBe(""); // utm_campaign (empty)
        expect(blobs[13]).toBe(""); // utm_term (empty)
        expect(blobs[14]).toBe(""); // utm_content (empty)
    });
});

describe("collectRequestHandler allowlist enforcement", () => {
    const UA =
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36";

    function buildRequest(opts: {
        h: string;
        r?: string;
        origin?: string;
        referer?: string;
    }) {
        const headers: Record<string, string> = { "user-agent": UA };
        if (opts.origin) headers["origin"] = opts.origin;
        if (opts.referer) headers["referer"] = opts.referer;
        return {
            method: "GET",
            url:
                "https://example.com/collect?" +
                new URLSearchParams({
                    sid: "example",
                    h: opts.h,
                    p: "/",
                    r: opts.r ?? "",
                    ht: "1",
                }).toString(),
            headers: {
                get: (header: string) => headers[header],
            },
        };
    }

    function makeEnv(allowed?: string) {
        return {
            WEB_COUNTER_AE: { writeDataPoint: vi.fn() },
            TRACKER_ALLOWED_ORIGINS: allowed,
        } as unknown as Env;
    }

    test("writes when h matches a listed origin via subdomain", () => {
        const env = makeEnv("pmux.io");
        collectRequestHandler(
            buildRequest({ h: "https://docs.pmux.io" }) as any,
            env,
        );
        expect(env.WEB_COUNTER_AE.writeDataPoint).toHaveBeenCalled();
    });

    test("silently drops (200 gif, no write) when h is not allowed", () => {
        const env = makeEnv("pmux.io");
        const response = collectRequestHandler(
            buildRequest({ h: "https://evil.com" }) as any,
            env,
        );
        expect(env.WEB_COUNTER_AE.writeDataPoint).not.toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("image/gif");
        // Drop path must NOT set Last-Modified: the tracker uses it for
        // cookieless visit counting, and updating it on a dropped hit would
        // corrupt session state.
        expect(response.headers.get("Last-Modified")).toBeNull();
    });

    test("writes when h is a bare hostname (no scheme) that is allowed", () => {
        const env = makeEnv("pmux.io");
        collectRequestHandler(buildRequest({ h: "docs.pmux.io" }) as any, env);
        expect(env.WEB_COUNTER_AE.writeDataPoint).toHaveBeenCalled();
    });

    test("writes when only the Referer header is present and allowed", () => {
        const env = makeEnv("pmux.io");
        collectRequestHandler(
            buildRequest({
                h: "https://docs.pmux.io",
                referer: "https://docs.pmux.io/guide",
            }) as any,
            env,
        );
        expect(env.WEB_COUNTER_AE.writeDataPoint).toHaveBeenCalled();
    });

    test("does not drop legit traffic from an opaque 'null' Origin", () => {
        // Sandboxed iframes send Origin: null; this must not block an
        // otherwise-allowed hit.
        const env = makeEnv("pmux.io");
        collectRequestHandler(
            buildRequest({ h: "https://docs.pmux.io", origin: "null" }) as any,
            env,
        );
        expect(env.WEB_COUNTER_AE.writeDataPoint).toHaveBeenCalled();
    });

    test("'*' in the allowlist disables enforcement (allow all)", () => {
        const env = makeEnv("*");
        collectRequestHandler(
            buildRequest({ h: "https://anything.com" }) as any,
            env,
        );
        expect(env.WEB_COUNTER_AE.writeDataPoint).toHaveBeenCalled();
    });

    test("drops when h is allowed but the Origin header is not", () => {
        const env = makeEnv("pmux.io");
        collectRequestHandler(
            buildRequest({
                h: "https://docs.pmux.io",
                origin: "https://evil.com",
            }) as any,
            env,
        );
        expect(env.WEB_COUNTER_AE.writeDataPoint).not.toHaveBeenCalled();
    });

    test("writes when h, Origin, and Referer headers all match", () => {
        const env = makeEnv("pmux.io");
        collectRequestHandler(
            buildRequest({
                h: "https://docs.pmux.io",
                origin: "https://docs.pmux.io",
                referer: "https://docs.pmux.io/guide",
            }) as any,
            env,
        );
        expect(env.WEB_COUNTER_AE.writeDataPoint).toHaveBeenCalled();
    });

    test("ignores the analytics referrer (r) param for enforcement", () => {
        // r is the visitor's traffic source, not the embedding page; it must
        // not be validated against the allowlist.
        const env = makeEnv("pmux.io");
        collectRequestHandler(
            buildRequest({
                h: "https://docs.pmux.io",
                r: "https://google.com",
            }) as any,
            env,
        );
        expect(env.WEB_COUNTER_AE.writeDataPoint).toHaveBeenCalled();
    });

    test("writes for any host when the allowlist is unset (opt-in)", () => {
        const env = makeEnv(undefined);
        collectRequestHandler(
            buildRequest({ h: "https://anything.com" }) as any,
            env,
        );
        expect(env.WEB_COUNTER_AE.writeDataPoint).toHaveBeenCalled();
    });
});
