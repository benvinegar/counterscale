import { test, expect, Request } from "@playwright/test";

test("tracks pushState and popState events as pageviews", async ({ page }) => {
    // Listen for all console events and handle errors
    page.on("console", (msg) => {
        if (msg.type() === "error") console.log(`Error text: "${msg.text()}"`);
    });

    const collectRequests: Request[] = [];
    page.on("request", (request) => {
        if (request.url().includes("/collect")) {
            collectRequests.push(request);
        }
    });

    await page.goto("http://localhost:3004/03_pushState/");
    expect(collectRequests).toHaveLength(1);

    let request = collectRequests[0];
    expect(request).toBeTruthy();
    expect(request.method()).toBe("GET");
    let params = new URLSearchParams(request.url().split("?")[1]);
    expect(params.get("sid")).toBe("your-unique-site-id");
    expect(params.get("h")).toBe("http://localhost"); // drops port
    expect(params.get("p")).toBe("/03_pushState/");
    expect(params.get("r")).toBe("");

    // click <button> to initiate pushState
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

    // back button (popState)
    await page.goBack({
        // NOTE: "load" already fired because the page is not being reloaded, so need
        //       to wait on networkidle instead
        waitUntil: "networkidle",
    });

    expect(page.url()).toBe("http://localhost:3004/03_pushState/");
    expect(collectRequests).toHaveLength(3);
    request = collectRequests[2];
    expect(request).toBeTruthy();
    expect(request.method()).toBe("GET");
    params = new URLSearchParams(request.url().split("?")[1]);
    expect(params.get("sid")).toBe("your-unique-site-id");
    expect(params.get("h")).toBe("http://localhost"); // drops port
    expect(params.get("p")).toBe("/03_pushState/");
    expect(params.get("r")).toBe("");
});
