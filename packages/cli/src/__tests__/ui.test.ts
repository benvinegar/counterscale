import { getTitle, getScriptSnippet, getPackageSnippet } from "../ui.js";

function stripAnsiEscapeCodes(str: string) {
    return str.replace(
        // https://stackoverflow.com/questions/25245716/remove-all-ansi-colors-styles-from-strings

        // eslint-disable-next-line no-control-regex
        /\x1b\[[0-9;]*m/g,
        "",
    );
}

describe("UI module", () => {
    describe("getTitle", () => {
        it("should generate title with version and homepage", () => {
            const version = "1.0.0";
            const homepage = "https://counterscale.dev";
            const title = getTitle(version, homepage);

            expect(title).toContain(version);
            expect(title).toContain(homepage);
        });
    });

    describe("getScriptSnippet", () => {
        it("should generate valid script snippet with deploy URL", () => {
            const deployUrl = "https://example.counterscale.dev";
            const snippet = stripAnsiEscapeCodes(getScriptSnippet(deployUrl));

            expect(snippet).toContain("script");
            expect(snippet).toContain('id="counterscale-script"');
            expect(snippet).toContain(
                'data-site-id="YOUR_UNIQUE_SITE_ID__CHANGE_THIS"',
            );
            expect(snippet).toContain(`${deployUrl}/tracker.js`);
        });
    });

    describe("getPackageSnippet", () => {
        it("should generate valid package snippet with deploy URL and version", () => {
            const deployUrl = "https://example.counterscale.dev";
            const version = "1.0.0";
            const snippet = stripAnsiEscapeCodes(
                getPackageSnippet(deployUrl, version),
            );

            expect(snippet).toContain(`@counterscale/tracker@${version}`);
            expect(snippet).toContain("Counterscale.init");
            expect(snippet).toContain(
                'siteId: "YOUR_UNIQUE_SITE_ID__CHANGE_THIS"',
            );
            expect(snippet).toContain(`reporterUrl: "${deployUrl}/collect"`);
        });
    });
});
