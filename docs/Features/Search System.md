---
description: Simple client-side search for finding notes by title and content
tags:
  - search
  - features
  - client-side
type: feature-guide
category: features
audience: all
difficulty: beginner
estimated_time: 5 minutes
last_updated: 2025-10-24
related_apis:
  - SiteGenerator API
---

# Search System

Obsidian:P includes a simple client-side search system for finding notes.

## Features

- **Basic text search** - Search across note titles and content
- **Case-insensitive matching** - Finds matches regardless of case
- **Live results** - Updates as you type (after 2+ characters)
- **Click to navigate** - Click any result to view that note
- **No server required** - All search happens in the browser

## How It Works

The search system uses simple substring matching:

1. User types in the search input
2. After 2+ characters, search activates
3. Filters notes where title or content includes the query (case-insensitive)
4. Shows up to 10 results
5. Displays title and excerpt with highlighted matches

## Search Data

During site generation, a JSON file is created with note data:

```json
{
  "notes": {
    "note-id": {
      "id": "note-id",
      "title": "Note Title",
      "content": "First 500 characters of content...",
      "links": [...],
      "backlinks": [...],
      "frontMatter": {...}
    }
  }
}
```

The search loads this data from `/data/notes.json` and searches through it client-side.

## Implementation

The search is implemented in `src/assets/search.js`:

```javascript
class Search {
  constructor() {
    this.searchInput = document.getElementById('search-input');
    this.searchResults = document.getElementById('search-results');
    this.notes = new Map();
    this.searchIndex = [];
  }
  
  loadSearchIndex(notes) {
    this.notes = notes;
    this.searchIndex = Array.from(notes.values()).map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      searchText: `${note.title} ${note.content}`.toLowerCase()
    }));
  }
  
  handleSearch(query) {
    if (!query || query.length < 2) {
      this.searchResults.classList.add('hidden');
      return;
    }
    
    const results = this.searchIndex
      .filter(item => item.searchText.includes(query.toLowerCase()))
      .slice(0, 10);
    
    this.displayResults(results, query);
  }
}
```

## Usage

The search input is available in the site header. Simply:

1. Click the search input or focus it
2. Type at least 2 characters
3. Results appear below the input
4. Click any result to navigate to that note
5. Click outside to close results

## Search Result Display

Each result shows:
- **Title** - With matched text highlighted
- **Excerpt** - Context around the match (up to 100 characters)

Highlighting uses `<mark>` tags for visual emphasis.

## Limitations

The current search implementation:
- Does **NOT** support fuzzy matching
- Does **NOT** support advanced queries (AND, OR, NOT)
- Does **NOT** support field-specific search (title:, tag:, etc.)
- Does **NOT** rank results by relevance
- Simply matches substrings (case-insensitive)
- Limited to first 500 characters of each note's content

## Data Generation

The search data is generated in `SiteGenerator`:

```typescript
// In generateDataFiles method
const notesObject: Record<string, any> = {};
notes.forEach((note, id) => {
  notesObject[id] = {
    id: note.id,
    title: note.title,
    html: note.html,
    frontMatterHtml: note.frontMatterHtml,
    content: note.content.substring(0, 500), // Truncated for search
    links: note.links,
    backlinks: note.backlinks,
    frontMatter: note.frontMatter,
    fileStats: note.fileStats,
    folderPath: note.folderPath
  };
});

await fs.writeFile(
  path.join(dataDir, 'notes.json'),
  JSON.stringify({ notes: notesObject, ... })
);
```

## Performance

The search is fast for small to medium vaults:
- **< 100 notes**: Instant results
- **100-500 notes**: Very fast (< 50ms)
- **500-1000 notes**: Fast (< 100ms)
- **1000+ notes**: May have slight delay

All filtering happens in the browser's JavaScript engine.

---

**Main documentation complete!** Explore the API references for advanced usage.
