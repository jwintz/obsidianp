---
description: Learn how to generate your static website from your Obsidian vault
tags:
  - build
  - cli
  - site-generation
  - workflow
type: guide
category: getting-started
audience: all
difficulty: beginner
estimated_time: 20 minutes
last_updated: 2025-10-17
prerequisites:
  - Installation
  - Configuration
---

# Building Sites

Learn how to generate your static website from your Obsidian vault.

## Quick Start

```bash
# Generate your site
obsidianp generate ./vault ./dist

# Or with npm (after building the project)
node dist/cli.js generate ./vault ./dist
```

## CLI Usage

### Generate Command

```bash
obsidianp generate <vault-path> <output-path> [options]
```

**Arguments:**
- `<vault-path>` - Path to your Obsidian vault directory
- `<output-path>` - Path where the static site will be generated

**Options:**
- `--title <title>` / `-t` - Site title (overrides config file)
- `--base-path <path>` / `-b` - Base path for hosting in subfolders (e.g., "/poseidon")
- `--config <path>` / `-c` - Path to configuration file

**Examples:**
```bash
# Basic generation
obsidianp generate ./vault ./dist

# With custom title
obsidianp generate ./vault ./dist --title "My Knowledge Base"

# For GitHub Pages project (subfolder hosting)
obsidianp generate ./vault ./dist --base-path "/my-repo"

# With custom config file
obsidianp generate ./vault ./dist --config my-config.jsonc
```

## Build Process

### 1. Vault Analysis

The build process starts by analyzing your vault:

```typescript
// Scans all .md files
// Extracts metadata and links
// Builds internal graph structure
```

**Console Output:**
```
Scanning vault...
Found 150 notes
Found 45 folders
Extracted 230 tags
Built link graph with 450 connections
```

### 2. Content Processing

Transforms markdown to HTML:

```typescript
// Processes wiki-links
// Renders code blocks
// Processes Mermaid diagrams
// Renders ABC notation
```

**Console Output:**
```
Processing notes...
[████████████████████] 150/150 Complete
```

### 3. Asset Generation

Creates supporting files:

```typescript
// Generates search index
// Creates graph data
// Copies images and attachments
// Bundles CSS and JavaScript
```

### 4. HTML Generation

Creates final HTML pages:

```typescript
// Generates note pages
// Creates index page
// Builds navigation
// Generates sitemap
```

**Console Output:**
```
Generating pages...
Created 150 pages
Generated search index
Created sitemap.xml
Build complete! ✓
Output: ./dist
```

### Serve Command

For local development with automatic rebuilding:

```bash
obsidianp serve <vault-path> [options]
```

**Options:**
- `--port <port>` / `-p` - Port to serve on (default: 8000)
- `--title <title>` / `-t` - Site title (overrides config file)
- `--base-path <path>` / `-b` - Base path for hosting
- `--config <path>` / `-c` - Path to configuration file
- `--no-watch` - Disable file watching

**Examples:**
```bash
# Serve with default settings
obsidianp serve ./vault

# Serve on custom port
obsidianp serve ./vault --port 3000

# Serve without file watching
obsidianp serve ./vault --no-watch
```

**Features:**
- Automatic file watching and rebuilding
- Live development server
- Temporary output directory (no dist pollution)
- Hot reload on changes

**Console Output:**
```
🔮 Generating site...
✅ Initial generation complete
👀 Watching for file changes...
🌐 Starting server on http://localhost:8000
Press Ctrl+C to stop the server
```

### Initialize Configuration

Create a configuration file:

```bash
obsidianp init [options]
```

**Options:**
- `--output <file>` / `-o` - Output configuration file (default: obsidianp.config.json)

**Example:**
```bash
# Create default config
obsidianp init

# Create with custom name
obsidianp init --output my-config.jsonc
```

## Configuration

Obsidian:P automatically detects `obsidianp.config.jsonc` or `obsidianp.config.json` in your project directory.

### Production Build

```bash
obsidianp generate ./vault ./dist
```

With config file `obsidianp.config.jsonc`:

```jsonc
{
  "title": "My Site",
  "basePath": "/my-site",
  "customization": {
    "dark": {
      "color-primary": "#a78bfa"
    }
  }
}
```

### Development Build

```bash
# Serve for local development
obsidianp serve ./vault --port 8000
```

## Output Structure

Generated site structure:

```
dist/
├── index.html                 # Home page
├── [note-name].html          # Note pages
├── assets/
│   ├── main.css              # Styles
│   ├── app.js                # Application logic
│   ├── graph.js              # Graph rendering
│   ├── search.js             # Search functionality
│   └── search-index.json     # Search index
├── attachments/
│   └── [images, files]       # Vault attachments
└── sitemap.xml               # SEO sitemap
```

## Performance Tips

### Incremental Rebuilds

The `serve` command automatically detects changes and rebuilds only what's necessary:

- New markdown files
- Modified notes
- Deleted files
- Configuration changes

### Large Vaults

For vaults with many notes (500+):

1. Use `serve` command for development (faster than repeated `generate`)
2. Ensure images are in supported formats (PNG, JPG, SVG, WebP)
3. Keep frontmatter concise
4. Avoid extremely large individual notes (>10,000 lines)

## Troubleshooting

### Build Fails

```bash
# Check vault path
ls vault/

# Check permissions
chmod -R 755 vault/

# Clear cache
rm -rf .obsidianp-cache
```

### Missing Links

```bash
# Enable verbose output
node dist/cli.js build --verbose

# Check for broken links
node dist/cli.js build --check-links
```

### Performance Issues

```bash
# Profile build
node dist/cli.js build --profile

# Disable expensive features
node dist/cli.js build --no-graph --no-search
```

## Advanced Usage

### Programmatic Usage

```typescript
import { SiteGenerator } from './site-generator';
import { SiteConfig } from './types';

async function customBuild() {
  const config: SiteConfig = {
    title: 'My Knowledge Base',
    basePath: '/docs',
    customization: {
      light: {
        'color-primary': '#7c3aed'
      }
    }
  };

  const generator = new SiteGenerator();
  await generator.generateSite('./vault', './dist', config);
  
  console.log('Build complete!');
}

customBuild();
```

### Custom Scripts

You can wrap the CLI in your own scripts:

```bash
#!/bin/bash
# deploy.sh

# Generate the site
obsidianp generate ./vault ./dist --base-path "/docs"

# Run custom post-processing
node scripts/post-process.js

# Deploy to server
rsync -avz ./dist/ user@server:/var/www/
```

---

Read Next: [[Deployment]]
