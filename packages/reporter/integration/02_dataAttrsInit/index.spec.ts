import { test, expect } from "@playwright/test";

test("tracks outbound requests", async ({ page }) => {
    // Create a promise that will resolve when we see a request to /collect
    const collectRequestPromise = page.waitForRequest((request) =>
        request.url().includes("/collect"),
    );
    await page.goto("http://localhost:3004/02_dataAttrsInit/");
    // Wait for the request to /collect
    const request = await collectRequestPromise;
    expect(request).toBeTruthy();
    const url = request.url();
    expect(request.method()).toBe("GET");
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("sid")).toBe("your-unique-site-id");
    expect(params.get("h")).toBe("http://localhost"); // drops port
    expect(params.get("p")).toBe("/02_dataAttrsInit/");
    expect(params.get("r")).toBe("");
});
