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

import { loader } from "../resources.utm-term";
import { createFetchResponse, getDefaultContext } from "./testutils";

describe("Resources/UTM Term route", () => {
    let fetch: Mock;

    beforeEach(() => {
        fetch = global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("loader", () => {
        test("returns valid json with UTM term data", async () => {
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [
                        { blob14: "running_shoes", count: "55" },
                        { blob14: "fitness_equipment", count: "35" },
                        { blob14: "workout_clothes", count: "25" },
                    ],
                }),
            );

            const response = await loader({
                ...getDefaultContext(),
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/resources/utm-term?site=example.com&interval=7d",
                },
            });

            const json = await response;
            expect(json).toEqual({
                countsByProperty: [
                    ["running_shoes", 55],
                    ["fitness_equipment", 35],
                    ["workout_clothes", 25],
                ],
                page: 1,
            });
        });
    });
});
