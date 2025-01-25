# @counterscale/tracker

Client-side page view tracking library for [Counterscale](https://counterscale.dev).

_For instructions on downloading and deploying the [Counterscale server](https://github.com/benvinegar/counterscale), consult the [project README](https://github.com/benvinegar/counterscale/blob/master/packages/server/README.md)._

## Usage

In your browser-based web project:

```bash
npm install @counterscale/tracker
```

Initialize Counterscale with your site ID and deployment URL:

```typescript
import * as Counterscale from "@counterscale/tracker";

Counterscale.init({
    siteId: "your-unique-site-id",
    deploymentUrl: "https://{subdomain-emitted-during-deploy}.pages.dev/",
});
```

That's it! Your page views will automatically be tracked and reported to Counterscale.

## Advanced

### Manually Track Pageviews

Alternatively you can track page view events manually.

To do so, during initialization set `autoTrackPageviews` to `false`. Then, you manually call `Counterscale.trackPageview()` when you want to record a pageview.

```typescript
import * as Counterscale from "@counterscale/tracker";

Counterscale.init({
    siteId: "your-unique-site-id",
    deploymentUrl: "https://{subdomain-emitted-during-deploy}.pages.dev/",
    autoTrackPageviews: false, // <- don't forget this
});

// ... when a pageview happens
Counterscale.trackPageview();
```
