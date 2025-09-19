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

import { loader } from "../resources.utm-campaign";
import { createFetchResponse, getDefaultContext } from "./testutils";

describe("Resources/UTM Campaign route", () => {
    let fetch: Mock;

    beforeEach(() => {
        fetch = global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("loader", () => {
        test("returns valid json with UTM campaign data", async () => {
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [
                        { blob13: "summer_sale", count: "60" },
                        { blob13: "newsletter", count: "40" },
                        { blob13: "blog_post", count: "25" },
                    ],
                }),
            );

            const response = await loader({
                ...getDefaultContext(),
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/resources/utm-campaign?site=example.com&interval=7d",
                },
            });

            const json = await response;
            expect(json).toEqual({
                countsByProperty: [
                    ["summer_sale", 60],
                    ["newsletter", 40],
                    ["blog_post", 25],
                ],
                page: 1,
            });
        });
    });
});
