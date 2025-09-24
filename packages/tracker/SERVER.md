# Server-Side Usage

The `@counterscale/tracker` package now supports server-side usage through the `/server` module export.

**Requirements:** Node.js 18+ (uses native fetch API)

## Installation

```bash
npm install @counterscale/tracker
```

## Basic Usage

```typescript
import * as Counterscale from "@counterscale/tracker/server";

// Initialize the tracker
Counterscale.init({
    siteId: "your-site-id",
    reporterUrl: "https://your-counterscale-domain.com/collect",
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

## Express.js Middleware Example

```javascript
import express from "express";
import * as Counterscale from "@counterscale/tracker/server";

const app = express();

// Initialize tracker
Counterscale.init({
    siteId: "your-site-id",
    reporterUrl: "https://your-analytics-domain.com/collect",
});

// Track all requests
app.use(async (req, res, next) => {
    try {
        await Counterscale.trackPageview({
            url: req.originalUrl,
            hostname: req.get("Host"),
            referrer: req.get("Referer"),
        });
    } catch (error) {
        // Tracking errors shouldn't break your app
        console.error("Tracking error:", error);
    }
    next();
});
```

## API Reference

### `init(options)`

Initialize the server-side tracker.

**Options:**

- `siteId` (string, required): Your site ID
- `reporterUrl` (string, required): The analytics collection endpoint
- `reportOnLocalhost` (boolean, optional): Whether to track localhost requests
- `timeout` (number, optional): Request timeout in milliseconds

### `trackPageview(options)`

Track a pageview event.

**Options:**

- `url` (string, required): Full URL or relative path
- `hostname` (string, required for relative URLs): The hostname
- `referrer` (string, optional): The referring URL
- `utmSource` (string, optional): UTM source parameter
- `utmMedium` (string, optional): UTM medium parameter
- `utmCampaign` (string, optional): UTM campaign parameter
- `utmTerm` (string, optional): UTM term parameter
- `utmContent` (string, optional): UTM content parameter

**Note:** UTM parameters in the URL will be automatically extracted. Explicitly passed UTM parameters will override URL parameters.

### Other Functions

- `isInitialized()`: Returns whether the tracker is initialized
- `cleanup()`: Clean up the tracker instance
- `getInitializedClient()`: Get the initialized client instance

## Differences from Client-Side Version

The server module:

- ✅ Does not include DOM-dependent features (auto-tracking, browser instrumentation)
- ✅ Uses fetch API instead of XMLHttpRequest (compatible with Node.js 18+)
- ✅ Does not perform cache status checks
- ✅ Requires explicit URL and hostname parameters
- ✅ Always reports hit type as "1" (new visit) since there's no browser session tracking
- ✅ Is fire-and-forget - tracking errors won't throw exceptions

## Backwards Compatibility

The existing client-side API remains completely unchanged. Import from the main module for browser usage:

```typescript
import * as Counterscale from "@counterscale/tracker"; // Client-side
import * as CounterscaleServer from "@counterscale/tracker/server"; // Server-side
```
