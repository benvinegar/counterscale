# Contributing to Counterscale

Counterscale development is 100% volunteer-driven. If you use and like this software and want to see it improve, we encourage you to contribute with Issues or Pull Requests.

## Development

### Dependencies

Install dependencies:

```bash
pnpm install
```

Install Playwright browsers:

```bash
cd packages/tracker && pnpm playwright install
```

### Config

To get started, in the `packages/server` folder, copy `.dev.vars.example` to `.dev.vars`.

Open `.dev.vars` and enter the same values for `CF_BEARER_TOKEN` and `CF_ACCOUNT_ID` you used earlier.

### Running the Server

Counterscale is built on Vite/React Router (v7+) and Cloudflare Workers.

In development, you have two options:

1. `pnpm turbo dev` → This runs the Vite development server in Node.js. This server will automatically rebuild files when you change them, but it does not best reflect Cloudflare's serverless platform.

2. `pnpm turbo preview` → This runs Cloudflare's Miniflare server with a build of the Remix files. This closer matches the deployment environment, but does not (yet) automatically rebuild your app.

## Publishing

When publishing a new version, use this little utility script:

```
./bump.sh <new_version>
```

## Development Philosophy

The primary goal of Counterscale is to be super easy to self-host and maintain. It should be "set up once and forget".

To achieve that:

- There should be no application state outside of CF Analytics Engine
    - e.g. no additional relational database like MySQL, PostgreSQL, etc.
    - That means no `users` table, no `sites` table, etc.
    - This also means retention will be limited by what CF Analytics Engine provides. While it could be possible to stand up a "hit counter" for long-lived data (e.g. years), that would mean another database, which we will not pursue.
- We prioritize backwards compatibility
    - New `metricsDataset` columns can be added, but old columns cannot be removed or renamed (they can however, be "forgotten").
    - That also means it's okay if a feature only works during a period where the data is active.
