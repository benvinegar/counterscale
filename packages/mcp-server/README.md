# Counterscale Analytics MCP Server (Alpha)

A Model Context Protocol (MCP) server that provides programmatic access to Counterscale analytics data through HTTP requests to your deployed Counterscale worker.

## Features

This MCP server provides tools to query analytics data including:

- **Site Listing**: Get all available sites from your Counterscale instance
- **Site Statistics**: Views, visitors, bounces, and bounce rate
- **Top Pages**: Most visited pages/paths with view and visitor counts
- **Top Referrers**: Traffic sources and referrers with view and visitor counts
- **Top Countries**: Visitor locations by country
- **Top Browsers**: Browser statistics
- **Top Devices**: Device type statistics
- **Time Series**: Historical data over time intervals

## Architecture

The MCP server uses:

- **Durable Objects** for persistent storage of worker URLs per client
- **HTTP requests** to Counterscale worker resource endpoints (`.data` suffix)
- **React Router serialized data parsing** to handle complex response formats
- **Comprehensive test suite** with 10 test cases covering all response formats

## Available Tools

### 1. `setup_analytics`

Configure the connection to your Counterscale worker. This stores the worker URL persistently for your MCP client session.

**Parameters:**

- `workerUrl` (string): Your deployed Counterscale worker URL (e.g., `https://your-worker.workers.dev`)

**Example:**

```
setup_analytics(workerUrl="https://counterscale.your-domain.workers.dev")
```

### 2. `list_sites`

Get all available sites from your Counterscale instance.

**Parameters:** None

**Returns:** Array of site IDs available in your Counterscale instance

**Example:**

```
list_sites()
```

### 3. `get_site_stats`

Get basic statistics for a site.

**Parameters:**

- `siteId` (string): Site ID to get stats for
- `interval` (string, default: "7d"): Time interval (today, yesterday, 1d, 7d, 30d, 90d)
- `timezone` (string, default: "UTC"): Timezone for the query
- `filters` (object, default: {}): Additional filters (path, referrer, country, etc.)

**Returns:** Views, visitors, and bounce rate

### 4. `get_top_pages`

Get the most visited pages for a site.

**Parameters:**

- `siteId` (string): Site ID to get top pages for
- `interval` (string, default: "7d"): Time interval
- `timezone` (string, default: "UTC"): Timezone for the query
- `filters` (object, default: {}): Additional filters
- `page` (number, default: 1): Page number for pagination

### 5. `get_top_referrers`

Get the top referrers (traffic sources) for a site.

**Parameters:**

- `siteId` (string): Site ID to get top referrers for
- `interval` (string, default: "7d"): Time interval
- `timezone` (string, default: "UTC"): Timezone for the query
- `filters` (object, default: {}): Additional filters
- `page` (number, default: 1): Page number for pagination

### 6. `get_top_countries`

Get visitor locations by country for a site.

**Parameters:**

- `siteId` (string): Site ID to get top countries for
- `interval` (string, default: "7d"): Time interval
- `timezone` (string, default: "UTC"): Timezone for the query
- `filters` (object, default: {}): Additional filters
- `page` (number, default: 1): Page number for pagination

### 7. `get_top_browsers`

Get browser statistics for a site.

**Parameters:**

- `siteId` (string): Site ID to get top browsers for
- `interval` (string, default: "7d"): Time interval
- `timezone` (string, default: "UTC"): Timezone for the query
- `filters` (object, default: {}): Additional filters
- `page` (number, default: 1): Page number for pagination

### 8. `get_top_devices`

Get device type statistics for a site.

**Parameters:**

- `siteId` (string): Site ID to get top devices for
- `interval` (string, default: "7d"): Time interval
- `timezone` (string, default: "UTC"): Timezone for the query
- `filters` (object, default: {}): Additional filters
- `page` (number, default: 1): Page number for pagination

### 9. `get_timeseries`

Get time series data for visualization.

**Parameters:**

- `siteId` (string): Site ID to get time series data for
- `interval` (string, default: "7d"): Time interval
- `timezone` (string, default: "UTC"): Timezone for the query
- `filters` (object, default: {}): Additional filters

## Usage

1. First, set up the analytics connection with your worker URL:

    ```
    setup_analytics(workerUrl="https://your-counterscale.workers.dev")
    ```

2. List available sites:

    ```
    list_sites()
    ```

3. Get basic statistics for a site:

    ```
    get_site_stats(siteId="example.com")
    ```

4. Get detailed breakdowns:

    ```
    get_top_pages(siteId="example.com", interval="30d", page=1)
    get_top_referrers(siteId="example.com")
    get_top_countries(siteId="example.com")
    ```

5. Use filters to drill down:

    ```
    get_top_pages(siteId="example.com", filters={"referrer": "google.com"})
    ```

6. Get time series data:

    ```
    get_timeseries(siteId="example.com", interval="7d")
    ```

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run in development mode
pnpm dev

# Build for deployment
pnpm build

# Deploy to Cloudflare Workers
pnpm deploy
```

## Testing

The project includes a comprehensive test suite covering the React Router serialized data parsing:

```bash
# Run all tests
pnpm test

# Run tests in watch mode for development
pnpm test:watch
```

**Test Coverage:**

- ✅ Simple stats responses
- ✅ Paths responses with nested arrays
- ✅ Referrer responses with mixed data types
- ✅ Country responses with nested country data
- ✅ Device and browser responses
- ✅ Complex timeseries responses
- ✅ Dashboard sites responses
- ✅ Edge cases (empty arrays, mixed types)

## Configuration

### Claude Desktop Integration

For local development, add to your Claude Desktop configuration:

```json
{
    "mcpServers": {
        "counterscale": {
            "command": "npx",
            "args": ["mcp-remote", "http://localhost:8787/sse"]
        }
    }
}
```

For remote deployment, use your deployed worker URL:

```json
{
    "mcpServers": {
        "counterscale": {
            "command": "npx",
            "args": ["mcp-remote", "https://mcp.counterscale.dev/sse"]
        }
    }
}
```

### Cursor Integration

To connect [Cursor](https://cursor.sh/) with your MCP server during development:

1. Open Cursor and go to Settings
2. Navigate to the MCP section
3. Choose `Type`: "Command"
4. In the `Command` field, enter: `npx mcp-remote http://localhost:8787/sse`

For production deployment, replace the localhost URL with your deployed worker URL:

```
npx mcp-remote https://mcp.counterscale.dev/sse
```

This uses the [mcp-remote proxy](https://www.npmjs.com/package/mcp-remote) to connect Cursor to your remote MCP server, as described in the [Cloudflare MCP documentation](https://developers.cloudflare.com/agents/guides/test-remote-mcp-server/#connect-your-remote-mcp-server-to-cursor).

### Direct Connection

The server will be available at:

- SSE endpoint: `/sse`
- MCP endpoint: `/mcp`

## Integration with Counterscale

This MCP server uses HTTP requests to your deployed Counterscale worker's resource endpoints:

- `/resources/stats.data` - Site statistics
- `/resources/paths.data` - Top pages
- `/resources/referrer.data` - Top referrers
- `/resources/country.data` - Top countries
- `/resources/browser.data` - Top browsers
- `/resources/device.data` - Top devices
- `/resources/timeseries.data` - Time series data
- `/dashboard.data` - Available sites

All requests include the required `_routes` parameter and parse React Router's serialized data format to ensure you get exactly the same data as shown in your web dashboard.

## Data Format

The server handles React Router's serialized data format automatically. The parsing logic:

1. **Identifies array references** - Arrays of numeric indices that point to other values
2. **Resolves nested structures** - Handles complex nested arrays and objects
3. **Preserves data integrity** - Maintains exact same data as the web dashboard
4. **Handles edge cases** - Empty arrays, mixed data types, and complex structures

## Timezone Support

All endpoints support timezone specification. Use standard timezone names like:

- `America/New_York`
- `Europe/London`
- `UTC` (default)

## Filtering

Most endpoints support filtering by:

- `path` - Filter by specific page path
- `referrer` - Filter by traffic source
- `country` - Filter by visitor country
- `browserName` - Filter by browser
- `deviceType` - Filter by device type

## Error Handling

The server includes comprehensive error handling for:

- Invalid worker URLs
- Network connectivity issues
- Malformed responses
- Missing or invalid site IDs
- Authentication failures

## Security

- **No credentials required** - Uses public endpoints of your deployed worker
- **Per-client configuration** - Each MCP client configures their own worker URL
- **Durable Object storage** - Worker URLs are stored securely per client session
