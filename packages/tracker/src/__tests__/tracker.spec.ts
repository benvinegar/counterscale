import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    init: vi.fn(),
}));

vi.mock("../index", () => ({
    init: mocks.init,
}));

describe("tracker loader", () => {
    afterEach(() => {
        document.body.innerHTML = "";
        mocks.init.mockReset();
        vi.resetModules();
    });

    test.each([
        {
            name: "default filename",
            scriptUrl: "https://example.com/tracker.js",
            reporterUrl: "https://example.com/collect",
        },
        {
            name: "custom filename",
            scriptUrl: "https://example.com/analytics.js",
            reporterUrl: "https://example.com/collect",
        },
        {
            name: "deployment subpath",
            scriptUrl: "https://example.com/apps/counterscale/custom.js",
            reporterUrl: "https://example.com/apps/counterscale/collect",
        },
        {
            name: "query and hash components",
            scriptUrl:
                "https://example.com/apps/counterscale/custom.js?v=123#loader",
            reporterUrl: "https://example.com/apps/counterscale/collect",
        },
    ])(
        "derives the collect endpoint for $name",
        async ({ scriptUrl, reporterUrl }) => {
            document.body.innerHTML = `<script id="counterscale-script" data-site-id="test-site" src="${scriptUrl}"></script>`;

            await import("../tracker");

            expect(mocks.init).toHaveBeenCalledOnce();
            expect(mocks.init).toHaveBeenCalledWith({
                siteId: "test-site",
                reportOnLocalhost: false,
                reporterUrl,
                autoTrackPageviews: true,
            });
        },
    );
});
