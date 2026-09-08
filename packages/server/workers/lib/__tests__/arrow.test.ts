import { describe, expect, test } from "vitest";
import { tableFromIPC, tableToIPC } from "apache-arrow";

import { recordsToTable } from "../arrow";

describe("recordsToTable", () => {
    test("round-trips mixed string/number columns through Arrow IPC", () => {
        const records = [
            {
                date: "2026-05-11",
                siteId: "site-a",
                views: 12,
                visitors: 7,
                bounces: 3,
                path: "/",
                country: "US",
            },
            {
                date: "2026-05-11",
                siteId: "site-a",
                views: 5,
                visitors: 4,
                bounces: 0,
                path: "/docs",
                country: "TW",
            },
        ];

        const table = recordsToTable(records);
        const buf = new Uint8Array(tableToIPC(table, "file"));
        const decoded = tableFromIPC(buf);

        expect(decoded.numRows).toBe(2);
        expect(decoded.schema.fields.map((f) => f.name)).toEqual([
            "date",
            "siteId",
            "views",
            "visitors",
            "bounces",
            "path",
            "country",
        ]);

        const rows = decoded.toArray().map((r: unknown) => {
            const row = r as Record<string, unknown>;
            return {
                date: String(row.date),
                siteId: String(row.siteId),
                views: Number(row.views),
                visitors: Number(row.visitors),
                bounces: Number(row.bounces),
                path: String(row.path),
                country: String(row.country),
            };
        });
        expect(rows).toEqual(records);
    });

    test("round-trips null/undefined values as null", () => {
        const records = [
            { a: "x", b: 1 },
            { a: null, b: null },
            { a: undefined, b: undefined },
        ];
        const table = recordsToTable(records);
        const buf = new Uint8Array(tableToIPC(table, "file"));
        const decoded = tableFromIPC(buf);
        const rows = decoded.toArray().map((row: unknown) => {
            const values = row as Record<string, unknown>;
            return { a: values.a, b: values.b };
        });

        expect(rows).toEqual([
            { a: "x", b: 1 },
            { a: null, b: null },
            { a: null, b: null },
        ]);
    });

    test("only allocates validity bitmaps for columns with nulls", () => {
        const table = recordsToTable([
            { nullable: null, complete: "x" },
            { nullable: "value", complete: "y" },
        ]);
        const batch = table.batches[0];
        const nullable = batch.getChild("nullable")?.data[0];
        const complete = batch.getChild("complete")?.data[0];

        expect(nullable?.nullCount).toBe(1);
        expect(nullable?.nullBitmap.byteLength).toBe(8);
        expect(complete?.nullCount).toBe(0);
        expect(complete?.nullBitmap.byteLength).toBe(0);
    });

    test("returns empty table for empty input", () => {
        const table = recordsToTable([]);
        expect(table.numRows).toBe(0);
    });

    test("does not invoke `new Function()` (CF Workers codegen ban)", () => {
        // Cloudflare Workers' runtime forbids `new Function(...)` and `eval`.
        // apache-arrow's Builder path (used by tableFromJSON / vectorFromArray)
        // triggers `new Function()` for validity-check codegen — this is the
        // exact regression we are guarding against.
        const realFunction = globalThis.Function;
        let callCount = 0;
        const FunctionProxy = new Proxy(realFunction, {
            construct(target, args) {
                callCount++;
                return Reflect.construct(target, args);
            },
            apply(target, thisArg, args) {
                callCount++;
                return Reflect.apply(target, thisArg, args);
            },
        });

        const records = [
            { date: "2026-05-11", siteId: "s", views: 1, path: "/" },
        ];

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (globalThis as any).Function = FunctionProxy;
            const table = recordsToTable(records);
            tableToIPC(table, "file");
        } finally {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (globalThis as any).Function = realFunction;
        }

        expect(callCount).toBe(0);
    });
});
