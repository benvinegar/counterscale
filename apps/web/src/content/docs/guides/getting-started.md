---
title: Getting Started
description: Install and deploy Counterscale to Cloudflare in minutes
---

Counterscale is a simple web analytics tracker and dashboard that you self-host on Cloudflare. It's designed to be easy to deploy and maintain, and should cost you near-zero to operate – even at high levels of traffic.

## Requirements

- macOS or Linux environment
- Node v20 or above
- An active [Cloudflare](https://cloudflare.com) account (either free or paid)

## Cloudflare Preparation

If you don't have one already, [create a Cloudflare account here](https://dash.cloudflare.com/sign-up) and verify your email address.

### 1. Set up Workers subdomain

Go to your Cloudflare dashboard and, if you do not already have one, set up a [Cloudflare Workers subdomain](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).

### 2. Enable Analytics Engine

Enable [Cloudflare Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/) beta for your account. To enable, navigate to **Storage & Databases > Analytics Engine** and click the "Enable" button ([screenshot](../../../docs/enable-analytics-engine.png)). You can ignore and exit out of the "Create Dataset" menu that will pop up next.

:::note
If this is your first time using Workers, you have to create a Worker before you can enable the Analytics Engine. Navigate to **Workers & Pages > Overview**, click the "Create Worker" button ([screenshot](../../../docs/create-worker.png)) to create a "Hello World" worker (it doesn't matter what you name this Worker as you can delete it later).
:::

### 3. Create API token

Create a [Cloudflare API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/). This token needs `Account.Account Analytics` permissions at a minimum.

:::caution
Keep this window open or copy your API token somewhere safe (e.g. a password manager), because if you close this window you will not be able to access this API token again and have to start over.
:::

## Deploy Counterscale

### 1. Login to Cloudflare

First, sign into Cloudflare and authorize the Cloudflare CLI (Wrangler):

```bash
npx wrangler login
```

### 2. Run the installer

Run the Counterscale installer:

```bash
npx @counterscale/cli@latest install
```

Follow the prompts. You will be asked for the Cloudflare API token you created earlier. You'll also be asked if you want to protect your dashboard with a password:

- **Yes** (recommended): You'll be prompted to create a password that will be required to access your analytics dashboard.
- **No**: Your dashboard will be publicly accessible without authentication.

### 3. Verify deployment

Once the script has finished, the server application should be deployed. Visit `https://{subdomain-emitted-during-deploy}.workers.dev` to verify.

:::note
If this is your first time deploying Counterscale, it may take a few minutes before the Worker subdomain becomes live.
:::

## What's Next?

Now that Counterscale is deployed, you'll want to:

1. [Set up tracking](/guides/tracking-setup) on your website(s)
2. Start collecting and analyzing your web traffic data!

If you encounter any issues during deployment, check out our [troubleshooting guide](/guides/troubleshooting).
