// Search functionality
class Search {
  constructor() {
    this.searchInput = document.getElementById('search-input');
    this.searchResults = document.getElementById('search-results');
    this.notes = new Map();
    this.searchIndex = [];
    
    this.init();
  }
  
  init() {
    if (!this.searchInput) return;
    
    this.searchInput.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });
    
    this.searchInput.addEventListener('focus', () => {
      if (this.searchInput.value) {
        this.searchResults.classList.remove('hidden');
      }
    });
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        this.searchResults.classList.add('hidden');
      }
    });
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
  
  displayResults(results, query) {
    if (results.length === 0) {
      this.searchResults.innerHTML = '<div class="search-result">No results found</div>';
    } else {
      this.searchResults.innerHTML = results
        .map(result => this.createResultHTML(result, query))
        .join('');
    }
    
    this.searchResults.classList.remove('hidden');
    
    // Add click handlers
    this.searchResults.querySelectorAll('.search-result').forEach((el, index) => {
      if (results[index]) {
        el.addEventListener('click', () => {
          this.selectResult(results[index].id);
        });
      }
    });
  }
  
  createResultHTML(result, query) {
    const excerpt = this.getExcerpt(result.content, query);
    return `
      <div class="search-result" data-note-id="${result.id}">
        <div class="search-result-title">${this.highlightText(result.title, query)}</div>
        <div class="search-result-excerpt">${this.highlightText(excerpt, query)}</div>
      </div>
    `;
  }
  
  getExcerpt(content, query) {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);
    
    if (index === -1) {
      return content.slice(0, 100) + (content.length > 100 ? '...' : '');
    }
    
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 50);
    const excerpt = content.slice(start, end);
    
    return (start > 0 ? '...' : '') + excerpt + (end < content.length ? '...' : '');
  }
  
  highlightText(text, query) {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
  
  selectResult(noteId) {
    this.searchResults.classList.add('hidden');
    this.searchInput.value = '';
    
    // Trigger note selection
    if (window.app && window.app.loadNote) {
      window.app.loadNote(noteId);
    }
  }
}

// Initialize search when DOM is loaded
if (typeof window !== 'undefined') {
  window.Search = Search;
}
