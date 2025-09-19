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

import { loader } from "../resources.utm-source";
import { createFetchResponse, getDefaultContext } from "./testutils";

describe("Resources/UTM Source route", () => {
    let fetch: Mock;

    beforeEach(() => {
        fetch = global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("loader", () => {
        test("returns valid json with UTM source data", async () => {
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [
                        { blob11: "google", count: "50" },
                        { blob11: "facebook", count: "30" },
                        { blob11: "twitter", count: "20" },
                    ],
                }),
            );

            const response = await loader({
                ...getDefaultContext(),
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/resources/utm-source?site=example.com&interval=7d",
                },
            });

            const json = await response;
            expect(json).toEqual({
                countsByProperty: [
                    ["google", 50],
                    ["facebook", 30],
                    ["twitter", 20],
                ],
                page: 1,
            });
        });

        test("handles empty UTM source data", async () => {
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [],
                }),
            );

            const response = await loader({
                ...getDefaultContext(),
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/resources/utm-source?site=example.com&interval=7d",
                },
            });

            const json = await response;
            expect(json).toEqual({
                countsByProperty: [],
                page: 1,
            });
        });
    });
});
