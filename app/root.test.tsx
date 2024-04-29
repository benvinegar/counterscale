// @vitest-environment jsdom
import { json } from "@remix-run/node";
import { beforeAll, describe, expect, test, vitest } from "vitest";
import "vitest-dom/extend-expect";
import { render, waitFor, screen } from "@testing-library/react";
import { createRemixStub } from "@remix-run/testing";

import Root from "./root";

describe("Root", () => {
    beforeAll(() => {
        // not sure what calls scrollTo, but it does get
        // called in this test - and if we don't mock it this
        // will throw an exception/warning

        window.scrollTo = vitest.fn(() => {});
    });

    test("renders without crashing", async () => {
        function loader() {
            return json({
                version: "ABC123",
                origin: "http://example.com",
                url: "http://example.com/path",
            });
        }

        // note: this will render an <html> element into a <div>,
        // which will trigger a warning in the console
        //
        // "Warning: validateDOMNesting(...): <html> cannot appear as a child of <div>."

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
