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

import { loader } from "../resources.browser";
import { createFetchResponse, getDefaultContext } from "./testutils";

describe("Resources/Browser route", () => {
    let fetch: Mock;

    beforeEach(() => {
        fetch = global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("loader", () => {
        test("returns valid json", async () => {
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [
                        { blob6: "Chrome", count: "5" },
                        { blob6: "Firefox", count: "1" },
                    ],
                }),
            );

            const response = await loader({
                ...getDefaultContext(),
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/resources/browser", // no site query param
                },
            });

            const json = await response;
            expect(json).toEqual({
                countsByProperty: [
                    ["Chrome", 5],
                    ["Firefox", 1],
                ],
                page: 1,
            });
        });
    });
});
