---
title: Troubleshooting
description: Common issues and solutions for Counterscale deployment and operation
---

This guide covers common issues you might encounter when deploying or using Counterscale, along with their solutions.

## Deployment Issues

### Website not immediately available

**Problem**: After deployment, visiting your Worker URL shows "Secure Connection Failed" or similar error.

**Solution**: This is usually because Cloudflare has not yet activated your subdomain. This process can take a few minutes.

**Steps to resolve**:

1. Wait 5-10 minutes and try again
2. Check the Worker status in your Cloudflare dashboard:
    - Go to **Workers & Pages** → **counterscale**
    - Verify the Worker shows as "Published"
3. If the issue persists after 15 minutes, try redeploying:
    ```bash
    npx @counterscale/cli@latest install
    ```

### Worker subdomain not found

**Problem**: The `*.workers.dev` subdomain was never created or isn't working.

**Solution**:

1. Ensure you have set up a [Cloudflare Workers subdomain](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
2. Check that you're on a Cloudflare plan that supports Workers (Free plan is sufficient)
3. Try creating a simple "Hello World" worker first to verify your subdomain works

### Analytics Engine not available

**Problem**: Error during installation about Analytics Engine not being enabled.

**Solution**:

1. Navigate to **Storage & Databases** → **Analytics Engine** in your Cloudflare dashboard
2. Click the "Enable" button if you see it
3. If you don't see Analytics Engine, you may need to create a Worker first:
    - Go to **Workers & Pages** → **Overview**
    - Click "Create Worker" to create a simple worker
    - Then return to enable Analytics Engine

## API Token Issues

### Invalid API token error

**Problem**: CLI reports that your API token is invalid or doesn't have sufficient permissions.

**Solution**:

1. Verify your API token has `Account.Account Analytics` permissions at minimum
2. Check that the token hasn't expired
3. Create a new API token if necessary:
    - Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
    - Click "Create Token"
    - Use "Custom Token" and add required permissions

### Permission denied errors

**Problem**: CLI fails with permission errors during deployment.

**Solution**:

1. Ensure your API token has these permissions:
    - `Zone:Zone:Read` (if using custom domains)
    - `Zone:Zone Settings:Edit` (if using custom domains)
    - `Account:Cloudflare Workers:Edit`
    - `Account:Account Analytics:Read`
2. If still failing, try creating a token with broader permissions temporarily

## Tracking Issues

### No data appearing in dashboard

**Problem**: Tracking is set up but no pageviews are recorded.

**Troubleshooting steps**:

1. **Check tracking implementation**:

    - Verify the script tag has the correct `src` and `data-site-id`
    - Ensure the script is loading (check browser Network tab)
    - Look for JavaScript errors in browser console

2. **Verify network requests**:

    - Open browser developer tools → Network tab
    - Navigate to your website
    - Look for requests to your `/collect` endpoint
    - Check if requests are returning 200 status codes

3. **Check data processing time**:

    - Analytics Engine can take 5-15 minutes to process data
    - Try waiting and refreshing your dashboard

4. **Verify site ID**:
    - Ensure your `data-site-id` matches what you expect
    - Check for typos or extra spaces

### Tracking requests failing

**Problem**: Network requests to `/collect` endpoint are failing (4xx/5xx errors).

**Solution**:

1. **For 404 errors**: Verify your deployment URL and that the Worker is published
2. **For 500 errors**: Check Cloudflare Worker logs:
    - Go to **Workers & Pages** → **counterscale**
    - Click on the "Logs" tab to see runtime errors
3. **For CORS errors**: This usually indicates a deployment issue - try redeploying

### Data only showing for some pages

**Problem**: Some pages record analytics but others don't.

**Troubleshooting**:

1. **Single Page Applications (SPAs)**: You may need manual tracking for route changes
2. **Script loading issues**: Check if the tracking script loads on all pages
3. **Ad blockers**: Some users may have ad blockers preventing tracking
4. **JavaScript errors**: Check browser console for errors preventing script execution

## Authentication Issues

### Forgot dashboard password

**Problem**: Cannot access the Counterscale dashboard due to forgotten password.

**Solution**: Use the CLI to update the password:

```bash
npx @counterscale/cli@latest auth roll
```

### Authentication not working

**Problem**: Entering the correct password doesn't grant access.

**Solutions**:

1. Clear browser cookies for your Counterscale domain
2. Try an incognito/private browser window
3. Verify the password was set correctly:
    ```bash
    npx @counterscale/cli@latest auth disable
    npx @counterscale/cli@latest auth enable
    ```

## CLI Issues

### CLI command not found

**Problem**: `npx @counterscale/cli` returns "command not found" or similar.

**Solution**:

1. Verify Node.js version (requires v20 or above):
    ```bash
    node --version
    ```
2. Try clearing npm cache:
    ```bash
    npm cache clean --force
    ```
3. Use the full command:
    ```bash
    npx @counterscale/cli@latest install
    ```

### Wrangler login issues

**Problem**: `npx wrangler login` fails or doesn't work properly.

**Solution**:

1. Clear existing Wrangler authentication:
    ```bash
    npx wrangler logout
    npx wrangler login
    ```
2. If browser-based login fails, try token-based authentication:
    ```bash
    npx wrangler auth api-token
    ```

## Performance Issues

### Dashboard loading slowly

**Problem**: The analytics dashboard takes a long time to load or times out.

**Possible causes and solutions**:

1. **Large datasets**: Analytics Engine may be processing large amounts of data
2. **Network issues**: Check your internet connection
3. **Browser performance**: Try a different browser or clear browser cache
4. **Worker performance**: Check Worker CPU usage in Cloudflare dashboard

## Getting Additional Help

If these troubleshooting steps don't resolve your issue:

1. **Check existing issues**: Browse [GitHub issues](https://github.com/benvinegar/counterscale/issues) for similar problems
2. **Create a new issue**: Include:
    - Your operating system and Node.js version
    - Complete error messages
    - Steps to reproduce the problem
    - Your Counterscale version
3. **Provide context**: Include relevant logs from CLI output or browser console

For urgent issues affecting production deployments, consider implementing a temporary workaround while seeking support.
