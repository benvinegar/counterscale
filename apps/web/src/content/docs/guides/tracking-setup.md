---
title: Tracking Setup
description: Add Counterscale tracking to your website using script loader, NPM module, or server-side tracking
---

Once Counterscale is deployed, you need to add tracking to your website(s) to start recording web traffic. There are three methods to choose from depending on your setup and requirements.

## Method 1: Script Loader (CDN)

The simplest way to add tracking is using the script loader. When Counterscale is deployed, it makes `tracker.js` available at your deployment URL.

### Usage

Copy and paste this snippet into your website HTML, replacing the placeholders:

```html
<script
    id="counterscale-script"
    data-site-id="your-unique-site-id"
    src="https://{subdomain-emitted-during-deploy}.workers.dev/tracker.js"
    defer
></script>
```

### When to use

- Static websites
- Simple setups where you want tracking with minimal configuration
- When you don't need programmatic control over tracking

## Method 2: NPM Module (Client-side)

For applications built with modern JavaScript frameworks, you can install Counterscale as an npm package.

### Installation

```bash
npm install @counterscale/tracker
```

### Usage

Initialize Counterscale with your site ID and reporter URL:

```typescript
import * as Counterscale from "@counterscale/tracker";

Counterscale.init({
    siteId: "your-unique-site-id",
    reporterUrl:
        "https://{subdomain-emitted-during-deploy}.workers.dev/collect",
});
```

### When to use

- React, Vue, Angular, or other JavaScript framework applications
- When you need programmatic control over tracking
- Single-page applications (SPAs) that need custom pageview tracking

## Method 3: Server-side Module

For server-side applications or when you prefer to track analytics on the backend instead of the browser.

### Installation

```bash
npm install @counterscale/tracker
```

### Usage

```typescript
import * as Counterscale from "@counterscale/tracker/server";

// Initialize the tracker
Counterscale.init({
    siteId: "your-unique-site-id",
    reporterUrl:
        "https://{subdomain-emitted-during-deploy}.workers.dev/collect",
    reportOnLocalhost: false, // optional, defaults to false
    timeout: 2000, // optional, defaults to 1000ms
});

// Track a pageview
await Counterscale.trackPageview({
    url: "https://example.com/page", // or relative: '/page'
    hostname: "example.com", // required for relative URLs
    referrer: "https://google.com",
    utmSource: "social",
    utmMedium: "twitter",
});
```

### Key differences from client-side

- No DOM-dependent features (auto-tracking, browser instrumentation)
- Uses fetch API instead of XMLHttpRequest
- Requires explicit URL and hostname parameters
- Fire-and-forget - tracking errors won't throw exceptions

### When to use

- Server-rendered applications (Next.js, Remix, SvelteKit, etc.)
- API endpoints that want to track usage
- When you want full control over what data is sent
- Privacy-focused setups where you prefer server-side tracking

## Method Comparison

| Feature                   | Script Loader | NPM Module | Server Module |
| ------------------------- | ------------- | ---------- | ------------- |
| **Setup complexity**      | Simple        | Medium     | Medium        |
| **Auto-tracking**         | ✅ Yes        | ✅ Yes     | ❌ No         |
| **Manual tracking**       | ❌ No         | ✅ Yes     | ✅ Yes        |
| **Framework integration** | Basic         | Excellent  | Excellent     |
| **Privacy**               | Standard      | Standard   | Enhanced      |
| **Bundle size impact**    | None          | Small      | None          |

## Verification

After implementing tracking, you can verify it's working by:

1. Visiting your website
2. Checking your Counterscale dashboard for new pageviews
3. Looking at browser developer tools (Network tab) for requests to your `/collect` endpoint

:::note
It may take a few minutes for data to appear in your dashboard due to Analytics Engine processing time.
:::

## Next Steps

Once tracking is set up, you might want to:

- [Configure advanced tracking options](/reference/advanced-configuration)
- [Explore the full tracker API](/reference/tracker-api)
- [Set up manual pageview tracking](/reference/advanced-configuration#manually-track-pageviews)
