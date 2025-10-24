---
description: Complete API reference for the SiteGenerator class
tags:
  - api
  - site-generation
  - build
  - typescript
  - reference
type: api-reference
category: api
audience: developers
difficulty: advanced
estimated_time: 20 minutes
last_updated: 2025-10-24
related_components:
  - VaultProcessor
  - MarkdownProcessor
  - BaseProcessor
features:
  - HTML generation
  - Asset copying
  - Data file generation
code_examples: true
---

# SiteGenerator API

The `SiteGenerator` class orchestrates the entire static site generation process, from processing the vault to copying assets.

## Class: SiteGenerator

### Constructor

```typescript
class SiteGenerator {
  constructor()
}
```

**Note:** The constructor takes no parameters.

### Methods

#### generateSite()

Generate the complete static site from a vault.

```typescript
async generateSite(
  vaultPath: string,
  outputPath: string,
  config?: SiteConfig
): Promise<void>
```

**Parameters:**
- `vaultPath`: Absolute path to the Obsidian vault
- `outputPath`: Absolute path where the site will be generated
- `config`: (Optional) Site configuration

**Example:**
```typescript
import { SiteGenerator } from './site-generator';

const generator = new SiteGenerator();

await generator.generateSite(
  './vault',
  './dist',
  {
    title: 'My Knowledge Base',
    basePath: '/docs'
  }
);

console.log('Site generated successfully!');
```

## Configuration

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

**Default Configuration:**
```typescript
{
  title: 'Vault'
}
```

## Generation Process

When `generateSite()` is called, the following steps occur:

1. **Vault Processing** - VaultProcessor scans and processes all markdown and base files
2. **Output Directory Setup** - Creates/cleans output directory (preserves `.git`)
3. **Asset Copying** - Copies CSS, JS, fonts, and libraries to `assets/`
4. **Custom CSS Application** - Applies theme customization from config
5. **Attachment Copying** - Copies images and other attachments preserving structure
6. **HTML Generation** - Generates HTML for each note and base file
7. **Data File Generation** - Creates JSON files for client-side features
8. **Jekyll Bypass** - Creates `.nojekyll` for GitHub Pages compatibility

### Console Output

```
🚀 Starting site generation...
📁 Vault: /path/to/vault
📤 Output: /path/to/dist
📖 Processing vault...
🗄️ Processing base files...
🔗 Resolving embedded notes...
🔗 Fixing wiki link paths...
🔗 Building link graph...
📋 Copying assets...
🖼️ Copying attachments...
📝 Generating HTML files...
💾 Generating data files...
✅ Site generation complete!
```

## Generated Output Structure

```
dist/
├── index.html                    # Main index page
├── note-id.html                  # Individual note pages
├── folder/
│   └── note-id.html              # Nested note pages
├── .nojekyll                     # GitHub Pages marker
├── assets/
│   ├── main.css                  # Compiled styles
│   ├── main.js                   # Main JavaScript
│   ├── graph.js                  # Graph rendering
│   ├── search.js                 # Search functionality
│   ├── table-of-contents.js      # TOC generation
│   ├── d3.min.js                 # D3.js library
│   ├── mermaid.min.js            # Mermaid library
│   ├── abcjs-basic-min.js        # ABCJS library
│   ├── katex.min.css             # KaTeX styles
│   └── fonts/                    # Font files
├── data/
│   ├── notes.json                # All notes + metadata
│   └── search.json               # Search index
└── [image files preserving vault structure]
```

## Usage Examples

### Basic Site Generation

```typescript
import { SiteGenerator } from './site-generator';

const generator = new SiteGenerator();

await generator.generateSite(
  './vault',
  './dist',
  {
    title: 'My Knowledge Base',
    basePath: ''
  }
);
```

### With Custom Configuration

```typescript
import { SiteGenerator } from './site-generator';
import { SiteConfig } from './types';

const config: SiteConfig = {
  title: 'Technical Documentation',
  basePath: '/docs',
  fonts: {
    main: 'Inter, system-ui, sans-serif',
    code: 'Fira Code, monospace'
  },
  customization: {
    light: {
      'color-primary': '#0066cc',
      'color-accent': '#00aa66'
    },
    dark: {
      'color-primary': '#3399ff',
      'color-accent': '#00dd88'
    }
  }
};

const generator = new SiteGenerator();
await generator.generateSite('./vault', './dist', config);
```

### With Theme Customization

```typescript
const config: SiteConfig = {
  title: 'My Site',
  customization: {
    common: {
      'sidebar-width': '320px',
      'font-size-base': '16px'
    },
    light: {
      'color-bg-primary': '#ffffff',
      'color-text-primary': '#1a1a1a',
      'color-primary': '#7c3aed'
    },
    dark: {
      'color-bg-primary': '#0d1117',
      'color-text-primary': '#c9d1d9',
      'color-primary': '#a78bfa'
    }
  }
};

const generator = new SiteGenerator();
await generator.generateSite('./vault', './dist', config);
```

### Programmatic Build Script

```typescript
import { SiteGenerator } from './site-generator';
import path from 'path';

async function build() {
  const vaultPath = path.resolve('./vault');
  const outputPath = path.resolve('./dist');
  
  console.log('Building site...');
  
  const generator = new SiteGenerator();
  
  try {
    await generator.generateSite(vaultPath, outputPath, {
      title: process.env.SITE_TITLE || 'My Site',
      basePath: process.env.BASE_PATH || ''
    });
    
    console.log('✅ Build successful!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
```

## Internal Components

The SiteGenerator uses several internal components:

- **VaultProcessor** - Processes markdown and base files
- **MarkdownProcessor** - Handles markdown transformation
- **Template Functions** - Generate HTML pages (`templates.ts`)
  - `generateMainTemplate()` - Index page
  - `generateNoteTemplate()` - Note content
  - `generateNoteHTML()` - Complete note page
  - `generateBaseHTML()` - Base file pages

## Asset Management

### Copied Assets

The generator automatically copies:

1. **CSS Files**: `main.css` with theme customization
2. **JavaScript Files**: `main.js`, `graph.js`, `search.js`, `table-of-contents.js`
3. **Libraries**: D3.js, Mermaid.js, ABCJS, KaTeX
4. **Fonts**: Mona Sans (weights: 400, 500, 600, 700), Monaspace Krypton, KaTeX fonts
5. **Images**: All images from vault preserving folder structure

### Base Path Handling

When `basePath` is set, all asset URLs are automatically prefixed:

```css
/* Before */
url('/assets/fonts/MonaSans-400.woff2')

/* After (with basePath="/docs") */
url('/docs/assets/fonts/MonaSans-400.woff2')
```

## Performance

- **Small vaults** (<100 notes): ~2-5 seconds
- **Medium vaults** (100-500 notes): ~5-15 seconds
- **Large vaults** (500-2000 notes): ~15-45 seconds
- **Very large vaults** (2000+ notes): ~45+ seconds

Performance depends on:
- Number of notes
- Amount of embedded content
- Number of images/attachments
- Code blocks to highlight
- Math expressions to render

---

See also: [[VaultProcessor API]] • [[MarkdownProcessor API]] • [[BaseProcessor API]] • [[../Getting-Started/Building Sites|Building Sites]]
