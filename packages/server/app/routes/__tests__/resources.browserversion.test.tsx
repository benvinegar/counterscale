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

import { loader } from "../resources.browserversion";
import { createFetchResponse, getDefaultContext } from "./testutils";

describe("Resources/Browserversion route", () => {
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
                        { blob6: "Chrome", blob9: "118", count: "5" },
                        { blob6: "Chrome", blob9: "117", count: "15" },
                        { blob6: "Chrome", blob9: "116", count: "1" },
                    ],
                }),
            );

            const response = await loader({
                ...getDefaultContext(),
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/resources/browserversion?browserName=Chrome", // need browserName query param
                },
            });

            const json = await response;
            expect(json).toEqual({
                countsByProperty: [
                    ["118", 5],
                    ["117", 15],
                    ["116", 1],
                ],
                page: 1,
            });
        });
    });
});
