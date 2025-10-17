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
# Build your site
npm run build

# Output will be in ./dist directory
```

## CLI Usage

### Basic Command

```bash
node dist/cli.js build
```

### With Custom Config

```bash
node dist/cli.js build --config custom-config.jsonc
```

### Options

```bash
node dist/cli.js build [options]

Options:
  --config <path>    Path to configuration file
  --vault <path>     Vault directory path
  --output <path>    Output directory path
  --watch           Watch for changes and rebuild
  --serve           Serve the site locally
  --port <number>   Port for local server (default: 8000)
  --help            Show help
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

## Watch Mode

Monitor vault changes and rebuild automatically:

```bash
node dist/cli.js build --watch
```

**Features:**
- Detects file changes
- Incremental rebuilds
- Fast refresh
- Live reload (with serve)

**Console Output:**
```
Watching vault for changes...
✓ Ready

[12:34:56] Changed: notes/MyNote.md
[12:34:57] Rebuilding...
[12:34:58] Build complete ✓
```

## Local Development Server

Serve your site locally:

```bash
node dist/cli.js build --serve --port 8000
```

**Features:**
- Static file serving
- Auto-refresh on changes
- CORS enabled
- Development mode

**Console Output:**
```
Server running at http://localhost:8000
Press Ctrl+C to stop
```

## Build Configuration

### Production Build

```jsonc
{
  "vaultPath": "./vault",
  "outputPath": "./dist",
  "minify": true,
  "optimize": true,
  "baseUrl": "https://mysite.com"
}
```

### Development Build

```jsonc
{
  "vaultPath": "./vault",
  "outputPath": "./dev-dist",
  "minify": false,
  "sourceMap": true,
  "baseUrl": "/"
}
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

## Performance Optimization

### Fast Builds

```bash
# Skip graph generation
node dist/cli.js build --no-graph

# Skip search index
node dist/cli.js build --no-search

# Minimal build
node dist/cli.js build --no-graph --no-search
```

### Incremental Builds

Only rebuild changed files in watch mode:

```typescript
// Detects:
// - New files
// - Modified files
// - Deleted files
// - Changed links
```

### Parallel Processing

Process notes in parallel:

```jsonc
{
  "build": {
    "parallel": true,
    "workers": 4
  }
}
```

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

### Custom Build Script

```typescript
import { VaultProcessor, SiteGenerator } from 'obsidianp';

async function customBuild() {
  const processor = new VaultProcessor('./vault', config);
  const vaultData = await processor.processVault();
  
  // Custom processing
  for (const [id, note] of vaultData.notes) {
    // Your custom logic
  }
  
  const generator = new SiteGenerator(config);
  await generator.generate(vaultData);
}

customBuild();
```

### Pre/Post Build Hooks

```jsonc
{
  "build": {
    "hooks": {
      "preBuild": "scripts/pre-build.sh",
      "postBuild": "scripts/post-build.sh"
    }
  }
}
```

### Custom Plugins

```typescript
interface BuildPlugin {
  name: string;
  setup(build: BuildContext): void;
}

const customPlugin: BuildPlugin = {
  name: 'my-plugin',
  setup(build) {
    build.onStart(() => console.log('Starting...'));
    build.onEnd(() => console.log('Complete!'));
  }
};
```

---

Read Next: [[Deployment]]
