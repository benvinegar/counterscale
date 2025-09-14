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

import { loader } from "../resources.utm-medium";
import { createFetchResponse, getDefaultContext } from "./testutils";

describe("Resources/UTM Medium route", () => {
    let fetch: Mock;

    beforeEach(() => {
        fetch = global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("loader", () => {
        test("returns valid json with UTM medium data", async () => {
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [
                        { blob12: "cpc", count: "40" },
                        { blob12: "email", count: "35" },
                        { blob12: "social", count: "25" },
                    ],
                }),
            );

            const response = await loader({
                ...getDefaultContext(),
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/resources/utm-medium?site=example.com&interval=7d",
                },
            });

            const json = await response;
            expect(json).toEqual({
                countsByProperty: [
                    ["cpc", 40],
                    ["email", 35],
                    ["social", 25],
                ],
                page: 1,
            });
        });
    });
});
