---
description: Complete API reference for the SiteGenerator class
tags:
  - api
  - site-generation
  - templates
  - build
  - typescript
  - reference
type: api-reference
category: api
audience: developers
difficulty: advanced
estimated_time: 30 minutes
last_updated: 2025-10-17
related_components:
  - VaultProcessor
  - MarkdownProcessor
  - GraphRenderer
features:
  - HTML generation
  - Search index
  - Sitemap
  - Asset copying
code_examples: true
---

# SiteGenerator API

The `SiteGenerator` class creates the final static HTML website from processed vault data.

## Class: SiteGenerator

### Constructor

```typescript
class SiteGenerator {
  constructor(
    config: GeneratorConfig,
    templates: Templates
  )
}
```

**Parameters:**
- `config`: Generation configuration
- `templates`: HTML template functions

### Methods

#### generate()

Generate the complete static site.

```typescript
async generate(vaultData: VaultData): Promise<void>
```

**Parameters:**
- `vaultData`: Processed vault data from VaultProcessor

**Example:**
```typescript
const generator = new SiteGenerator(config, templates);
await generator.generate(vaultData);
console.log('Site generated in ./dist');
```

#### generateNotePage()

Generate HTML page for a single note.

```typescript
generateNotePage(
  note: Note,
  vaultData: VaultData
): string
```

**Returns:** HTML string

**Example:**
```typescript
const html = generator.generateNotePage(note, vaultData);
fs.writeFileSync(`dist/${note.id}.html`, html);
```

#### generateIndexPage()

Generate the home/index page.

```typescript
generateIndexPage(vaultData: VaultData): string
```

**Example:**
```typescript
const indexHtml = generator.generateIndexPage(vaultData);
fs.writeFileSync('dist/index.html', indexHtml);
```

#### generateSearchIndex()

Create search index for client-side search.

```typescript
generateSearchIndex(notes: Map<string, Note>): SearchIndex
```

**Returns:**
```typescript
interface SearchIndex {
  documents: SearchDocument[];
  index: any; // Lunr.js index
}

interface SearchDocument {
  id: string;
  title: string;
  content: string;
  tags: string[];
  path: string;
}
```

**Example:**
```typescript
const searchIndex = generator.generateSearchIndex(vaultData.notes);
fs.writeFileSync(
  'dist/assets/search-index.json',
  JSON.stringify(searchIndex)
);
```

#### generateSitemap()

Generate XML sitemap for SEO.

```typescript
generateSitemap(
  notes: Map<string, Note>,
  baseUrl: string
): string
```

**Example:**
```typescript
const sitemap = generator.generateSitemap(vaultData.notes, 'https://mysite.com');
fs.writeFileSync('dist/sitemap.xml', sitemap);
```

#### copyAssets()

Copy static assets to output directory.

```typescript
async copyAssets(): Promise<void>
```

**Copies:**
- CSS files
- JavaScript files
- Images
- Fonts
- Other static files

**Example:**
```typescript
await generator.copyAssets();
// Assets copied to dist/assets/
```

#### generateNavigation()

Create navigation structure.

```typescript
generateNavigation(
  folders: FolderStructure[]
): NavigationTree
```

**Returns:**
```typescript
interface NavigationTree {
  folders: NavigationFolder[];
}

interface NavigationFolder {
  name: string;
  path: string;
  notes: NavigationNote[];
  subfolders: NavigationFolder[];
}
```

## Configuration

```typescript
interface GeneratorConfig {
  outputPath: string;           // Output directory
  baseUrl: string;              // Base URL for links
  siteName: string;             // Site title
  siteDescription?: string;     // Meta description
  author?: string;              // Author metadata
  language?: string;            // HTML lang attribute
  features: {
    search: boolean;            // Enable search
    graph: boolean;             // Enable graph views
    toc: boolean;               // Enable table of contents
    backlinks: boolean;         // Show backlinks
    breadcrumbs: boolean;       // Show breadcrumbs
  };
  optimization: {
    minifyHTML: boolean;        // Minify HTML output
    minifyCSS: boolean;         // Minify CSS
    minifyJS: boolean;          // Minify JavaScript
    optimizeImages: boolean;    // Optimize images
  };
}
```

## Templates

```typescript
interface Templates {
  noteTemplate: (data: NoteTemplateData) => string;
  indexTemplate: (data: IndexTemplateData) => string;
  graphTemplate: (data: GraphTemplateData) => string;
  headTemplate: (data: HeadTemplateData) => string;
  navTemplate: (data: NavTemplateData) => string;
}
```

### Template Data Types

#### NoteTemplateData

```typescript
interface NoteTemplateData {
  note: Note;
  htmlContent: string;
  backlinks: Note[];
  tags: string[];
  toc: TOCItem[];
  breadcrumbs: Breadcrumb[];
  relatedNotes: Note[];
  config: GeneratorConfig;
}
```

#### IndexTemplateData

```typescript
interface IndexTemplateData {
  notes: Note[];
  recentNotes: Note[];
  popularNotes: Note[];
  tags: TagData[];
  stats: VaultStats;
  config: GeneratorConfig;
}
```

## Usage Examples

### Basic Site Generation

```typescript
import { SiteGenerator } from './site-generator';
import { defaultTemplates } from './templates';

const config: GeneratorConfig = {
  outputPath: './dist',
  baseUrl: 'https://mysite.com',
  siteName: 'My Knowledge Base',
  features: {
    search: true,
    graph: true,
    toc: true,
    backlinks: true,
    breadcrumbs: true
  },
  optimization: {
    minifyHTML: true,
    minifyCSS: true,
    minifyJS: true,
    optimizeImages: false
  }
};

const generator = new SiteGenerator(config, defaultTemplates);
await generator.generate(vaultData);
```

### Custom Templates

```typescript
const customTemplates: Templates = {
  noteTemplate: (data) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>${data.note.title} - ${data.config.siteName}</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="/assets/main.css">
    </head>
    <body>
      <nav>${data.breadcrumbs.map(b => b.title).join(' > ')}</nav>
      <main>
        <article>
          <h1>${data.note.title}</h1>
          ${data.htmlContent}
        </article>
        
        ${data.backlinks.length > 0 ? `
          <aside class="backlinks">
            <h2>Linked References</h2>
            <ul>
              ${data.backlinks.map(link => `
                <li><a href="/${link.id}">${link.title}</a></li>
              `).join('')}
            </ul>
          </aside>
        ` : ''}
      </main>
      <script src="/assets/app.js"></script>
    </body>
    </html>
  `,
  
  indexTemplate: (data) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>${data.config.siteName}</title>
    </head>
    <body>
      <h1>Welcome to ${data.config.siteName}</h1>
      <p>Total notes: ${data.notes.length}</p>
      
      <h2>Recent Notes</h2>
      <ul>
        ${data.recentNotes.map(note => `
          <li><a href="/${note.id}">${note.title}</a></li>
        `).join('')}
      </ul>
    </body>
    </html>
  `,
  
  // ... other templates
};

const generator = new SiteGenerator(config, customTemplates);
```

### Generate Individual Pages

```typescript
// Generate only specific notes
const notesToGenerate = ['Home', 'About', 'Contact'];

for (const noteId of notesToGenerate) {
  const note = vaultData.notes.get(noteId);
  if (note) {
    const html = generator.generateNotePage(note, vaultData);
    await fs.promises.writeFile(
      path.join(config.outputPath, `${note.id}.html`),
      html
    );
  }
}
```

### Custom Search Index

```typescript
// Add custom fields to search index
const searchIndex = generator.generateSearchIndex(vaultData.notes);

// Enhance with custom data
searchIndex.documents = searchIndex.documents.map(doc => ({
  ...doc,
  category: getCategoryForNote(doc.id),
  importance: calculateImportance(doc.id)
}));

// Save enhanced index
await fs.promises.writeFile(
  'dist/assets/search-index.json',
  JSON.stringify(searchIndex)
);
```

### Progress Tracking

```typescript
class ProgressTracker extends SiteGenerator {
  async generate(vaultData: VaultData): Promise<void> {
    const total = vaultData.notes.size;
    let processed = 0;
    
    for (const [id, note] of vaultData.notes) {
      await this.generateNotePage(note, vaultData);
      processed++;
      console.log(`Progress: ${processed}/${total} (${Math.round(processed/total * 100)}%)`);
    }
    
    await this.copyAssets();
    console.log('Complete!');
  }
}

const generator = new ProgressTracker(config, templates);
```

### Parallel Generation

```typescript
import { Worker } from 'worker_threads';

async function parallelGenerate(vaultData: VaultData) {
  const notes = Array.from(vaultData.notes.values());
  const workers = 4;
  const chunkSize = Math.ceil(notes.length / workers);
  
  const promises = [];
  for (let i = 0; i < workers; i++) {
    const chunk = notes.slice(i * chunkSize, (i + 1) * chunkSize);
    promises.push(
      new Promise((resolve) => {
        const worker = new Worker('./generate-worker.js', {
          workerData: { chunk, vaultData, config }
        });
        worker.on('exit', resolve);
      })
    );
  }
  
  await Promise.all(promises);
}
```

---

See also: [[Getting-Started/Building Sites|Building Sites]] • [[Getting-Started/Deployment|Deployment]] • [[Architecture/Core Components|Core Components]]
