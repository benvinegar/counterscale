import { describe, expect, test } from "vitest";
import {
    parseAllowedOrigins,
    extractHost,
    isHostAllowed,
} from "../allowedOrigins";

describe("parseAllowedOrigins", () => {
    test("returns empty list for undefined", () => {
        expect(parseAllowedOrigins(undefined)).toEqual([]);
    });

    test("returns empty list for empty string", () => {
        expect(parseAllowedOrigins("")).toEqual([]);
    });

    test("splits comma-separated entries and trims whitespace", () => {
        expect(parseAllowedOrigins("foo.com, bar.com ,baz.com")).toEqual([
            "foo.com",
            "bar.com",
            "baz.com",
        ]);
    });

    test("strips scheme, port, path, and wildcard prefix; lowercases", () => {
        expect(
            parseAllowedOrigins(
                "https://Foo.com, http://bar.com:8080/path, *.baz.com",
            ),
        ).toEqual(["foo.com", "bar.com", "baz.com"]);
    });

    test("drops empty entries from trailing/duplicate commas", () => {
        expect(parseAllowedOrigins("foo.com,,bar.com,")).toEqual([
            "foo.com",
            "bar.com",
        ]);
    });

    test("treats a lone '*' as allow-all (empty list, enforcement off)", () => {
        expect(parseAllowedOrigins("*")).toEqual([]);
        expect(parseAllowedOrigins("https://*")).toEqual([]);
    });

    test("drops a '*' entry but keeps real hosts alongside it", () => {
        expect(parseAllowedOrigins("*, foo.com")).toEqual(["foo.com"]);
    });
});

describe("extractHost", () => {
    test("extracts hostname from a full URL", () => {
        expect(extractHost("https://docs.pmux.io")).toBe("docs.pmux.io");
    });

    test("extracts hostname from a URL with path and query", () => {
        expect(extractHost("https://docs.pmux.io/guide?x=1")).toBe(
            "docs.pmux.io",
        );
    });

    test("handles a bare hostname without scheme", () => {
        expect(extractHost("example.com")).toBe("example.com");
    });

    test("lowercases the host", () => {
        expect(extractHost("https://Docs.PMUX.io")).toBe("docs.pmux.io");
    });

    test("returns null for empty or nullish input", () => {
        expect(extractHost("")).toBeNull();
        expect(extractHost(null)).toBeNull();
        expect(extractHost(undefined)).toBeNull();
    });

    test("treats the opaque 'null' origin as absent", () => {
        // Sandboxed iframes / file:// pages send the literal Origin: null.
        expect(extractHost("null")).toBeNull();
    });

    test("rejects candidates carrying userinfo (anti-spoofing)", () => {
        // new URL("https://evil.com@pmux.io/").hostname is "pmux.io"; without
        // this guard an attacker-controlled `h` could impersonate an allowed host.
        expect(extractHost("https://evil.com@pmux.io/")).toBeNull();
        expect(extractHost("https://pmux.io@evil.com/")).toBeNull();
    });

    test("handles a bare host with a port without corrupting it", () => {
        expect(extractHost("localhost:3000")).toBe("localhost");
    });

    test("does not corrupt a bracketed IPv6 host", () => {
        expect(extractHost("[::1]")).toBe("[::1]");
    });

    test("returns null for schemes with no host (data:, javascript:)", () => {
        expect(extractHost("data:text/html,hi")).toBeNull();
        expect(extractHost("javascript:alert(1)")).toBeNull();
    });
});

describe("isHostAllowed", () => {
    const allowed = parseAllowedOrigins(
        "shiftinbits.com,constellationdev.io,pmux.io",
    );

    test("matches an exact host", () => {
        expect(isHostAllowed("pmux.io", allowed)).toBe(true);
    });

    test("matches a subdomain of a listed host", () => {
        expect(isHostAllowed("docs.pmux.io", allowed)).toBe(true);
        expect(isHostAllowed("app.constellationdev.io", allowed)).toBe(true);
    });

    test("matches a deep subdomain", () => {
        expect(isHostAllowed("a.b.pmux.io", allowed)).toBe(true);
    });

    test("rejects a sibling domain that merely ends with the name", () => {
        expect(isHostAllowed("evil-pmux.io", allowed)).toBe(false);
        expect(isHostAllowed("notpmux.io", allowed)).toBe(false);
    });

    test("rejects an unlisted host", () => {
        expect(isHostAllowed("example.com", allowed)).toBe(false);
    });

    test("rejects null host", () => {
        expect(isHostAllowed(null, allowed)).toBe(false);
    });

    test("rejects any host against an empty allowlist", () => {
        expect(isHostAllowed("pmux.io", [])).toBe(false);
    });
});
