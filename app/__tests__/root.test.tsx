// @vitest-environment jsdom
import { beforeAll, afterEach, describe, expect, test, vitest } from "vitest";
import "vitest-dom/extend-expect";
import { render, waitFor, screen, cleanup } from "@testing-library/react";
import { createRemixStub } from "@remix-run/testing";

import Root, { Layout } from "../root";

describe("Root", () => {
    beforeAll(() => {
        // not sure what calls scrollTo, but it does get
        // called in this test - and if we don't mock it this
        // will throw an exception/warning
        window.scrollTo = vitest.fn(() => {});
    });

    test("renders without crashing", async () => {
        function loader() {
            return {
                version: "ABC123",
                origin: "http://example.com",
                url: "http://example.com/path",
            };
        }

        const RemixStub = createRemixStub([
            {
                path: "/",
                Component: Root,
                loader,
            },
        ]);

        render(<RemixStub />);
        // wait until the rows render in the document
        await waitFor(() => screen.findByText("Version"));
        expect(screen.getByText("ABC123")).toBeInTheDocument();
    });
});

describe("Layout", () => {
    beforeAll(() => {
        window.scrollTo = vitest.fn(() => {});
    });

    afterEach(() => {
        cleanup();
    });

    test("renders with default data when no route data is available", async () => {
        const RemixStub = createRemixStub([
            {
                path: "/",
                // @ts-expect-error TODO: Figure out how t
                Component: Layout,
                // loader intentionally omitted
            },
        ]);

        // note: this will render an <html> element into a <div>,
        // which will trigger a warning in the console
        //
        // "Warning: validateDOMNesting(...): <html> cannot appear as a child of <div>."

        await waitFor(() => render(<RemixStub />));

        // Check for important meta tags
        const viewport = document.querySelector('meta[name="viewport"]');
        expect(viewport).toHaveAttribute(
            "content",
            "width=device-width, initial-scale=1",
        );
    });

    test("renders with provided route data", async () => {
        function loader() {
            return {
                version: "v1.2.3",
                origin: "test.counterscale.dev",
                url: "https://test.counterscale.dev/",
            };
        }

        const RemixStub = createRemixStub([
            {
                path: "/",
                // @ts-expect-error TODO: Figure out how to type this
                Component: Layout,
                loader,
            },
        ]);

        render(<RemixStub />);

        await waitFor(() =>
            expect(
                document.querySelector('meta[property="og:url"]'),
            ).toBeInTheDocument(),
        );

        const meta = document.querySelector('meta[property="og:url"]');
        expect(meta).toHaveAttribute(
            "content",
            "https://test.counterscale.dev/",
        );
    });
});
