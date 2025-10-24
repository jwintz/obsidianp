// Main application class
class ObsidianSSGApp {
  constructor() {
    this.notes = new Map();
    this.bases = new Map();
    this.linkGraph = new Map();
    this.categories = new Map();
    this.tags = new Map();
    this.folderStructure = [];
    this.currentNote = null;
    this.lastViewedNoteId = null; // Track last viewed note for graph switching
    this.currentBase = null;
    this.search = null;
    this.graph = null;
    this.basePath = this.getBasePath();
    
    this.init();
  }
  
  getBasePath() {
    // Get the base path from the HTML data attribute
    return document.querySelector('html').getAttribute('data-base-path') || '';
  }
  
  async init() {
    // Load notes data
    await this.loadData();
    
    // Initialize components
    this.initializeTheme();
    this.initializeSearch();
    this.initializeGraph();
    this.initializeNavigation();
    this.initializeEventListeners();
    this.initializeEmbeddedBases();
    
    // Load default note if available
    let noteId = null;
    
    // Extract note ID from pathname (clean URLs)
    let pathname = window.location.pathname;
    
    // Strip basePath prefix if present
    if (this.basePath && pathname.startsWith(this.basePath + '/')) {
      pathname = pathname.substring(this.basePath.length);
    } else if (this.basePath && pathname === this.basePath) {
      pathname = '/';
    }
    
    if (pathname !== '/' && pathname !== '/index.html') {
      // Remove leading slash and decode URI components
      let pathId = decodeURIComponent(pathname.substring(1));
      // Handle .html extension if present
      if (pathId.endsWith('.html')) {
        pathId = pathId.substring(0, pathId.length - 5);
      }
      
      // Don't check for "bases/" prefix anymore since bases are in their folders
      noteId = pathId;
    }
    
    // Fall back to query parameter for backwards compatibility
    if (!noteId) {
      const urlParams = new URLSearchParams(window.location.search);
      noteId = urlParams.get('note');
      if (noteId) {
        noteId = decodeURIComponent(noteId);
      }
    }
    
    // If still no noteId, use default
    if (!noteId) {
      noteId = this.getDefaultNote();
    }

    // Render initial content - expand to the note that will be loaded
    this.renderSidebar(noteId);
    
    // Check if noteId is a base - try exact match first, then try last path segment
    let baseId = null;
    if (this.bases.has(noteId)) {
      baseId = noteId;
    } else if (noteId.includes('/')) {
      // Try the last segment of the path (e.g., "benchmarks/benchmarks" -> "benchmarks")
      const lastSegment = noteId.split('/').pop();
      if (this.bases.has(lastSegment)) {
        baseId = lastSegment;
      }
    }
    
    if (noteId) {
      // Check if it's a base first
      if (baseId) {
        this.loadBase(baseId);
      } else {
        this.loadNote(noteId);
      }
    }
    
    // Initialize code copy buttons after initial content is loaded
    // Use setTimeout to ensure content is fully rendered
    setTimeout(() => {
      this.initializeCodeCopyButtons();
    }, 100);
  }
  
  async loadData() {
    try {
      // Use the basePath from constructor
      const dataPath = this.basePath ? `${this.basePath}/data/notes.json` : '/data/notes.json';
      
      const response = await fetch(dataPath);
      if (response.ok) {
        const data = await response.json();
        this.notes = new Map(Object.entries(data.notes || {}));
        this.bases = new Map(Object.entries(data.bases || {}));
        this.linkGraph = new Map(Object.entries(data.linkGraph || {}));
        this.categories = new Map(Object.entries(data.categories || {}));
        this.tags = new Map(Object.entries(data.tags || {}));
        this.folderStructure = data.folderStructure || [];
      } else {
        console.warn('Notes data not found, using empty dataset');
      }
    } catch (error) {
      console.warn('Failed to load notes data:', error);
    }
  }
  
  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  initializeTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleDesktop = document.getElementById('theme-toggle-desktop');
    
    // Load saved theme or default to system theme
    const savedTheme = localStorage.getItem('obsidian-theme') || this.getSystemTheme();
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
  }
  
  setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    document.body.className = `theme-${theme}`;
    localStorage.setItem('obsidian-theme', theme);
    
    // Dispatch custom event for theme change
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
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
      this.graph.loadData(this.notes, this.linkGraph, this.tags);
      // Initialize empty - will be populated when a note is loaded
    }
  }
  
  initializeNavigation() {
    // Disable automatic scroll restoration - we'll handle it manually
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
      const noteId = event.state?.noteId || this.getDefaultNote();
      if (noteId) {
        // On back/forward, restore the saved scroll position if available
        const savedScroll = event.state?.scrollY || 0;
        this.loadNote(noteId, false);
        // Restore scroll after content loads
        requestAnimationFrame(() => {
          window.scrollTo(0, savedScroll);
        });
      }
    });
  }
  
  closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const menuBtn = document.getElementById('nav-menu-btn');

    if (sidebar) {
      sidebar.classList.remove('open');
      document.body.classList.remove('sidebar-open');
    }

    // Update toggle button ARIA state (no visual styling change)
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  }

  openMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const menuBtn = document.getElementById('nav-menu-btn');

    if (sidebar) {
      sidebar.classList.add('open');
      document.body.classList.add('sidebar-open');
    }

    // Update toggle button ARIA state (no visual styling change)
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'true');
    }
  }
  
  initializeEmbeddedBases() {
    // Find all embedded bases and initialize their interactions
    const embedBases = document.querySelectorAll('.embed-base');
    
    embedBases.forEach((embedBase, index) => {
      // Extract base data from the embedded element
      const baseId = embedBase.dataset.baseId;
      
      // Handle inline bases
      if (embedBase.classList.contains('inline-base')) {
        this.processInlineBase(embedBase);
      } else if (baseId && this.bases.has(baseId)) {
        const base = this.bases.get(baseId);
        this.initializeBaseInteractions(base);
      }
    });
    
    // Render embedded cards using client-side code for consistency
    // This handles both embedded cards and standalone base page cards
    this.renderEmbeddedCards();
  }
  
  renderEmbeddedCards() {
    // Find all cards-view elements with data-base-cards attribute
    const embeddedCardsViews = document.querySelectorAll('.cards-view[data-base-cards]');
    
    embeddedCardsViews.forEach((cardsView, index) => {
      try {
        const baseData = JSON.parse(cardsView.dataset.baseCards);
        const { noteIds, notes: legacyNotes, view, filters, properties } = baseData;  // Include properties
        
        // Retrieve full note objects from this.notes using the IDs
        let notes;
        if (noteIds) {
          notes = noteIds.map(id => this.notes.get(id)).filter(note => note);
        } else if (legacyNotes) {
          // Fallback for server-rendered HTML with old format
          notes = legacyNotes.map(legacyNote => {
            // Try to get full note from this.notes, or use legacy note as fallback
            return this.notes.get(legacyNote.id) || legacyNote;
          });
        } else {
          console.error('No noteIds or notes found in base data');
          return;
        }
        
        // Use the same rendering logic as standalone bases
        const cardsContainer = cardsView.querySelector('.cards-container');
        if (cardsContainer) {
          const usedProperties = this.getUsedProperties(view, filters, properties);  // Pass properties
          const cardsHtml = notes.map(note => {
            return this.generateCardHtml(note, usedProperties, 150, view, properties);  // Pass properties to card generation
          }).join('');
          cardsContainer.innerHTML = cardsHtml;
        }
      } catch (e) {
        console.error('Failed to render embedded cards:', e);
      }
    });
  }
  
  processInlineBase(embedBase) {
    try {
      // Get the base configuration from the inline-base-placeholder element
      const placeholder = embedBase.querySelector('.inline-base-placeholder');
      
      if (!placeholder || !placeholder.dataset.baseConfig) {
        console.error('No base config found in inline base placeholder');
        return;
      }
      
      const baseConfig = JSON.parse(placeholder.dataset.baseConfig);
      const embedId = embedBase.dataset.embedId;
      
      // Create a temporary base object from the inline configuration
      const inlineBase = {
        id: embedBase.dataset.baseId,
        title: baseConfig.title || 'Inline Base',
        source: '',
        path: '',
        relativePath: '',
        folderPath: '',
        description: baseConfig.description || '',
        views: baseConfig.views || [{ type: 'cards', name: 'Default' }],
        properties: baseConfig.properties || [],
        formulas: baseConfig.formulas || [],
        filters: baseConfig.filters || (baseConfig.views && baseConfig.views[0] && baseConfig.views[0].filters) || null,
        matchedNotes: []
      };
      
      // Process the filters to match notes from the vault
      if (inlineBase.filters) {
        const allNotesArray = Array.from(this.notes.values());
        inlineBase.matchedNotes = this.filterNotesForBase(inlineBase, allNotesArray);
      } else {
        // If no filters, use all notes
        inlineBase.matchedNotes = Array.from(this.notes.values());
      }
      
      // Apply formulas if any
      if (inlineBase.formulas && inlineBase.formulas.length > 0) {
        inlineBase.matchedNotes = this.processFormulasForNotes(inlineBase, inlineBase.matchedNotes);
      }
      
      // Register the inline base in the bases Map so it can be found later
      this.bases.set(inlineBase.id, inlineBase);
      
      // Find the content container and render the base view
      const contentContainer = embedBase.querySelector('.inline-base-placeholder');
      if (contentContainer) {
        const defaultView = inlineBase.views && inlineBase.views.length > 0 ? inlineBase.views[0] : { type: 'cards', name: 'Default' };
        const baseContent = this.renderBaseViewContent(inlineBase, defaultView);
        contentContainer.innerHTML = baseContent;
        
        // Initialize interactions for this inline base
        this.initializeBaseInteractions(inlineBase);
      }
      
    } catch (error) {
      console.error('Failed to process inline base:', error);
      const contentContainer = embedBase.querySelector('.inline-base-placeholder');
      if (contentContainer) {
        contentContainer.innerHTML = `<div class="base-error">❌ Failed to process inline base: ${error.message}</div>`;
      }
    }
  }

  initializeEventListeners() {
    // Close sidebar when clicking outside (mobile only)
    document.addEventListener('click', (e) => {
      const sidebar = document.querySelector('.sidebar');
      const menuToggle = document.getElementById('nav-menu-btn');
      const pillNav = document.querySelector('.nav-pills-container');

      if (sidebar && sidebar.classList.contains('open')) {
        // Check if click is outside sidebar and not on toggle button or pill navigation
        const isClickOnToggle = menuToggle && (menuToggle.contains(e.target) || menuToggle === e.target);
        const isClickOnPillNav = pillNav && pillNav.contains(e.target);
        const isClickOnSidebar = sidebar.contains(e.target);

        if (!isClickOnSidebar && !isClickOnToggle && !isClickOnPillNav) {
          this.closeMobileMenu();
        }
      }
    });
    
    // Graph expansion controls
    this.initializeGraphControls();
    
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
  
  initializeGraphControls() {
    // Single graph expansion button
    const expandGraphBtn = document.getElementById('expand-graph');
    if (expandGraphBtn) {
      expandGraphBtn.addEventListener('click', () => {
        // Show local graph if we have a current note, otherwise show global graph
        if (this.currentNote) {
          this.showLocalGraphModal();
        } else {
          this.showGlobalGraphModal();
        }
      });
    }
    
    // Graph mode toggle buttons
    const localToggleBtn = document.getElementById('local-graph-toggle');
    const globalToggleBtn = document.getElementById('global-graph-toggle');
    const globalLocalToggleBtn = document.getElementById('global-local-graph-toggle');
    const globalGlobalToggleBtn = document.getElementById('global-global-graph-toggle');
    
    if (localToggleBtn) {
      localToggleBtn.addEventListener('click', () => {
        // Already in local mode, no action needed
      });
    }
    
    if (globalToggleBtn) {
      globalToggleBtn.addEventListener('click', () => {
        this.switchToGlobalGraph();
      });
    }
    
    if (globalLocalToggleBtn) {
      globalLocalToggleBtn.addEventListener('click', () => {
        this.switchToLocalGraph();
      });
    }
    
    if (globalGlobalToggleBtn) {
      globalGlobalToggleBtn.addEventListener('click', () => {
        // Already in global mode, no action needed
      });
    }
    
    // Close modal buttons
    const closeGlobalBtn = document.getElementById('close-global-graph');
    if (closeGlobalBtn) {
      closeGlobalBtn.addEventListener('click', () => {
        this.hideGlobalGraphModal();
      });
    }
    
    const closeLocalBtn = document.getElementById('close-local-graph');
    if (closeLocalBtn) {
      closeLocalBtn.addEventListener('click', () => {
        this.hideLocalGraphModal();
      });
    }

    // Setup collapse/expand buttons for parameter panels
    const collapseButtons = document.querySelectorAll('.graph-parameter-collapse');
    collapseButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.closest('.graph-parameter-panel');
        if (panel) {
          panel.classList.toggle('collapsed');

          // Sync collapsed state to both panels
          const isCollapsed = panel.classList.contains('collapsed');
          const allPanels = document.querySelectorAll('.graph-parameter-panel');
          allPanels.forEach(p => {
            if (isCollapsed) {
              p.classList.add('collapsed');
            } else {
              p.classList.remove('collapsed');
            }
          });
        }
      });
    });

    // Close modal when clicking overlay
    const globalOverlay = document.getElementById('global-graph-overlay');
    if (globalOverlay) {
      globalOverlay.addEventListener('click', () => {
        this.hideGlobalGraphModal();
      });
    }
    
    const localOverlay = document.getElementById('local-graph-overlay');
    if (localOverlay) {
      localOverlay.addEventListener('click', () => {
        this.hideLocalGraphModal();
      });
    }
    
    // Close modals on Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.hideGlobalGraphModal();
        this.hideLocalGraphModal();
      }
    });
  }
  
  showGlobalGraphModal() {
    const modal = document.getElementById('global-graph-modal');
    const container = document.getElementById('global-graph-container');
    const graphBtn = document.getElementById('nav-graph-btn');

    if (modal && container && this.graph) {
      // Close sidebar if open (mobile) - mutual exclusivity
      this.closeMobileMenu();

      modal.classList.remove('hidden');

      // Update graph button ARIA state (no visual styling change)
      if (graphBtn) {
        graphBtn.setAttribute('aria-pressed', 'true');
      }

      // Wait for layout to complete before rendering graph
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Render global graph
          this.graph.renderGlobalGraph(container);

          // Update toggle states
          this.updateGraphToggleStates('global');
        });
      });
    }
  }

  hideGlobalGraphModal() {
    const modal = document.getElementById('global-graph-modal');
    const graphBtn = document.getElementById('nav-graph-btn');

    if (modal) {
      modal.classList.add('hidden');
    }

    // Update graph button ARIA state (no visual styling change)
    if (graphBtn) {
      graphBtn.setAttribute('aria-pressed', 'false');
    }
  }
  
  showLocalGraphModal(noteId = null) {
    const modal = document.getElementById('local-graph-modal');
    const container = document.getElementById('local-graph-container');
    const targetNoteId = noteId || this.currentNote?.id;
    const graphBtn = document.getElementById('nav-graph-btn');

    if (modal && container && this.graph && targetNoteId) {
      // Close sidebar if open (mobile) - mutual exclusivity
      this.closeMobileMenu();

      modal.classList.remove('hidden');

      // Update graph button ARIA state (no visual styling change)
      if (graphBtn) {
        graphBtn.setAttribute('aria-pressed', 'true');
      }

      // Wait for layout to complete before rendering graph
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Render local graph - pass note ID, not note object
          this.graph.renderLocalGraph(container, targetNoteId);

          // Update toggle states
          this.updateGraphToggleStates('local');
        });
      });
    }
  }

  hideLocalGraphModal() {
    const modal = document.getElementById('local-graph-modal');
    const graphBtn = document.getElementById('nav-graph-btn');

    if (modal) {
      modal.classList.add('hidden');
    }

    // Update graph button ARIA state (no visual styling change)
    if (graphBtn) {
      graphBtn.setAttribute('aria-pressed', 'false');
    }
  }
  
  switchToGlobalGraph() {
    this.hideLocalGraphModal();
    this.showGlobalGraphModal();
    this.updateGraphToggleStates('global');
  }

  switchToLocalGraph() {
    this.hideGlobalGraphModal();
    // Use current note or fall back to last viewed note
    const noteId = this.currentNote?.id || this.lastViewedNoteId;
    if (noteId) {
      this.showLocalGraphModal(noteId);
      this.updateGraphToggleStates('local');
    }
  }
  
  updateGraphToggleStates(activeMode) {
    // Update local modal toggle states
    const localToggleBtn = document.getElementById('local-graph-toggle');
    const globalToggleBtn = document.getElementById('global-graph-toggle');
    
    if (localToggleBtn && globalToggleBtn) {
      if (activeMode === 'local') {
        localToggleBtn.classList.add('active');
        globalToggleBtn.classList.remove('active');
      } else {
        localToggleBtn.classList.remove('active');
        globalToggleBtn.classList.add('active');
      }
    }
    
    // Update global modal toggle states
    const globalLocalToggleBtn = document.getElementById('global-local-graph-toggle');
    const globalGlobalToggleBtn = document.getElementById('global-global-graph-toggle');
    
    if (globalLocalToggleBtn && globalGlobalToggleBtn) {
      if (activeMode === 'local') {
        globalLocalToggleBtn.classList.add('active');
        globalGlobalToggleBtn.classList.remove('active');
      } else {
        globalLocalToggleBtn.classList.remove('active');
        globalGlobalToggleBtn.classList.add('active');
      }
    }
  }
  
  renderSidebar(expandToNoteId = null) {
    let expandedPaths = [];
    if (expandToNoteId) {
      const pathToNote = this.findPathToNote(expandToNoteId);
      if (pathToNote) {
        expandedPaths = pathToNote;
      }
    }
    this.renderFolderTree(expandedPaths);
    this.setupExpandCollapseAll();
  }

  // Find the path to a note in the folder structure
  findPathToNote(noteId, nodes = this.folderStructure, currentPath = []) {
    for (const node of nodes) {
      const newPath = [...currentPath, node.path];
      
      if (node.type === 'file' && node.noteId === noteId) {
        return newPath.slice(0, -1); // Return folder path, exclude the file itself
      }
      
      if (node.type === 'folder' && node.children) {
        const found = this.findPathToNote(noteId, node.children, newPath);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  // Expand folders to show the path to a specific note
  expandPathToNote(noteId) {
    if (!noteId) return;
    
    const pathToNote = this.findPathToNote(noteId);
    if (!pathToNote) return;
    
    // Expand each folder in the path
    pathToNote.forEach(folderPath => {
      const folderId = `folder-${folderPath.replace(/\//g, '-')}`;
      const content = document.getElementById(folderId);
      const folderItem = document.querySelector(`[onclick="toggleFolder('${folderId}')"]`);
      
      if (content && folderItem) {
        content.classList.remove('collapsed');
        content.classList.add('expanded');
        folderItem.classList.remove('collapsed');  
        folderItem.classList.add('expanded');
      }
    });
  }
  
  renderFolderTree(expandedPaths = []) {
    const folderTree = document.getElementById('folder-tree');
    if (!folderTree) return;
    
    const renderNode = (node, level = 0) => {
      const isFolder = node.type === 'folder';
      const hasChildren = node.children && node.children.length > 0;
      
      let html = '';
      
      if (isFolder) {
        const folderId = `folder-${node.path.replace(/\//g, '-')}`;
        const isExpanded = expandedPaths.includes(node.path);
        
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
        // File node - check if it's a base, folder index, or regular note
        const isBase = this.bases.has(node.noteId);
        const isFolderIndex = node.noteId && node.noteId.startsWith('-');
        
        if (isFolderIndex) {
          // Render as a folder-style item for folder index files
          html += `
            <div class="folder-item file folder-index" data-note-id="${node.noteId}" data-is-base="${isBase}">
              <span class="file-name">${node.name}</span>
              ${isBase ? '<span class="base-pill">BASE</span>' : ''}
            </div>
          `;
        } else {
          // Regular file
          html += `
            <div class="folder-item file ${isBase ? 'base-file' : ''}" data-note-id="${node.noteId}" data-is-base="${isBase}">
              <span class="file-name">${node.name}</span>
              ${isBase ? '<span class="base-pill">BASE</span>' : ''}
            </div>
          `;
        }
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
        const isBase = item.getAttribute('data-is-base') === 'true';
        
        if (noteId) {
          if (isBase) {
            this.loadBase(noteId);
          } else {
            this.loadNote(noteId);
          }
          
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

  setupExpandCollapseAll() {
    const expandCollapseButton = document.getElementById('expand-collapse-all');
    if (!expandCollapseButton) return;

    let allExpanded = false;
    
    expandCollapseButton.addEventListener('click', () => {
      const folderItems = document.querySelectorAll('.folder-item.folder');
      const folderContents = document.querySelectorAll('.folder-content');
      
      if (allExpanded) {
        // Collapse all folders
        folderItems.forEach(item => {
          item.classList.remove('expanded');
          item.classList.add('collapsed');
        });
        folderContents.forEach(content => {
          content.classList.remove('expanded');
          content.classList.add('collapsed');
        });
        
        // Update button state
        expandCollapseButton.title = 'Expand all folders';
        expandCollapseButton.classList.remove('all-expanded');
        allExpanded = false;
      } else {
        // Expand all folders
        folderItems.forEach(item => {
          item.classList.remove('collapsed');
          item.classList.add('expanded');
        });
        folderContents.forEach(content => {
          content.classList.remove('collapsed');
          content.classList.add('expanded');
        });
        
        // Update button state
        expandCollapseButton.title = 'Collapse all folders';
        expandCollapseButton.classList.add('all-expanded');
        allExpanded = true;
      }
    });
  }

  getLucideIcon(iconName, size = 16) {
    // Using actual Lucide SVG paths for consistency
    const icons = {
      'TableOfContents': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 12H3"/><path d="M16 18H3"/><path d="M16 6H3"/><path d="M21 12h.01"/><path d="M21 18h.01"/><path d="M21 6h.01"/></svg>`
    };
    return icons[iconName] || icons['TableOfContents'];
  }
  
  loadNote(noteId, addToHistory = true) {
    const note = this.notes.get(noteId);
    if (!note) {
      console.warn(`Note not found: ${noteId}`);
      return;
    }
    
    this.currentNote = note;
    this.lastViewedNoteId = noteId; // Track for graph view switching
    
    // Update URL and history with clean URLs
    if (addToHistory) {
      const cleanUrl = this.basePath ? `${window.location.origin}${this.basePath}/${noteId}` : `${window.location.origin}/${noteId}`;
      // Save current scroll position in history state for back/forward navigation
      window.history.pushState({ noteId, scrollY: window.scrollY }, note.title, cleanUrl);
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
      const frontMatterHtml = note.frontMatterHtml || '';
      noteContent.innerHTML = `
        <h1 class="note-title">${note.title}</h1>
        ${frontMatterHtml}
        <div class="note-body">${note.html}</div>
        <aside class="backlinks-panel" id="backlinks-panel">
          <div id="backlinks-content"></div>
        </aside>
      `;
      
      // Initialize ABC notation containers after content is loaded
      if (window.initializeAllABCNotation) {
        window.initializeAllABCNotation();
      }
      
      // Initialize Mermaid diagrams after content is loaded
      if (window.initializeMermaid) {
        window.initializeMermaid();
      }
      
      // Initialize copy buttons for code blocks
      this.initializeCodeCopyButtons();
    }
    
    // Update backlinks
    this.renderBacklinks(note);
    
    // Initialize embedded bases if any exist
    this.initializeEmbeddedBases();
    
    // Update active state in sidebar and expand hierarchy
    this.updateSidebarActiveState(noteId);
    this.expandPathToNote(noteId);
    
    // Update table of contents
    if (window.tableOfContents) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        window.tableOfContents.setCurrentNote(noteId);
      }, 100);
    }

    // Update mini graph to show local graph for current note
    if (this.graph) {
      this.graph.updateMiniGraph(noteId);
    }
    
    // Scroll to top - scroll both the container and the window
    if (noteContent) {
      noteContent.scrollTop = 0;
    }
    // Scroll window to top for new page navigation (preserves position for back/forward)
    if (addToHistory) {
      window.scrollTo(0, 0);
    }
  }
  
  loadBase(baseId, addToHistory = true) {
    const base = this.bases.get(baseId);
    if (!base) {
      console.warn(`Base not found: ${baseId}`);
      return;
    }
    
    this.currentBase = base;
    this.currentNote = null; // Clear current note
    
    // Update URL and history - use the base's folder path, not "bases/"
    if (addToHistory) {
      // Construct path from base's folder path and file name
      const basePath = base.folderPath 
        ? `/${base.folderPath.toLowerCase()}/${baseId.toLowerCase()}`
        : `/${baseId.toLowerCase()}`;
      const baseUrl = `${window.location.origin}${basePath}`;
      window.history.pushState({ baseId }, base.title, baseUrl);
    }
    
    // Update page title
    document.title = `${base.title} - Obsidian Vault`;
    
    // Update breadcrumb
    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb) {
      breadcrumb.innerHTML = `<span class="breadcrumb-item">${base.title}</span>`;
    }
    
    // Update main content with base view
    const noteContent = document.getElementById('note-content');
    if (noteContent) {
      // Only re-render if navigating (addToHistory=true) or if content is different
      // On initial page load with addToHistory=false, the content is already rendered by server
      const hasBaseHeader = noteContent.querySelector('.base-header');
      const shouldRender = addToHistory || !hasBaseHeader;
      
      if (shouldRender) {
        noteContent.innerHTML = this.renderBaseView(base);
      }
      
      // Always initialize base interactions (buttons, etc)
      this.initializeBaseInteractions(base);
      
      // Always render cards to ensure they display correctly
      this.renderEmbeddedCards();
      
      // Initialize Mermaid diagrams if any
      if (window.initializeMermaid) {
        window.initializeMermaid();
      }
      
      // Initialize copy buttons for code blocks
      this.initializeCodeCopyButtons();
    }
    
    // Update active state in sidebar and expand hierarchy
    this.updateSidebarActiveState(baseId);
    this.expandPathToNote(baseId);
    
    // Clear table of contents for base views
    if (window.tableOfContents) {
      window.tableOfContents.setCurrentNote(null);
    }

    // Clear mini graph for base views (bases aren't part of the note graph)
    if (this.graph) {
      this.graph.updateMiniGraph(null);
    }
    
    // Scroll to top - scroll both the container and the window
    if (noteContent) {
      noteContent.scrollTop = 0;
    }
    // Scroll window to top for new page navigation (preserves position for back/forward)
    if (addToHistory) {
      window.scrollTo(0, 0);
    }
  }
  
  renderBaseView(base) {
    const defaultView = base.views[0] || { type: 'table', name: 'Default' };
    
    // Check if base has sort or filter rules
    const hasSortRules = defaultView.sort && defaultView.sort.length > 0;
    const hasFilterRules = (base.filters && (
      (typeof base.filters === 'string') ||
      (typeof base.filters === 'object' && base.filters !== null && Object.keys(base.filters).length > 0)
    )) || (defaultView.filters && (
      (typeof defaultView.filters === 'string') ||
      (typeof defaultView.filters === 'object' && defaultView.filters !== null && Object.keys(defaultView.filters).length > 0)
    ));
    
    const viewButtons = base.views.map(view => 
        `<button class="view-button ${view === defaultView ? 'active' : ''}" data-view-type="${view.type}" data-view-name="${view.name}" title="${view.name}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${view.type === 'cards' ? 
                  '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>' :
                  '<path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9l7-6z"></path><polyline points="12,3 12,9 19,9"></polyline>'
                }
            </svg>
            <span class="view-button-text">${view.name}</span>
        </button>`
    ).join('');

    return `<div class="base-header">
        <h1 class="base-title">${base.title}</h1>
        <div class="base-controls">
            <div class="view-switcher">
                ${viewButtons}
            </div>
            <div class="base-actions" style="position: relative;">
                <button class="action-button ${hasSortRules ? 'has-rules' : ''}" id="sort-button" data-base-id="${base.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m3 16 4 4 4-4"></path><path d="M7 20V4"></path><path d="m21 8-4-4-4 4"></path><path d="M17 4v16"></path>
                    </svg>
                    Sort
                </button>
                <button class="action-button ${hasFilterRules ? 'has-rules' : ''}" id="filter-button" data-base-id="${base.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
                    </svg>
                    Filter
                </button>
            </div>
        </div>
    </div>
    <div class="base-content" id="base-content">
        ${this.renderBaseViewContent(base, defaultView)}
    </div>`;
  }
  
  renderBaseViewContent(base, view) {
    // Get matched notes and convert IDs to full note objects
    const matchedNoteIds = base.matchedNotes || [];
    
    // Check if matchedNotes contains objects or IDs
    let notes;
    if (matchedNoteIds.length > 0 && typeof matchedNoteIds[0] === 'object') {
      // Already note objects
      notes = matchedNoteIds;
    } else {
      // Note IDs that need to be converted
      notes = matchedNoteIds.map(id => this.notes.get(id)).filter(note => note);
    }
    
    // Apply view-specific filters if they exist
    if (view.filters) {
      notes = this.applyViewFilters(notes, view.filters);
    }
    
    // Apply view-specific sorting if it exists
    if (view.sort && Array.isArray(view.sort)) {
      notes = this.sortNotes(notes, view.sort);
    }
    
    if (notes.length === 0) {
        return '<div class="empty-base">No items found</div>';
    }

    switch (view.type) {
        case 'table':
            return this.renderTableView(notes, view);
        case 'cards':
            return this.renderCardsView(notes, view, base);
        case 'calendar':
            return this.renderCalendarView(notes, view);
        default:
            return this.renderTableView(notes, view);
    }
  }
  
  applyViewFilters(notes, filters) {
    return notes.filter(note => this.evaluateViewFilter(filters, note));
  }
  
  sortNotes(notes, sortRules) {
    return notes.sort((a, b) => {
      for (const sortRule of sortRules) {
        const comparison = this.compareNotes(a, b, sortRule.property);
        if (comparison !== 0) {
          return sortRule.direction === 'DESC' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }
  
  compareNotes(a, b, property) {
    let valueA, valueB;
    
    switch (property) {
      case 'file.name':
        valueA = a.title;
        valueB = b.title;
        break;
      case 'file.path':
        valueA = a.relativePath;
        valueB = b.relativePath;
        break;
      case 'file.mtime':
        valueA = this.getFileMtime(a);
        valueB = this.getFileMtime(b);
        break;
      case 'file.ctime':
        valueA = this.getFileCtime(a);
        valueB = this.getFileCtime(b);
        break;
      case 'file.tags':
        valueA = (a.frontMatter.tags || []).join(',');
        valueB = (b.frontMatter.tags || []).join(',');
        break;
      default:
        valueA = a.frontMatter[property];
        valueB = b.frontMatter[property];
    }
    
    // Handle null values - treat null as oldest (smallest) value
    if (valueA === null && valueB === null) return 0;
    if (valueA === null) return 1;  // null is "greater" (older)
    if (valueB === null) return -1; // non-null is "lesser" (newer)
    
    // Handle different data types
    if (valueA instanceof Date && valueB instanceof Date) {
      return valueA.getTime() - valueB.getTime();
    }
    
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return valueA - valueB;
    }
    
    // Default to string comparison
    const strA = String(valueA || '');
    const strB = String(valueB || '');
    return strA.localeCompare(strB);
  }
  
  getFileMtime(note) {
    if (note.fileStats) {
      return new Date(note.fileStats.mtime);
    }
    return null;
  }
  
  getFileCtime(note) {
    if (note.fileStats) {
      return new Date(note.fileStats.ctime);
    }
    return null;
  }
  
  getPropertyValue(note, property) {
    switch (property) {
      case 'file.name':
        return note.title;
      case 'file.path':
        return note.relativePath;
      case 'file.mtime':
        return this.getFileMtime(note);
      case 'file.ctime':
        return this.getFileCtime(note);
      case 'file.tags':
        return (note.frontMatter.tags || []).join(',');
      default:
        return note.frontMatter[property];
    }
  }
  
  evaluateViewFilter(filter, note) {
    // Handle logical operators
    if (filter.and) {
      return filter.and.every(subFilter => this.evaluateViewFilter(subFilter, note));
    }
    
    if (filter.or) {
      return filter.or.some(subFilter => this.evaluateViewFilter(subFilter, note));
    }
    
    if (filter.not) {
      return !this.evaluateViewFilter(filter.not, note);
    }
    
    // Handle string-based filters
    if (typeof filter === 'string') {
      return this.evaluateStringFilter(filter, note);
    }
    
    // Handle property-based filters
    for (const [key, value] of Object.entries(filter)) {
      if (key === 'and' || key === 'or' || key === 'not') continue;
      
      if (!this.evaluatePropertyFilter(key, value, note)) {
        return false;
      }
    }
    
    return true;
  }
  
  evaluateStringFilter(filter, note) {
    // Handle common property comparisons like "status == 'DOING'"
    const propertyMatch = filter.match(/(\w+)\s*(==|!=)\s*["']([^"']+)["']/);
    if (propertyMatch) {
      const property = propertyMatch[1];
      const operator = propertyMatch[2];
      const value = propertyMatch[3];
      const noteValue = note.frontMatter?.[property];
      
      if (operator === '==') {
        return noteValue === value;
      } else if (operator === '!=') {
        return noteValue !== value;
      }
    }

    // Handle file.hasTag() filters
    const hasTagMatch = filter.match(/file\.hasTag\(["']([^"']+)["']\)/);
    if (hasTagMatch) {
      const tag = hasTagMatch[1];
      const tags = note.frontMatter?.tags || [];
      const tagList = Array.isArray(tags) ? tags : [tags];
      return tagList.includes(tag);
    }

    return false;
  }  evaluatePropertyFilter(property, value, note) {
    const noteValue = note.frontMatter?.[property];
    
    // Handle simple equality
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return noteValue === value;
    }
    
    // Handle complex filters (could be extended)
    return false;
  }
  
  /**
   * Extract properties used in filter conditions
   */
  extractPropertiesFromFilter(filter, usedProperties) {
    if (!filter) return;
    
    // Handle logical operators
    if (filter.and && Array.isArray(filter.and)) {
      filter.and.forEach(subFilter => this.extractPropertiesFromFilter(subFilter, usedProperties));
    }
    
    if (filter.or && Array.isArray(filter.or)) {
      filter.or.forEach(subFilter => this.extractPropertiesFromFilter(subFilter, usedProperties));
    }
    
    if (filter.not) {
      this.extractPropertiesFromFilter(filter.not, usedProperties);
    }
    
    // Handle string-based filters - look for property patterns
    if (typeof filter === 'string') {
      // Common patterns: file.hasTag, file.tags, file.path, etc.
      const propertyMatch = filter.match(/file\.(hasTag|tags|path|mtime|ctime|size)/g);
      if (propertyMatch) {
        propertyMatch.forEach(prop => {
          // Convert file.hasTag to file.tags since that's what we display
          if (prop === 'file.hasTag') {
            usedProperties.add('file.tags');
          } else {
            usedProperties.add(prop);
          }
        });
      }
    }
    
    // Handle object-based filters
    if (typeof filter === 'object' && filter !== null) {
      Object.keys(filter).forEach(key => {
        if (key.startsWith('file.')) {
          usedProperties.add(key);
        }
      });
    }
  }

  /**
   * Filter notes for a base using its filters
   */
  filterNotesForBase(base, allNotes) {
    if (!base.filters) {
      return allNotes;
    }
    
    const filteredNotes = allNotes.filter(note => {
      const result = this.evaluateViewFilter(base.filters, note);
      
      return result;
    });
    
    return filteredNotes;
  }

  /**
   * Process formulas for notes (placeholder implementation)
   */
  processFormulasForNotes(base, notes) {
    // For now, just return the notes as-is
    // TODO: Implement formula processing when needed
    return notes;
  }

  /**
   * Determine which properties are used for filtering and sorting
   */
  getUsedProperties(baseView, baseFilters, baseProperties = null) {
    const usedProperties = new Set();
    
    // First, add properties explicitly defined in the base configuration
    if (baseProperties) {
      Object.keys(baseProperties).forEach(propName => {
        // Skip the cover_image property as it's used for the card image
        if (propName !== 'cover_image' && !propName.startsWith('file.')) {
          usedProperties.add(propName);
        }
      });
    }
    
    // Add properties used in filtering from the base configuration
    if (baseFilters) {
      this.extractPropertiesFromFilter(baseFilters, usedProperties);
    }
    
    // Add properties used in sorting
    if (baseView.sort && Array.isArray(baseView.sort)) {
      baseView.sort.forEach(sortRule => {
        if (typeof sortRule === 'object' && sortRule.property) {
          usedProperties.add(sortRule.property);
        } else if (typeof sortRule === 'string') {
          usedProperties.add(sortRule);
        }
      });
    }
    
    // If no specific properties are identified, fall back to showing tags only
    if (usedProperties.size === 0) {
      usedProperties.add('file.tags');
    }
    
    return Array.from(usedProperties);
  }

  /**
   * Convert markdown content to HTML for card preview
   */
  renderMarkdownForPreview(content) {
    if (!content) return '';
    
    // Remove frontmatter first
    let htmlContent = content.replace(/^---[\s\S]*?---\s*/, '');
    
    // Convert markdown to HTML while preserving formatting
    htmlContent = htmlContent
      // Convert headers (keep them but make them smaller for previews)
      .replace(/^### (.+)$/gm, '<h6>$1</h6>')
      .replace(/^## (.+)$/gm, '<h5>$1</h5>')
      .replace(/^# (.+)$/gm, '<h4>$1</h4>')
      // Convert bold and italic
      .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      // Convert strikethrough
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      // Convert inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Convert wiki links [[link]] and [[link|alias]]
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<a href="/$1" class="internal-link">$2</a>')
      .replace(/\[\[([^\]]+)\]\]/g, '<a href="/$1" class="internal-link">$1</a>')
      // Convert markdown links [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Convert line breaks to paragraphs (simple approach)
      .replace(/\n\n/g, '</p><p>')
      .replace(/^\s*$\n/gm, '') // Remove empty lines
      .trim();
    
    // Wrap in paragraph if not empty and doesn't start with a heading
    if (htmlContent && !htmlContent.startsWith('<h')) {
      htmlContent = '<p>' + htmlContent + '</p>';
    }
    
    // If content is too short or problematic, don't show preview
    if (htmlContent.length < 10) {
      return '';
    }
    
    return htmlContent;
  }

  /**
   * Generate card HTML for a single note
   */
  generateCardHtml(note, usedProperties, contentPreviewLength = 150, view = null, baseProperties = null) {
    // Generate top section (image or skeleton)
    const topSectionHtml = this.generateCardTopSection(note, view);

    // Title comes after the top section
    const titleHtml = `<div class="card-title-section">
        <h3 class="card-title">
            <a href="/${note.id}" class="internal-link">${note.title}</a>
        </h3>
    </div>`;

    // Generate properties table for filtering/sorting fields
    const propertiesTableHtml = this.generateCardPropertiesTable(usedProperties, note, baseProperties);

    return `<div class="card" data-note-id="${note.id}">
        ${topSectionHtml}
        ${titleHtml}
        ${propertiesTableHtml}
    </div>`;
  }

  /**
   * Generate the top section of a card (image or skeleton)
   */
  generateCardTopSection(note, view) {
    // Check if the view has an image entry
    if (view?.image) {
      const imageValue = this.getImageFromNote(note, view.image);
      if (imageValue) {
        return `<div class="card-top-image">
            <img src="${imageValue}" alt="${note.title}" />
        </div>`;
      }
    }

    // Generate content-based skeleton if no image
    return this.generateContentBasedSkeleton(note);
  }

  /**
   * Generate skeleton lines based on actual note content structure
   */
  generateContentBasedSkeleton(note) {
    if (!note.content) {
      // Default skeleton if no content - fill available space
      return this.generateDefaultSkeleton();
    }

    // Remove frontmatter first
    let content = note.content.replace(/^---[\s\S]*?---\s*/, '');
    
    // Split into lines and analyze structure
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const skeletonLines = [];
    
    // With thinner lines and gap spacing, calculate available space
    // Height: 200px, padding: 24px (12px * 2), gap: 4px between lines, average line height: ~10px
    const availableHeight = 200 - (24 * 2); // 152px available
    const avgLineHeight = 10; // Average line height
    const gapSize = 4; // Gap between lines
    // Calculate lines with gap: (height - (gaps * (lines-1))) / lineHeight = lines
    // Rearranging: height = lines * lineHeight + gaps * (lines-1)
    // height = lines * (lineHeight + gap) - gap
    const effectiveLineHeight = avgLineHeight + gapSize;
    const maxPossibleLines = Math.floor((availableHeight + gapSize) / effectiveLineHeight); // ~12 lines
    
    // Analyze content structure for the number of lines we can fit
    const contentLines = Math.min(lines.length, maxPossibleLines);
    
    for (let i = 0; i < contentLines; i++) {
      const line = lines[i].trim();
      
      if (!line) continue;
      
      // Determine skeleton line type based on content
      let skeletonClass = '';
      
      if (line.startsWith('# ')) {
        // Main heading - tall and prominent
        skeletonClass = 'skeleton-line-heading-1';
      } else if (line.startsWith('## ')) {
        // Secondary heading
        skeletonClass = 'skeleton-line-heading-2';
      } else if (line.startsWith('### ') || line.startsWith('#### ')) {
        // Sub-headings
        skeletonClass = 'skeleton-line-heading-3';
      } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
        // Bullet list items - with bullet point
        skeletonClass = 'skeleton-line-list';
      } else if (line.match(/^\d+\. /)) {
        // Numbered list items
        skeletonClass = 'skeleton-line-medium';
      } else if (line.startsWith('```')) {
        // Code blocks - monospaced feel
        skeletonClass = 'skeleton-line-code';
      } else if (line.startsWith('> ')) {
        // Quotes - medium width
        skeletonClass = 'skeleton-line-medium';
      } else if (line.length > 80) {
        // Long paragraphs
        skeletonClass = 'skeleton-line-long';
      } else if (line.length > 50) {
        // Medium paragraphs
        skeletonClass = 'skeleton-line-medium';
      } else if (line.length > 20) {
        // Short paragraphs
        skeletonClass = 'skeleton-line-short';
      } else {
        // Very short lines
        skeletonClass = 'skeleton-line-short';
      }
      
      skeletonLines.push(`<div class="skeleton-line ${skeletonClass}"></div>`);
    }
    
    // If we have room for more lines and haven't used all content, add more based on remaining content
    if (skeletonLines.length < maxPossibleLines && lines.length > contentLines) {
      const remainingSpace = maxPossibleLines - skeletonLines.length;
      const remainingContent = lines.slice(contentLines);
      
      // Add more skeleton lines based on remaining content patterns
      for (let i = 0; i < Math.min(remainingSpace, remainingContent.length); i++) {
        const line = remainingContent[i].trim();
        let skeletonClass;
        
        if (line.startsWith('- ') || line.startsWith('* ')) {
          skeletonClass = 'skeleton-line-list';
        } else if (line.length > 60) {
          skeletonClass = 'skeleton-line-long';
        } else if (line.length > 30) {
          skeletonClass = 'skeleton-line-medium';
        } else {
          skeletonClass = 'skeleton-line-short';
        }
        
        skeletonLines.push(`<div class="skeleton-line ${skeletonClass}"></div>`);
      }
    }
    
    // If we still have space and no more content, fill with varied lines to use all space
    if (skeletonLines.length < maxPossibleLines) {
      const remainingSpace = maxPossibleLines - skeletonLines.length;
      const patterns = ['skeleton-line-long', 'skeleton-line-medium', 'skeleton-line-short', 'skeleton-line-medium'];
      
      for (let i = 0; i < remainingSpace; i++) {
        const patternIndex = i % patterns.length;
        skeletonLines.push(`<div class="skeleton-line ${patterns[patternIndex]}"></div>`);
      }
    }
    
    return `<div class="card-top-skeleton">
        ${skeletonLines.join('')}
    </div>`;
  }

  /**
   * Generate default skeleton when no content is available
   */
  generateDefaultSkeleton() {
    // Fill available space with varied skeleton lines that look like a document
    const availableHeight = 200 - (24 * 2); // 152px available
    const avgLineHeight = 10; // Average line height
    const gapSize = 4; // Gap between lines
    const effectiveLineHeight = avgLineHeight + gapSize;
    const maxLines = Math.floor((availableHeight + gapSize) / effectiveLineHeight); // ~12 lines
    
    // Create a realistic document structure
    const documentStructure = [
      'skeleton-line-heading-1', // Title
      'skeleton-line-long',      // First paragraph
      'skeleton-line-medium',    // Second line
      'skeleton-line-short',     // Third line
      'skeleton-line-heading-2', // Subheading
      'skeleton-line-list',      // List item
      'skeleton-line-list',      // List item
      'skeleton-line-list',      // List item
      'skeleton-line-medium',    // Paragraph
      'skeleton-line-long',      // Long paragraph
      'skeleton-line-short',     // Short line
      'skeleton-line-medium',    // Medium line
      'skeleton-line-heading-3', // Another heading
      'skeleton-line-long',      // Content
      'skeleton-line-medium'     // More content
    ];
    
    const skeletonLines = [];
    const linesToUse = Math.min(maxLines, documentStructure.length);
    
    for (let i = 0; i < linesToUse; i++) {
      skeletonLines.push(`<div class="skeleton-line ${documentStructure[i]}"></div>`);
    }
    
    return `<div class="card-top-skeleton">
        ${skeletonLines.join('')}
    </div>`;
  }

  /**
   * Extract image value from note based on view configuration
   */
  getImageFromNote(note, imageConfig) {
    if (!imageConfig || !note) return null;
    
    // Derive folderPath from note ID if not present
    // e.g., "benchmarks/six_hump_camel/six_hump_camel" -> "benchmarks/six_hump_camel"
    let folderPath = note.folderPath;
    if (!folderPath && note.id) {
      const parts = note.id.split('/');
      if (parts.length > 1) {
        // Remove the last part (filename) - preserve exact case from note ID
        folderPath = parts.slice(0, -1).join('/');
      }
    }
    
    // Handle note.cover or similar property references
    if (imageConfig.startsWith('note.')) {
      const property = imageConfig.substring(5); // Remove 'note.' prefix
      
      // Try frontmatter first
      if (note.frontMatter && note.frontMatter[property]) {
        let imagePath = note.frontMatter[property];
        
        // If it's a relative path, prepend the note's folder path
        if (imagePath && !imagePath.startsWith('/') && !imagePath.startsWith('http')) {
          const noteFolderPath = folderPath || '';
          if (noteFolderPath !== '') {
            imagePath = `/${noteFolderPath}/${imagePath}`;
          } else {
            imagePath = `/${imagePath}`;
          }
        }
        
        return imagePath;
      }
      
      // Try other note properties
      if (note[property]) {
        return note[property];
      }
    }
    
    return null;
  }

  /**
   * Generate properties table for filtering and sorting fields
   */
  generateCardPropertiesTable(usedProperties, note, baseProperties = null) {
    if (!usedProperties || usedProperties.length === 0) {
      return '';
    }

    const propertyRows = usedProperties
      .filter(property => property !== 'file.name') // Skip file.name since title is shown above
      .map(property => {
        const value = this.getColumnValue(note, property);
        if (!value) return '';

        const label = this.getPropertyLabel(property, baseProperties);
        
        // Special handling for different property types
        let valueHtml = '';
        if (property === 'file.tags') {
          valueHtml = `<div class="card-tags">${value}</div>`;
        } else if (property.includes('time')) {
          valueHtml = `<div class="card-date">${value}</div>`;
        } else {
          valueHtml = `<div class="card-property-value">${value}</div>`;
        }

        return `<tr class="card-property-row">
            <td class="card-property-label">${label}</td>
            <td class="card-property-value-cell">${valueHtml}</td>
        </tr>`;
      })
      .filter(row => row)
      .join('');

    if (!propertyRows) {
      return '';
    }

    return `<div class="card-properties-table">
        <table class="properties-table">
            <tbody>
                ${propertyRows}
            </tbody>
        </table>
    </div>`;
  }
  
  /**
   * Get human-readable label for property
   */
  getPropertyLabel(property, baseProperties = null) {
    // First check if there's a displayName in the base properties configuration
    if (baseProperties && baseProperties[property]?.displayName) {
      return baseProperties[property].displayName;
    }
    
    // Fall back to built-in property names
    switch (property) {
      case 'file.tags': return 'file tags';
      case 'file.mtime': return 'modified time';
      case 'file.ctime': return 'created time';
      case 'file.size': return 'file size';
      case 'file.path': return 'file path';
      default: return property.replace('file.', '').replace(/([A-Z])/g, ' $1').toLowerCase();
    }
  }
  
  renderCardsView(notes, view, base = null) {
    // Use client-side rendering for consistency
    const filters = base?.filters || null;
    const baseProperties = base?.properties || null;  // Include base properties for card display
    const baseData = {
      noteIds: notes.map(note => note.id),  // Store only IDs, not full note objects
      view: view,
      filters: filters,
      properties: baseProperties  // Pass properties to client-side
    };

    // Return a placeholder that will be rendered client-side
    return `<div class="cards-view" data-base-cards='${JSON.stringify(baseData).replace(/'/g, "&apos;")}'>
        <div class="cards-container">
            <!-- Cards will be rendered by client-side JavaScript -->
        </div>
    </div>`;
  }  renderTableView(notes, view) {
    if (notes.length === 0) {
        return '<div class="table-view"><p class="empty-state">No notes match the current filters.</p></div>';
    }

    // Determine columns to show
    const columns = view.order || ['file.name', 'file.tags', 'file.mtime'];
    
    const headerHtml = columns.map(col => {
        const columnName = this.getColumnDisplayName(col);
        return `<th data-column="${col}" class="sortable">
            ${columnName}
        </th>`;
    }).join('');
    
    const rowsHtml = notes.map(note => {
        const cellsHtml = columns.map(col => {
            const value = this.getColumnValue(note, col);
            return `<td data-column="${col}">${value}</td>`;
        }).join('');
        
        return `<tr data-note-id="${note.id}" class="table-row clickable-row">
            ${cellsHtml}
        </tr>`;
    }).join('');
    
    return `<div class="table-view">
        <table class="base-table">
            <thead>
                <tr>
                    ${headerHtml}
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
    </div>`;
  }

  renderCalendarView(notes, view) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();
    
    // Group notes by date
    const notesByDate = {};
    notes.forEach(note => {
        const dateStr = note.frontMatter?.date || note.frontMatter?.created;
        if (dateStr) {
            const date = new Date(dateStr);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            if (!notesByDate[key]) notesByDate[key] = [];
            notesByDate[key].push(note);
        }
    });
    
    // Generate calendar grid
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    let calendarHtml = `<div class="calendar-view">
        <div class="calendar-header">
            <h3>${monthNames[month]} ${year}</h3>
        </div>
        <div class="calendar-grid">
            <div class="calendar-days-header">
                ${dayNames.map(day => `<div class="day-header">${day}</div>`).join('')}
            </div>
            <div class="calendar-days">`;
    
    // Empty cells for days before first day of month
    for (let i = 0; i < startDay; i++) {
        calendarHtml += '<div class="calendar-day empty"></div>';
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayNotes = notesByDate[dateKey] || [];
        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        
        calendarHtml += `<div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateKey}">
            <div class="day-number">${day}</div>
            <div class="day-notes">
                ${dayNotes.map(note => `<div class="calendar-note" data-note-id="${note.id}" title="${note.title}">${note.title}</div>`).join('')}
            </div>
        </div>`;
    }
    
    calendarHtml += '</div></div></div>';
    return calendarHtml;
  }

  getColumnDisplayName(column) {
    const displayNames = {
        'file.name': 'Name',
        'file.path': 'Path', 
        'file.tags': 'Tags',
        'file.mtime': 'Modified',
        'file.ctime': 'Created',
    };
    
    return displayNames[column] || column;
  }
  
  getColumnValue(note, column) {
    switch (column) {
        case 'file.name':
            return `<a href="/${note.id}" class="internal-link">${note.title}</a>`;
        
        case 'file.path':
            return note.relativePath || '';
        
        case 'file.size':
            if (note.fileStats && note.fileStats.size) {
                const size = note.fileStats.size;
                if (size < 1024) return `${size} B`;
                if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
                return `${Math.round(size / (1024 * 1024))} MB`;
            }
            return '';
        
        case 'file.tags':
            const tags = note.frontMatter?.tags || [];
            const tagList = Array.isArray(tags) ? tags : [tags];
            return tagList.filter(tag => tag && tag.trim()).map(tag => `<span class="tag">${tag.trim()}</span>`).join('');
        
        case 'file.mtime':
            if (note.fileStats && note.fileStats.mtime) {
                const mtime = new Date(note.fileStats.mtime);
                return this.formatDate(mtime);
            }
            return '';
            
        case 'file.ctime':
            if (note.fileStats && note.fileStats.ctime) {
                const ctime = new Date(note.fileStats.ctime);
                return this.formatDate(ctime);
            }
            return '';
        
        default:
            // Custom property from frontmatter
            const value = note.frontMatter?.[column];
            if (value === undefined || value === null) return '';
            if (Array.isArray(value)) return value.join(', ');
            return String(value);
    }
  }
  
  formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
  }
  
  initializeBaseInteractions(base) {
    // View switcher buttons
    const viewButtons = document.querySelectorAll('.view-button');
    viewButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const viewType = e.currentTarget.dataset.viewType;
        const viewName = e.currentTarget.dataset.viewName;
        
        // Find the view
        const view = base.views.find(v => v.type === viewType && v.name === viewName);
        if (view) {
          this.switchBaseView(base, view);
          
          // Update active button
          viewButtons.forEach(btn => btn.classList.remove('active'));
          e.currentTarget.classList.add('active');
        }
      });
    });
    
    // Embed view buttons for embedded bases
    const embedViewButtons = document.querySelectorAll('.embed-view-button');
    embedViewButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const viewType = e.currentTarget.dataset.viewType;
        const viewName = e.currentTarget.dataset.viewName;
        
        // Find the embed container and get the base ID
        const embedContainer = e.currentTarget.closest('.embed-base');
        if (embedContainer) {
          const baseId = embedContainer.dataset.baseId;
          if (baseId && this.bases.has(baseId)) {
            const base = this.bases.get(baseId);
            
            // Find the view
            const view = base.views.find(v => v.type === viewType && v.name === viewName);
            if (view) {
              const embedContent = embedContainer.querySelector('.embed-content');
              if (embedContent) {
                // Update content
                embedContent.innerHTML = this.renderBaseViewContent(base, view);
                
                // Update active button within this embed
                const embedButtons = embedContainer.querySelectorAll('.embed-view-button');
                embedButtons.forEach(btn => btn.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Re-initialize interactions for the new content
                this.initializeBaseInteractions(base);
                this.initializeEmbeddedBaseInteractions();
              }
            }
          }
        }
      });
    });
    
    // Table row clicks
    const tableRows = document.querySelectorAll('.clickable-row');
    tableRows.forEach(row => {
      row.addEventListener('click', (e) => {
        const noteId = e.currentTarget.dataset.noteId;
        if (noteId) {
          const url = this.basePath ? `${this.basePath}/${noteId}` : `/${noteId}`;
          window.location.href = url;
        }
      });
    });
    
    // Sortable columns
    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        const column = e.currentTarget.dataset.column;
        this.sortBaseByColumn(base, column);
      });
    });

    // Sort and Filter button event handlers
    const sortButton = document.getElementById('sort-button');
    const filterButton = document.getElementById('filter-button');
    
    if (sortButton) {
      sortButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showSortPopup(base, e.currentTarget);
      });
    }
    
    if (filterButton) {
      filterButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showFilterPopup(base, e.currentTarget);
      });
    }

    // Embedded sort and filter button event handlers
    const embedActionButtons = document.querySelectorAll('.embed-action-button');
    embedActionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.currentTarget.dataset.action;
        const baseId = e.currentTarget.dataset.baseId;
        
        if (baseId && this.bases.has(baseId)) {
          const targetBase = this.bases.get(baseId);
          if (action === 'sort') {
            this.showSortPopup(targetBase, e.currentTarget);
          } else if (action === 'filter') {
            this.showFilterPopup(targetBase, e.currentTarget);
          }
        }
      });
    });

    // Calendar note clicks
    const calendarNotes = document.querySelectorAll('.calendar-note');
    calendarNotes.forEach(note => {
      note.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent day click
        const noteId = e.currentTarget.dataset.noteId;
        if (noteId) {
          const url = this.basePath ? `${this.basePath}/${noteId}` : `/${noteId}`;
          window.location.href = url;
        }
      });
    });
  }
  
  initializeEmbeddedBaseInteractions() {
    // Re-initialize embedded action buttons (sort/filter buttons in embedded bases)
    const embeddedActionButtons = document.querySelectorAll('.embed-action-button');
    embeddedActionButtons.forEach(button => {
      // Remove any existing listeners to avoid duplicates
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      
      newButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.currentTarget.dataset.action;
        const baseId = e.currentTarget.dataset.baseId;
        
        if (baseId && this.bases.has(baseId)) {
          const base = this.bases.get(baseId);
          if (action === 'sort') {
            this.showSortPopup(base, e.currentTarget);
          } else if (action === 'filter') {
            this.showFilterPopup(base, e.currentTarget);
          }
        }
      });
    });
  }
  
  switchBaseView(base, view) {
    const baseContent = document.getElementById('base-content');
    if (baseContent) {
      baseContent.innerHTML = this.renderBaseViewContent(base, view);
      this.initializeBaseInteractions(base);
      
      // Render cards if this is a cards view
      this.renderEmbeddedCards();
      
      // Update sort and filter button indicators for the new view
      this.updateActionButtonIndicators(base, view);
    }
  }
  
  updateActionButtonIndicators(base, view) {
    const sortButton = document.getElementById('sort-button');
    const filterButton = document.getElementById('filter-button');
    
    if (sortButton) {
      const hasSortRules = view.sort && view.sort.length > 0;
      sortButton.classList.toggle('has-rules', hasSortRules);
    }
    
    if (filterButton) {
      const hasFilterRules = (base.filters && (
        (typeof base.filters === 'string') ||
        (typeof base.filters === 'object' && base.filters !== null && Object.keys(base.filters).length > 0)
      )) || (view.filters && (
        (typeof view.filters === 'string') ||
        (typeof view.filters === 'object' && view.filters !== null && Object.keys(view.filters).length > 0)
      ));
      filterButton.classList.toggle('has-rules', hasFilterRules);
    }
  }
  
  sortBaseByColumn(base, column) {
    // This is a simplified version - in a full implementation,
    // you'd maintain sort state and update the backend data
    // For now, just handle the action silently
  }
  
  showSortPopup(base, button) {
    // Close any existing popups
    this.closePopups();
    
    const currentView = this.getCurrentView(base);
    const sortRules = currentView.sort || [];
    
    const popup = this.createSortPopup(sortRules);
    
    // Position popup relative to the button
    this.positionPopup(popup, button);
    
    // Add event listeners
    this.setupPopupEventListeners(popup);
  }
  
  showFilterPopup(base, button) {
    // Close any existing popups
    this.closePopups();
    
    const currentView = this.getCurrentView(base);
    const baseFilters = base.filters;
    const viewFilters = currentView.filter || currentView.filters; // Handle both property names
    
    const popup = this.createFilterPopup(baseFilters, viewFilters);
    
    // Position popup relative to the button
    this.positionPopup(popup, button);
    
    // Add event listeners
    this.setupPopupEventListeners(popup);
  }
  
  positionPopup(popup, button) {
    // Add to document body first to calculate dimensions
    document.body.appendChild(popup);
    
    const buttonRect = button.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    
    // Default positioning: below and to the right of button
    let top = buttonRect.bottom + 8;
    let left = buttonRect.right - popupRect.width;
    
    // Ensure popup stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Adjust horizontal position if needed
    if (left < 8) {
      left = 8;
    } else if (left + popupRect.width > viewportWidth - 8) {
      left = viewportWidth - popupRect.width - 8;
    }
    
    // Adjust vertical position if needed
    if (top + popupRect.height > viewportHeight - 8) {
      top = buttonRect.top - popupRect.height - 8;
    }
    
    // Apply positioning
    popup.style.position = 'fixed';
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
    popup.style.right = 'auto';
  }
  
  getCurrentView(base) {
    // Try to find the currently active view - first check for standalone base view buttons
    let activeButton = document.querySelector('.view-button.active');
    
    // If not found, check for embedded base view buttons
    if (!activeButton) {
      activeButton = document.querySelector('.embed-view-button.active');
    }
    
    if (activeButton) {
      const viewType = activeButton.dataset.viewType;
      const viewName = activeButton.dataset.viewName;
      return base.views.find(v => v.type === viewType && v.name === viewName) || base.views[0];
    }
    return base.views[0] || { type: 'table', name: 'Default' };
  }
  
  createSortPopup(sortRules) {
    const sortRulesHtml = sortRules.length > 0 
      ? sortRules.map(rule => this.createSortRuleHtml(rule)).join('')
      : '<div class="empty-rules">No sort rules defined</div>';
      
    const popup = document.createElement('div');
    popup.className = 'base-popup';
    popup.innerHTML = `
      <div class="popup-header">
        <h3 class="popup-title">Sort</h3>
        <button class="popup-close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="popup-section">
        <h4 class="popup-section-title">Current Sort Rules</h4>
        ${sortRulesHtml}
      </div>
    `;
    
    return popup;
  }
  
  createFilterPopup(baseFilters, viewFilters) {
    const baseFiltersHtml = baseFilters 
      ? this.createFilterRuleHtml(baseFilters, 'Base Filters')
      : '';
      
    const viewFiltersHtml = viewFilters 
      ? this.createFilterRuleHtml(viewFilters, 'View Filters')
      : '';
      
    const hasAnyFilters = baseFilters || viewFilters;
    
    const popup = document.createElement('div');
    popup.className = 'base-popup';
    popup.innerHTML = `
      <div class="popup-header">
        <h3 class="popup-title">Filter</h3>
        <button class="popup-close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      ${hasAnyFilters ? baseFiltersHtml + viewFiltersHtml : '<div class="empty-rules">No filter rules defined</div>'}
    `;
    
    return popup;
  }
  
  createSortRuleHtml(rule) {
    const propertyName = this.getColumnDisplayName(rule.property);
    const direction = rule.direction === 'DESC' ? 'Descending' : 'Ascending';
    const arrowIcon = rule.direction === 'DESC' 
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 13l3 3 3-3m-6-8l3-3 3 3"></path></svg>'
      : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m17 11-3-3-3 3m6 8-3 3-3-3"></path></svg>';
    
    return `
      <div class="sort-rule">
        <div class="sort-rule-property">${propertyName}</div>
        <div class="sort-rule-direction">
          <span>${direction}</span>
          <div class="sort-rule-arrow">${arrowIcon}</div>
        </div>
      </div>
    `;
  }
  
  createFilterRuleHtml(filters, sectionTitle) {
    return `
      <div class="popup-section">
        <h4 class="popup-section-title">${sectionTitle}</h4>
        ${this.renderFilterRule(filters)}
      </div>
    `;
  }
  
  renderFilterRule(filter, depth = 0) {
    if (typeof filter === 'string') {
      return `<div class="filter-rule ${depth > 0 ? 'filter-rule-nested' : ''}">
        <div class="filter-rule-condition">${filter}</div>
      </div>`;
    }
    
    if (filter.and) {
      return `<div class="filter-rule ${depth > 0 ? 'filter-rule-nested' : ''}">
        <div class="filter-rule-operator">All of the following</div>
        ${filter.and.map(subFilter => this.renderFilterRule(subFilter, depth + 1)).join('')}
      </div>`;
    }
    
    if (filter.or) {
      return `<div class="filter-rule ${depth > 0 ? 'filter-rule-nested' : ''}">
        <div class="filter-rule-operator">Any of the following</div>
        ${filter.or.map(subFilter => this.renderFilterRule(subFilter, depth + 1)).join('')}
      </div>`;
    }
    
    if (filter.not) {
      return `<div class="filter-rule ${depth > 0 ? 'filter-rule-nested' : ''}">
        <div class="filter-rule-operator">Not</div>
        ${this.renderFilterRule(filter.not, depth + 1)}
      </div>`;
    }
    
    // Handle object-based filters
    const conditions = Object.entries(filter)
      .filter(([key]) => !['and', 'or', 'not'].includes(key))
      .map(([key, value]) => `${key} = ${JSON.stringify(value)}`);
      
    return conditions.map(condition => `
      <div class="filter-rule ${depth > 0 ? 'filter-rule-nested' : ''}">
        <div class="filter-rule-condition">${condition}</div>
      </div>
    `).join('');
  }
  
  setupPopupEventListeners(popup) {
    // Close button
    const closeButton = popup.querySelector('.popup-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.closePopups();
      });
    }
    
    // Create overlay for clicking outside to close
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', () => {
      this.closePopups();
    });
    
    // Prevent popup clicks from closing the popup
    popup.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  closePopups() {
    // Remove all popups and overlays
    document.querySelectorAll('.base-popup').forEach(popup => popup.remove());
    document.querySelectorAll('.popup-overlay').forEach(overlay => overlay.remove());
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
  
  initializeCodeCopyButtons() {
    // Find all code block wrappers and plain pre blocks
    const codeBlockWrappers = document.querySelectorAll('.code-block-wrapper');
    const prePlainBlocks = document.querySelectorAll('.note-body pre:not(.code-block-wrapper pre)');
    
    // Combine both NodeLists into one array
    const allCodeBlocks = [...codeBlockWrappers, ...prePlainBlocks];
    
    allCodeBlocks.forEach(container => {
      // Skip if already has a copy button
      if (container.querySelector('.code-copy-button')) {
        return;
      }
      
      // Create copy button
      const copyButton = document.createElement('button');
      copyButton.className = 'code-copy-button';
      copyButton.setAttribute('aria-label', 'Copy code to clipboard');
      copyButton.setAttribute('title', 'Copy code');
      
      // Copy icon SVG
      const copySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>`;
      
      // Check icon SVG (for success state)
      const checkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>`;
      
      copyButton.innerHTML = copySvg;
      
      // Add click handler
      copyButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Find the code element - handle both wrapper and plain pre cases
        let codeElement;
        if (container.classList.contains('code-block-wrapper')) {
          codeElement = container.querySelector('pre code') || container.querySelector('code');
        } else {
          // Plain pre block
          codeElement = container.querySelector('code') || container;
        }
        
        if (!codeElement) return;
        
        // Get the text content
        const code = codeElement.textContent || '';
        
        try {
          // Copy to clipboard
          await navigator.clipboard.writeText(code);
          
          // Show success state
          copyButton.innerHTML = checkSvg;
          copyButton.classList.add('copied');
          copyButton.setAttribute('title', 'Copied!');
          
          // Reset after 2 seconds
          setTimeout(() => {
            copyButton.innerHTML = copySvg;
            copyButton.classList.remove('copied');
            copyButton.setAttribute('title', 'Copy code');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy code:', err);
          
          // Fallback for older browsers
          try {
            const textArea = document.createElement('textarea');
            textArea.value = code;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            // Show success state
            copyButton.innerHTML = checkSvg;
            copyButton.classList.add('copied');
            copyButton.setAttribute('title', 'Copied!');
            
            setTimeout(() => {
              copyButton.innerHTML = copySvg;
              copyButton.classList.remove('copied');
              copyButton.setAttribute('title', 'Copy code');
            }, 2000);
          } catch (fallbackErr) {
            console.error('Fallback copy also failed:', fallbackErr);
          }
        }
      });
      
      // Add button to container
      container.appendChild(copyButton);
    });
  }
  
  extractNoteIdFromLink(link) {
    const href = link.getAttribute('href');
    if (href) {
      // Handle absolute URLs starting with /
      if (href.startsWith('/')) {
        return decodeURIComponent(href.substring(1));
      }
      // Handle old .html format for backwards compatibility
      if (href.endsWith('.html')) {
        return href.replace('.html', '');
      }
      return decodeURIComponent(href);
    }
    return link.getAttribute('data-note-id');
  }
  
  getDefaultNote() {
    const notes = Array.from(this.notes.values());
    // Try to find 'home' note first
    const homeNote = notes.find(note => note.id.toLowerCase() === 'home');
    if (homeNote) {
      return homeNote.id;
    }
    // Fall back to first note if no home note exists
    return notes.length > 0 ? notes[0].id : null;
  }
}

// Keeps --viewport-block synced with the current visual viewport height
const initializeViewportBlock = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const applyViewportBlock = () => {
    const viewport = window.visualViewport;
    const height = viewport ? viewport.height : window.innerHeight;
    if (!height) {
      return;
    }

    document.documentElement.style.setProperty('--viewport-block', `${height}px`);
  };

  applyViewportBlock();
  window.addEventListener('resize', applyViewportBlock);
  window.addEventListener('orientationchange', applyViewportBlock);
  window.visualViewport?.addEventListener('resize', applyViewportBlock);
  window.visualViewport?.addEventListener('scroll', applyViewportBlock);
};

initializeViewportBlock();

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new ObsidianSSGApp();
  });
} else {
  window.app = new ObsidianSSGApp();
}

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
  const maximizeButton = embedElement?.querySelector('.embed-maximize');
  
  if (embedElement && contentElement) {
    embedElement.classList.toggle('collapsed');
    contentElement.classList.toggle('collapsed');
    
    // Enable/disable maximize button based on collapsed state
    if (maximizeButton) {
      const isCollapsed = embedElement.classList.contains('collapsed');
      if (isCollapsed) {
        maximizeButton.classList.add('disabled');
        maximizeButton.setAttribute('disabled', 'true');
      } else {
        maximizeButton.classList.remove('disabled');
        maximizeButton.removeAttribute('disabled');
      }
    }
  }
}

// Global function for embed maximize toggle interaction
function toggleEmbedMaximize(embedId) {
  const embedElement = document.querySelector(`[data-embed-id="${embedId}"]`);
  const maximizeButton = embedElement?.querySelector('.embed-maximize');
  const maximizeButtonSvg = embedElement?.querySelector('.embed-maximize svg');
  
  // Don't proceed if the maximize button is disabled (when embed is collapsed)
  if (maximizeButton?.classList.contains('disabled')) {
    return;
  }
  
  if (embedElement && maximizeButtonSvg) {
    const isCurrentlyLimited = embedElement.classList.contains('limited-height');
    
    // Toggle between maximized (default) and limited height
    embedElement.classList.toggle('limited-height');
    
    // Update the icon based on new state
    if (isCurrentlyLimited) {
      // Now maximized (no height limit), show minimize icon to indicate you can limit height
      maximizeButtonSvg.innerHTML = `
        <polyline points="4,14 10,14 10,20"></polyline>
        <polyline points="20,10 14,10 14,4"></polyline>
        <line x1="14" y1="10" x2="21" y2="3"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      `;
      maximizeButton.setAttribute('title', 'Limit height');
    } else {
      // Now limited height, show maximize icon to indicate you can remove height limit
      maximizeButtonSvg.innerHTML = `
        <polyline points="15,3 21,3 21,9"></polyline>
        <polyline points="9,21 3,21 3,15"></polyline>
        <line x1="21" y1="3" x2="14" y2="10"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      `;
      maximizeButton.setAttribute('title', 'Remove height limit');
    }
  }
}

// Global function for properties toggle interaction
function toggleProperties(propertiesId) {
  const content = document.getElementById(propertiesId);
  const header = content && content.previousElementSibling;
  const chevron = header && header.querySelector('.properties-chevron');
  
  if (content) {
    content.classList.toggle('collapsed');
    
    // Update chevron rotation
    if (chevron) {
      if (content.classList.contains('collapsed')) {
        chevron.style.transform = 'rotate(0deg)';
      } else {
        chevron.style.transform = 'rotate(90deg)';
      }
    }
  }
}
/**
 * Adaptive Navigation System for ObsidianP
 * Handles responsive navigation transitions between sidebar and pill views
 * Implements liquid glass design with smooth breakpoint transitions
 */

class AdaptiveNavigation {
  constructor() {
    this.pillContainer = document.getElementById('nav-pills-container');
    this.pillWrapper = document.getElementById('nav-pills-wrapper');
    this.sidebar = document.querySelector('.sidebar');
    this.sidebarToggle = document.getElementById('sidebar-toggle');
    this.currentBreakpoint = this.getBreakpoint();
    this.navigationItems = [];
    this.resizeTimeout = null;
    this.scrollTimeout = null;
    
    this.init();
  }
  
  init() {
    // Initialize responsive behavior
    this.setupResizeHandler();
    this.setupSidebarToggle();
    this.setupPillScrollIndicators();
    this.setupKeyboardNavigation();
    this.setupAccessibility();
    this.setupThemeToggle();
    
    // Wait for folder tree to be populated by app.js
    // We'll use a MutationObserver to detect when it's ready
    this.waitForFolderTree();
  }
  
  /**
   * Wait for folder tree to be populated, then initialize navigation
   */
  waitForFolderTree() {
    const folderTree = document.getElementById('folder-tree');
    if (!folderTree) {
      console.warn('AdaptiveNav: folder-tree element not found');
      return;
    }
    
    // Check if already populated
    if (folderTree.children.length > 0) {
      this.onFolderTreeReady();
      return;
    }
    
    // Wait for it to be populated
    const observer = new MutationObserver((mutations) => {
      if (folderTree.children.length > 0) {
        observer.disconnect();
        this.onFolderTreeReady();
      }
    });
    
    observer.observe(folderTree, { childList: true, subtree: true });
    
    // Fallback timeout
    setTimeout(() => {
      if (folderTree.children.length > 0) {
        observer.disconnect();
        this.onFolderTreeReady();
      } else {
        console.warn('AdaptiveNav: Folder tree not populated after timeout');
      }
    }, 2000);
  }
  
  /**
   * Called when folder tree is ready
   */
  onFolderTreeReady() {
    this.populateNavigation();
    this.handleBreakpointChange();
  }
  
  /**
   * Get current breakpoint based on window width
   */
  getBreakpoint() {
    const width = window.innerWidth;
    if (width < 480) return 'mobile-sm';
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
  
  /**
   * Setup window resize handler with debouncing
   */
  setupResizeHandler() {
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        const newBreakpoint = this.getBreakpoint();
        if (newBreakpoint !== this.currentBreakpoint) {
          this.currentBreakpoint = newBreakpoint;
          this.handleBreakpointChange();
        }
        this.updatePillScrollIndicators();
      }, 150);
    });
  }
  
  /**
   * Handle breakpoint changes
   */
  handleBreakpointChange() {
    const body = document.body;
    
    
    // Update body classes
    body.classList.remove('nav-mobile', 'nav-tablet', 'nav-desktop');
    
    if (this.currentBreakpoint === 'mobile' || this.currentBreakpoint === 'mobile-sm') {
      body.classList.add('nav-mobile', 'with-pill-nav');
      this.populatePillNavigation();
    } else if (this.currentBreakpoint === 'tablet') {
      body.classList.add('nav-tablet');
      body.classList.remove('with-pill-nav');
    } else {
      body.classList.add('nav-desktop');
      body.classList.remove('with-pill-nav');
    }
    
    // Announce change to screen readers
    this.announceNavigationMode();
  }
  
  /**
   * Populate navigation items from folder tree
   */
  populateNavigation() {
    const folderTree = document.getElementById('folder-tree');
    if (!folderTree) {
      console.warn('AdaptiveNav: folder-tree not found');
      return;
    }
    
    // Get all top-level items (folders and files)
    const topLevelItems = Array.from(folderTree.children);
    
    const items = [];
    
    topLevelItems.forEach(item => {
      if (item.classList.contains('folder-item')) {
        // It's a folder
        if (item.classList.contains('folder')) {
          // Top-level folder
          const folderName = item.querySelector('.folder-name');
          if (folderName) {
            const text = folderName.textContent.trim();
            const folderId = item.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
            
            // Find first file in this folder
            const folderId2 = folderId || `folder-${text.replace(/\//g, '-')}`;
            const folderContent = document.getElementById(folderId2);
            let href = '#';
            let isActive = false;
            
            if (folderContent) {
              const firstFile = folderContent.querySelector('.folder-item.file');
              if (firstFile) {
                const noteId = firstFile.getAttribute('data-note-id');
                href = noteId ? `${noteId}.html` : '#';
                isActive = firstFile.classList.contains('active');
              }
            }
            
            items.push({
              href,
              text,
              icon: null,
              isActive,
              isFolder: true
            });
          }
        } else if (item.classList.contains('file')) {
          // Top-level file
          const fileName = item.querySelector('.file-name');
          const noteId = item.getAttribute('data-note-id');
          if (fileName && noteId) {
            const text = fileName.textContent.trim();
            const href = `${noteId}.html`;
            const isActive = item.classList.contains('active');
            
            items.push({
              href,
              text,
              icon: null,
              isActive,
              isFolder: false
            });
          }
        }
      }
    });
    
    this.navigationItems = items;
  }
  
  /**
   * Populate pill navigation for mobile view
   */
  populatePillNavigation() {
    if (!this.pillWrapper) return;
    
    // Clear existing pills
    this.pillWrapper.innerHTML = '';
    
    // Create pills from navigation items
    this.navigationItems.forEach((item, index) => {
      const pill = document.createElement('a');
      pill.href = item.href;
      pill.className = `nav-pill ${item.isActive ? 'active' : ''}`;
      pill.setAttribute('role', 'tab');
      pill.setAttribute('aria-selected', item.isActive ? 'true' : 'false');
      pill.setAttribute('tabindex', item.isActive ? '0' : '-1');
      
      // Add icon if available
      if (item.icon) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'nav-pill-icon';
        iconSpan.innerHTML = item.icon;
        pill.appendChild(iconSpan);
      }
      
      // Add text
      const textSpan = document.createElement('span');
      textSpan.textContent = item.text;
      pill.appendChild(textSpan);
      
      // Add click handler
      pill.addEventListener('click', (e) => {
        this.handlePillClick(e, pill);
      });
      
      this.pillWrapper.appendChild(pill);
      
      // Add loaded class after a frame to prevent initial animation
      setTimeout(() => pill.classList.add('loaded'), 50 * (index + 1));
    });
    
    // Scroll active pill into view
    setTimeout(() => this.scrollActivePillIntoView(), 100);
    
    // Update scroll indicators
    this.updatePillScrollIndicators();
  }
  
  /**
   * Handle pill click
   */
  handlePillClick(e, pill) {
    // Update active states
    const pills = this.pillWrapper.querySelectorAll('.nav-pill');
    pills.forEach(p => {
      p.classList.remove('active');
      p.setAttribute('aria-selected', 'false');
      p.setAttribute('tabindex', '-1');
    });
    
    pill.classList.add('active');
    pill.setAttribute('aria-selected', 'true');
    pill.setAttribute('tabindex', '0');
    
    // Scroll into view
    this.scrollActivePillIntoView();
  }
  
  /**
   * Scroll active pill into view
   */
  scrollActivePillIntoView() {
    const activePill = this.pillWrapper?.querySelector('.nav-pill.active');
    if (!activePill) return;
    
    activePill.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  }
  
  /**
   * Setup theme toggle for pills navigation
   */
  setupThemeToggle() {
    const themeTogglePills = document.getElementById('theme-toggle-pills');
    if (themeTogglePills) {
      themeTogglePills.addEventListener('click', () => {
        // Trigger the main theme toggle (handled by app.js)
        const mainToggle = document.getElementById('theme-toggle') || 
                          document.getElementById('theme-toggle-desktop');
        if (mainToggle) {
          mainToggle.click();
        }
      });
    }
    
    // Setup graph button in pill nav - toggle ANY graph modal on/off
    const graphBtn = document.getElementById('nav-graph-btn');
    if (graphBtn) {
      graphBtn.addEventListener('click', () => {
        const localModal = document.getElementById('local-graph-modal');
        const globalModal = document.getElementById('global-graph-modal');

        // Check if ANY graph modal is visible
        const localVisible = localModal && !localModal.classList.contains('hidden');
        const globalVisible = globalModal && !globalModal.classList.contains('hidden');
        const anyModalVisible = localVisible || globalVisible;

        if (anyModalVisible) {
          // Close ALL graph modals using proper methods to update button states
          if (window.app) {
            window.app.hideGlobalGraphModal();
            window.app.hideLocalGraphModal();
          }
        } else {
          // Open the appropriate modal - trigger the expand graph button
          const expandGraph = document.getElementById('expand-graph');
          if (expandGraph) {
            expandGraph.click();
          }
        }
      });
    }
    
    // Setup graph button in sidebar - same behavior as pill nav button
    const sidebarGraphBtn = document.getElementById('sidebar-graph-toggle');
    if (sidebarGraphBtn) {
      sidebarGraphBtn.addEventListener('click', () => {
        const expandGraph = document.getElementById('expand-graph');
        if (expandGraph) {
          expandGraph.click();
        }
      });
    }
  }
  
  /**
   * Setup sidebar toggle button for tablet view
   */
  setupSidebarToggle() {
    if (!this.sidebar) return;

    if (this.sidebarToggle) {
      this.sidebarToggle.addEventListener('click', () => {
        this.sidebar.classList.toggle('expanded');

        // Update ARIA
        const isExpanded = this.sidebar.classList.contains('expanded');
        this.sidebarToggle.setAttribute('aria-expanded', isExpanded.toString());

        // Announce to screen readers
        const announcement = isExpanded ? 'Sidebar expanded' : 'Sidebar collapsed';
        this.announceToScreenReader(announcement);
      });
    }
    
    // Setup mobile menu button (in pill navigation) - toggle on/off
    const menuBtn = document.getElementById('nav-menu-btn');

    if (menuBtn) {
      console.log('AdaptiveNav: Menu button found, setting up click handler');
      menuBtn.addEventListener('click', (e) => {
        console.log('AdaptiveNav: Menu button clicked');
        e.preventDefault();
        e.stopPropagation();

        // Re-query sidebar in case it wasn't ready during initialization
        if (!this.sidebar) {
          this.sidebar = document.querySelector('.sidebar');
        }

        if (!this.sidebar) {
          console.error('Sidebar element not found');
          return;
        }

        const isOpen = this.sidebar.classList.contains('open');
        console.log('Sidebar is currently', isOpen ? 'open' : 'closed');

        if (isOpen) {
          // Close sidebar using proper method to update button state
          if (window.app) {
            window.app.closeMobileMenu();
            console.log('Closing sidebar');
          }
        } else {
          // Close any open graph modals using proper methods to update button states
          if (window.app) {
            window.app.hideGlobalGraphModal();
            window.app.hideLocalGraphModal();
          }

          // Open sidebar using proper method to update button state
          if (window.app) {
            window.app.openMobileMenu();
            console.log('Opening sidebar');
          }
        }
      });
    } else {
      console.warn('AdaptiveNav: Menu button (#nav-menu-btn) not found');
    }
  }
  
  /**
   * Setup scroll indicators for pill navigation
   */
  setupPillScrollIndicators() {
    if (!this.pillContainer) return;
    
    this.pillContainer.addEventListener('scroll', () => {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.updatePillScrollIndicators();
      }, 50);
    });
  }
  
  /**
   * Update pill scroll indicators
   */
  updatePillScrollIndicators() {
    if (!this.pillContainer || !this.pillWrapper) return;
    
    const container = this.pillContainer;
    const hasScrollLeft = container.scrollLeft > 10;
    const hasScrollRight = 
      container.scrollLeft < (container.scrollWidth - container.clientWidth - 10);
    
    container.classList.toggle('has-scroll-left', hasScrollLeft);
    container.classList.toggle('has-scroll-right', hasScrollRight);
  }
  
  /**
   * Setup keyboard navigation
   */
  setupKeyboardNavigation() {
    // Handle arrow key navigation in pill bar
    if (this.pillWrapper) {
      this.pillWrapper.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        
        const pills = Array.from(this.pillWrapper.querySelectorAll('.nav-pill'));
        const currentIndex = pills.findIndex(p => p === document.activeElement);
        
        if (currentIndex === -1) return;
        
        e.preventDefault();
        
        let nextIndex;
        if (e.key === 'ArrowLeft') {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : pills.length - 1;
        } else {
          nextIndex = currentIndex < pills.length - 1 ? currentIndex + 1 : 0;
        }
        
        const nextPill = pills[nextIndex];
        nextPill.focus();
        
        // Update tabindex
        pills.forEach((p, i) => {
          p.setAttribute('tabindex', i === nextIndex ? '0' : '-1');
        });
      });
    }
    
    // Handle Enter/Space on pills
    if (this.pillWrapper) {
      this.pillWrapper.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (!e.target.classList.contains('nav-pill')) return;
        
        e.preventDefault();
        e.target.click();
      });
    }
  }
  
  /**
   * Setup accessibility features
   */
  setupAccessibility() {
    // Add ARIA landmarks
    if (this.pillContainer) {
      this.pillContainer.setAttribute('role', 'navigation');
      this.pillContainer.setAttribute('aria-label', 'Main navigation');
    }
    
    // Add ARIA to sidebar toggle
    if (this.sidebarToggle) {
      this.sidebarToggle.setAttribute('aria-expanded', 'false');
    }
    
    // Create live region for announcements
    if (!document.getElementById('nav-announcer')) {
      const announcer = document.createElement('div');
      announcer.id = 'nav-announcer';
      announcer.className = 'sr-only';
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(announcer);
    }
  }
  
  /**
   * Announce navigation mode change to screen readers
   */
  announceNavigationMode() {
    let message = '';
    switch (this.currentBreakpoint) {
      case 'mobile':
      case 'mobile-sm':
        message = 'Switched to mobile pill navigation';
        break;
      case 'tablet':
        message = 'Switched to tablet collapsed sidebar';
        break;
      case 'desktop':
        message = 'Switched to desktop sidebar navigation';
        break;
    }
    
    if (message) {
      this.announceToScreenReader(message);
    }
  }
  
  /**
   * Announce message to screen readers
   */
  announceToScreenReader(message) {
    const announcer = document.getElementById('nav-announcer');
    if (!announcer) return;
    
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  }
  
  /**
   * Refresh navigation (called when navigation items change)
   */
  refresh() {
    this.populateNavigation();
    if (this.currentBreakpoint === 'mobile' || this.currentBreakpoint === 'mobile-sm') {
      this.populatePillNavigation();
    }
  }
  
  /**
   * Update active state (called when page changes)
   */
  updateActiveState(href) {
    // Update navigation items
    this.navigationItems.forEach(item => {
      item.isActive = item.href === href;
    });
    
    // Update pills if in mobile view
    if (this.currentBreakpoint === 'mobile' || this.currentBreakpoint === 'mobile-sm') {
      const pills = this.pillWrapper?.querySelectorAll('.nav-pill');
      pills?.forEach(pill => {
        const isActive = pill.getAttribute('href') === href;
        pill.classList.toggle('active', isActive);
        pill.setAttribute('aria-selected', isActive ? 'true' : 'false');
        pill.setAttribute('tabindex', isActive ? '0' : '-1');
      });
      
      this.scrollActivePillIntoView();
    }
  }
}

// Initialize adaptive navigation when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.adaptiveNav = new AdaptiveNavigation();
  });
} else {
  window.adaptiveNav = new AdaptiveNavigation();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdaptiveNavigation;
}
