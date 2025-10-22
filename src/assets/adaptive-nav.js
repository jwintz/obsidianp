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
    
    // Setup graph button in pill nav - toggle on mobile
    const graphBtn = document.getElementById('nav-graph-btn');
    if (graphBtn) {
      graphBtn.addEventListener('click', () => {
        const localModal = document.getElementById('local-graph-modal');
        
        if (localModal) {
          // Check if modal is visible
          const isVisible = !localModal.classList.contains('hidden');
          
          if (isVisible) {
            // Close the modal
            localModal.classList.add('hidden');
            document.body.style.overflow = '';
          } else {
            // Open the modal - trigger the expand graph button
            const expandGraph = document.getElementById('expand-graph');
            if (expandGraph) {
              expandGraph.click();
            }
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
    if (!this.sidebarToggle || !this.sidebar) return;
    
    this.sidebarToggle.addEventListener('click', () => {
      this.sidebar.classList.toggle('expanded');
      
      // Update ARIA
      const isExpanded = this.sidebar.classList.contains('expanded');
      this.sidebarToggle.setAttribute('aria-expanded', isExpanded.toString());
      
      // Announce to screen readers
      const announcement = isExpanded ? 'Sidebar expanded' : 'Sidebar collapsed';
      this.announceToScreenReader(announcement);
    });
    
    // Setup mobile menu button (in pill navigation) - toggle on/off
    const menuBtn = document.getElementById('nav-menu-btn');
    
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        const isOpen = this.sidebar.classList.contains('open');
        
        if (isOpen) {
          // Close sidebar
          this.sidebar.classList.remove('open');
        } else {
          // Close any open graph modals
          const globalGraphModal = document.getElementById('global-graph-modal');
          const localGraphModal = document.getElementById('local-graph-modal');
          if (globalGraphModal && !globalGraphModal.classList.contains('hidden')) {
            globalGraphModal.classList.add('hidden');
          }
          if (localGraphModal && !localGraphModal.classList.contains('hidden')) {
            localGraphModal.classList.add('hidden');
          }
          
          // Open sidebar
          this.sidebar.classList.add('open');
        }
      });
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
