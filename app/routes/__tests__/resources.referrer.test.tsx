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

import { loader } from "../resources.referrer";
import { createFetchResponse, getDefaultContext } from "./testutils";

describe("Resources/Referrer route", () => {
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
                        { blob5: "/", count: "5" },
                        { blob5: "/example", count: "1" },
                    ],
                }),
            );

            const response = await loader({
                ...getDefaultContext(),
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/resources/referrer", // no site query param
                },
            });

            // expect redirect
            expect(response.status).toBe(200);

            const json = await response.json();
            expect(json).toEqual({
                countsByProperty: [
                    ["/", 5],
                    ["/example", 1],
                ],
                page: 1,
            });
        });
    });
});
