# Counterscale

![](/packages/server/public/counterscale-logo-300x300.webp)

![ci status](https://github.com/benvinegar/counterscale/actions/workflows/ci.yaml/badge.svg)
[![License](https://img.shields.io/github/license/benvinegar/counterscale)](https://github.com/benvinegar/counterscale/blob/master/LICENSE)
[![codecov](https://codecov.io/gh/benvinegar/counterscale/graph/badge.svg?token=NUHURNB682)](https://codecov.io/gh/benvinegar/counterscale)

Counterscale is a simple web analytics tracker and dashboard that you self-host on Cloudflare.

It's designed to be easy to deploy and maintain, and should cost you near-zero to operate – even at high levels of traffic (Cloudflare's [free tier](https://developers.cloudflare.com/workers/platform/pricing/#workers) could hypothetically support up to 100k hits/day).

## License

Counterscale is free, open source software made available under the MIT license. See: [LICENSE](LICENSE).

## Limitations

Counterscale is powered primarily by Cloudflare Workers and [Workers Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/). As of February 2025, Workers Analytics Engine has _maximum 90 days retention_, which means Counterscale can only show the last 90 days of recorded data.

## Installation

### Requirements

* macOS or Linux environment
* Node v20 or above
* An active [Cloudflare](https://cloudflare.com) account (either free or paid)

### Cloudflare Preparation

If you don't have one already, [create a Cloudflare account here](https://dash.cloudflare.com/sign-up) and verify your email address.

1. Go to your Cloudflare dashboard and, if you do not already have one, set up a [Cloudflare Workers subdomain](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
1. Enable [Cloudflare Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/) beta for your account. To enable, navigate to Storage & Databases > Analytics Engine and click the "Enable" button ([screenshot](./docs/enable-analytics-engine.png)). You can ignore and exit out of the "Create Dataset" menu that will pop up next.
    - Note: If this is your first time using Workers, you have to create a Worker before you can enable the Analytics Engine. Navigate to Workers & Pages > Overview, click the "Create Worker" button ([screenshot](./docs/create-worker.png)) to create a "Hello World" worker (it doesn't matter what you name this Worker as you can delete it later).
1. Create a [Cloudflare API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/). This token needs `Account.Account Analytics` permissions at a minimum ([screenshot](./docs/api-token.png)).
    - _WARNING: Keep this window open or copy your API token somewhere safe (e.g. a password manager), because if you close this window you will not be able to access this API token again and have to start over._

### Deploy Counterscale

First, sign into Cloudflare and authorize the Cloudflare CLI (Wrangler) using:

```bash
npx wrangler login
```

Afterwards, run the Counterscale installer:

```bash
npx @counterscale/cli@latest install
```

Follow the prompts. You will be asked for the Cloudflare API token you created earlier. You'll also be asked if you want to protect your dashboard with a password:

- If you choose **Yes** (recommended for public deployments), you'll be prompted to create a password that will be required to access your analytics dashboard.
- If you choose **No**, your dashboard will be publicly accessible without authentication.

Once the script has finished, the server application should be deployed. Visit `https://{subdomain-emitted-during-deploy}.workers.dev` to verify.

NOTE: _If this is your first time deploying Counterscale, it may take take a few minutes before the Worker subdomain becomes live._

### Start Recording Web Traffic from Your Website(s)

You can load the tracking code using one of two methods:

#### 1. Script Loader (CDN)

When Counterscale is deployed, it makes `tracker.js` available at the URL you deployed to:

```
https://{subdomain-emitted-during-deploy}.workers.dev/tracker.js
```

To start reporting website traffic from your web property, copy/paste the following snippet into your website HTML:

```html
<script
    id="counterscale-script"
    data-site-id="your-unique-site-id"
    src="https://{subdomain-emitted-during-deploy}.workers.dev/tracker.js"
    defer
></script>
```

#### 2. Package/Module

The Counterscale tracker is published as an npm module:

```bash
npm install @counterscale/tracker
```

Initialize Counterscale with your site ID and the URL of your deployed reporting endpoint:

```typescript
import * as Counterscale from "@counterscale/tracker";

Counterscale.init({
    siteId: "your-unique-site-id",
    reporterUrl: "https://{subdomain-emitted-during-deploy}.workers.dev/collect",
});
```

__Available Methods__
| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `init(opts)` | `ClientOpts` | `void` | Initializes the Counterscale client with site configuration. Creates a global client instance if one doesn't exist. |
| `isInitialized()` | None | `boolean` | Checks if the Counterscale client has been initialized. Returns true if client exists, false otherwise. |
| `getInitializedClient()` | None | `Client \| undefined` | Returns the initialized client instance or undefined if not initialized. |
| `trackPageview(opts?)` | `TrackPageviewOpts?` | `void` | Tracks a pageview event. Requires client to be initialized first. Automatically detects URL and referrer if not provided. |
| `cleanup()` | None | `void` | Cleans up the client instance and removes event listeners. Sets global client to undefined. |


## Upgrading

For most releases, upgrading is as simple as re-running the CLI installer:

```bash
npx @counterscale/cli@latest install

# OR
# npx @counterscale/cli@VERSION install
```

You won't have to enter a new API key, and your data will carry forrward.


Counterscale uses [semantic versioning](https://semver.org/). If upgrading to a major version (e.g. 2.x, 3.x, 4.x), there may be extra steps. Please consult the [release notes](https://github.com/benvinegar/counterscale/releases).

## Troubleshooting

If the website is not immediately available (e.g. "Secure Connection Failed"), it could be because Cloudflare has not yet activated your subdomain (yoursubdomain.workers.dev). This process can take a minute; you can check in on the progress by visiting the newly created worker in your Cloudflare dashboard (Workers & Pages → counterscale).

## Advanced

### Manually Track Pageviews

When you initialize the Counterscale tracker, set `autoTrackPageviews` to `false`. Then, you can manually call `Counterscale.trackPageview()` when you want to record a pageview.

```typescript
import * as Counterscale from "@counterscale/tracker";

Counterscale.init({
    siteId: "your-unique-site-id",
    reporterUrl: "https://{subdomain-emitted-during-deploy}.workers.dev/collect",
    autoTrackPageviews: false, // <- don't forget this
});

// ... when a pageview happens
Counterscale.trackPageview();
```

### Custom Domains

The deployment URL can always be changed to go behind a custom domain you own. [More here](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

## CLI Commands

Counterscale provides a command-line interface (CLI) to help you install, configure, and manage your deployment.

### Available Commands

#### `install`

The main command for installing and deploying Counterscale to Cloudflare.

```bash
npx @counterscale/cli@latest install
```

Options:

- `--advanced` - Enable advanced mode to customize worker name and analytics dataset
- `--verbose` - Show additional logging information

#### `auth`

Manage authentication settings for your Counterscale deployment.

```bash
npx @counterscale/cli@latest auth [subcommand]
```

Available subcommands:

- `enable` - Enable authentication for your Counterscale deployment
- `disable` - Disable authentication for your Counterscale deployment
- `roll` - Update/roll the authentication password

##### Examples:

Enable authentication:

```bash
npx @counterscale/cli@latest auth enable
```

Disable authentication:

```bash
npx @counterscale/cli@latest auth disable
```

Update/roll the password:

```bash
npx @counterscale/cli@latest auth roll
```

## Development

See [Contributing](CONTRIBUTING.md) for information on how to get started.

## Notes

### Database

There is only one "database": the Cloudflare Analytics Engine dataset, which is communicated entirely over HTTP using Cloudflare's API.

Right now there is no local "test" database. This means in local development:

- Writes will no-op (no hits will be recorded)
- Reads will be read from the production Analaytics Engine dataset (local development shows production data)

### Sampling

Cloudflare Analytics Engine uses sampling to make high volume data ingestion/querying affordable at scale (this is similar to most other analytics tools, see [Google Analytics on Sampling](https://support.google.com/analytics/answer/2637192?hl=en#zippy=%2Cin-this-article)). You can find out more how [sampling works with CF AE here](https://developers.cloudflare.com/analytics/analytics-engine/sampling/).
