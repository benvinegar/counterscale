// @vitest-environment jsdom
import { test, describe, expect } from "vitest";
import "vitest-dom/extend-expect";

import { createRoutesStub } from "react-router";
import { render, screen } from "@testing-library/react";

import Index from "../_index";

describe("Index route", () => {
    test("renders index route", async () => {
        const RemixStub = createRoutesStub([
            {
                path: "/",
                Component: Index,
            },
        ]);

        render(<RemixStub />);

        expect(
            screen.getByText(
                "Scalable web analytics you run yourself on Cloudflare",
            ),
        ).toBeInTheDocument();
    });
});
