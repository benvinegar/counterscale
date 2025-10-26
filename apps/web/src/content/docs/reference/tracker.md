---
title: Tracker API Reference
description: Complete API documentation for Counterscale's client-side and server-side tracking modules
---

Counterscale provides both client-side and server-side tracking APIs. This reference covers all available methods, types, and configuration options.

## Client-Side API

The client-side tracker runs in the browser and provides automatic pageview tracking with manual override capabilities.

### Installation

```bash
npm install @counterscale/tracker
```

### Import

```typescript
import * as Counterscale from "@counterscale/tracker";
```

### Methods

#### `init(opts: ClientOpts): void`

Initializes the Counterscale client with site configuration. Creates a global client instance if one doesn't exist.

**Parameters:**

- `opts: ClientOpts` - Configuration options for the client

**Example:**

```typescript
Counterscale.init({
    siteId: "your-unique-site-id",
    reporterUrl: "https://your-subdomain.workers.dev/collect",
    autoTrackPageviews: true, // default: true
});
```

#### `isInitialized(): boolean`

Checks if the Counterscale client has been initialized.

**Returns:** `boolean` - True if client exists, false otherwise

**Example:**

```typescript
if (Counterscale.isInitialized()) {
    console.log("Counterscale is ready");
}
```

#### `getInitializedClient(): Client | undefined`

Returns the initialized client instance or undefined if not initialized.

**Returns:** `Client | undefined` - The client instance or undefined

**Example:**

```typescript
const client = Counterscale.getInitializedClient();
if (client) {
    // Client is available
}
```

#### `trackPageview(opts?: TrackPageviewOpts): void`

Tracks a pageview event. Requires client to be initialized first. Automatically detects URL and referrer if not provided.

**Parameters:**

- `opts?: TrackPageviewOpts` - Optional pageview tracking options

**Example:**

```typescript
// Track current page (automatic detection)
Counterscale.trackPageview();

// Track specific page
Counterscale.trackPageview({
    url: "/custom-page",
    referrer: "https://example.com",
    utmSource: "newsletter",
    utmMedium: "email",
});
```

#### `cleanup(): void`

Cleans up the client instance and removes event listeners. Sets global client to undefined.

**Example:**

```typescript
// Clean up when component unmounts or app shuts down
Counterscale.cleanup();
```

### Types

#### `ClientOpts`

```typescript
interface ClientOpts {
    siteId: string; // Your unique site identifier
    reporterUrl: string; // URL to your /collect endpoint
    autoTrackPageviews?: boolean; // Auto-track pageviews (default: true)
    enableLocalStorage?: boolean; // Use localStorage for session tracking
    debug?: boolean; // Enable debug logging
}
```

#### `TrackPageviewOpts`

```typescript
interface TrackPageviewOpts {
    url?: string; // Page URL (auto-detected if not provided)
    referrer?: string; // Referrer URL (auto-detected if not provided)
    utmSource?: string; // UTM source parameter
    utmMedium?: string; // UTM medium parameter
    utmCampaign?: string; // UTM campaign parameter
    utmTerm?: string; // UTM term parameter
    utmContent?: string; // UTM content parameter
}
```

## Server-Side API

The server-side tracker is designed for backend applications and provides explicit control over tracking without DOM dependencies.

### Installation

```bash
npm install @counterscale/tracker
```

### Import

```typescript
import * as Counterscale from "@counterscale/tracker/server";
```

### Methods

#### `init(opts: ServerClientOpts): void`

Initializes the server-side tracker with configuration options.

**Parameters:**

- `opts: ServerClientOpts` - Server-specific configuration options

**Example:**

```typescript
Counterscale.init({
    siteId: "your-unique-site-id",
    reporterUrl: "https://your-subdomain.workers.dev/collect",
    reportOnLocalhost: false, // optional, default: false
    timeout: 2000, // optional, default: 1000ms
});
```

#### `isInitialized(): boolean`

Checks if the server-side tracker has been initialized.

**Returns:** `boolean` - True if initialized, false otherwise

#### `getInitializedClient(): ServerClient | undefined`

Returns the initialized server client instance or undefined if not initialized.

**Returns:** `ServerClient | undefined` - The server client instance or undefined

#### `trackPageview(opts: TrackPageviewOpts): Promise<void>`

Tracks a pageview event asynchronously. Requires explicit URL and hostname parameters for server-side usage.

**Parameters:**

- `opts: TrackPageviewOpts` - Pageview tracking options (URL and hostname required)

**Example:**

```typescript
await Counterscale.trackPageview({
    url: "https://example.com/page", // Full URL
    hostname: "example.com", // Required for relative URLs
    referrer: "https://google.com",
    utmSource: "social",
    utmMedium: "twitter",
});

// With relative URL
await Counterscale.trackPageview({
    url: "/blog/post-title", // Relative URL
    hostname: "myblog.com", // Required for relative URLs
    referrer: "https://twitter.com",
});
```

#### `cleanup(): void`

Cleans up the server client instance.

**Example:**

```typescript
// Clean up during application shutdown
Counterscale.cleanup();
```

### Types

#### `ServerClientOpts`

```typescript
interface ServerClientOpts {
    siteId: string; // Your unique site identifier
    reporterUrl: string; // URL to your /collect endpoint
    reportOnLocalhost?: boolean; // Track localhost requests (default: false)
    timeout?: number; // Request timeout in ms (default: 1000)
    userAgent?: string; // Custom User-Agent header
}
```

#### `ServerTrackPageviewOpts`

```typescript
interface ServerTrackPageviewOpts {
    url: string; // Page URL (required) - can be full or relative
    hostname: string; // Hostname (required for relative URLs)
    referrer?: string; // Referrer URL
    userAgent?: string; // User-Agent string
    ip?: string; // Client IP address
    utmSource?: string; // UTM source parameter
    utmMedium?: string; // UTM medium parameter
    utmCampaign?: string; // UTM campaign parameter
    utmTerm?: string; // UTM term parameter
    utmContent?: string; // UTM content parameter
}
```

## Key Differences

| Feature                | Client-Side      | Server-Side       |
| ---------------------- | ---------------- | ----------------- |
| **Environment**        | Browser          | Node.js/Server    |
| **URL Detection**      | Automatic        | Manual (required) |
| **Referrer Detection** | Automatic        | Manual            |
| **DOM Access**         | Yes              | No                |
| **Auto-tracking**      | Available        | Not available     |
| **Request Method**     | XMLHttpRequest   | fetch API         |
| **Error Handling**     | Console warnings | Silent failures   |
| **Session Tracking**   | Automatic        | Manual            |

## Error Handling

### Client-Side

Client-side errors are logged to the console but don't throw exceptions:

```typescript
// This won't crash your app if tracking fails
Counterscale.trackPageview();
```

### Server-Side

Server-side tracking uses fire-and-forget approach - errors don't throw exceptions:

```typescript
// This won't throw even if the request fails
await Counterscale.trackPageview({
    url: "/page",
    hostname: "example.com",
});
```

## Best Practices

### Client-Side

```typescript
// Initialize once, typically in your app's entry point
Counterscale.init({
    siteId: process.env.REACT_APP_COUNTERSCALE_SITE_ID,
    reporterUrl: process.env.REACT_APP_COUNTERSCALE_URL,
});

// For SPAs, disable auto-tracking and track manually
Counterscale.init({
    siteId: "your-site-id",
    reporterUrl: "your-reporter-url",
    autoTrackPageviews: false,
});

// Track on route changes
router.afterEach(() => {
    Counterscale.trackPageview();
});
```

### Server-Side

```typescript
// Initialize during application startup
Counterscale.init({
    siteId: process.env.COUNTERSCALE_SITE_ID,
    reporterUrl: process.env.COUNTERSCALE_URL,
    reportOnLocalhost: process.env.NODE_ENV === "development",
});

// Track in request handlers
app.get("*", async (req, res) => {
    // Handle your route
    res.send("Hello World");

    // Track asynchronously (don't await in production)
    Counterscale.trackPageview({
        url: req.url,
        hostname: req.get("host"),
        referrer: req.get("referer"),
        userAgent: req.get("user-agent"),
    }).catch(() => {
        // Handle tracking errors silently
    });
});
```
