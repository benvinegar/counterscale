# Counterscale

![](/public/counterscale-logo-300x300.webp)

![ci status](https://github.com/benvinegar/counterscale/actions/workflows/ci.yaml/badge.svg)
[![License](https://img.shields.io/github/license/benvinegar/counterscale)](https://github.com/benvinegar/counterscale/blob/master/LICENSE)
[![codecov](https://codecov.io/gh/benvinegar/counterscale/graph/badge.svg?token=NUHURNB682)](https://codecov.io/gh/benvinegar/counterscale)

Counterscale is a simple web analytics tracker and dashboard that you self-host on Cloudflare.

It's designed to be easy to deploy and maintain, and should cost you near-zero to operate – even at high levels of traffic (Cloudflare's [free tier](https://developers.cloudflare.com/workers/platform/pricing/#workers) could hypothetically support up to 100k hits/day).

**_NOTE: Counterscale is currently in very early development and shouldn't be used in any actual production setting. We welcome people trying it and giving feedback/contributing, but heads up this project is still super early._**

## Deployment

If you don't have one already, [create a Cloudflare account here](https://dash.cloudflare.com/sign-up).

1. Go to your Cloudflare dashboard and, if you do not already have one, set up a [Cloudflare Workers subdomain](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
1. Enable [Cloudflare Analytics Engine beta](https://developers.cloudflare.com/analytics/analytics-engine/get-started/) for your account ([screenshot](https://github.com/benvinegar/counterscale/assets/4562878/ad1b5712-2344-4489-a684-685b876635d1))
1. Create a [Cloudflare API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/). This token needs `Account.Account Analytics` permissions at a minimum.
1. Run `npm install`
1. Run `npx wrangler secret put CF_BEARER_TOKEN` → when prompted, paste the API token you created
1. Run `npx wrangler secret put CF_ACCOUNT_ID` → when prompted, paste your Cloudflare Account ID
1. Run `npm run deploy` – this will do two things:
    1. Create a new worker, `counterscale`, now visible under _Workers and Pages_ in Cloudflare
    1. Create a new Analytics Engine dataset, called `metricsDataset`
1. It should now be live. Visit `https://counterscale.{yoursubdomain}.workers.dev`.

### Troubleshooting

If the website is not immediately available (e.g. "Secure Connection Failed"), it could be because Cloudflare has not yet activated your subdomain (yoursubdomain.workers.dev). This process can take a minute; you can check in on the progress by visiting the newly created worker in your Cloudflare dashboard (Workers & Pages → counterscale).

### Custom Domains

The deployment URL can always be changed to go behind a custom domain you own. [More here](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

## Installing the Tracker

When Counterscale is deployed, it makes `tracker.js` available at the URL you deployed to:

```
https://counterscale.{yoursubdomain}.workers.dev/tracker.js
```

To start tracking website traffic on your web property, copy/paste the following snippet into your website HTML:

```html
<script>
    (function () {
        window.counterscale = {
            q: [["set", "siteId", "your-unique-site-id"], ["trackPageview"]],
        };
    })();
</script>
<script
    id="counterscale-script"
    src="https://counterscale.{yoursubdomain}.workers.dev/tracker.js"
    defer
></script>
```

Be sure to replace `your-unique-site-id` with a unique string/slug representing your web property. Use a unique site ID for each property you place the tracking script on.

## Development

### Config

To get started, in the project root, copy `.dev.vars.example` to `.dev.vars`.

Open `.dev.vars` and enter the same values for `CF_BEARER_TOKEN` and `CF_ACCOUNT_ID` you used earlier.

### Running the Server

Counterscale is built on Remix and Cloudflare Workers. In development, you'll run two servers:

-   The Remix development server
-   The Miniflare server (local environment for Cloudflare Workers)

You run both using:

```sh
npm run dev
```

Afterwards, the dashboard should be visible at [http://127.0.0.1:8787](http://127.0.0.1:8787).

If you want to check the production build, you can stop the dev server and run following commands:

```sh
npm run build
npm start
```

Then refresh the same URL in your browser (no live reload for production builds).

## Notes

### Database

There is only one "database": the Cloudflare Analytics Engine dataset, which is communicated entirely over HTTP using Cloudflare's API.

Right now there is no local "test" database. This means in local development:

-   Writes will no-op (no hits will be recorded)
-   Reads will be read from the production Analaytics Engine dataset (local development shows production data)

### Sampling

Cloudflare Analytics Engine uses sampling to make high volume data ingestion/querying affordable at scale (this is similar to most other analytics tools, see [Google Analytics on Sampling](https://support.google.com/analytics/answer/2637192?hl=en#zippy=%2Cin-this-article)). You can find out more how [sampling works with CF AE here](https://developers.cloudflare.com/analytics/analytics-engine/sampling/).

## Contributing

Counterscale development is 100% volunteer-driven. If you use and like this software and want to see it improve, we encourage you to contribute with Issues or Pull Requests.

### Development Philosophy

The primary goal of Counterscale is to be super easy to self-host and maintain. It should be "set up once and forget".

To achieve that:

* There should be no application state outside of CF Analytics Engine
    * e.g. no additional relational database like MySQL, PostgreSQL, etc.
    * That means no `users` table, no `sites` table, etc.
    * This also means retention will be limited by what CF Analytics Engine provides. While it could be possible to stand up a "hit counter" for long-lived data (e.g. years), that would mean another database, which we will not pursue.
* We prioritize backwards compatibility
    * New `metricsDataset` columns can be added, but old columns cannot be removed or renamed (they can however, be "forgotten").
    * That also means it's okay if a feature only works during a period where the data is active.
