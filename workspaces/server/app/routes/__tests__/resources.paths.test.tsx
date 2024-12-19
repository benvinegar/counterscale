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

import { createFetchResponse, getDefaultContext } from "./testutils";
import { loader } from "../resources.paths";

describe("Resources/Paths route", () => {
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
                        { blob3: "/", isVisitor: 1, count: "2" },
                        {
                            blob3: "/example",
                            isVisitor: 1,
                            count: "4",
                        },
                    ],
                }),
            );
            // second request for views
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [
                        { blob3: "/", isVisitor: 0, count: "5" },
                        {
                            blob3: "/example",
                            isVisitor: 0,
                            count: "6",
                        },
                    ],
                }),
            );

            const response = await loader({
                ...getDefaultContext(),
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/resources/paths", // no site query param
                },
            });

            // expect redirect
            expect(fetch).toHaveBeenCalledTimes(2);

            const json = await response;

            expect(json).toEqual({
                countsByProperty: [
                    ["/example", 4, 10],
                    ["/", 2, 7],
                ],
                page: 1,
            });
        });
    });
});
