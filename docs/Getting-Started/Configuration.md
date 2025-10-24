---
description: Complete guide to configuring Obsidian:P for your vault
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

Obsidian:P uses a JSON configuration file to customize your site generation.

## Configuration File

Obsidian:P automatically detects configuration files in your project root:
- `obsidianp.config.jsonc` (recommended - supports comments)
- `obsidianp.config.json`

### Create Configuration

Use the `init` command to create a default configuration:

```bash
obsidianp init
```

This creates `obsidianp.config.json`:

```json
{
  "title": "Vault"
}
```

Or create `obsidianp.config.jsonc` manually for a configuration with comments:

```jsonc
{
  "title": "My Knowledge Base",
  "basePath": "",  // For subfolder hosting (e.g., "/poseidon"), leave empty for root
  "fonts": {
    "main": "Mona Sans, system-ui, sans-serif",
    "code": "Monaspace Krypton, monospace"
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

**Note:** The `.jsonc` extension allows you to include comments (using `//`) in your configuration.

## Configuration Options

### Core Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | "Vault" | Site title displayed in header |
| `basePath` | string | "" | Base path for subfolder hosting (e.g., "/poseidon") |

### Fonts

Customize font families (defaults shown):

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fonts.main` | string | "Mona Sans, system-ui, sans-serif" | Main text font |
| `fonts.heading` | string | Same as main | Heading font |
| `fonts.code` | string | "Monaspace Krypton, monospace" | Code font |

**Example:**
```jsonc
{
  "fonts": {
    "main": "Inter, system-ui, sans-serif",
    "heading": "Playfair Display, serif",
    "code": "Fira Code, monospace"
  }
}
```

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

## Using Configuration

### With Auto-Detection

Simply place `obsidianp.config.jsonc` or `obsidianp.config.json` in your project root:

```bash
# Configuration is automatically loaded
obsidianp generate ./vault ./dist
```

### With Custom Path

Specify a custom configuration file:

```bash
obsidianp generate ./vault ./dist --config my-config.jsonc
```

### Command-Line Overrides

Command-line options override configuration file settings:

```bash
# Override title
obsidianp generate ./vault ./dist --title "My Site"

# Override base path
obsidianp generate ./vault ./dist --base-path "/docs"

# Override both
obsidianp generate ./vault ./dist --title "Docs" --base-path "/docs"
```

## Configuration API

The configuration object type definition:

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

**Note:** When using programmatically, you can import types:

```typescript
import { SiteConfig } from './types';

const config: SiteConfig = {
  title: 'My Site',
  basePath: '/docs'
};
```

---

Read Next: [[Building Sites]]
