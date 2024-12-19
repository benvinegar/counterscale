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
            // first request for visitors
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [
                        { blob5: "/", isVisitor: 1, count: "1" },
                        {
                            blob5: "/example",
                            isVisitor: 1,
                            count: "1",
                        },
                    ],
                }),
            );
            // second request for views
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [
                        { blob5: "/", isVisitor: 0, count: "5" },
                        {
                            blob5: "/example",
                            isVisitor: 0,
                            count: "2",
                        },
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
            expect(fetch).toHaveBeenCalledTimes(2);

            const json = await response;
            expect(json).toEqual({
                countsByProperty: [
                    ["/", 1, 6],
                    ["/example", 1, 3],
                ],
                page: 1,
            });
        });
    });
});
