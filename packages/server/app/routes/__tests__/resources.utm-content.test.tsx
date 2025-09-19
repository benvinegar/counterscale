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

import { loader } from "../resources.utm-content";
import { createFetchResponse, getDefaultContext } from "./testutils";

describe("Resources/UTM Content route", () => {
    let fetch: Mock;

    beforeEach(() => {
        fetch = global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("loader", () => {
        test("returns valid json with UTM content data", async () => {
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [
                        { blob15: "banner_ad", count: "45" },
                        { blob15: "sidebar_widget", count: "30" },
                        { blob15: "footer_link", count: "20" },
                    ],
                }),
            );

            const response = await loader({
                ...getDefaultContext(),
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/resources/utm-content?site=example.com&interval=7d",
                },
            });

            const json = await response;
            expect(json).toEqual({
                countsByProperty: [
                    ["banner_ad", 45],
                    ["sidebar_widget", 30],
                    ["footer_link", 20],
                ],
                page: 1,
            });
        });
    });
});
