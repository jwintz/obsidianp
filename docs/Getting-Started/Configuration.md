---
description: Complete guide to configuring ObsidianP for your vault
tags:
  - configuration
  - setup
  - config-file
  - settings
type: guide
category: getting-started
audience: all
difficulty: intermediate
estimated_time: 15 minutes
last_updated: 2025-10-17
related_apis:
  - VaultProcessor API
  - SiteGenerator API
---

# Configuration

ObsidianP uses a JSON configuration file to customize your site generation.

## Configuration File

Create `obsidianp.config.jsonc` in your project root:

```jsonc
{
  // Path to your Obsidian vault
  "vaultPath": "./vault",
  
  // Output directory for generated site
  "outputPath": "./dist",
  
  // Site metadata
  "siteName": "My Knowledge Base",
  "siteDescription": "Personal knowledge management",
  
  // Base URL for deployment
  "baseUrl": "/",
  
  // Enable/disable features
  "features": {
    "search": true,
    "graphView": true,
    "tableOfContents": true,
    "backlinks": true
  },
  
  // Graph visualization settings
  "graph": {
    "defaultView": "local",
    "nodeSize": 0.7,
    "linkThickness": 0.5,
    "showArrows": true
  }
}
```

## Configuration Options

### Required Options

| Option | Type | Description |
|--------|------|-------------|
| `vaultPath` | string | Path to Obsidian vault |
| `outputPath` | string | Output directory path |

### Optional Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `siteName` | string | "Site" | Site title |
| `siteDescription` | string | "" | Site description |
| `baseUrl` | string | "/" | Base URL for links |

### Feature Flags

Feature flags control which features are enabled in your generated site. Configure them in the `features` object of your config file.

### Graph Settings

Graph settings control the visualization appearance. Configure them in the `graph` object of your config file.

## Environment-Specific Configuration

You can use different configurations for development and production:

```bash
# Development
npm run build -- --config obsidianp.dev.jsonc

# Production
npm run build -- --config obsidianp.prod.jsonc
```

## Configuration API

```typescript
interface ObsidianPConfig {
  vaultPath: string;
  outputPath: string;
  siteName?: string;
  siteDescription?: string;
  baseUrl?: string;
  features?: FeatureConfig;
  graph?: GraphConfig;
}
```

See [[../API-Reference/VaultProcessor API|VaultProcessor API]] for programmatic configuration.

---

Read Next: [[Building Sites]]
