import { getFiltersFromSearchParams } from "./utils";
import { describe, test, expect } from "vitest";

// test this getfiltersfromsearchparams function
describe("getFiltersFromSearchParams", () => {
    test("it should return an object with the correct keys", () => {
        const searchParams = new URLSearchParams(
            "?path=/about&referrer=google.com",
        );
        expect(getFiltersFromSearchParams(searchParams)).toEqual({
            path: "/about",
            referrer: "google.com",
        });
    });

    test("it should ignore keys it doesn't recognize", () => {
        const searchParams = new URLSearchParams("?unknown=foo&path=/about");
        expect(getFiltersFromSearchParams(searchParams)).toEqual({
            path: "/about",
        });
    });
});
