// Main application class
class ObsidianSSGApp {
  constructor() {
    this.notes = new Map();
    this.bases = new Map();
    this.linkGraph = new Map();
    this.categories = new Map();
    this.folderStructure = [];
    this.currentNote = null;
    this.currentBase = null;
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
      // Check if it's a base first
      if (this.bases.has(noteId)) {
        this.loadBase(noteId);
      } else {
        this.loadNote(noteId);
      }
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
        this.bases = new Map(Object.entries(data.bases || {}));
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
    this.setupExpandCollapseAll();
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
        const isExpanded = false; // All folders collapsed by default
        
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
        // File node - check if it's a base or regular note
        const isBase = this.bases.has(node.noteId);
        const iconSvg = isBase 
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9l7-6z"></path><polyline points="12,3 12,9 19,9"></polyline></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline></svg>';
        
        html += `
          <div class="folder-item file ${isBase ? 'base-file' : ''}" data-note-id="${node.noteId}" data-is-base="${isBase}">
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
      const frontMatterHtml = note.frontMatterHtml || '';
      noteContent.innerHTML = `
        <h1 class="note-title">${note.title}</h1>
        ${frontMatterHtml}
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
  
  loadBase(baseId, addToHistory = true) {
    const base = this.bases.get(baseId);
    if (!base) {
      console.warn(`Base not found: ${baseId}`);
      return;
    }
    
    this.currentBase = base;
    this.currentNote = null; // Clear current note
    
    // Update URL and history - keep base URLs clean without query parameters
    if (addToHistory) {
      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.pushState({ baseId }, base.title, cleanUrl);
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
      noteContent.innerHTML = this.renderBaseView(base);
      
      // Initialize base interactions
      this.initializeBaseInteractions(base);
    }
    
    // Update active state in sidebar
    this.updateSidebarActiveState(baseId);
    
    // Scroll to top
    if (noteContent) {
      noteContent.scrollTop = 0;
    }
  }
  
  renderBaseView(base) {
    const defaultView = base.views[0] || { type: 'table', name: 'Default' };
    const viewButtons = base.views.map(view => 
        `<button class="view-button ${view === defaultView ? 'active' : ''}" data-view-type="${view.type}" data-view-name="${view.name}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${view.type === 'cards' ? 
                  '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>' :
                  '<path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9l7-6z"></path><polyline points="12,3 12,9 19,9"></polyline>'
                }
            </svg>
            ${view.name}
        </button>`
    ).join('');

    return `<div class="base-header">
        <h1 class="base-title">${base.title}</h1>
        <div class="base-controls">
            <div class="view-switcher">
                ${viewButtons}
            </div>
            <div class="base-actions">
                <button class="action-button" id="sort-button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="m3 16 4 4 4-4"></path><path d="M7 20V4"></path><path d="m21 8-4-4-4 4"></path><path d="M17 4v16"></path>
                    </svg>
                    Sort
                </button>
                <button class="action-button" id="filter-button">
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
    const notes = matchedNoteIds.map(id => this.notes.get(id)).filter(note => note);
    
    if (notes.length === 0) {
        return '<div class="empty-base">No items found</div>';
    }

    switch (view.type) {
        case 'table':
            return this.renderTableView(notes, view);
        case 'cards':
            return this.renderCardsView(notes, view);
        case 'calendar':
            return this.renderCalendarView(notes, view);
        case 'gallery':
            return this.renderGalleryView(notes, view);
        default:
            return this.renderTableView(notes, view);
    }
  }
  
  renderCardsView(notes, view) {
    const cardsHtml = notes.map(note => {
        const tags = note.frontMatter?.tags || [];
        const tagList = Array.isArray(tags) ? tags : [tags];
        const tagsHtml = tagList.map(tag => `<span class="tag">${tag}</span>`).join('');
        
        return `<div class="card" data-note-id="${note.id}">
            <div class="card-header">
                <h3 class="card-title">
                    <a href="${note.id}.html" class="internal-link">${note.title}</a>
                </h3>
            </div>
            <div class="card-content">
                <div class="card-meta">
                    ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
                </div>
                ${note.content && note.content.length > 200 
                    ? `<div class="card-preview">${note.content.substring(0, 200)}...</div>`
                    : `<div class="card-preview">${note.content || ''}</div>`
                }
            </div>
        </div>`;
    }).join('');
    
    return `<div class="cards-view">
        <div class="cards-container">
            ${cardsHtml}
        </div>
    </div>`;
  }
  
  renderTableView(notes, view) {
    if (notes.length === 0) {
        return '<div class="table-view"><p class="empty-state">No notes match the current filters.</p></div>';
    }

    // Determine columns to show
    const columns = view.order || ['file.name', 'file.tags', 'file.mtime'];
    
    const headerHtml = columns.map(col => {
        const columnName = this.getColumnDisplayName(col);
        return `<th data-column="${col}" class="sortable">
            ${columnName}
            <span class="sort-indicator">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m3 16 4 4 4-4"></path><path d="M7 20V4"></path><path d="m21 8-4-4-4 4"></path><path d="M17 4v16"></path>
                </svg>
            </span>
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

  renderGalleryView(notes, view) {
    if (notes.length === 0) return '<div class="empty-state">No notes match the current filters</div>';

    const cardsHtml = notes.map(note => {
        // Look for image in frontmatter
        let imageUrl = note.frontMatter?.image || note.frontMatter?.cover;
        let imageHtml = '';
        
        if (imageUrl) {
            imageHtml = `<div class="gallery-image">
                <img src="${imageUrl}" alt="${note.title}" loading="lazy" />
            </div>`;
        } else {
            // Fallback placeholder
            imageHtml = `<div class="gallery-image placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                </svg>
            </div>`;
        }
        
        return `<div class="gallery-card" data-note-id="${note.id}">
            ${imageHtml}
            <div class="gallery-card-content">
                <h3 class="gallery-card-title">${note.title}</h3>
                ${note.frontMatter?.description ? 
                    `<p class="gallery-card-description">${note.frontMatter.description}</p>` : 
                    ''
                }
                <div class="gallery-card-meta">
                    <span class="gallery-card-date">${new Date(note.frontMatter?.created || '').toLocaleDateString()}</span>
                </div>
            </div>
        </div>`;
    }).join('');

    return `<div class="gallery-view">
        <div class="gallery-grid">
            ${cardsHtml}
        </div>
    </div>`;
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
            return `<a href="${note.id}.html" class="internal-link">${note.title}</a>`;
        
        case 'file.path':
            return note.relativePath || '';
        
        case 'file.tags':
            const tags = note.frontMatter?.tags || [];
            const tagList = Array.isArray(tags) ? tags : [tags];
            return tagList.map(tag => `<span class="tag">${tag}</span>`).join('');
        
        case 'file.mtime':
        case 'file.ctime':
            // For client-side, we don't have direct file stats
            // Could be added to note data if needed
            return '';
        
        default:
            // Custom property from frontmatter
            const value = note.frontMatter?.[column];
            if (value === undefined || value === null) return '';
            if (Array.isArray(value)) return value.join(', ');
            return String(value);
    }
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
    
    // Table row clicks
    const tableRows = document.querySelectorAll('.clickable-row');
    tableRows.forEach(row => {
      row.addEventListener('click', (e) => {
        const noteId = e.currentTarget.dataset.noteId;
        if (noteId) {
          window.location.href = `${noteId}.html`;
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

    // Gallery card clicks
    const galleryCards = document.querySelectorAll('.gallery-card');
    galleryCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const noteId = e.currentTarget.dataset.noteId;
        if (noteId) {
          window.location.href = `${noteId}.html`;
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
          window.location.href = `${noteId}.html`;
        }
      });
    });
  }
  
  switchBaseView(base, view) {
    const baseContent = document.getElementById('base-content');
    if (baseContent) {
      baseContent.innerHTML = this.renderBaseViewContent(base, view);
      this.initializeBaseInteractions(base);
    }
  }
  
  sortBaseByColumn(base, column) {
    // This is a simplified version - in a full implementation,
    // you'd maintain sort state and update the backend data
    console.log(`Sorting base by column: ${column}`);
    // For now, just log the action
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
  console.log('toggleEmbed called with:', embedId); // Debug log
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
    const isCurrentlyFixedHeight = embedElement.classList.contains('fixed-height');
    
    embedElement.classList.toggle('fixed-height');
    
    // Update the icon based on new state
    if (isCurrentlyFixedHeight) {
      // Now maximized, show minimize icon (minimize-2)
      maximizeButtonSvg.innerHTML = `
        <polyline points="4,14 10,14 10,20"></polyline>
        <polyline points="20,10 14,10 14,4"></polyline>
        <line x1="14" y1="10" x2="21" y2="3"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      `;
    } else {
      // Now fixed height, show maximize icon (maximize-2)  
      maximizeButtonSvg.innerHTML = `
        <polyline points="15,3 21,3 21,9"></polyline>
        <polyline points="9,21 3,21 3,15"></polyline>
        <line x1="21" y1="3" x2="14" y2="10"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      `;
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
