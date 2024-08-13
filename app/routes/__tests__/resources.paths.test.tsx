// @vitest-environment jsdom
import {
    vi,
    test,
    describe,
    beforeAll,
    beforeEach,
    afterEach,
    expect,
    Mock,
} from "vitest";
import "vitest-dom/extend-expect";

import { getDefaultContext } from "./testutils";
import { loader } from "../resources.paths";

function createFetchResponse<T>(data: T) {
    return {
        ok: true,
        json: () => new Promise<T>((resolve) => resolve(data)),
    };
}

describe("Resources/Paths route", () => {
    let fetch: Mock;

    beforeAll(() => {
        // polyfill needed for recharts (used by TimeSeriesChart)
        global.ResizeObserver = require("resize-observer-polyfill");
    });

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
                        { blob3: "/", isVisitor: 0, isVisit: 0, count: "5" },
                        { blob3: "/", isVisitor: 0, isVisit: 1, count: "1" },
                        { blob3: "/", isVisitor: 1, isVisit: 1, count: "2" },
                        {
                            blob3: "/example",
                            isVisitor: 0,
                            isVisit: 0,
                            count: "4",
                        },
                        {
                            blob3: "/example",
                            isVisitor: 0,
                            isVisit: 1,
                            count: "6",
                        },
                        {
                            blob3: "/example",
                            isVisitor: 1,
                            isVisit: 1,
                            count: "2",
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
            expect(response.status).toBe(200);

            const json = await response.json();
            expect(json).toEqual({
                countsByProperty: [
                    ["/", 2, 8],
                    ["/example", 2, 12],
                ],
                page: 1,
            });
        });
    });
});
