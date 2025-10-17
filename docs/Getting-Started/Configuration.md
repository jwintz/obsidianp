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
  "title": "My Knowledge Base",
  "basePath": "",  // For subfolder hosting (e.g., "/poseidon"), leave empty for root
  "fonts": {
    "main": "Inter, system-ui, sans-serif",
    "code": "JetBrains Mono, monospace"
  },
  "customization": {
    "common": {
      "sidebar-width": "300px",
      "font-size-base": "14px"
    },
    "light": {
      "color-primary": "#7c3aed",
      "color-accent": "#06b6d4"
    },
    "dark": {
      "color-primary": "#a78bfa",
      "color-accent": "#22d3ee"
    }
  }
}
```

**Note:** The file will be automatically detected if named `obsidianp.config.jsonc` or `obsidianp.config.json`.

## Configuration Options

### Core Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | "Vault" | Site title displayed in header |
| `basePath` | string | "" | Base path for subfolder hosting (e.g., "/poseidon") |

### Fonts

Customize font families:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fonts.main` | string | System default | Main text font |
| `fonts.heading` | string | Main font | Heading font |
| `fonts.code` | string | Monospace | Code font |

### Customization

Theme-aware CSS variables:

- `customization.common` - Variables for both themes
- `customization.light` - Light theme only
- `customization.dark` - Dark theme only

**Available CSS Variables:**
- `sidebar-width` - Sidebar width (default: 280px)
- `font-size-base` - Base font size (default: 14px)
- `color-primary` - Primary accent color
- `color-accent` - Secondary accent color
- `color-bg-primary` - Background color
- `color-text-primary` - Text color

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
interface SiteConfig {
  title: string;
  basePath?: string;
  fonts?: {
    main?: string;
    heading?: string;
    code?: string;
  };
  customization?: {
    common?: Record<string, string>;
    light?: Record<string, string>;
    dark?: Record<string, string>;
  };
}
```

See [[../API-Reference/VaultProcessor API|VaultProcessor API]] for programmatic configuration.

---

Read Next: [[Building Sites]]
