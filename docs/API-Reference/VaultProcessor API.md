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
estimated_time: 25 minutes
last_updated: 2025-10-17
related_components:
  - MarkdownProcessor
  - SiteGenerator
code_examples: true
---

# VaultProcessor API

The `VaultProcessor` class is the core component that reads and processes your Obsidian vault.

## Class: VaultProcessor

### Constructor

```typescript
class VaultProcessor {
  constructor(
    vaultPath: string,
    config: ProcessorConfig
  )
}
```

**Parameters:**
- `vaultPath`: Path to your Obsidian vault directory
- `config`: Configuration object

### Methods

#### processVault()

Processes the entire vault and returns note metadata.

```typescript
async processVault(): Promise<VaultData>
```

**Returns:**
```typescript
interface VaultData {
  notes: Map<string, Note>;
  folders: FolderStructure[];
  tags: Map<string, string[]>;
  linkGraph: Map<string, string[]>;
}
```

**Example:**
```typescript
const processor = new VaultProcessor('./vault', config);
const vaultData = await processor.processVault();

console.log(`Processed ${vaultData.notes.size} notes`);
```

#### processNote()

Process a single note file.

```typescript
async processNote(filePath: string): Promise<Note>
```

**Parameters:**
- `filePath`: Relative path to note from vault root

**Returns:**
```typescript
interface Note {
  id: string;
  title: string;
  content: string;
  links: string[];
  backlinks: string[];
  tags: string[];
  frontMatter?: FrontMatter;
  created?: Date;
  modified?: Date;
}
```

**Example:**
```typescript
const note = await processor.processNote('folder/MyNote.md');
console.log(note.title); // "MyNote"
console.log(note.links); // ["LinkedNote", "AnotherNote"]
```

#### buildLinkGraph()

Constructs bidirectional link graph.

```typescript
buildLinkGraph(notes: Map<string, Note>): LinkGraph
```

**Returns:**
```typescript
interface LinkGraph {
  outbound: Map<string, string[]>;  // Note -> targets
  inbound: Map<string, string[]>;   // Note -> sources (backlinks)
}
```

**Example:**
```typescript
const linkGraph = processor.buildLinkGraph(vaultData.notes);

// Get all notes linking TO a specific note
const backlinks = linkGraph.inbound.get('MyNote');

// Get all notes this note links TO
const outgoingLinks = linkGraph.outbound.get('MyNote');
```

## Type Definitions

### Note

```typescript
interface Note {
  id: string;              // Unique identifier (filename without extension)
  title: string;           // Note title (from H1 or filename)
  content: string;         // Raw markdown content
  htmlContent?: string;    // Processed HTML (after markdown processing)
  links: string[];         // Outgoing wiki-links
  backlinks: string[];     // Incoming links from other notes
  tags: string[];          // Tags found in note
  frontMatter?: FrontMatter;
  path: string;            // Relative path from vault root
  created?: Date;
  modified?: Date;
}
```

### FrontMatter

```typescript
interface FrontMatter {
  title?: string;
  date?: string;
  tags?: string | string[];
  aliases?: string[];
  [key: string]: any;      // Custom frontmatter fields
}
```

### ProcessorConfig

```typescript
interface ProcessorConfig {
  vaultPath: string;
  outputPath: string;
  excludePatterns?: string[];  // Glob patterns to exclude
  includeAttachments?: boolean;
  parseFrontMatter?: boolean;
}
```

## Usage Examples

### Basic Vault Processing

```typescript
import { VaultProcessor } from './vault-processor';

const processor = new VaultProcessor('./vault', {
  vaultPath: './vault',
  outputPath: './dist',
  parseFrontMatter: true
});

const data = await processor.processVault();

// Access processed notes
for (const [id, note] of data.notes) {
  console.log(`${note.title}: ${note.links.length} links`);
}
```

### Filter Notes by Tag

```typescript
const vaultData = await processor.processVault();

const notesByTag = new Map<string, Note[]>();
for (const [id, note] of vaultData.notes) {
  for (const tag of note.tags) {
    if (!notesByTag.has(tag)) {
      notesByTag.set(tag, []);
    }
    notesByTag.get(tag)!.push(note);
  }
}

// Get all notes with #concept tag
const conceptNotes = notesByTag.get('concept') || [];
```

### Find Most Connected Notes

```typescript
const linkGraph = processor.buildLinkGraph(vaultData.notes);

const connectionCounts = new Map<string, number>();
for (const [noteId, note] of vaultData.notes) {
  const outgoing = linkGraph.outbound.get(noteId)?.length || 0;
  const incoming = linkGraph.inbound.get(noteId)?.length || 0;
  connectionCounts.set(noteId, outgoing + incoming);
}

// Sort by connection count
const sorted = Array.from(connectionCounts.entries())
  .sort((a, b) => b[1] - a[1]);

console.log('Most connected notes:', sorted.slice(0, 10));
```

## Error Handling

```typescript
try {
  const data = await processor.processVault();
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Vault directory not found');
  } else {
    console.error('Error processing vault:', error);
  }
}
```

---

See also: [[MarkdownProcessor API]] • [[Architecture/Core Components|Core Components]]
