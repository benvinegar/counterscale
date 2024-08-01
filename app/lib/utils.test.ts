import { getFiltersFromSearchParams } from "./utils";
import { describe, test, expect } from "vitest";

// test this getfiltersfromsearchparams function
describe("getFiltersFromSearchParams", () => {
    test("it should return an object with the correct keys", () => {
        const searchParams = new URLSearchParams(
            "?path=/about&referrer=google.com&deviceModel=iphone&country=us&browserName=chrome",
        );
        expect(getFiltersFromSearchParams(searchParams)).toEqual({
            path: "/about",
            referrer: "google.com",
            deviceModel: "iphone",
            country: "us",
            browserName: "chrome",
        });
    });

    test("it should ignore keys it doesn't recognize", () => {
        // only path is valid; unknown should be discarded
        const searchParams = new URLSearchParams("?unknown=foo&path=/about");
        expect(getFiltersFromSearchParams(searchParams)).toEqual({
            path: "/about",
        });
    });
});
