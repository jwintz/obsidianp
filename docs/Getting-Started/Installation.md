---
description: Step-by-step guide to install and set up ObsidianP
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

Get started with ObsidianP by installing it in your Obsidian vault directory.

## Prerequisites

- Node.js 16+ (recommended: 18+)
- npm or yarn
- An Obsidian vault

## Installation Steps

### 1. Clone or Install

```bash
# Clone the repository
git clone https://github.com/jwintz/obsidianp.git
cd obsidianp

# Or install via npm (if published)
npm install -g obsidianp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Project

```bash
npm run build
```

## Verify Installation

Check that ObsidianP is installed correctly:

```bash
npm run build -- --help
```

You should see the available CLI options.

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
