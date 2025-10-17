---
description: Fast client-side search system powered by Lunr.js for finding notes and content
tags:
  - search
  - features
  - lunrjs
  - client-side
  - full-text-search
type: feature-guide
category: features
audience: all
difficulty: beginner
estimated_time: 10 minutes
last_updated: 2025-10-17
related_apis:
  - SiteGenerator API
---

# Search System

ObsidianP includes a powerful client-side search system built with Lunr.js.

## Features

- **Fast full-text search** - Search across all note content
- **Tag filtering** - Filter by tags
- **Path filtering** - Search within folders
- **Fuzzy matching** - Tolerant of typos
- **Weighted results** - Title matches ranked higher
- **Instant results** - No server required

## Search Syntax

### Basic Search

```
hello world          # Search for notes containing both words
"hello world"        # Exact phrase match
hello OR world       # Either word
hello -world         # Contains hello but not world
```

### Field-Specific Search

```
title:concept        # Search in titles only
content:algorithm    # Search in content only
tag:#programming     # Filter by tag
path:folder/         # Search in specific folder
file:*.md            # File pattern matching
```

### Advanced Queries

```
title:graph AND tag:#visualization
path:docs/ AND content:API
(concept OR idea) AND tag:#important
```

## Search API

### SearchEngine Class

```typescript
class SearchEngine {
  constructor(searchIndex: SearchIndex)
  
  search(query: string, options?: SearchOptions): SearchResult[]
  
  suggest(partial: string): string[]
  
  filter(results: SearchResult[], filter: Filter): SearchResult[]
}
```

### Search Options

```typescript
interface SearchOptions {
  limit?: number;              // Max results (default: 50)
  fuzzy?: boolean;             // Enable fuzzy matching (default: true)
  fields?: string[];           // Fields to search
  boost?: {                    // Field weights
    title?: number;            // Default: 10
    content?: number;          // Default: 1
    tags?: number;             // Default: 5
  };
}
```

### Search Results

```typescript
interface SearchResult {
  noteId: string;
  note: Note;
  score: number;               // Relevance score (0-1)
  matches: Match[];            // Matched text snippets
  highlights: Highlight[];     // Positions to highlight
}

interface Match {
  field: string;               // Field name (title, content, etc.)
  text: string;                // Matched text
  context: string;             // Surrounding context
}
```

## Usage Examples

### Basic Search

```typescript
const searchEngine = new SearchEngine(searchIndex);

// Simple search
const results = searchEngine.search('algorithm');

results.forEach(result => {
  console.log(`${result.note.title} (score: ${result.score})`);
  result.matches.forEach(match => {
    console.log(`  ${match.context}`);
  });
});
```

### Advanced Search

```typescript
// Search with options
const results = searchEngine.search('algorithm', {
  limit: 10,
  fuzzy: true,
  fields: ['title', 'content'],
  boost: {
    title: 20,
    content: 1
  }
});
```

### Tag Filtering

```typescript
// Search and filter by tag
const results = searchEngine.search('algorithm')
  .filter(r => r.note.tags.includes('computer-science'));
```

### Auto-complete Suggestions

```typescript
const suggestions = searchEngine.suggest('alg');
// ['algorithm', 'algebra', 'algebraic']
```

## Building Search Index

### During Build

```typescript
const generator = new SiteGenerator(config, templates);
const searchIndex = generator.generateSearchIndex(vaultData.notes);

// Save to JSON
fs.writeFileSync(
  'dist/assets/search-index.json',
  JSON.stringify(searchIndex)
);
```

### Index Structure

```typescript
interface SearchIndex {
  documents: SearchDocument[];
  index: SerializedIndex;      // Lunr.js serialized index
  metadata: {
    version: string;
    created: Date;
    documentCount: number;
  };
}

interface SearchDocument {
  id: string;
  title: string;
  content: string;
  tags: string[];
  path: string;
  modified?: Date;
}
```

### Custom Index Fields

```typescript
// Add custom fields to index
const searchIndex = {
  documents: Array.from(notes.values()).map(note => ({
    id: note.id,
    title: note.title,
    content: note.content,
    tags: note.tags,
    path: note.path,
    // Custom fields
    category: getCategory(note),
    importance: calculateImportance(note),
    author: note.frontMatter?.author
  })),
  index: buildLunrIndex(documents)
};
```

## Client-Side Implementation

### HTML Integration

```html
<input 
  type="text" 
  id="search-input" 
  placeholder="Search notes..."
  autocomplete="off"
>

<div id="search-results"></div>

<script src="/assets/search.js"></script>
```

### JavaScript

```javascript
// Initialize search
const searchEngine = new SearchEngine();

// Load index
fetch('/assets/search-index.json')
  .then(r => r.json())
  .then(index => searchEngine.initialize(index));

// Handle input
const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', (e) => {
  const query = e.target.value;
  if (query.length < 2) return;
  
  const results = searchEngine.search(query);
  displayResults(results);
});

function displayResults(results) {
  const container = document.getElementById('search-results');
  container.innerHTML = results.map(r => `
    <div class="search-result">
      <a href="/${r.noteId}">
        <h3>${highlightMatches(r.note.title, r.highlights)}</h3>
        <p>${r.matches[0]?.context || ''}</p>
      </a>
      <div class="tags">
        ${r.note.tags.map(t => `<span class="tag">${t}</span>`).join('')}
      </div>
    </div>
  `).join('');
}
```

## Performance Optimization

### Index Size Reduction

```typescript
// Limit indexed content length
const searchIndex = {
  documents: Array.from(notes.values()).map(note => ({
    id: note.id,
    title: note.title,
    content: note.content.substring(0, 1000), // Limit content
    tags: note.tags,
    path: note.path
  }))
};
```

### Lazy Loading

```javascript
// Load index only when needed
let searchIndex = null;

async function lazyLoadSearch() {
  if (!searchIndex) {
    const response = await fetch('/assets/search-index.json');
    searchIndex = await response.json();
    searchEngine.initialize(searchIndex);
  }
}

searchInput.addEventListener('focus', lazyLoadSearch);
```

### Debouncing

```javascript
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const results = searchEngine.search(e.target.value);
    displayResults(results);
  }, 300); // Wait 300ms after typing stops
});
```

## Keyboard Shortcuts

```javascript
// Cmd/Ctrl + K to open search
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
  }
  
  // Escape to close
  if (e.key === 'Escape') {
    searchInput.value = '';
    searchInput.blur();
  }
});
```

---

Read Next: [[../API-Reference/SiteGenerator API|SiteGenerator API]] > [[Interactive Graph Views]] > [[../Getting-Started/Building Sites|Building Sites]]
