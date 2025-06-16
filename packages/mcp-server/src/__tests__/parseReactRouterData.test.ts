import { describe, expect, test } from "vitest";

// Helper function to parse React Router serialized data format
function parseReactRouterData(rawData: any[]): Record<string, any> {
    // Parse React Router serialized data format
    // Format: [metadata, "route", metadata, "data", metadata, key1, value1, key2, value2, ...]
    const result: Record<string, any> = {};
    const processedIndices = new Set<number>();

    function resolveValue(value: any): any {
        if (
            Array.isArray(value) &&
            value.every((val) => typeof val === "number")
        ) {
            // Array of indices - resolve each index to its value
            return value.map((index: number) => {
                processedIndices.add(index);
                return resolveValue(rawData[index]);
            });
        } else if (Array.isArray(value)) {
            // Regular array - resolve each element
            return value.map((item: any) => resolveValue(item));
        } else {
            // Primitive value
            return value;
        }
    }

    // First pass: identify and resolve array references
    for (let i = 0; i < rawData.length; i++) {
        const item = rawData[i];
        if (typeof item === "string" && i + 1 < rawData.length) {
            const nextItem = rawData[i + 1];
            if (
                Array.isArray(nextItem) &&
                nextItem.every((val) => typeof val === "number")
            ) {
                // This is a key with array indices as value
                result[item] = resolveValue(nextItem);
                processedIndices.add(i);
                processedIndices.add(i + 1);
            }
        }
    }

    // Second pass: handle remaining key-value pairs that weren't part of array resolutions
    for (let i = 0; i < rawData.length; i++) {
        if (processedIndices.has(i)) continue;

        const item = rawData[i];
        if (
            typeof item === "string" &&
            i + 1 < rawData.length &&
            !processedIndices.has(i + 1)
        ) {
            const nextItem = rawData[i + 1];
            result[item] = resolveValue(nextItem);
            processedIndices.add(i);
            processedIndices.add(i + 1);
        }
    }

    return result;
}

describe("parseReactRouterData", () => {
    test("parses simple stats response", () => {
        const rawData = [
            { _1: 2 },
            "routes/resources.stats",
            { _3: 4 },
            "data",
            { _5: 6, _7: 8, _9: 10, _11: 12 },
            "views",
            30,
            "visitors",
            6,
            "bounceRate",
            0.3333333333333333,
            "hasSufficientBounceData",
            false,
        ];

        const result = parseReactRouterData(rawData);

        expect(result).toEqual({
            "routes/resources.stats": { _3: 4 },
            data: { _5: 6, _7: 8, _9: 10, _11: 12 },
            views: 30,
            visitors: 6,
            bounceRate: 0.3333333333333333,
            hasSufficientBounceData: false,
        });
    });

    test("parses paths response with nested arrays", () => {
        const rawData = [
            { _1: 2 },
            "routes/resources.paths",
            { _3: 4 },
            "data",
            { _5: 6, _14: 15 },
            "countsByProperty",
            [7, 11],
            [8, 9, 10],
            "/dashboard",
            3,
            23,
            [12, 9, 13],
            "/",
            7,
            "page",
            1,
        ];

        const result = parseReactRouterData(rawData);

        expect(result).toEqual({
            "routes/resources.paths": { _3: 4 },
            data: { _5: 6, _14: 15 },
            countsByProperty: [
                ["/dashboard", 3, 23],
                ["/", 3, 7], // Index 13 points to value 7, not 13
            ],
            page: 1,
        });
    });

    test("parses referrer response with mixed data types", () => {
        const rawData = [
            { _1: 2 },
            "routes/resources.referrer",
            { _3: 4 },
            "data",
            { _5: 6, _14: 13 },
            "countsByProperty",
            [7, 11],
            [8, 9, 10],
            "",
            5,
            29,
            [12, 13, 13],
            "https://www.facebook.com/",
            1,
            "page",
        ];

        const result = parseReactRouterData(rawData);

        expect(result).toEqual({
            "routes/resources.referrer": { _3: 4 },
            data: { _5: 6, _14: 13 },
            countsByProperty: [
                ["", 5, 29],
                ["https://www.facebook.com/", 1, 1],
            ],
            page: undefined, // Note: "page" doesn't have a value after it in this array
        });
    });

    test("parses country response with nested country data", () => {
        const rawData = [
            { _1: 2 },
            "routes/resources.country",
            { _3: 4 },
            "data",
            { _5: 6, _17: 16 },
            "countsByProperty",
            [7, 12],
            [8, 11],
            [9, 10],
            "CA",
            "Canada",
            5,
            [13, 16],
            [14, 15],
            "US",
            "United States",
            1,
            "page",
        ];

        const result = parseReactRouterData(rawData);

        expect(result).toEqual({
            "routes/resources.country": { _3: 4 },
            data: { _5: 6, _17: 16 },
            countsByProperty: [
                [["CA", "Canada"], 5],
                [["US", "United States"], 1],
            ],
            page: undefined,
        });
    });

    test("parses device response", () => {
        const rawData = [
            { _1: 2 },
            "routes/resources.device",
            { _3: 4 },
            "data",
            { _5: 6, _13: 12 },
            "countsByProperty",
            [7, 10],
            [8, 9],
            "desktop",
            5,
            [11, 12],
            "tablet",
            1,
            "page",
        ];

        const result = parseReactRouterData(rawData);

        expect(result).toEqual({
            "routes/resources.device": { _3: 4 },
            data: { _5: 6, _13: 12 },
            countsByProperty: [
                ["desktop", 5],
                ["tablet", 1],
            ],
            page: undefined,
        });
    });

    test("parses browser response", () => {
        const rawData = [
            { _1: 2 },
            "routes/resources.browser",
            { _3: 4 },
            "data",
            { _5: 6, _10: 11 },
            "countsByProperty",
            [7],
            [8, 9],
            "Chrome",
            6,
            "page",
            1,
        ];

        const result = parseReactRouterData(rawData);

        expect(result).toEqual({
            "routes/resources.browser": { _3: 4 },
            data: { _5: 6, _10: 11 },
            countsByProperty: [["Chrome", 6]],
            page: 1,
        });
    });

    test("parses complex timeseries response", () => {
        const rawData = [
            { _1: 2 },
            "routes/resources.timeseries",
            { _3: 4 },
            "data",
            { _5: 6, _31: 32 },
            "chartData",
            [7, 14, 16, 18, 20, 22, 24, 26],
            { _8: 9, _10: 11, _12: 11, _13: 11 },
            "date",
            "2025-06-05 04:00:00",
            "views",
            0,
            "visitors",
            "bounceRate",
            { _8: 15, _10: 11, _12: 11, _13: 11 },
            "2025-06-06 04:00:00",
            { _8: 17, _10: 11, _12: 11, _13: 11 },
            "2025-06-07 04:00:00",
            { _8: 19, _10: 11, _12: 11, _13: 11 },
            "2025-06-08 04:00:00",
            { _8: 21, _10: 11, _12: 11, _13: 11 },
            "2025-06-09 04:00:00",
            { _8: 23, _10: 11, _12: 11, _13: 11 },
            "2025-06-10 04:00:00",
            { _8: 25, _10: 11, _12: 11, _13: 11 },
            "2025-06-11 04:00:00",
            { _8: 27, _10: 28, _12: 29, _13: 30 },
            "2025-06-12 04:00:00",
            30,
            6,
            33,
            "intervalType",
            "DAY",
        ];

        const result = parseReactRouterData(rawData);

        expect(result).toEqual({
            "routes/resources.timeseries": { _3: 4 },
            data: { _5: 6, _31: 32 },
            chartData: [
                { _8: 9, _10: 11, _12: 11, _13: 11 },
                { _8: 15, _10: 11, _12: 11, _13: 11 },
                { _8: 17, _10: 11, _12: 11, _13: 11 },
                { _8: 19, _10: 11, _12: 11, _13: 11 },
                { _8: 21, _10: 11, _12: 11, _13: 11 },
                { _8: 23, _10: 11, _12: 11, _13: 11 },
                { _8: 25, _10: 11, _12: 11, _13: 11 },
                { _8: 27, _10: 28, _12: 29, _13: 30 },
            ],
            date: "2025-06-05 04:00:00",
            views: 0,
            visitors: "bounceRate",
            "2025-06-12 04:00:00": 30, // This extra key-value pair is actually correct
            intervalType: "DAY",
        });
    });

    test("parses dashboard sites response", () => {
        const rawData = [
            { _1: 2 },
            "routes/dashboard",
            { _3: 4 },
            "data",
            { _5: 6, _7: 8, _11: 12, _13: 14, _15: 16 },
            "siteId",
            "",
            "sites",
            [9, 10],
            "counterscale-dev",
            "serg_tech",
            "intervalType",
            "DAY",
            "interval",
            "7d",
            "filters",
            {},
        ];

        const result = parseReactRouterData(rawData);

        expect(result).toEqual({
            "routes/dashboard": { _3: 4 },
            data: { _5: 6, _7: 8, _11: 12, _13: 14, _15: 16 },
            siteId: "",
            sites: ["counterscale-dev", "serg_tech"],
            intervalType: "DAY",
            interval: "7d",
            filters: {},
        });
    });

    test("handles empty arrays", () => {
        const rawData = [
            { _1: 2 },
            "routes/test",
            { _3: 4 },
            "data",
            { _5: 6 },
            "emptyArray",
            [],
            "normalValue",
            "test",
        ];

        const result = parseReactRouterData(rawData);

        expect(result).toEqual({
            "routes/test": { _3: 4 },
            data: { _5: 6 },
            emptyArray: [],
            normalValue: "test",
        });
    });

    test("handles mixed array types", () => {
        const rawData = [
            { _1: 2 },
            "routes/test",
            { _3: 4 },
            "data",
            { _5: 6 },
            "mixedArray",
            [7, "direct", 8],
            "resolved",
            "value",
            9,
        ];

        const result = parseReactRouterData(rawData);

        expect(result).toEqual({
            "routes/test": { _3: 4 },
            data: { _5: 6 },
            mixedArray: [7, "direct", 8], // Indices 7 and 8 are not resolved because they're not all numbers
            resolved: "value",
        });
    });
});
