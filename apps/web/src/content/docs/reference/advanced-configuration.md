---
title: Advanced Configuration
description: Advanced configuration options and custom setups for Counterscale
---

This guide covers advanced configuration options and custom setups for power users who want more control over their Counterscale deployment.

## Manual Pageview Tracking

By default, Counterscale automatically tracks pageviews when pages load. For single-page applications (SPAs) or custom tracking scenarios, you can disable auto-tracking and manually control when pageviews are recorded.

### Disable Auto-tracking

When initializing the Counterscale tracker, set `autoTrackPageviews` to `false`:

```typescript
import * as Counterscale from "@counterscale/tracker";

Counterscale.init({
    siteId: "your-unique-site-id",
    reporterUrl: "https://your-subdomain.workers.dev/collect",
    autoTrackPageviews: false, // Disable automatic tracking
});
```

### Manual Tracking

With auto-tracking disabled, you can manually call `trackPageview()` when needed:

```typescript
// Track the current page
Counterscale.trackPageview();

// Track with custom parameters
Counterscale.trackPageview({
    url: "/custom-page",
    referrer: "https://example.com",
    utmSource: "newsletter",
    utmMedium: "email",
});
```

### SPA Integration Examples

#### React Router

```typescript
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import * as Counterscale from "@counterscale/tracker";

function App() {
    const location = useLocation();

    useEffect(() => {
        Counterscale.init({
            siteId: "your-site-id",
            reporterUrl: "your-reporter-url",
            autoTrackPageviews: false,
        });
    }, []);

    useEffect(() => {
        // Track pageview on route change
        Counterscale.trackPageview();
    }, [location]);

    return <div>Your app content</div>;
}
```

#### Vue Router

```typescript
import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import * as Counterscale from "@counterscale/tracker";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        /* your routes */
    ],
});

// Initialize Counterscale
Counterscale.init({
    siteId: "your-site-id",
    reporterUrl: "your-reporter-url",
    autoTrackPageviews: false,
});

// Track pageview after each navigation
router.afterEach(() => {
    Counterscale.trackPageview();
});

const app = createApp(App);
app.use(router);
app.mount("#app");
```

#### Next.js

```typescript
// pages/_app.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import * as Counterscale from "@counterscale/tracker";

function MyApp({ Component, pageProps }) {
    const router = useRouter();

    useEffect(() => {
        Counterscale.init({
            siteId: process.env.NEXT_PUBLIC_COUNTERSCALE_SITE_ID,
            reporterUrl: process.env.NEXT_PUBLIC_COUNTERSCALE_URL,
            autoTrackPageviews: false,
        });
    }, []);

    useEffect(() => {
        const handleRouteChange = () => {
            Counterscale.trackPageview();
        };

        router.events.on('routeChangeComplete', handleRouteChange);
        return () => {
            router.events.off('routeChangeComplete', handleRouteChange);
        };
    }, [router.events]);

    return <Component {...pageProps} />;
}

export default MyApp;
```

## Custom Domains

You can configure Counterscale to use your own custom domain instead of the default `*.workers.dev` subdomain.

### Prerequisites

1. A domain managed by Cloudflare
2. Cloudflare Workers subscription (custom domains require a paid plan)

### Setup Process

1. **Add Custom Domain in Cloudflare Dashboard:**

    - Go to **Workers & Pages** → **counterscale**
    - Click the **Settings** tab
    - Under **Domains & Routes**, click **Add Custom Domain**
    - Enter your desired subdomain (e.g., `analytics.yourdomain.com`)

2. **Update DNS (if needed):**

    - Cloudflare will automatically create the necessary DNS records
    - Verify the CNAME record points to your Worker

3. **Update Tracking Code:**

    Update your tracking implementation to use the new domain:

    ```html
    <!-- Script loader -->
    <script
        id="counterscale-script"
        data-site-id="your-site-id"
        src="https://analytics.yourdomain.com/tracker.js"
        defer
    ></script>
    ```

    ```typescript
    // NPM module
    Counterscale.init({
        siteId: "your-site-id",
        reporterUrl: "https://analytics.yourdomain.com/collect",
    });
    ```

### Benefits of Custom Domains

- **Professional appearance**: Use your own branded domain
- **Ad blocker resilience**: Some ad blockers target `*.workers.dev` domains
- **SSL certificate control**: Use your own certificates if needed

## Environment-Specific Configuration

### Development vs. Production

```typescript
const config = {
    siteId:
        process.env.NODE_ENV === "production" ? "prod-site-id" : "dev-site-id",
    reporterUrl:
        process.env.NODE_ENV === "production"
            ? "https://analytics.yourdomain.com/collect"
            : "https://dev-analytics.yourdomain.com/collect",
    debug: process.env.NODE_ENV === "development",
};

Counterscale.init(config);
```

### Multiple Environments

For staging, development, and production environments:

```typescript
const environments = {
    development: {
        siteId: "dev-site-id",
        reporterUrl: "https://dev-counterscale.workers.dev/collect",
        debug: true,
    },
    staging: {
        siteId: "staging-site-id",
        reporterUrl: "https://staging-counterscale.workers.dev/collect",
        debug: false,
    },
    production: {
        siteId: "prod-site-id",
        reporterUrl: "https://analytics.yourdomain.com/collect",
        debug: false,
    },
};

const config = environments[process.env.NODE_ENV] || environments.development;
Counterscale.init(config);
```

## Advanced Tracking Options

### UTM Parameter Tracking

Automatically capture UTM parameters from URLs:

```typescript
// This will automatically capture UTM parameters from the current URL
Counterscale.trackPageview();

// Or specify them explicitly
Counterscale.trackPageview({
    utmSource: "newsletter",
    utmMedium: "email",
    utmCampaign: "product-launch",
    utmTerm: "analytics",
    utmContent: "header-link",
});
```

### Custom Event Data

While Counterscale focuses on pageviews, you can include additional context:

```typescript
Counterscale.trackPageview({
    url: window.location.pathname + window.location.search,
    referrer: document.referrer,
    // Custom parameters via UTM fields
    utmSource: "internal",
    utmMedium: "navigation",
    utmContent: "main-menu",
});
```

## Server-Side Configuration

### Express.js Integration

```typescript
import express from "express";
import * as Counterscale from "@counterscale/tracker/server";

const app = express();

// Initialize once at startup
Counterscale.init({
    siteId: process.env.COUNTERSCALE_SITE_ID,
    reporterUrl: process.env.COUNTERSCALE_URL,
    reportOnLocalhost: false,
    timeout: 2000,
});

// Middleware to track all requests
app.use((req, res, next) => {
    // Don't wait for tracking to complete
    Counterscale.trackPageview({
        url: req.originalUrl,
        hostname: req.get("host"),
        referrer: req.get("referer"),
        userAgent: req.get("user-agent"),
    }).catch(() => {
        // Silently handle tracking errors
    });

    next();
});
```

### Next.js API Routes

```typescript
// pages/api/track.ts
import * as Counterscale from "@counterscale/tracker/server";

// Initialize if not already done
if (!Counterscale.isInitialized()) {
    Counterscale.init({
        siteId: process.env.COUNTERSCALE_SITE_ID,
        reporterUrl: process.env.COUNTERSCALE_URL,
    });
}

export default async function handler(req, res) {
    // Track the API usage
    await Counterscale.trackPageview({
        url: req.url,
        hostname: req.headers.host,
        referrer: req.headers.referer,
        userAgent: req.headers["user-agent"],
    });

    res.status(200).json({ message: "Tracked" });
}
```

## Performance Optimization

### Lazy Loading

For better initial page load performance, you can lazy load Counterscale:

```typescript
// Lazy load Counterscale after page load
window.addEventListener("load", async () => {
    const Counterscale = await import("@counterscale/tracker");

    Counterscale.init({
        siteId: "your-site-id",
        reporterUrl: "your-reporter-url",
    });
});
```

### Request Batching

For high-traffic applications, consider implementing request batching:

```typescript
class BatchedTracker {
    private queue: TrackingEvent[] = [];
    private flushInterval: number;

    constructor(interval = 5000) {
        this.flushInterval = setInterval(() => this.flush(), interval);
    }

    track(event: TrackingEvent) {
        this.queue.push(event);

        if (this.queue.length >= 10) {
            this.flush();
        }
    }

    private async flush() {
        if (this.queue.length === 0) return;

        const events = this.queue.splice(0);

        // Send batched events to your custom endpoint
        // that forwards to Counterscale
        try {
            await fetch("/api/batch-track", {
                method: "POST",
                body: JSON.stringify(events),
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.warn("Batch tracking failed:", error);
        }
    }

    destroy() {
        clearInterval(this.flushInterval);
        this.flush();
    }
}
```

## Security Considerations

### Content Security Policy (CSP)

If using Content Security Policy, you'll need to allow:

```
script-src 'self' https://your-counterscale-domain.workers.dev;
connect-src 'self' https://your-counterscale-domain.workers.dev;
```

### Environment Variables

Never expose sensitive configuration in client-side code:

```typescript
// ✅ Good - using environment variables
const config = {
    siteId: process.env.REACT_APP_COUNTERSCALE_SITE_ID,
    reporterUrl: process.env.REACT_APP_COUNTERSCALE_URL,
};

// ❌ Bad - hardcoded sensitive values
const config = {
    siteId: "hardcoded-site-id",
    reporterUrl: "https://secret-url.workers.dev/collect",
};
```

## Multiple Site Tracking

To track multiple sites with a single Counterscale deployment:

```typescript
// Site A
Counterscale.init({
    siteId: "site-a-id",
    reporterUrl: "https://shared-analytics.workers.dev/collect",
});

// Site B (separate initialization)
const CounterscaleB = await import("@counterscale/tracker");
CounterscaleB.init({
    siteId: "site-b-id",
    reporterUrl: "https://shared-analytics.workers.dev/collect",
});
```

Each site will appear as a separate entity in your analytics dashboard, allowing you to track them independently while using a single Counterscale deployment.
