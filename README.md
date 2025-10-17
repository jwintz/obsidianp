# Obsidian Static Site Generator

Convert your Obsidian vault into a beautiful, interactive static website with wiki-links, search, graph view, and math rendering.

## Features

- **Wiki-link Support**: `[[Note Name]]` and `[[Note Name|Display Text]]` links
- **Interactive Graph View**: Visualize note relationships with configurable local graph controls (toggle outgoing/backlinks/sibling links, adjust traversal depth, and show/hide tags)
- **Full-text Search**: Fast client-side search
- **Light/Dark Theme**: Automatic theme switching
- **Math Rendering**: Server-side KaTeX processing
- **Responsive Design**: Works on all devices
- **Backlinks**: Automatic bidirectional linking

## Installation

```bash
git clone <repository-url>
cd obsidianp
npm install
npm run build
npm install -g .
```

If you're working on the codebase, you can use the binary without global installation:

```bash
npm run build
node dist/cli.js generate ./vault ./site
node dist/cli.js serve ./vault -p 8000
```

Or, to fallback to the dedicated usage with the binary, while in redaction mode:

```bash
npm link
obsidianp generate ./vault ./site
obsidianp serve ./vault -p 8000
```

Or, in development mode:

```bash
npm run dev serve ./vault -- --port 8000
```

## Usage

### Generate Static Site

```bash
obsidianp generate <vault-path> <output-path>
```

Example:
```bash
obsidianp generate ./my-vault ./public
obsidianp generate ./vault ./site --title "My Blog"
obsidianp generate ./vault ./site --base-path "/poseidon"
```

**Options:**
- `--title` / `-t`: Override site title
- `--base-path` / `-b`: Base path for hosting in subfolders (e.g., "/poseidon")
- `--config` / `-c`: Use custom config file path

### Serve Locally

```bash
obsidianp serve ./vault -p 8000
obsidianp serve ./vault -p 8000 --base-path "/poseidon"
```

### Initialize Configuration

```bash
obsidianp init                    # Creates obsidianp.config.json
obsidianp init -o my-config.jsonc # Custom filename
```

## Configuration

ObsidianP automatically detects `obsidianp.config.jsonc` or `obsidianp.config.json` in your project directory:

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

**Configuration Options:**
- `title`: Site title displayed in the header
- `basePath`: Base path for hosting in subfolders
- `fonts`: Custom font families for main text, headings, and code
- `customization`: Theme-aware CSS variables (common, light, dark themes)

**Command Line Options:**
- `--title`: Override site title
- `--config`: Use custom config file path

## Deployment

The generated site is pure HTML/CSS/JS. Deploy to any static host:

An example Github Actions deployment taks:

1. **Enable GitHub Pages** in your repository settings:
   - Go to Settings → Pages
   - Set Source to "GitHub Actions"

2. **Create workflow file** `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build ObsidianP
        run: npm run build
      
      - name: Generate site
        run: |
          # For root domain: yourname.github.io
          npx obsidianp generate ./vault ./site
          
          # For project pages: yourname.github.io/repo-name
          # npx obsidianp generate ./vault ./site --base-path "/repo-name"
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./site

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

3. **Configure base path**:
   - For **user/org sites** (yourname.github.io): Use `--base-path ""`
   - For **project sites** (yourname.github.io/repo-name): Use `--base-path "/repo-name"`

4. **Push to trigger deployment**:
```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Pages workflow"
git push
```

The site will be available at:
- User/org site: `https://yourname.github.io`
- Project site: `https://yourname.github.io/repo-name`

## License

MIT © [jwintz](https://github.com/jwintz)
