---
description: Complete API reference for the VaultProcessor class
tags:
  - api
  - vault-processing
  - core
  - typescript
  - reference
type: api-reference
category: api
audience: developers
difficulty: advanced
estimated_time: 20 minutes
last_updated: 2025-10-24
related_components:
  - MarkdownProcessor
  - SiteGenerator
  - BaseProcessor
code_examples: true
---

# VaultProcessor API

The `VaultProcessor` class reads and processes your Obsidian vault, handling both markdown notes and `.base` database files.

## Class: VaultProcessor

### Constructor

```typescript
class VaultProcessor {
  constructor()
}
```

**Note:** The constructor takes no parameters. Configuration is handled via the `SiteGenerator` or passed to methods.

**Example:**
```typescript
import { VaultProcessor } from './vault-processor';

const processor = new VaultProcessor();
```

### Methods

#### processVault()

Processes the entire vault and returns complete vault structure.

```typescript
async processVault(vaultPath: string): Promise<VaultStructure>
```

**Parameters:**
- `vaultPath`: Absolute path to your Obsidian vault directory

**Returns:**
```typescript
interface VaultStructure {
  notes: Map<string, Note>;
  bases: Map<string, Base>;
  linkGraph: Map<string, Set<string>>;
  categories: Map<string, string[]>;
  tags: Map<string, string[]>;
  folderStructure: FolderNode[];
}
```

**Example:**
```typescript
const processor = new VaultProcessor();
const vaultData = await processor.processVault('/path/to/vault');

console.log(`Processed ${vaultData.notes.size} notes`);
console.log(`Found ${vaultData.bases.size} base files`);
console.log(`Indexed ${vaultData.tags.size} tags`);
```

#### getMarkdownProcessor()

Get access to the internal MarkdownProcessor instance.

```typescript
getMarkdownProcessor(): MarkdownProcessor
```

**Returns:** The `MarkdownProcessor` instance used by this vault processor.

**Example:**
```typescript
const processor = new VaultProcessor();
const mdProcessor = processor.getMarkdownProcessor();

// Can be used for custom processing
await mdProcessor.initialize();
```

## Type Definitions

### VaultStructure

```typescript
interface VaultStructure {
  notes: Map<string, Note>;        // All markdown notes
  bases: Map<string, Base>;        // All .base database files
  linkGraph: Map<string, Set<string>>;  // Note connections
  categories: Map<string, string[]>;    // Category -> note IDs
  tags: Map<string, string[]>;          // Tag -> note IDs
  folderStructure: FolderNode[];        // Folder hierarchy
}
```

### Note

```typescript
interface Note {
  id: string;              // Unique identifier (path-based)
  title: string;           // Note title (from frontmatter or filename)
  path: string;            // Absolute file path
  relativePath: string;    // Path relative to vault
  folderPath: string;      // Parent folder path
  content: string;         // Raw markdown content
  frontMatter: FrontMatter;    // Parsed frontmatter
  frontMatterHtml: string;     // Rendered frontmatter HTML
  html: string;                // Processed HTML content
  links: string[];             // Outgoing wiki-links
  backlinks: string[];         // Incoming links (note IDs)
  fileStats?: {                // File metadata
    size: number;
    mtime: Date;
    ctime: Date;
  };
}
```

### Base

```typescript
interface Base {
  id: string;              // Unique identifier
  title: string;           // Base title
  source: string;          // Source YAML content
  path: string;            // Absolute file path
  relativePath: string;    // Path relative to vault
  folderPath: string;      // Parent folder path
  description?: string;    // Optional description
  views: BaseView[];       // View configurations
  filters?: BaseFilter;    // Filter rules
  properties?: Record<string, BaseProperty> | BaseProperty[];
  formulas?: BaseFormula[];
  matchedNotes?: Note[];   // Notes matching filters
}
```

### FolderNode

```typescript
interface FolderNode {
  name: string;           // Folder/file name
  path: string;           // Relative path
  type: 'folder' | 'file';
  children: FolderNode[]; // Nested items
  noteId?: string;        // Note ID (for files)
}
```

### FrontMatter

```typescript
interface FrontMatter {
  [key: string]: any;
  categories?: string[];
  tags?: string[];
  created?: string;
  url?: string;
  author?: string[];
  published?: string;
  topics?: string[];
  status?: string[];
}
```

## Usage Examples

### Basic Vault Processing

```typescript
import { VaultProcessor } from './vault-processor';

const processor = new VaultProcessor();
const vaultData = await processor.processVault('./vault');

// Access processed notes
for (const [id, note] of vaultData.notes) {
  console.log(`${note.title}: ${note.links.length} links`);
}

// Access base files
for (const [id, base] of vaultData.bases) {
  console.log(`Base: ${base.title} (${base.matchedNotes?.length || 0} notes)`);
}

// Access link graph
vaultData.linkGraph.forEach((targets, sourceId) => {
  const source = vaultData.notes.get(sourceId);
  console.log(`${source?.title} links to ${targets.size} notes`);
});
```

### Filter Notes by Tag

```typescript
const processor = new VaultProcessor();
const vaultData = await processor.processVault('./vault');

// Get notes with specific tag
const tag = 'documentation';
const noteIds = vaultData.tags.get(tag) || [];
const taggedNotes = noteIds
  .map(id => vaultData.notes.get(id))
  .filter((note): note is Note => note !== undefined);

console.log(`Found ${taggedNotes.length} notes with #${tag}`);
```

### Analyze Link Graph

```typescript
const processor = new VaultProcessor();
const vaultData = await processor.processVault('./vault');

// Find most connected notes
const connectionCounts = new Map<string, number>();

for (const [noteId, note] of vaultData.notes) {
  const outgoing = vaultData.linkGraph.get(noteId)?.size || 0;
  const incoming = note.backlinks.length;
  connectionCounts.set(noteId, outgoing + incoming);
}

// Sort by connection count
const sorted = Array.from(connectionCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log('Top 10 most connected notes:');
sorted.forEach(([noteId, count]) => {
  const note = vaultData.notes.get(noteId);
  console.log(`  ${note?.title}: ${count} connections`);
});
```

### Working with Folder Structure

```typescript
const processor = new VaultProcessor();
const vaultData = await processor.processVault('./vault');

// Recursively print folder structure
function printStructure(nodes: FolderNode[], indent = '') {
  for (const node of nodes) {
    const icon = node.type === 'folder' ? '📁' : '📄';
    console.log(`${indent}${icon} ${node.name}`);
    if (node.children.length > 0) {
      printStructure(node.children, indent + '  ');
    }
  }
}

printStructure(vaultData.folderStructure);
```

## Internal Processing

### Processing Pipeline

When you call `processVault()`, the following steps occur:

1. **Markdown File Discovery** - Scans for all `.md` files using glob patterns
2. **Base File Discovery** - Scans for all `.base` database files
3. **Markdown Processing** - Each note is processed:
   - Frontmatter extraction
   - Wiki-link extraction
   - Content transformation to HTML
   - Tag indexing
   - Category indexing
4. **Base Processing** - Each base file is processed:
   - YAML parsing
   - Filter evaluation
   - Note matching
   - Formula computation
5. **Backlink Generation** - Bidirectional links are computed
6. **Embed Resolution** - Embedded notes and bases are resolved
7. **Link Path Fixing** - Wiki-links are resolved to correct paths
8. **Link Graph Building** - Connection graph is constructed
9. **Folder Structure Building** - Hierarchy is created

### Performance Considerations

- Processing is sequential but optimized with async I/O
- Large vaults (1000+ notes) typically process in < 10 seconds
- The markdown processor is initialized once and reused
- Shiki highlighter is cached after first initialization

## Error Handling

```typescript
try {
  const processor = new VaultProcessor();
  const vaultData = await processor.processVault('./vault');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Vault directory not found');
  } else if (error.message.includes('Failed to process')) {
    console.error('Error processing file:', error);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

The processor logs warnings for individual file failures but continues processing the rest of the vault.

---

See also: [[MarkdownProcessor API]] • [[BaseProcessor API]] • [[SiteGenerator API]]
