// Table of Contents generator
class TableOfContents {
  constructor() {
    this.container = null;
    this.currentNote = null;
    this.headings = [];
    this.tocItems = [];
    this.activeItem = null;
    this.scrollTimeout = null;
    this.init();
  }
  
  init() {
    this.container = document.getElementById('table-of-contents');
    if (!this.container) return;
    
    // Initialize with any existing content
    this.updateFromContent();
    
    // Listen for note content changes
    this.setupMutationObserver();
    
    // Setup scroll tracking for active section highlighting
    this.setupScrollTracking();
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
  
  setupScrollTracking() {
    const noteContent = document.getElementById('note-content');
    if (!noteContent) return;
    
    const handleScroll = () => {
      // Debounce scroll events for performance
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.updateActiveSection();
      }, 50);
    };
    
    noteContent.addEventListener('scroll', handleScroll);
    
    // Also update on window resize in case layout changes
    window.addEventListener('resize', () => {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.updateActiveSection();
      }, 100);
    });
  }
  
  updateActiveSection() {
    if (this.headings.length === 0 || this.tocItems.length === 0) return;
    
    const noteContent = document.getElementById('note-content');
    if (!noteContent) return;
    
    const containerRect = noteContent.getBoundingClientRect();
    const scrollTop = noteContent.scrollTop;
    
    // Find the heading that's currently most visible
    let activeHeadingIndex = 0;
    let bestScore = -1;
    
    this.headings.forEach((heading, index) => {
      const headingRect = heading.getBoundingClientRect();
      const relativeTop = headingRect.top - containerRect.top;
      
      // Score based on visibility and position
      let score = 0;
      if (relativeTop <= 100) { // Within the top 100px of the container
        score = 100 - Math.abs(relativeTop);
        if (score > bestScore) {
          bestScore = score;
          activeHeadingIndex = index;
        }
      }
    });
    
    // If no heading is in the top area, find the last heading that's above the viewport
    if (bestScore === -1) {
      for (let i = this.headings.length - 1; i >= 0; i--) {
        const headingRect = this.headings[i].getBoundingClientRect();
        const relativeTop = headingRect.top - containerRect.top;
        
        if (relativeTop < 0) {
          activeHeadingIndex = i;
          break;
        }
      }
    }
    
    // Update active state
    this.setActiveItem(activeHeadingIndex);
  }
  
  setActiveItem(index) {
    if (index < 0 || index >= this.tocItems.length) return;
    
    // Remove previous active state
    if (this.activeItem) {
      this.activeItem.classList.remove('active');
    }
    
    // Set new active state
    this.activeItem = this.tocItems[index];
    this.activeItem.classList.add('active');
  }

  updateFromContent() {
    if (!this.container) return;
    
    const noteContent = document.getElementById('note-content');
    if (!noteContent) {
      this.showPlaceholder();
      return;
    }
    
    // Collect all headings including embedded content
    const allTocItems = [];
    
    // Find all direct heading elements (h2-h6 only) in the main note content
    const directHeadings = noteContent.querySelectorAll('h2, h3, h4, h5, h6');
    
    // Filter out headings that are inside embedded content or excluded areas
    const validDirectHeadings = Array.from(directHeadings).filter(heading => {
      // Check if heading is inside an embedded note
      if (heading.closest('.embed-content')) {
        return false;
      }
      
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
    
    // Add direct headings to TOC items
    validDirectHeadings.forEach(heading => {
      allTocItems.push({
        element: heading,
        level: parseInt(heading.tagName.charAt(1)),
        text: heading.textContent || heading.innerText || '',
        isEmbedded: false
      });
    });
    
    // Find all embedded notes/bases and add them as level 2 items
    const embeddedNotes = noteContent.querySelectorAll('.embed-note');
    embeddedNotes.forEach(embedNote => {
      const embedTitle = embedNote.querySelector('.embed-title-text');
      if (embedTitle) {
        // Add the embedded note/base title as level 2
        allTocItems.push({
          element: embedNote,
          level: 2,
          text: embedTitle.textContent || embedTitle.innerText || '',
          isEmbedded: true,
          isEmbedTitle: true
        });
        
        // Find headings within this embedded content and increase their level by 1
        const embeddedHeadings = embedNote.querySelectorAll('.embed-content h1, .embed-content h2, .embed-content h3, .embed-content h4, .embed-content h5, .embed-content h6');
        embeddedHeadings.forEach(heading => {
          const currentLevel = parseInt(heading.tagName.charAt(1));
          
          // For bases, drop an extra indentation level (increase by 1 instead of 2)
          const isBase = embedNote.classList.contains('embed-base');
          const levelIncrease = isBase ? 0 : 1; // Bases: no increase, Notes: +1 increase
          const newLevel = Math.min(currentLevel + levelIncrease, 6); // Cap at h6
          
          allTocItems.push({
            element: heading,
            level: newLevel,
            text: heading.textContent || heading.innerText || '',
            isEmbedded: true,
            embedContainer: embedNote,
            isBase: isBase
          });
        });
      }
    });
    
    // Sort items by their position in the DOM
    allTocItems.sort((a, b) => {
      const position = a.element.compareDocumentPosition(b.element);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
      } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
      }
      return 0;
    });
    
    if (allTocItems.length === 0) {
      this.showPlaceholder();
      return;
    }
    
    this.generateTOC(allTocItems);
  }
  
  showPlaceholder() {
    if (!this.container) return;
    
    // Hide the entire "ON THIS PAGE" section when there are no headings
    const tocSection = this.container.closest('.right-sidebar-section');
    if (tocSection) {
      tocSection.style.display = 'none';
    }
  }
  
  generateTOC(tocItems) {
    if (!this.container) return;
    
    // Show the "ON THIS PAGE" section when there are headings
    const tocSection = this.container.closest('.right-sidebar-section');
    if (tocSection) {
      tocSection.style.display = '';
    }
    
    // Store references for scroll tracking - extract just the elements
    this.headings = tocItems.map(item => item.element);
    this.tocItems = [];
    this.activeItem = null;
    
    const tocList = document.createElement('ul');
    tocList.className = 'toc-list';
    
    tocItems.forEach((tocItem, index) => {
      const level = tocItem.level;
      const text = tocItem.text;
      const element = tocItem.element;
      
      // Generate an ID for the element if it doesn't have one
      let elementId = element.id;
      if (!elementId) {
        elementId = this.generateHeadingId(text, index);
        element.id = elementId;
      }
      
      // Create TOC item
      const listItem = document.createElement('li');
      listItem.className = `toc-item level-${level}`;
      
      // Add special class for embedded content
      if (tocItem.isEmbedded) {
        listItem.classList.add('toc-embedded');
      }
      if (tocItem.isEmbedTitle) {
        listItem.classList.add('toc-embed-title');
      }
      
      const link = document.createElement('a');
      link.href = `#${elementId}`;
      link.textContent = text;
      link.title = text;
      
      // Add click handler for smooth scrolling
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.scrollToElement(elementId, tocItem);
      });
      
      listItem.appendChild(link);
      tocList.appendChild(listItem);
      
      // Store reference for scroll tracking
      this.tocItems.push(listItem);
    });
    
    // Replace container content
    this.container.innerHTML = '';
    this.container.appendChild(tocList);
    
    // Initialize active section after a brief delay
    setTimeout(() => {
      this.updateActiveSection();
    }, 100);
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
  
  scrollToElement(elementId, tocItem) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // If it's an embedded note title, we might need to expand it first
    if (tocItem.isEmbedTitle) {
      const embedNote = element.closest('.embed-note');
      const embedContent = embedNote?.querySelector('.embed-content');
      if (embedContent && embedContent.style.display === 'none') {
        // Expand the embedded note first
        const embedId = embedNote.getAttribute('data-embed-id');
        if (embedId && window.toggleEmbed) {
          window.toggleEmbed(embedId);
        }
      }
    }
    
    // For embedded headings, ensure the parent embed is expanded
    if (tocItem.isEmbedded && tocItem.embedContainer) {
      const embedContent = tocItem.embedContainer.querySelector('.embed-content');
      if (embedContent && embedContent.style.display === 'none') {
        const embedId = tocItem.embedContainer.getAttribute('data-embed-id');
        if (embedId && window.toggleEmbed) {
          window.toggleEmbed(embedId);
        }
      }
    }
    
    this.scrollToHeading(elementId);
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
