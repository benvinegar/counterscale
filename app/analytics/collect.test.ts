import { describe, expect, test, vi } from 'vitest'
import httpMocks from 'node-mocks-http';

import { collectRequestHandler } from './collect';

const defaultRequestParams = {
    method: 'GET',
    url: 'https://example.com/user/42?' + new URLSearchParams({
        sid: 'example',
        h: 'example.com',
        p: '/post/123',
        r: 'https://google.com',
        nv: '1',
        ns: '1',
    }).toString(),
    headers: {
        get: (_header: string) => {
            return "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36";
        }
    },
    // Cloudflare-specific request properties
    cf: {
        country: 'US'
    }
};

describe("collectRequestHandler", () => {
    test("invokes writeDataPoint with transformed params", () => {
        const env = {
            WEB_COUNTER_AE: {
                writeDataPoint: vi.fn()
            } as CFAnalyticsEngine,
        } as Environment;

        // @ts-expect-error - we're mocking the request object
        const request = httpMocks.createRequest(defaultRequestParams);

        collectRequestHandler(request, env);

        const writeDataPoint = env.WEB_COUNTER_AE.writeDataPoint;
        expect(env.WEB_COUNTER_AE.writeDataPoint).toHaveBeenCalled();

        // verify data shows up in the right place
        expect((writeDataPoint as any).mock.calls[0][0]).toEqual({
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
            "doubles": [
                1,
                1,
            ],
            "indexes": [
                "",
            ],

        });
    });
});