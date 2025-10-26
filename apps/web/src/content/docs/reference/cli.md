---
title: CLI Commands
description: Complete reference for Counterscale's command-line interface
---

The Counterscale CLI provides commands to install, configure, and manage your analytics deployment on Cloudflare.

## Installation

The CLI is available as an npm package that you run with `npx`:

```bash
npx @counterscale/cli@latest [command]
```

You can also install it globally:

```bash
npm install -g @counterscale/cli
counterscale [command]
```

## Commands

### `install`

The primary command for deploying Counterscale to Cloudflare.

```bash
npx @counterscale/cli@latest install [options]
```

This command will:

- Guide you through the setup process
- Deploy the Worker to Cloudflare
- Configure Analytics Engine
- Set up authentication (optional)
- Provide your deployment URL

#### Options

| Option       | Description                                                         |
| ------------ | ------------------------------------------------------------------- |
| `--advanced` | Enable advanced mode to customize worker name and analytics dataset |
| `--verbose`  | Show additional logging information during installation             |

#### Examples

Basic installation:

```bash
npx @counterscale/cli@latest install
```

Advanced installation with custom settings:

```bash
npx @counterscale/cli@latest install --advanced --verbose
```

#### Interactive prompts

During installation, you'll be prompted for:

1. **Cloudflare API Token**: The API token you created in your Cloudflare dashboard
2. **Authentication preference**: Whether to protect your dashboard with a password
3. **Password** (if authentication enabled): A secure password for accessing your dashboard
4. **Worker name** (advanced mode): Custom name for your Cloudflare Worker
5. **Dataset name** (advanced mode): Custom name for your Analytics Engine dataset

### `auth`

Manage authentication settings for your Counterscale deployment.

```bash
npx @counterscale/cli@latest auth [subcommand]
```

#### Subcommands

#### `enable`

Enable password protection for your dashboard.

```bash
npx @counterscale/cli@latest auth enable
```

This will prompt you to set a password that will be required to access your analytics dashboard.

#### `disable`

Remove password protection, making your dashboard publicly accessible.

```bash
npx @counterscale/cli@latest auth disable
```

:::caution
Disabling authentication makes your analytics data publicly viewable. Only do this if you're certain about the security implications.
:::

#### `roll`

Update/change the authentication password.

```bash
npx @counterscale/cli@latest auth roll
```

This is useful when:

- You've forgotten your current password
- You want to change your password for security reasons
- You need to rotate credentials

## Global Options

These options are available for all commands:

| Option            | Description           |
| ----------------- | --------------------- |
| `--help`, `-h`    | Show help information |
| `--version`, `-v` | Display CLI version   |

## Version Management

### Using specific versions

You can specify a particular CLI version:

```bash
npx @counterscale/cli@1.2.3 install
```

### Checking your version

```bash
npx @counterscale/cli@latest --version
```

### Latest vs. specific versions

- `@latest`: Always use the most recent published version
- `@1.2.3`: Use a specific version (recommended for production)

## Troubleshooting CLI Issues

### Command not found

If `npx @counterscale/cli` fails:

```bash
# Check Node.js version (requires v20+)
node --version

# Clear npm cache
npm cache clean --force

# Try with full version
npx @counterscale/cli@latest --version
```

### Authentication errors

If CLI authentication fails:

```bash
# Re-authenticate with Cloudflare
npx wrangler logout
npx wrangler login

# Or use API token directly
npx wrangler auth api-token
```

### Network issues

For network-related errors:

- Check your internet connection
- Verify Cloudflare API status
- Try again with `--verbose` for more details

## Advanced Usage

### Custom Worker names

In advanced mode, you can specify a custom name for the Cloudflare worker that will run counterscale:

```bash
npx @counterscale/cli@latest install --advanced
```
