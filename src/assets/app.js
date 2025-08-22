// Main application class
class ObsidianSSGApp {
  constructor() {
    this.notes = new Map();
    this.linkGraph = new Map();
    this.categories = new Map();
    this.folderStructure = [];
    this.currentNote = null;
    this.search = null;
    this.graph = null;
    
    this.init();
  }
  
  async init() {
    // Safari viewport height fix
    this.initializeSafariViewportFix();
    
    // Load notes data
    await this.loadData();
    
    // Initialize components
    this.initializeTheme();
    this.initializeSearch();
    this.initializeGraph();
    this.initializeNavigation();
    this.initializeEventListeners();
    
    // Render initial content
    this.renderSidebar();
    
    // Load default note if available
    const urlParams = new URLSearchParams(window.location.search);
    let noteId = urlParams.get('note');
    
    // If no note parameter, try to extract from pathname
    if (!noteId) {
      const pathname = window.location.pathname;
      const match = pathname.match(/\/([^\/]+)\.html$/);
      if (match) {
        noteId = match[1];
      } else {
        noteId = this.getDefaultNote();
      }
    }
    
    if (noteId) {
      this.loadNote(noteId);
    }
  }
  
  async loadData() {
    try {
      // In a real implementation, this would load from generated JSON files
      // For now, we'll use placeholder data structure
      const response = await fetch('data/notes.json');
      if (response.ok) {
        const data = await response.json();
        this.notes = new Map(Object.entries(data.notes || {}));
        this.linkGraph = new Map(Object.entries(data.linkGraph || {}));
        this.categories = new Map(Object.entries(data.categories || {}));
        this.folderStructure = data.folderStructure || [];
      } else {
        console.warn('Notes data not found, using empty dataset');
      }
    } catch (error) {
      console.warn('Failed to load notes data:', error);
    }
  }
  
  initializeSafariViewportFix() {
    // Fix for Safari iOS viewport height issues
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    // Set initial value
    setViewportHeight();
    
    // Update on resize and orientation change
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', () => {
      // Small delay to let the browser settle after orientation change
      setTimeout(setViewportHeight, 100);
    });
  }

  initializeTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleDesktop = document.getElementById('theme-toggle-desktop');
    
    // Load saved theme or default to light
    const savedTheme = localStorage.getItem('obsidian-theme') || 'light';
    this.setTheme(savedTheme);
    
    // Listen for system theme changes
    this.initializeSystemThemeDetection();
    
    // Handle mobile theme toggle
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
      });
    }
    
    // Handle desktop theme toggle
    if (themeToggleDesktop) {
      themeToggleDesktop.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
      });
    }
  }
  
  initializeSystemThemeDetection() {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Handle system theme change
    const handleSystemThemeChange = (e) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem('obsidian-theme')) {
        const systemTheme = e.matches ? 'dark' : 'light';
        this.setTheme(systemTheme);
      }
    };
    
    // Listen for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleSystemThemeChange);
    }
    
    // Initial system theme detection (only if no saved preference)
    if (!localStorage.getItem('obsidian-theme')) {
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      this.setTheme(systemTheme);
    }
  }
  
  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    document.body.className = `theme-${theme}`;
    localStorage.setItem('obsidian-theme', theme);
  }
  
  initializeSearch() {
    if (window.Search) {
      this.search = new window.Search();
      this.search.loadSearchIndex(this.notes);
    }
  }
  
  initializeGraph() {
    if (window.GraphView) {
      this.graph = new window.GraphView();
      this.graph.loadData(this.notes, this.linkGraph);
    }
    
    // Graph toggle functionality
    const graphToggle = document.getElementById('graph-toggle');
    const graphToggleDesktop = document.getElementById('graph-toggle-desktop');
    const graphPanel = document.getElementById('graph-panel');
    const closeGraph = document.getElementById('close-graph');
    
    // Handle mobile graph toggle
    if (graphToggle && graphPanel) {
      graphToggle.addEventListener('click', () => {
        graphPanel.classList.toggle('visible');
      });
    }
    
    // Handle desktop graph toggle
    if (graphToggleDesktop && graphPanel) {
      graphToggleDesktop.addEventListener('click', () => {
        graphPanel.classList.toggle('visible');
      });
    }
    
    if (closeGraph && graphPanel) {
      closeGraph.addEventListener('click', () => {
        graphPanel.classList.remove('visible');
      });
    }
  }
  
  initializeNavigation() {
    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
      const noteId = event.state?.noteId || this.getDefaultNote();
      if (noteId) {
        this.loadNote(noteId, false);
      }
    });
  }
  
  closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (sidebar && sidebarOverlay) {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('visible');
      document.body.classList.remove('menu-open');
    }
  }
  
  openMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (sidebar && sidebarOverlay) {
      sidebar.classList.add('open');
      sidebarOverlay.classList.add('visible');
      document.body.classList.add('menu-open');
    }
  }
  
  initializeEventListeners() {
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    
    // Mobile menu toggle button
    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
          this.closeMobileMenu();
        } else {
          this.openMobileMenu();
        }
      });
    }
    
    // Close sidebar when clicking overlay
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        this.closeMobileMenu();
      });
    }
    
    // Handle internal link clicks
    document.addEventListener('click', (event) => {
      const link = event.target.closest('.internal-link');
      if (link) {
        event.preventDefault();
        const noteId = this.extractNoteIdFromLink(link);
        if (noteId) {
          this.loadNote(noteId);
          
          // Always close sidebar after navigation (will be no-op on desktop)
          this.closeMobileMenu();
        }
      }
    });
    
    // Handle any navigation element with data-note-id
    document.addEventListener('click', (event) => {
      const navElement = event.target.closest('[data-note-id]');
      if (navElement) {
        // Always close mobile menu after any navigation (will be no-op on desktop)
        this.closeMobileMenu();
      }
    });
  }
  
  renderSidebar() {
    this.renderFolderTree();
  }
  
  renderFolderTree() {
    const folderTree = document.getElementById('folder-tree');
    if (!folderTree) return;
    
    const renderNode = (node, level = 0) => {
      const isFolder = node.type === 'folder';
      const hasChildren = node.children && node.children.length > 0;
      
      let html = '';
      
      if (isFolder) {
        const folderId = `folder-${node.path.replace(/\//g, '-')}`;
        const isExpanded = level < 2; // Expand first two levels by default
        
        html += `
          <div class="folder-item folder ${isExpanded ? 'expanded' : 'collapsed'}" data-folder="${node.path}" onclick="toggleFolder('${folderId}')">
            <button class="folder-toggle">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle"><path d="M3 8L12 17L21 8"></path></svg>
            </button>
            <span class="folder-name">${node.name}</span>
          </div>
          <div id="${folderId}" class="folder-content ${isExpanded ? 'expanded' : 'collapsed'}">
            <div class="folder-children">
        `;
        
        if (hasChildren) {
          node.children.forEach(child => {
            html += renderNode(child, level + 1);
          });
        }
        
        html += `
            </div>
          </div>
        `;
      } else {
        // File node
        html += `
          <div class="folder-item file" data-note-id="${node.noteId}">
            <span class="file-name">${node.name}</span>
          </div>
        `;
      }
      
      return html;
    };
    
    const treeHtml = this.folderStructure.map(node => renderNode(node)).join('');
    folderTree.innerHTML = treeHtml;
    
    // Add click handlers for files
    folderTree.querySelectorAll('.folder-item.file').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const noteId = item.getAttribute('data-note-id');
        if (noteId) {
          this.loadNote(noteId);
          
          // Always close mobile menu after navigation on mobile
          this.closeMobileMenu();
        }
      });
    });
    
    // Make folder toggle function globally available
    window.toggleFolder = (folderId) => {
      const content = document.getElementById(folderId);
      const folderItem = document.querySelector(`[onclick="toggleFolder('${folderId}')"]`).closest('.folder-item');
      
      if (content && folderItem) {
        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
          content.classList.remove('expanded');
          content.classList.add('collapsed');
          folderItem.classList.remove('expanded');
          folderItem.classList.add('collapsed');
        } else {
          content.classList.remove('collapsed');
          content.classList.add('expanded');
          folderItem.classList.remove('collapsed');
          folderItem.classList.add('expanded');
        }
      }
    };
  }
  
  loadNote(noteId, addToHistory = true) {
    const note = this.notes.get(noteId);
    if (!note) {
      console.warn(`Note not found: ${noteId}`);
      return;
    }
    
    this.currentNote = note;
    
    // Update URL and history
    if (addToHistory) {
      const url = new URL(window.location);
      url.searchParams.set('note', noteId);
      window.history.pushState({ noteId }, note.title, url);
    }
    
    // Update page title
    document.title = `${note.title} - Obsidian Vault`;
    
    // Update breadcrumb
    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb) {
      breadcrumb.innerHTML = `<span class="breadcrumb-item">${note.title}</span>`;
    }
    
    // Update main content
    const noteContent = document.getElementById('note-content');
    if (noteContent) {
      noteContent.innerHTML = `
        <h1 class="note-title">${note.title}</h1>
        <div class="note-body">${note.html}</div>
        <aside class="backlinks-panel" id="backlinks-panel">
          <div id="backlinks-content"></div>
        </aside>
      `;
    }
    
    // Update backlinks
    this.renderBacklinks(note);
    
    // Update active state in sidebar
    this.updateSidebarActiveState(noteId);
    
    // Scroll to top
    if (noteContent) {
      noteContent.scrollTop = 0;
    }
  }
  
  renderBacklinks(note) {
    const backlinksPanel = document.getElementById('backlinks-panel');
    const backlinksContent = document.getElementById('backlinks-content');
    
    if (!backlinksContent) return;
    
    if (note.backlinks && note.backlinks.length > 0) {
      // Group backlinks by source note
      const backlinkSources = {};
      
      note.backlinks.forEach(backlinkId => {
        const backlinkNote = this.notes.get(backlinkId);
        if (backlinkNote) {
          backlinkSources[backlinkId] = {
            title: backlinkNote.title,
            mentions: this.getBacklinkMentions(note.id, backlinkNote)
          };
        }
      });
      
      const linkedCount = Object.keys(backlinkSources).length;
      const linkedContentClass = linkedCount > 0 ? 'expanded' : 'collapsed';
      
      const backlinksHtml = `
        <div class="backlinks-section-header" onclick="toggleBacklinksSection('linked-mentions')">
          <h3>Linked mentions <span class="backlinks-count">${linkedCount}</span></h3>
        </div>
        <div id="linked-mentions-content" class="backlinks-section-content ${linkedContentClass}">
        ${Object.entries(backlinkSources).map(([sourceId, source]) => `
          <div class="backlinks-section">
            <div class="backlinks-source" onclick="this.nextElementSibling.classList.toggle('expanded'); this.querySelector('.backlinks-source-toggle').classList.toggle('expanded');">
              <button class="backlinks-source-toggle expanded">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle">
                  <path d="M3 8L12 17L21 8"></path>
                </svg>
              </button>
              <div class="backlinks-source-title" onclick="event.stopPropagation(); navigateToNote('${sourceId}');">${source.title}</div>
              <span class="backlinks-source-count">${source.mentions.length}</span>
            </div>
            <div class="backlinks-mentions expanded">
              ${source.mentions.map(mention => `
                <div class="backlink-mention" onclick="navigateToNote('${sourceId}');">
                  <div class="backlink-mention-content">${mention}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
        </div>
        
        <div class="backlinks-section-header unlinked-mentions-header dimmed" onclick="toggleBacklinksSection('unlinked-mentions')">
          <h4>Unlinked mentions</h4>
        </div>
        <div id="unlinked-mentions-content" class="backlinks-section-content collapsed">
          <div class="no-unlinked-mentions">No unlinked mentions found</div>
        </div>
      `;
      
      backlinksContent.innerHTML = backlinksHtml;
      
      if (backlinksPanel) {
        backlinksPanel.style.display = 'block';
      }
    } else {
      backlinksContent.innerHTML = `
        <div class="backlinks-section-header" onclick="toggleBacklinksSection('linked-mentions')">
          <h3>Linked mentions <span class="backlinks-count">0</span></h3>
        </div>
        <div id="linked-mentions-content" class="backlinks-section-content collapsed">
          <div class="no-linked-mentions">No linked mentions found</div>
        </div>
        
        <div class="backlinks-section-header unlinked-mentions-header dimmed" onclick="toggleBacklinksSection('unlinked-mentions')">
          <h4>Unlinked mentions</h4>
        </div>
        <div id="unlinked-mentions-content" class="backlinks-section-content collapsed">
          <div class="no-unlinked-mentions">No unlinked mentions found</div>
        </div>
      `;
      if (backlinksPanel) {
        backlinksPanel.style.display = 'block';
      }
    }
  }
  
  getBacklinkMentions(targetNoteId, sourceNote) {
    // Extract mentions of targetNoteId from sourceNote content
    // This is a simplified version - in reality you'd parse the markdown more carefully
    const mentions = [];
    const targetNote = this.notes.get(targetNoteId);
    if (!targetNote) return mentions;
    
    // Look for links to the target note
    const linkPattern = new RegExp(`\\[\\[([^\\]]*\\|)?${targetNote.title}\\]\\]`, 'gi');
    const lines = sourceNote.content.split('\n');
    
    lines.forEach((line, index) => {
      if (linkPattern.test(line)) {
        // Create a context snippet with highlighted mention
        const highlightedLine = line.replace(linkPattern, (match, alias) => {
          const displayText = alias ? alias.replace('|', '') : targetNote.title;
          return `<span class="backlink-mention-highlight">${displayText}</span>`;
        });
        
        // Add some context (line number for now, could be enhanced)
        mentions.push(`${index + 1}. ${highlightedLine}`);
      }
    });
    
    // If no specific mentions found, create a generic one
    if (mentions.length === 0) {
      mentions.push(`- <span class="backlink-mention-highlight">[[${targetNote.title}]]</span>`);
    }
    
    return mentions;
  }
  
  updateSidebarActiveState(noteId) {
    // Remove active class from all items
    document.querySelectorAll('.folder-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Add active class to current note
    const currentItem = document.querySelector(`[data-note-id="${noteId}"]`);
    if (currentItem) {
      currentItem.classList.add('active');
    }
  }
  
  extractNoteIdFromLink(link) {
    const href = link.getAttribute('href');
    if (href && href.endsWith('.html')) {
      return href.replace('.html', '');
    }
    return link.getAttribute('data-note-id');
  }
  
  getDefaultNote() {
    const notes = Array.from(this.notes.values());
    return notes.length > 0 ? notes[0].id : null;
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ObsidianSSGApp();
});

// Global functions for backlinks interaction
function toggleBacklinksSection(sectionId) {
  const content = document.getElementById(`${sectionId}-content`);
  
  if (content) {
    content.classList.toggle('expanded');
    content.classList.toggle('collapsed');
  }
}

function navigateToNote(noteId) {
  const app = window.app;
  if (app && app.notes.has(noteId)) {
    app.loadNote(noteId);
  }
}

// Global function for embed toggle interaction
function toggleEmbed(embedId) {
  const embedElement = document.querySelector(`[data-embed-id="${embedId}"]`);
  const contentElement = document.getElementById(`embed-content-${embedId}`);
  
  if (embedElement && contentElement) {
    embedElement.classList.toggle('collapsed');
    contentElement.classList.toggle('collapsed');
  }
}
