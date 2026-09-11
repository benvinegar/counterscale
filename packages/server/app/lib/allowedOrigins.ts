// Helpers for the TRACKER_ALLOWED_ORIGINS allowlist.
//
// Matching is host-based (not scheme-based): an entry like "pmux.io" matches
// the host itself and any subdomain (e.g. "docs.pmux.io"). Enforcement of this
// list lives in the /collect handler, since CORS headers cannot actually block
// who loads or POSTs to the worker.

/**
 * Normalize a single allowlist entry to a bare, lowercase hostname.
 * Strips scheme, leading "*." wildcard, port, and path.
 */
function normalizeEntry(entry: string): string {
    return entry
        .trim()
        .toLowerCase()
        .replace(/^[a-z][a-z0-9+.-]*:\/\//, "") // scheme://
        .replace(/^\*\./, "") // wildcard prefix
        .split("/")[0] // path
        .split(":")[0]; // port
}

/**
 * Parse the comma-separated TRACKER_ALLOWED_ORIGINS env var into a list of
 * normalized hostnames. Returns [] when unset/empty (enforcement is opt-in).
 * A lone "*" entry is dropped so that TRACKER_ALLOWED_ORIGINS="*" reads as
 * "allow all" (empty list = enforcement off) rather than silently blocking
 * every host (no real hostname equals "*").
 */
export function parseAllowedOrigins(value: string | undefined): string[] {
    return (value ?? "")
        .split(",")
        .map(normalizeEntry)
        .filter((host) => host.length > 0 && host !== "*");
}

function tryParseUrl(value: string): URL | null {
    try {
        return new URL(value);
    } catch {
        return null;
    }
}

/**
 * Extract a lowercase hostname from a candidate that may be a full URL
 * (e.g. "https://docs.pmux.io/x") or a bare host (e.g. "example.com:3000").
 * Returns null for empty/nullish input, the opaque "null" origin, schemes
 * with no host (data:, javascript:), or any candidate carrying userinfo
 * (e.g. "https://evil.com@pmux.io/", whose host parses as the allowed one).
 */
export function extractHost(
    candidate: string | null | undefined,
): string | null {
    if (!candidate) return null;
    const value = candidate.trim();
    // The literal "null" is what browsers send as the Origin for sandboxed
    // iframes / file:// pages — treat it as no signal, not a host named "null".
    if (value.length === 0 || value.toLowerCase() === "null") return null;

    // Parse as-is first; fall back to assuming a bare host when there's no
    // scheme, or when the value parsed as a scheme with no authority (e.g.
    // "localhost:3000" parses as scheme "localhost", "data:..."/"javascript:..."
    // have no host). The bare-host parse also handles ports and bracketed IPv6.
    let url = tryParseUrl(value);
    if (!url || url.hostname === "") {
        url = tryParseUrl(`https://${value}`);
    }
    if (!url) return null;

    // Reject userinfo: "https://evil.com@pmux.io/" has hostname "pmux.io", so
    // an attacker-controlled value could otherwise impersonate an allowed host.
    if (url.username !== "" || url.password !== "") return null;

    return url.hostname ? url.hostname.toLowerCase() : null;
}

/**
 * True if the host exactly equals a listed origin or is a subdomain of one.
 */
export function isHostAllowed(host: string | null, allowed: string[]): boolean {
    if (!host) return false;
    const lower = host.toLowerCase();
    return allowed.some(
        (entry) => lower === entry || lower.endsWith(`.${entry}`),
    );
}
