import { test, expect } from "@playwright/test";

test("tracks outbound requests", async ({ page }) => {
    // Create a promise that will resolve when we see a request to /collect
    const collectRequestPromise = page.waitForRequest((request) =>
        request.url().includes("/collect"),
    );

    await page.goto("http://localhost:3004");

    // Wait for the request to /collect
    const request = await collectRequestPromise;
    expect(request).toBeTruthy();
});
