import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import NotFound from "../$";

describe("NotFound", () => {
  it("renders 404 page with correct elements", () => {
    const router = createMemoryRouter([
      {
        path: "*",
        element: <NotFound />,
      },
    ]);

    render(<RouterProvider router={router} />);

    // Check for main elements
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Oops! Page Not Found")).toBeInTheDocument();
    expect(
      screen.getByText("Looks like these charts can't find what you're looking for!")
    ).toBeInTheDocument();

    // Check for home link
    const homeLink = screen.getByText("Go Home");
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.closest("a")).toHaveAttribute("href", "/");
  });
}); 