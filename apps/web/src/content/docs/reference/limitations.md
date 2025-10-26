---
title: Limitations & Constraints
description: Known limitations, constraints, and technical considerations when using Counterscale
---

Understanding Counterscale's limitations helps you make informed decisions about whether it fits your analytics needs and how to work within its constraints.

## Data Retention

### 90-Day Maximum Retention

Counterscale is powered by [Cloudflare Workers Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/), which has a **maximum 90-day data retention period** as of February 2025.

**What this means:**

- Historical data beyond 90 days is automatically purged
- You cannot view analytics data older than 90 days
- This is a hard limit imposed by Cloudflare, not Counterscale

**Workarounds:**

- Export data regularly if you need longer retention
- Consider supplementing with other analytics tools for historical analysis
- Use Cloudflare's APIs to export data before the 90-day limit

### Data Export Considerations

Currently, Counterscale doesn't provide built-in data export functionality. To preserve data beyond 90 days:

1. Use Cloudflare's [Analytics Engine API](https://developers.cloudflare.com/analytics/analytics-engine/querying/api/) directly
2. Build custom export scripts using your API token
3. Schedule regular exports to your own data warehouse

## Development Environment

### No Local Test Database

Counterscale doesn't include a local development database, which creates these limitations:

**Write Operations (Data Collection):**

- Tracking writes will no-op in local development
- No pageviews are recorded when testing locally
- You cannot test data collection without deploying

**Read Operations (Dashboard):**

- Local development reads from the **production** Analytics Engine dataset
- Your local development environment shows **live production data**
- This can be confusing when debugging or testing

**Implications:**

- You must deploy to test data collection features
- Local dashboard development uses real user data
- Testing requires careful consideration of production data privacy

### Development Best Practices

To work within these constraints:

```typescript
// Use environment-specific configuration
const config = {
    siteId:
        process.env.NODE_ENV === "production" ? "prod-site-id" : "dev-site-id",
    reporterUrl:
        process.env.NODE_ENV === "production"
            ? "https://analytics.yourdomain.com/collect"
            : "https://dev-analytics.workers.dev/collect",
    debug: process.env.NODE_ENV === "development",
};
```

Consider setting up separate development deployments for testing.

## Sampling and Data Accuracy

### Automatic Sampling

Cloudflare Analytics Engine uses [sampling](https://developers.cloudflare.com/analytics/analytics-engine/sampling/) to manage high-volume data efficiently:

**How sampling works:**

- At high traffic volumes, not every event is stored
- Sampling is automatic and transparent
- Results are statistically representative but not exact counts

**When sampling occurs:**

- Typically at very high traffic volumes (exact thresholds not documented)
- Sampling rates depend on your account type and traffic patterns
- Free tier accounts may experience more aggressive sampling

**Impact on accuracy:**

- Small to medium sites: Usually no sampling, data is exact
- High-traffic sites: May see sampled data, results are estimates
- This is similar to Google Analytics and other enterprise analytics tools

### Comparing with Other Analytics

Most analytics platforms use sampling:

- **Google Analytics**: [Samples data](https://support.google.com/analytics/answer/2637192) at high volumes
- **Adobe Analytics**: Uses sampling for large datasets
- **Counterscale**: Inherits Cloudflare Analytics Engine sampling behavior

## Technical Constraints

### Cloudflare Platform Limitations

Since Counterscale runs on Cloudflare Workers, it inherits platform constraints:

**Request Limits:**

- Worker CPU time limits (varies by plan)
- Memory usage limits
- Request size limitations

**Geographic Availability:**

- Dependent on Cloudflare's edge network
- Performance varies by geographic location
- Some regions may have higher latency

### Analytics Engine Constraints

**Query Limitations:**

- Limited aggregation capabilities compared to full databases
- Query complexity restrictions
- Real-time data may have slight delays (typically 1-5 minutes)

**Data Structure:**

- Fixed schema defined by Analytics Engine
- Limited custom fields or dimensions
- Cannot modify historical data structure

## Browser and Client Limitations

### Ad Blocker Impact

Like all web analytics, Counterscale can be affected by ad blockers:

**Potential blocking:**

- Ad blockers may block `*.workers.dev` domains
- Some aggressive blockers target analytics tracking
- Browser privacy features may interfere

**Mitigation strategies:**

- Use [custom domains](/reference/advanced-configuration#custom-domains)
- Consider [server-side tracking](/guides/tracking-setup#method-3-server-side-module)
- Implement graceful degradation

### JavaScript Dependency

**Client-side tracking requires:**

- JavaScript enabled in the browser
- Network connectivity to your Counterscale deployment
- Browser support for modern JavaScript APIs

**Users not tracked:**

- JavaScript disabled
- Very old browsers (pre-ES6)
- Bots and crawlers (by design)
- Users behind restrictive firewalls

## Scalability Considerations

### Free Tier Limits

Cloudflare's free tier supports Counterscale well but has limits:

**Theoretical maximum:**

- Up to 100,000 requests per day on free tier
- This could support high-traffic sites depending on implementation
- Actual limits may vary based on other factors

**Paid tier benefits:**

- Higher request limits
- Better performance guarantees
- Priority support

### High Traffic Scenarios

For very high-traffic sites (millions of pageviews):

**Potential issues:**

- Increased sampling rates
- Higher costs on paid plans
- Need for request optimization

**Solutions:**

- Implement request batching
- Use server-side tracking to reduce client-side load
- Consider hybrid approaches with other analytics tools

## Feature Limitations

### Analytics Capabilities

Compared to full-featured analytics platforms, Counterscale is intentionally simple:

**Missing features:**

- Real-time visitor tracking
- User journey analysis
- Conversion funnel tracking
- Custom event tracking (beyond pageviews)
- A/B testing integration
- Demographic data
- Device/browser detailed analysis

**Design philosophy:**

- Focuses on essential web analytics
- Prioritizes simplicity over feature completeness
- Suitable for basic traffic analysis

### Dashboard Features

**Current limitations:**

- Limited customization options
- Basic filtering and segmentation
- No custom reporting or dashboards
- Limited data export options

## Compliance and Privacy

### Data Processing Location

**Considerations:**

- Data processed in Cloudflare's global network
- May traverse multiple geographic regions
- Subject to Cloudflare's data processing terms

**For strict compliance requirements:**

- Review Cloudflare's data processing agreements
- Consider data residency requirements
- May need additional compliance measures

### GDPR and Privacy Laws

**Built-in privacy features:**

- No personal data collection by default
- IP addresses are not stored permanently
- No cross-site tracking

**Additional compliance needs:**

- Cookie consent (if required in your jurisdiction)
- Privacy policy updates
- Data processing agreements with Cloudflare

## Working Within Limitations

### Complementary Tools

Consider using Counterscale alongside other tools:

**For long-term data retention:**

- Export to BigQuery, PostgreSQL, or other databases
- Use business intelligence tools for historical analysis

**For advanced analytics:**

- Combine with Google Analytics for detailed insights
- Use specialized tools for conversion tracking
- Implement custom analytics for specific needs

### Cost-Benefit Analysis

**Counterscale is ideal when:**

- You need simple, reliable web analytics
- Cost efficiency is important
- You prefer self-hosted solutions
- 90-day retention is sufficient
- Basic pageview tracking meets your needs

**Consider alternatives when:**

- You need longer data retention
- Advanced analytics features are required
- Real-time data is critical
- You need extensive customization
- Compliance requires specific data handling

Understanding these limitations helps you use Counterscale effectively and make informed decisions about your analytics architecture.
