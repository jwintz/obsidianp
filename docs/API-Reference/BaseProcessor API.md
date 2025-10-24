---
description: Complete API reference for the BaseProcessor class for Obsidian database files
tags:
  - api
  - base
  - database
  - filtering
  - typescript
  - reference
type: api-reference
category: api
audience: developers
difficulty: advanced
estimated_time: 25 minutes
last_updated: 2025-10-24
related_components:
  - VaultProcessor
  - MarkdownProcessor
features:
  - Database views
  - Filtering
  - Formulas
  - Sorting
code_examples: true
---

# BaseProcessor API

The `BaseProcessor` class handles Obsidian database (`.base`) files, providing filtering, sorting, and formula evaluation for collections of notes.

## Overview

Obsidian:P supports Obsidian-style databases through `.base` files. These files define:
- **Filters** to select notes
- **Views** to display notes (table, cards, calendar)
- **Properties** to define custom fields
- **Formulas** to compute derived values
- **Sorting** to order results

## Class: BaseProcessor

### Constructor

```typescript
class BaseProcessor {
  constructor()
}
```

### Methods

#### processBase()

Process a `.base` file and extract its configuration.

```typescript
processBase(
  filePath: string,
  content: string,
  vaultPath: string
): Base
```

**Parameters:**
- `filePath`: Absolute path to the `.base` file
- `content`: Raw file content (YAML)
- `vaultPath`: Vault root path

**Returns:** A `Base` object with parsed configuration

**Example:**
```typescript
import { BaseProcessor } from './base-processor';

const processor = new BaseProcessor();
const baseContent = await fs.readFile('./Projects.base', 'utf-8');
const base = processor.processBase(
  './Projects.base',
  baseContent,
  './vault'
);

console.log(`Base: ${base.title}`);
console.log(`Views: ${base.views.length}`);
```

#### filterNotes()

Filter notes based on base filter rules.

```typescript
filterNotes(
  base: Base,
  allNotes: Map<string, Note>
): Note[]
```

**Parameters:**
- `base`: Base configuration with filter rules
- `allNotes`: All notes in the vault

**Returns:** Array of notes matching the filters

**Example:**
```typescript
const matchedNotes = processor.filterNotes(base, vaultData.notes);
console.log(`Matched ${matchedNotes.length} notes`);
```

#### processFormulas()

Evaluate formulas for each note.

```typescript
processFormulas(
  base: Base,
  notes: Note[]
): Note[]
```

**Parameters:**
- `base`: Base with formula definitions
- `notes`: Notes to process

**Returns:** Notes with computed formula properties added to frontmatter

**Example:**
```typescript
const notesWithFormulas = processor.processFormulas(base, matchedNotes);
```

#### sortNotes()

Sort notes based on view configuration.

```typescript
sortNotes(
  notes: Note[],
  view: BaseView
): Note[]
```

**Parameters:**
- `notes`: Notes to sort
- `view`: View configuration with sort rules

**Returns:** Sorted array of notes

#### evaluateFilter()

Evaluate a single filter rule against a note.

```typescript
evaluateFilter(
  filter: BaseFilter | string,
  note: Note
): boolean
```

**Parameters:**
- `filter`: Filter expression or object
- `note`: Note to test

**Returns:** `true` if note matches filter, `false` otherwise

## Type Definitions

### Base

```typescript
interface Base {
  id: string;
  title: string;
  source: string;              // Original YAML content
  path: string;
  relativePath: string;
  folderPath: string;
  description?: string;
  views: BaseView[];
  filters?: BaseFilter | BaseFilter[] | string;
  properties?: Record<string, BaseProperty> | BaseProperty[];
  formulas?: BaseFormula[];
  matchedNotes?: Note[];       // Filtered and processed notes
}
```

### BaseView

```typescript
interface BaseView {
  type: 'table' | 'cards' | 'calendar';
  name: string;
  order?: string[];            // Property display order
  sort?: Array<{
    property: string;
    direction: 'ASC' | 'DESC';
  }>;
  columnSize?: Record<string, number>;
  limit?: number;
  filter?: BaseFilter;         // View-specific filters
  group?: string;              // Group by property
  image?: string;              // Property for card images
}
```

### BaseFilter

```typescript
interface BaseFilter {
  and?: (BaseFilter | string)[];
  or?: (BaseFilter | string)[];
  not?: BaseFilter | string;
  
  // File properties
  'file.name'?: string | BaseStringFilter;
  'file.path'?: string | BaseStringFilter;
  'file.size'?: number | BaseNumberFilter;
  'file.mtime'?: string | Date | BaseDateFilter;
  'file.ctime'?: string | Date | BaseDateFilter;
  'file.tag'?: string | string[];
  'file.tags'?: string | string[];
  'file.hasTag'?: string | string[];
  'file.inFolder'?: string;
  'file.starred'?: boolean;
  
  // Custom properties (from frontmatter)
  [key: string]: any;
}
```

### BaseProperty

```typescript
interface BaseProperty {
  name?: string;
  displayName?: string;
  type?: 'text' | 'number' | 'date' | 'datetime' | 'checkbox' | 
         'select' | 'multiselect' | 'url' | 'email' | 'file' | 'person';
  options?: string[];
  default?: any;
  required?: boolean;
  format?: string;
}
```

### BaseFormula

```typescript
interface BaseFormula {
  name: string;                // Formula output property
  formula: string;             // Formula expression
  type?: 'text' | 'number' | 'date' | 'boolean';
  format?: string;
}
```

## Filter Syntax

### String Filters

```typescript
interface BaseStringFilter {
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  matches?: string;            // Regex pattern
  '='?: string;
  '!='?: string;
}
```

**Example:**
```yaml
filters:
  file.name:
    contains: "project"
```

### Number Filters

```typescript
interface BaseNumberFilter {
  '='?: number;
  '!='?: number;
  '>'?: number;
  '>='?: number;
  '<'?: number;
  '<='?: number;
}
```

**Example:**
```yaml
filters:
  file.size:
    '>': 1000
```

### Date Filters

```typescript
interface BaseDateFilter {
  before?: string | Date;
  after?: string | Date;
  on?: string | Date;
  '='?: string | Date;
  '!='?: string | Date;
  '>'?: string | Date;
  '>='?: string | Date;
  '<'?: string | Date;
  '<='?: string | Date;
}
```

**Example:**
```yaml
filters:
  file.mtime:
    after: "2025-01-01"
```

### Logical Operators

**AND:**
```yaml
filters:
  and:
    - file.tag: project
    - file.inFolder: "Projects"
```

**OR:**
```yaml
filters:
  or:
    - file.tag: urgent
    - file.tag: important
```

**NOT:**
```yaml
filters:
  not:
    file.tag: archived
```

**Complex:**
```yaml
filters:
  and:
    - or:
        - file.tag: project
        - file.tag: task
    - not:
        file.tag: archived
    - file.inFolder: "Active"
```

## Usage Examples

### Basic Base File

Create `Projects.base`:

```yaml
title: Active Projects
description: All active project notes
views:
  - type: cards
    name: Card View
  - type: table
    name: Table View
    order:
      - file.name
      - file.tags
      - file.mtime
filters:
  and:
    - file.tag: project
    - not:
        file.tag: archived
```

### Filter by Folder

```yaml
title: Documentation
filters:
  file.inFolder: "docs"
views:
  - type: table
    name: All Docs
    order:
      - file.name
      - file.mtime
```

### Filter by Multiple Tags

```yaml
title: Important Tasks
filters:
  and:
    - file.hasTag: task
    - or:
        - file.hasTag: urgent
        - file.hasTag: important
views:
  - type: cards
    name: Tasks
```

### Custom Properties

```yaml
title: Team Members
filters:
  file.tag: person
properties:
  role:
    type: select
    options:
      - Developer
      - Designer
      - Manager
  email:
    type: email
    required: true
  joined:
    type: date
    format: "YYYY-MM-DD"
views:
  - type: table
    name: Team
    order:
      - file.name
      - role
      - email
      - joined
```

### Formulas

```yaml
title: Projects with Age
filters:
  file.tag: project
formulas:
  - name: age
    formula: "days_since(file.ctime)"
    type: number
  - name: status_emoji
    formula: "if(status == 'done', '✅', '⏳')"
    type: text
views:
  - type: table
    name: Projects
    order:
      - file.name
      - status
      - status_emoji
      - age
    sort:
      - property: age
        direction: DESC
```

### View-Specific Filters

```yaml
title: Notes by Status
filters:
  file.tag: note
views:
  - type: cards
    name: Todo
    filter:
      status: todo
  - type: cards
    name: In Progress
    filter:
      status: in-progress
  - type: cards
    name: Done
    filter:
      status: done
```

### Card View with Images

```yaml
title: Gallery
filters:
  file.tag: artwork
properties:
  cover:
    type: file
views:
  - type: cards
    name: Gallery
    image: cover
```

## Programmatic Usage

### Filter Notes Manually

```typescript
const processor = new BaseProcessor();

// Create custom filter
const filter: BaseFilter = {
  and: [
    { 'file.tag': 'project' },
    { 'file.mtime': { after: '2025-01-01' } }
  ]
};

const base: Base = {
  id: 'custom',
  title: 'Custom Filter',
  filters: filter,
  // ... other required fields
};

const filtered = processor.filterNotes(base, allNotes);
```

### Evaluate Single Filter

```typescript
const processor = new BaseProcessor();

const filter = {
  'file.tag': 'documentation',
  'file.mtime': { after: '2025-01-01' }
};

for (const note of allNotes.values()) {
  if (processor.evaluateFilter(filter, note)) {
    console.log(`Match: ${note.title}`);
  }
}
```

### Custom Sorting

```typescript
const view: BaseView = {
  type: 'table',
  name: 'Sorted',
  sort: [
    { property: 'file.mtime', direction: 'DESC' },
    { property: 'file.name', direction: 'ASC' }
  ]
};

const sorted = processor.sortNotes(notes, view);
```

## Embedding Bases

### In Markdown Files

Embed a base in any markdown note:

```markdown
![[Projects.base]]
```

Embed with specific view:

```markdown
![[Projects.base#Card View]]
```

### Inline Base Syntax

Define a base inline in a markdown file:

````markdown
```base
title: Inline Tasks
filters:
  file.tag: task
views:
  - type: cards
    name: Tasks
```
````

This creates an embedded database without a separate `.base` file.

---

See also: [[VaultProcessor API]] • [[MarkdownProcessor API]] • [[../Features/Syntax Reference|Syntax Reference]]
