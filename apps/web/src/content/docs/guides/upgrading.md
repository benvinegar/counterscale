---
title: Upgrading Counterscale
description: Keep your Counterscale installation up to date with the latest features and security updates
---

Keeping Counterscale up to date ensures you have the latest features, performance improvements, and security updates.

## Standard Upgrade Process

For most releases, upgrading is as simple as re-running the CLI installer:

```bash
npx @counterscale/cli@latest install
```

You can also specify a specific version if needed:

```bash
npx @counterscale/cli@VERSION install
```

### What happens during upgrade

- Your existing configuration and API keys are preserved
- All historical data remains intact
- The Worker deployment is updated with the new code
- New features and improvements are automatically applied

:::note
You won't need to re-enter your API key or reconfigure settings during a standard upgrade.
:::

## Versioning

Counterscale follows [semantic versioning](https://semver.org/):

- **Patch versions** (e.g., 1.0.1 → 1.0.2): Bug fixes and minor improvements
- **Minor versions** (e.g., 1.0.x → 1.1.0): New features that are backward compatible
- **Major versions** (e.g., 1.x.x → 2.0.0): Breaking changes that may require additional steps

## Major Version Upgrades

When upgrading to a major version (e.g., 2.x, 3.x, 4.x), there may be breaking changes that require extra steps.

### Before upgrading

1. **Check the release notes**: Visit the [GitHub releases page](https://github.com/benvinegar/counterscale/releases) for detailed upgrade instructions
2. **Review breaking changes**: Look for any configuration changes or API modifications
3. **Backup considerations**: While your data is stored in Cloudflare Analytics Engine, note any custom configurations

### Migration steps

Major version upgrades may include:

- Changes to the CLI command structure
- Updates to tracker API methods
- New configuration options
- Database schema updates

Always consult the specific release notes for detailed migration instructions.

## Upgrade Verification

After upgrading, verify everything is working correctly:

1. **Check deployment**: Visit your Counterscale dashboard URL to ensure it loads
2. **Test tracking**: Verify that new pageviews are being recorded
3. **Review dashboard**: Check that historical data is still accessible
4. **Update trackers**: If using NPM packages, update them to match your deployment version:

```bash
npm update @counterscale/tracker
```

## Rollback

If you encounter issues after upgrading, you can rollback to a previous version:

```bash
npx @counterscale/cli@PREVIOUS_VERSION install
```

Replace `PREVIOUS_VERSION` with the version number you want to return to.

## Best Practices

### Stay informed

- Watch the [GitHub repository](https://github.com/benvinegar/counterscale) for updates
- Check the [releases page](https://github.com/benvinegar/counterscale/releases) regularly
- Subscribe to release notifications

### Test upgrades

- For production deployments, consider testing upgrades in a separate Cloudflare account first
- Review changes in non-critical environments when possible

### Regular maintenance

- Upgrade regularly to avoid falling too far behind
- Don't skip major versions - upgrade incrementally when possible

## Troubleshooting Upgrades

If you encounter issues during upgrade:

1. **Check CLI version**: Ensure you're using the latest CLI version
2. **Verify permissions**: Confirm your Cloudflare API token still has the required permissions
3. **Review logs**: Check the CLI output for specific error messages
4. **Clean deployment**: Try removing the existing Worker and doing a fresh install

For more detailed troubleshooting, see our [troubleshooting guide](/guides/troubleshooting).

## Getting Help

If you encounter issues during upgrade:

- Check existing [GitHub issues](https://github.com/benvinegar/counterscale/issues)
- Create a new issue with upgrade details and error messages
- Include your Counterscale version and the version you're upgrading to
