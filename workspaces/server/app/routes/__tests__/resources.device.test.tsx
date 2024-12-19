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

import { loader } from "../resources.device";
import { createFetchResponse, getDefaultContext } from "./testutils";

describe("Resources/Device route", () => {
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
                        { blob7: "Android", count: "5" },
                        { blob7: "Windows", count: "1" },
                    ],
                }),
            );

            const response = await loader({
                ...getDefaultContext(),
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/resources/device", // no site query param
                },
            });

            const json = await response;
            expect(json).toEqual({
                countsByProperty: [
                    ["Android", 5],
                    ["Windows", 1],
                ],
                page: 1,
            });
        });
    });
});
