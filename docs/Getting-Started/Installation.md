---
description: Step-by-step guide to install and set up Obsidian:P
tags:
  - installation
  - setup
  - getting-started
  - prerequisites
type: guide
category: getting-started
audience: beginners
difficulty: beginner
estimated_time: 10 minutes
last_updated: 2025-10-17
---

# Installation

Get started with Obsidian:P by installing it in your Obsidian vault directory.

## Prerequisites

- Node.js 16+ (recommended: 18+)
- npm or yarn
- An Obsidian vault

## Installation Steps

### Method 1: Development Installation

```bash
# Clone the repository
git clone https://github.com/jwintz/obsidianp.git
cd obsidianp

# Install dependencies
npm install

# Build the project
npm run build

# Link globally for command-line usage
npm link
```

After linking, you can use the `obsidianp` command anywhere:

```bash
obsidianp generate ./vault ./dist
obsidianp serve ./vault
```

### Method 2: Direct Usage (Without Global Install)

```bash
# Clone and build
git clone https://github.com/jwintz/obsidianp.git
cd obsidianp
npm install
npm run build

# Use directly with node
node dist/cli.js generate ./vault ./dist
```

### Method 3: Development Mode

```bash
# Clone and install
git clone https://github.com/jwintz/obsidianp.git
cd obsidianp
npm install

# Run in development mode (no build needed)
npm run dev serve ./vault -- --port 8000
```

## Verify Installation

Check that Obsidian:P is installed correctly:

```bash
# If you used npm link
obsidianp --help

# Or with direct usage
node dist/cli.js --help
```

You should see output showing available commands:

```
Usage: obsidianp [options] [command]

Static Site Generator for Obsidian vaults

Options:
  -V, --version              output the version number
  -h, --help                 display help for command

Commands:
  generate|gen <vault-path> <output-path>
                             Generate a static site from an Obsidian vault
  serve <vault-path>         Generate and serve the site locally with file watching
  init                       Initialize a configuration file
  help [command]             display help for command
```

Test with a simple generation:

```bash
# Create a test vault
mkdir test-vault
echo "# Hello World" > test-vault/index.md

# Generate site
obsidianp generate ./test-vault ./test-output

# You should see output like:
# 🚀 Starting site generation...
# 📁 Vault: /path/to/test-vault
# 📤 Output: /path/to/test-output
# ✅ Site generation complete!
```

## Next Steps

- [[Configuration]] - Set up your configuration file
- [[Building Sites]] - Generate your first site

## Troubleshooting

### Node Version Issues

If you encounter errors, ensure you're using Node.js 16+:

```bash
node --version
```

### TypeScript Compilation Errors

Rebuild the project:

```bash
npm run build
```

---

Read Next: [[Configuration]]
