import { test, expect } from "@playwright/test";

test("tracks UTM parameters when present in URL", async ({ page }) => {
    const collectRequestPromise = page.waitForRequest((request) =>
        request.url().includes("/collect"),
    );

    await page.goto(
        "http://localhost:3004/04_utmTracking/?utm_source=google&utm_medium=cpc&utm_campaign=summer_sale&utm_term=analytics&utm_content=banner",
    );

    // Wait for the request to /collect
    const request = await collectRequestPromise;
    expect(request).toBeTruthy();

    const url = request.url();
    expect(request.method()).toBe("GET");

    const params = new URLSearchParams(url.split("?")[1]);

    expect(params.get("sid")).toBe("utm-test-site-id");
    expect(params.get("h")).toBe("http://localhost");
    expect(params.get("p")).toBe("/04_utmTracking/");
    expect(params.get("r")).toBe("");

    expect(params.get("us")).toBe("google"); // utm_source
    expect(params.get("um")).toBe("cpc"); // utm_medium
    expect(params.get("uc")).toBe("summer_sale"); // utm_campaign
    expect(params.get("ut")).toBe("analytics"); // utm_term
    expect(params.get("uco")).toBe("banner"); // utm_content
});

test("tracks only non-empty UTM parameters", async ({ page }) => {
    const collectRequestPromise = page.waitForRequest((request) =>
        request.url().includes("/collect"),
    );

    // Navigate with partial UTM parameters (empty utm_medium)
    await page.goto(
        "http://localhost:3004/04_utmTracking/?utm_source=newsletter&utm_medium=&utm_campaign=launch",
    );

    const request = await collectRequestPromise;
    expect(request).toBeTruthy();

    const url = request.url();
    const params = new URLSearchParams(url.split("?")[1]);

    // Check that only non-empty UTM parameters are sent
    expect(params.get("us")).toBe("newsletter"); // utm_source present
    expect(params.get("uc")).toBe("launch"); // utm_campaign present
    expect(params.has("um")).toBe(false); // utm_medium not sent (empty)
    expect(params.has("ut")).toBe(false); // utm_term not sent (missing)
    expect(params.has("uco")).toBe(false); // utm_content not sent (missing)
});

test("handles URL-encoded UTM parameters", async ({ page }) => {
    const collectRequestPromise = page.waitForRequest((request) =>
        request.url().includes("/collect"),
    );

    // Navigate with URL-encoded UTM parameters
    await page.goto(
        "http://localhost:3004/04_utmTracking/?utm_campaign=summer%20sale&utm_content=blue%20button",
    );

    const request = await collectRequestPromise;
    expect(request).toBeTruthy();

    const url = request.url();
    const params = new URLSearchParams(url.split("?")[1]);

    // Check URL-encoded parameters are properly decoded
    expect(params.get("uc")).toBe("summer sale"); // utm_campaign decoded
    expect(params.get("uco")).toBe("blue button"); // utm_content decoded
});

test("handles mixed UTM and non-UTM parameters", async ({ page }) => {
    const collectRequestPromise = page.waitForRequest((request) =>
        request.url().includes("/collect"),
    );

    // Navigate with mixed parameters
    await page.goto(
        "http://localhost:3004/04_utmTracking/?page=1&utm_source=twitter&sort=date&utm_campaign=launch&filter=active",
    );

    const request = await collectRequestPromise;
    expect(request).toBeTruthy();

    const url = request.url();
    const params = new URLSearchParams(url.split("?")[1]);

    // Check UTM parameters are extracted correctly
    expect(params.get("us")).toBe("twitter");
    expect(params.get("uc")).toBe("launch");

    // Check non-UTM parameters are not sent as UTM
    expect(params.has("um")).toBe(false);
    expect(params.has("ut")).toBe(false);
    expect(params.has("uco")).toBe(false);
});
