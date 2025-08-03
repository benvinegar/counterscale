// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, test, expect, vi, afterEach } from "vitest";
import "vitest-dom/extend-expect";

import TableCard from "../TableCard";

describe("TableCard", () => {
    afterEach(() => {
        cleanup();
    });

    const defaultProps = {
        countByProperty: [
            ["example.com", "100"],
            ["test.com", "50"],
        ] as [string, string, string?][],
        columnHeaders: ["Site", "Views"],
    };

    test("renders basic table structure", () => {
        render(<TableCard {...defaultProps} />);
        
        expect(screen.getByText("Site")).toBeInTheDocument();
        expect(screen.getByText("Views")).toBeInTheDocument();
        expect(screen.getByText("example.com")).toBeInTheDocument();
        expect(screen.getByText("test.com")).toBeInTheDocument();
        expect(screen.getByText("100")).toBeInTheDocument();
        expect(screen.getByText("50")).toBeInTheDocument();
    });

    test("renders external link icon for URLs", () => {
        const propsWithUrls = {
            countByProperty: [
                ["https://example.com", "100"],
                ["http://test.com", "50"],
                ["not-a-url", "25"],
            ] as [string, string, string?][],
            columnHeaders: ["Site", "Views"],
        };

        const { container } = render(<TableCard {...propsWithUrls} />);
        
        // Should render external link icons for URLs - query specifically within this component
        const externalLinks = container.querySelectorAll('a[href^="http"]');
        expect(externalLinks).toHaveLength(2);
        
        // Check that the links have correct attributes
        expect(externalLinks[0]).toHaveAttribute("href", "https://example.com");
        expect(externalLinks[0]).toHaveAttribute("target", "_blank");
        expect(externalLinks[0]).toHaveAttribute("rel", "noreferrer");
        expect(externalLinks[0]).toHaveAttribute("aria-hidden", "true");
        
        expect(externalLinks[1]).toHaveAttribute("href", "http://test.com");
        expect(externalLinks[1]).toHaveAttribute("target", "_blank");
        expect(externalLinks[1]).toHaveAttribute("rel", "noreferrer");
        expect(externalLinks[1]).toHaveAttribute("aria-hidden", "true");
        
        // Non-URL should not have an external link
        expect(screen.getByText("not-a-url")).toBeInTheDocument();
    });

    test("does not render external link icon for non-URLs", () => {
        const propsWithoutUrls = {
            countByProperty: [
                ["example.com", "100"],
                ["some-path", "50"],
                ["", "25"],
            ] as [string, string, string?][],
            columnHeaders: ["Site", "Views"],
        };

        const { container } = render(<TableCard {...propsWithoutUrls} />);
        
        // Should not render any external link icons
        const externalLinks = container.querySelectorAll('a[href^="http"]');
        expect(externalLinks).toHaveLength(0);
    });

    test("renders external link icon with tuple format [key, label]", () => {
        const propsWithTuples = {
            countByProperty: [
                [["key1", "https://example.com"], "100"],
                [["key2", "http://test.com"], "50"],
                [["key3", "not-a-url"], "25"],
            ] as [string | [string, string], string, string?][],
            columnHeaders: ["Site", "Views"],
        };

        const { container } = render(<TableCard {...propsWithTuples} />);
        
        // Should render external link icons for URLs in tuple format
        const externalLinks = container.querySelectorAll('a[href^="http"]');
        expect(externalLinks).toHaveLength(2);
        
        expect(externalLinks[0]).toHaveAttribute("href", "https://example.com");
        expect(externalLinks[1]).toHaveAttribute("href", "http://test.com");
        
        // Check that the labels are displayed within this container
        expect(container.querySelector('[href="https://example.com"]')).toBeInTheDocument();
        expect(container.querySelector('[href="http://test.com"]')).toBeInTheDocument();
        expect(container).toHaveTextContent("https://example.com");
        expect(container).toHaveTextContent("http://test.com");
        expect(container).toHaveTextContent("not-a-url");
    });

    test("works with onClick handler and external links", () => {
        const mockOnClick = vi.fn();
        const propsWithOnClick = {
            countByProperty: [
                ["https://example.com", "100"],
                ["not-a-url", "50"],
            ] as [string, string, string?][],
            columnHeaders: ["Site", "Views"],
            onClick: mockOnClick,
        };

        const { container } = render(<TableCard {...propsWithOnClick} />);
        
        // Should have both clickable buttons and external links
        const buttons = screen.getAllByRole("button");
        expect(buttons).toHaveLength(2);
        
        const externalLinks = container.querySelectorAll('a[href^="http"]');
        expect(externalLinks).toHaveLength(1);
        expect(externalLinks[0]).toHaveAttribute("href", "https://example.com");
    });

    test("applies labelFormatter to URLs before checking for external links", () => {
        const labelFormatter = (label: string) => label.toUpperCase();
        const propsWithFormatter = {
            countByProperty: [
                ["https://example.com", "100"],
            ] as [string, string, string?][],
            columnHeaders: ["Site", "Views"],
            labelFormatter,
        };

        const { container } = render(<TableCard {...propsWithFormatter} />);
        
        // Should still detect the original URL for external link
        const externalLinks = container.querySelectorAll('a[href^="http"]');
        expect(externalLinks).toHaveLength(1);
        expect(externalLinks[0]).toHaveAttribute("href", "https://example.com");
        
        // But display the formatted label
        expect(screen.getByText("HTTPS://EXAMPLE.COM")).toBeInTheDocument();
    });

    test("handles edge cases for URL detection", () => {
        const edgeCaseProps = {
            countByProperty: [
                ["https://", "10"],
                ["http://", "20"],
                ["ftp://example.com", "30"],
                ["https://example.com/path?query=1", "40"],
            ] as [string, string, string?][],
            columnHeaders: ["Site", "Views"],
        };

        const { container } = render(<TableCard {...edgeCaseProps} />);
        
        const externalLinks = container.querySelectorAll('a[href^="http"]');
        // Should only match http:// and https:// protocols
        expect(externalLinks).toHaveLength(3);
        
        expect(externalLinks[0]).toHaveAttribute("href", "https://");
        expect(externalLinks[1]).toHaveAttribute("href", "http://");
        expect(externalLinks[2]).toHaveAttribute("href", "https://example.com/path?query=1");
        
        // ftp:// should not have an external link
        expect(screen.getByText("ftp://example.com")).toBeInTheDocument();
    });
});