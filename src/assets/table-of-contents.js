// Table of Contents generator
class TableOfContents {
  constructor() {
    this.container = null;
    this.currentNote = null;
    this.init();
  }
  
  init() {
    this.container = document.getElementById('table-of-contents');
    if (!this.container) return;
    
    // Initialize with any existing content
    this.updateFromContent();
    
    // Listen for note content changes
    this.setupMutationObserver();
  }
  
  setupMutationObserver() {
    // Watch for changes in the note content area
    const noteContent = document.getElementById('note-content');
    if (!noteContent) return;
    
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'subtree') {
          shouldUpdate = true;
        }
      });
      
      if (shouldUpdate) {
        // Debounce updates to avoid excessive processing
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
          this.updateFromContent();
        }, 100);
      }
    });
    
    observer.observe(noteContent, {
      childList: true,
      subtree: true
    });
  }
  
  updateFromContent() {
    if (!this.container) return;
    
    const noteContent = document.getElementById('note-content');
    if (!noteContent) {
      this.showPlaceholder();
      return;
    }
    
    // Find all heading elements (h2-h6 only) in the note content
    const allHeadings = noteContent.querySelectorAll('h2, h3, h4, h5, h6');
    
    // Filter out headings that are inside linked/unlinked mentions or other excluded areas
    const validHeadings = Array.from(allHeadings).filter(heading => {
      // Check if heading is inside a link (internal-link, external-link, etc.)
      if (heading.closest('.internal-link, .external-link, a[href], .unlinked-mention, .linked-mention')) {
        return false;
      }
      
      // Check if heading is inside backlinks panel or other excluded areas
      if (heading.closest('.backlinks-panel, .base-controls-container, .frontmatter')) {
        return false;
      }
      
      return true;
    });
    
    if (validHeadings.length === 0) {
      this.showPlaceholder();
      return;
    }
    
    this.generateTOC(validHeadings);
  }
  
  showPlaceholder() {
    if (!this.container) return;
    this.container.innerHTML = '<div class="toc-placeholder">No headings found</div>';
  }
  
  generateTOC(headings) {
    if (!this.container) return;
    
    const tocList = document.createElement('ul');
    tocList.className = 'toc-list';
    
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1)); // Extract number from h1, h2, etc.
      const text = heading.textContent || heading.innerText || '';
      
      // Generate an ID for the heading if it doesn't have one
      let headingId = heading.id;
      if (!headingId) {
        headingId = this.generateHeadingId(text, index);
        heading.id = headingId;
      }
      
      // Create TOC item
      const listItem = document.createElement('li');
      listItem.className = `toc-item level-${level}`;
      
      const link = document.createElement('a');
      link.href = `#${headingId}`;
      link.textContent = text;
      link.title = text;
      
      // Add click handler for smooth scrolling
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.scrollToHeading(headingId);
      });
      
      listItem.appendChild(link);
      tocList.appendChild(listItem);
    });
    
    // Replace container content
    this.container.innerHTML = '';
    this.container.appendChild(tocList);
  }
  
  generateHeadingId(text, index) {
    // Create a URL-friendly ID from heading text
    let id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/--+/g, '-') // Replace multiple dashes with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
    
    // Fallback to index-based ID if text processing results in empty string
    if (!id) {
      id = `heading-${index}`;
    }
    
    // Ensure uniqueness by checking for existing IDs
    let finalId = id;
    let counter = 1;
    while (document.getElementById(finalId)) {
      finalId = `${id}-${counter}`;
      counter++;
    }
    
    return finalId;
  }
  
  scrollToHeading(headingId) {
    const heading = document.getElementById(headingId);
    if (!heading) return;
    
    // Get the note content container for proper scrolling context
    const noteContent = document.getElementById('note-content');
    if (!noteContent) {
      // Fallback to regular scroll
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    
    // Calculate position within the scrollable container
    const containerRect = noteContent.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    const scrollTop = noteContent.scrollTop;
    
    // Target position with some offset from the top
    const targetScrollTop = scrollTop + (headingRect.top - containerRect.top) - 20;
    
    // Smooth scroll within the container
    noteContent.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth'
    });
    
    // Highlight the heading briefly
    this.highlightHeading(heading);
  }
  
  highlightHeading(heading) {
    // Add a temporary highlight class
    heading.style.transition = 'background-color 0.3s ease';
    heading.style.backgroundColor = 'var(--color-selection)';
    
    setTimeout(() => {
      heading.style.backgroundColor = '';
      setTimeout(() => {
        heading.style.transition = '';
      }, 300);
    }, 1000);
  }
  
  // Method to manually update TOC when note content changes
  update() {
    this.updateFromContent();
  }
  
  // Method to set the current note (can be used for future enhancements)
  setCurrentNote(noteId) {
    this.currentNote = noteId;
    this.updateFromContent();
  }
}

// Initialize TOC when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.tableOfContents = new TableOfContents();
  });
} else {
  window.tableOfContents = new TableOfContents();
}
