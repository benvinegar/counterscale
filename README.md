# Counterscale

Counterscale is a simple web analytics tracker and dashboard that you self-host on Cloudflare.

It's designed to be easy to deploy and maintain, and should cost you near-zero to operate – even at high levels of traffic (i.e. in the millions of pageviews/month).

## Prerequisites

You need a Cloudflare account, and have enabled [Cloudflare Analytics Engine beta](https://developers.cloudflare.com/analytics/analytics-engine/get-started/).

## Configuration

You need to create a [Clouflare API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/). This token needs `Account.Account Analytics` permissions.

Once you have the token, and your Cloudflare account ID, you need to:

1. Copy `.dev.vars.example` to `.dev.vars`
2. Add `CF_BEARER_TOKEN` (this is your API token)
3. Add `CF_ACCOUNT_ID` (this is your Cloudflare account ID)
4. Open up the Cloudflare Dashboard (web), and add both values as environment variables

## Development

Install dependencies using `npm`:

```sh
npm install
```

Counterscale is built on Remix and Cloudflare Workers. In development, you'll run two servers:

- The Remix development server
- The Miniflare server (local environment for Cloudflare Workers)

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

## Deployment

If you don't already have an account, then [create a cloudflare account here](https://dash.cloudflare.com/sign-up) and after verifying your email address with Cloudflare, go to your dashboard and set up your free custom Cloudflare Workers subdomain.

Once that's done, you should be able to deploy your app:

```sh
npm run deploy
```
