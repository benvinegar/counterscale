import { test, expect, Request } from "@playwright/test";

test("tracks outbound requests", async ({ page }) => {
    const collectRequests: Request[] = [];
    page.on("request", (request) => {
        if (request.url().includes("/collect")) {
            collectRequests.push(request);
        }
    });

    await page.goto("http://localhost:3004/03_pushState/");
    // Wait for the request to /collect
    expect(collectRequests).toHaveLength(1);

    let request = collectRequests[0];
    expect(request).toBeTruthy();
    expect(request.method()).toBe("GET");
    let params = new URLSearchParams(request.url().split("?")[1]);
    expect(params.get("sid")).toBe("your-unique-site-id");
    expect(params.get("h")).toBe("http://localhost"); // drops port
    expect(params.get("p")).toBe("/03_pushState/");
    expect(params.get("r")).toBe("");

    // click button
    await page.click("button");

    // assert url changed
    expect(page.url()).toBe("http://localhost:3004/03_pushState/part_2");

    expect(collectRequests).toHaveLength(2);
    request = collectRequests[1];
    expect(request).toBeTruthy();
    expect(request.method()).toBe("GET");
    params = new URLSearchParams(request.url().split("?")[1]);
    expect(params.get("sid")).toBe("your-unique-site-id");
    expect(params.get("h")).toBe("http://localhost"); // drops port
    expect(params.get("p")).toBe("/03_pushState/part_2");
    expect(params.get("r")).toBe("");
});
