import * as lucideIcons from 'lucide-static';
import { Base, BaseView, Note } from './types';

/**
 * Generate a Lucide icon SVG
 */
export function getLucideIcon(iconName: string, size = 16, className = ''): string {
    const iconSvg = (lucideIcons as any)[iconName];
    if (!iconSvg) {
        console.warn(`Lucide icon '${iconName}' not found`);
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="${className}"></svg>`;
    }

    // Replace default attributes with our custom ones
    return iconSvg
        .replace(/width="[^"]*"/, `width="${size}"`)
        .replace(/height="[^"]*"/, `height="${size}"`)
        .replace(/class="[^"]*"/, className ? `class="${className}"` : '')
        .replace(/<svg/, className && !iconSvg.includes('class=') ? `<svg class="${className}"` : '<svg');
}

export function generateMainTemplate(title: string = "Vault"): string {
    return generateTemplate(title, `
        <article class="note-content" id="note-content">
            <h1>Welcome to your Obsidian vault</h1>
            <p>Select a note from the sidebar to get started.</p>
            
            <aside class="backlinks-panel" id="backlinks-panel">
                <div id="backlinks-content"></div>
            </aside>
        </article>
    `);
}

export function generateBaseHTML(base: Base, vaultTitle: string = "Vault", markdownProcessor?: any): string {
    const baseContent = generateBaseTemplate(base, markdownProcessor);
    // Generate page title as "Base Title - Vault Title"
    const pageTitle = `${base.title} - ${vaultTitle}`;

    return generateTemplate(pageTitle, `
        <article class="note-content base-page" id="note-content">
            ${baseContent}
        </article>
    `);
}

export function generateNoteHTML(noteContent: string, vaultTitle: string = "Vault", noteTitle?: string): string {
    // Generate page title as "Note Title - Vault Title" or just "Vault Title" if no note title
    const pageTitle = noteTitle ? `${noteTitle} - ${vaultTitle}` : vaultTitle;

    return generateTemplate(pageTitle, `
        <article class="note-content" id="note-content">
            ${noteContent}
        </article>
    `);
}

function generateTemplate(title: string, mainContent: string): string {
    // const timestamp = Date.now(); // Cache busting disabled for development
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="/assets/main.css">
    <link rel="stylesheet" href="/assets/katex.min.css">
</head>

<body class="theme-light" data-theme="light">
    <div class="app-container">
        <div class="sidebar-overlay" id="sidebar-overlay"></div>
        
        <!-- Mobile header - outside sidebar for always visible -->
        <header class="mobile-header" id="mobile-header">
            <div class="mobile-header-content">
                <button id="mobile-menu-toggle" class="mobile-menu-toggle" title="Toggle navigation">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
                <h1 class="vault-title">${title}</h1>
                <div class="mobile-header-controls">
                    <button id="theme-toggle" class="icon-button" title="Toggle theme">
                        ${getLucideIcon('Sun', 16)}
                    </button>
                </div>
            </div>
        </header>
        
        <nav class="sidebar">
            <div class="sidebar-header">
                <div class="sidebar-title-section">
                    <h1 class="vault-title">${title}</h1>
                </div>
                <div class="sidebar-controls">
                    <button id="theme-toggle-desktop" class="icon-button" title="Toggle theme">
                        ${getLucideIcon('Sun', 16)}
                    </button>
                </div>
            </div>
            
            <div class="search-container">
                <input type="text" id="search-input" placeholder="Search notes..." autocomplete="off">
                <div id="search-results" class="search-results hidden"></div>
            </div>
            
            <div class="sidebar-content">
                <div class="nav-section">
                    <div class="nav-section-header">
                        <h3>Files</h3>
                        <button id="expand-collapse-all" class="icon-button expand-collapse-button" title="Expand all folders">
                            ${getLucideIcon('TableOfContents', 14)}
                        </button>
                    </div>
                    <div id="folder-tree" class="folder-tree"></div>
                </div>
            </div>
        </nav>
        
        <main class="main-content">
            <div class="content-wrapper">
                ${mainContent}
            </div>
            <aside class="right-sidebar" id="right-sidebar">
                <div class="right-sidebar-section">
                    <div class="right-sidebar-header">
                        <h3>Interactive Graph</h3>
                        <div class="graph-controls">
                            <button id="expand-graph" class="icon-button graph-expand-btn" title="Expand graph">
                                ${getLucideIcon('Maximize2', 14)}
                            </button>
                        </div>
                    </div>
                    <div class="mini-graph-container" id="mini-graph-container"></div>
                </div>
                
                <div class="right-sidebar-section">
                    <div class="right-sidebar-header">
                        <h3>On This Page</h3>
                    </div>
                    <div class="table-of-contents" id="table-of-contents">
                        <div class="toc-placeholder">No headings found</div>
                    </div>
                </div>
            </aside>
        </main>
        
        <!-- Graph Modal Popups -->
        <div class="graph-modal hidden" id="global-graph-modal">
            <div class="graph-modal-overlay" id="global-graph-overlay"></div>
            <div class="graph-modal-content">
                <div class="graph-modal-header">
                    <h3 id="global-graph-modal-title">Graph</h3>
                    <div class="graph-modal-controls">
                        <div class="view-switcher">
                            <button id="global-local-graph-toggle" class="view-button" data-mode="local">
                                ${getLucideIcon('Network', 16)}
                                <span>Local</span>
                            </button>
                            <button id="global-global-graph-toggle" class="view-button active" data-mode="global">
                                ${getLucideIcon('Globe', 16)}
                                <span>Global</span>
                            </button>
                        </div>
                    </div>
                    <button id="close-global-graph" class="icon-button">
                        ${getLucideIcon('X', 16)}
                    </button>
                </div>
                <div class="graph-modal-container" id="global-graph-container">
                    <div class="graph-parameter-panel graph-parameter-panel--global" aria-label="Graph display options (global view)">
                        <div class="graph-parameter-header">
                            <span class="graph-parameter-title">Display options</span>
                            <button type="button" class="graph-parameter-reset" id="global-graph-reset" title="Reset to defaults">
                                ${getLucideIcon('RotateCcw', 14)}
                                <span>Reset</span>
                            </button>
                        </div>
                        <div class="graph-parameter-section" aria-label="Link types">
                            <span class="graph-parameter-section-title">Link types</span>
                            <label class="graph-parameter-toggle">
                                <input type="checkbox" id="global-graph-links-toggle" checked>
                                <span>
                                    <strong>Links</strong>
                                    <small>(outgoing)</small>
                                </span>
                            </label>
                            <label class="graph-parameter-toggle">
                                <input type="checkbox" id="global-graph-backlinks-toggle" checked>
                                <span>
                                    <strong>Backlinks</strong>
                                    <small>(incoming)</small>
                                </span>
                            </label>
                            <label class="graph-parameter-toggle">
                                <input type="checkbox" id="global-graph-neighbors-toggle">
                                <span>
                                    <strong>Neighbors</strong>
                                    <small>(siblings)</small>
                                </span>
                            </label>
                        </div>
                        <div class="graph-parameter-section" aria-label="Additional nodes">
                            <label class="graph-parameter-toggle">
                                <input type="checkbox" id="global-graph-tags-toggle" checked>
                                <span>
                                    <strong>Tags</strong>
                                    <small>Include tag clusters</small>
                                </span>
                            </label>
                        </div>
                        <div class="graph-parameter-section" aria-label="Link styling">
                            <label class="graph-parameter-toggle">
                                <input type="checkbox" id="global-graph-arrows-toggle" checked>
                                <span>
                                    <strong>Arrows</strong>
                                    <small>Show direction of note links</small>
                                </span>
                            </label>
                        </div>
                    </div>
                    <div class="graph-canvas" id="global-graph-canvas"></div>
                </div>
            </div>
        </div>
        
        <div class="graph-modal hidden" id="local-graph-modal">
            <div class="graph-modal-overlay" id="local-graph-overlay"></div>
            <div class="graph-modal-content">
                <div class="graph-modal-header">
                    <h3 id="graph-modal-title">Graph</h3>
                    <div class="graph-modal-controls">
                        <div class="view-switcher">
                            <button id="local-graph-toggle" class="view-button active" data-mode="local">
                                ${getLucideIcon('Network', 16)}
                                <span>Local</span>
                            </button>
                            <button id="global-graph-toggle" class="view-button" data-mode="global">
                                ${getLucideIcon('Globe', 16)}
                                <span>Global</span>
                            </button>
                        </div>
                    </div>
                    <button id="close-local-graph" class="icon-button">
                        ${getLucideIcon('X', 16)}
                    </button>
                </div>
                <div class="graph-modal-container" id="local-graph-container">
                    <div class="graph-parameter-panel" id="local-graph-parameters" aria-label="Local graph display options">
                        <div class="graph-parameter-header">
                            <span class="graph-parameter-title">Display options</span>
                            <button type="button" class="graph-parameter-reset" id="local-graph-reset" title="Reset to defaults">
                                ${getLucideIcon('RotateCcw', 14)}
                                <span>Reset</span>
                            </button>
                        </div>
                        <div class="graph-parameter-section" aria-label="Link types">
                            <span class="graph-parameter-section-title">Link types</span>
                            <label class="graph-parameter-toggle">
                                <input type="checkbox" id="local-graph-links-toggle" checked>
                                <span>
                                    <strong>Links</strong>
                                    <small>(outgoing)</small>
                                </span>
                            </label>
                            <label class="graph-parameter-toggle">
                                <input type="checkbox" id="local-graph-backlinks-toggle">
                                <span>
                                    <strong>Backlinks</strong>
                                    <small>(incoming)</small>
                                </span>
                            </label>
                            <label class="graph-parameter-toggle">
                                <input type="checkbox" id="local-graph-neighbors-toggle" checked>
                                <span>
                                    <strong>Neighbors</strong>
                                    <small>(siblings)</small>
                                </span>
                            </label>
                        </div>
                        <div class="graph-parameter-section" aria-label="Traversal depth">
                            <span class="graph-parameter-section-title">Depth</span>
                            <div class="graph-parameter-depth">
                                <input type="range" id="local-graph-depth" min="1" max="5" step="1" value="1" aria-valuemin="1" aria-valuemax="5" aria-valuenow="1">
                                <span class="graph-parameter-depth-value" id="local-graph-depth-value">1</span>
                            </div>
                        </div>
                        <div class="graph-parameter-section" aria-label="Additional nodes">
                            <label class="graph-parameter-toggle">
                                <input type="checkbox" id="local-graph-tags-toggle" checked>
                                <span>
                                    <strong>Tags</strong>
                                    <small>(shared tag groups)</small>
                                </span>
                            </label>
                            <label class="graph-parameter-toggle">
                                <input type="checkbox" id="local-graph-arrows-toggle" checked>
                                <span>
                                    <strong>Arrows</strong>
                                    <small>(show direction)</small>
                                </span>
                            </label>
                        </div>
                    </div>
                    <div class="graph-canvas" id="local-graph-canvas"></div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="/assets/abcjs-basic-min.js"></script>
    <script src="/assets/mermaid.min.js"></script>
    <script>
        // Global Mermaid Diagram Initialization
        
        window.initializeMermaid = function() {
            console.log('=== MERMAID INIT STARTED ===');
            console.log('typeof mermaid:', typeof mermaid);
            console.log('document.readyState:', document.readyState);
            
            if (typeof mermaid === 'undefined') {
                console.error('Mermaid library not available');
                return;
            }
            
            // Get current theme - check BOTH body and documentElement
            const isDarkTheme = document.body.getAttribute('data-theme') === 'dark' || 
                               document.documentElement.getAttribute('data-theme') === 'dark';
            console.log('=== THEME DETECTION ===');
            console.log('isDarkTheme:', isDarkTheme);
            console.log('body data-theme:', document.body.getAttribute('data-theme'));
            console.log('documentElement data-theme:', document.documentElement.getAttribute('data-theme'));
            
            // Configure Mermaid with BASE theme for full control
            const themeConfig = isDarkTheme ? {
                theme: 'base',
                themeVariables: {
                    // CRITICAL: Set dark mode flag
                    darkMode: true,
                    
                    // Base colors - use dark backgrounds
                    primaryColor: '#374151',
                    primaryTextColor: '#ffffff',
                    primaryBorderColor: '#8b5cf6',
                    
                    secondaryColor: '#4b5563',
                    secondaryTextColor: '#ffffff',
                    secondaryBorderColor: '#8b5cf6',
                    
                    tertiaryColor: '#1f2937',
                    tertiaryTextColor: '#ffffff',
                    tertiaryBorderColor: '#6b7280',
                    
                    // Critical: Main backgrounds
                    background: '#1e1e1e',
                    mainBkg: '#374151',
                    secondBkg: '#4b5563',
                    tertiaryBkg: '#1f2937',
                    
                    // Lines and text
                    lineColor: '#9ca3af',
                    textColor: '#ffffff',
                    
                    // Borders
                    border1: '#6b7280',
                    border2: '#9ca3af',
                    
                    // Arrows
                    arrowheadColor: '#9ca3af',
                    
                    // Flowchart
                    nodeBkg: '#374151',
                    nodeTextColor: '#ffffff',
                    nodeBorder: '#8b5cf6',
                    clusterBkg: '#1f2937',
                    clusterBorder: '#6b7280',
                    defaultLinkColor: '#9ca3af',
                    titleColor: '#ffffff',
                    edgeLabelBackground: '#1e1e1e',
                    
                    // Class diagram - CRITICAL
                    classText: '#ffffff',
                    
                    // State diagram
                    labelColor: '#ffffff',
                    
                    // Sequence diagram
                    actorBkg: '#374151',
                    actorBorder: '#8b5cf6',
                    actorTextColor: '#ffffff',
                    actorLineColor: '#6b7280',
                    signalColor: '#9ca3af',
                    signalTextColor: '#ffffff',
                    labelBoxBkgColor: '#1e1e1e',
                    labelBoxBorderColor: '#6b7280',
                    labelTextColor: '#ffffff',
                    loopTextColor: '#ffffff',
                    noteBkgColor: '#4b5563',
                    noteTextColor: '#ffffff',
                    noteBorderColor: '#8b5cf6',
                    activationBkgColor: '#8b5cf6',
                    activationBorderColor: '#a78bfa',
                    sequenceNumberColor: '#ffffff',
                    
                    // Gantt
                    gridColor: '#4b5563',
                    doneTaskBkgColor: '#6b7280',
                    doneTaskBorderColor: '#9ca3af',
                    activeTaskBkgColor: '#8b5cf6',
                    activeTaskBorderColor: '#a78bfa',
                    taskTextColor: '#ffffff',
                    taskTextOutsideColor: '#ffffff',
                    taskTextLightColor: '#ffffff',
                    taskTextDarkColor: '#ffffff',
                    taskTextClickableColor: '#ffffff',
                    todayLineColor: '#ef4444',
                    sectionBkgColor: '#262626',
                    sectionBkgColor2: '#374151',
                    altSectionBkgColor: '#1f2937',
                    altBackgroundColor: '#1f2937',
                    
                    // ER diagram
                    attributeBackgroundColorOdd: '#374151',
                    attributeBackgroundColorEven: '#1f2937',
                    
                    // Git
                    git0: '#8b5cf6',
                    git1: '#a78bfa',
                    git2: '#c4b5fd',
                    git3: '#ddd6fe',
                    gitInv0: '#ffffff',
                    gitInv1: '#ffffff',
                    gitInv2: '#1e1e1e',
                    gitInv3: '#1e1e1e',
                    commitLabelColor: '#ffffff',
                    commitLabelBackground: '#374151',
                    tagLabelColor: '#ffffff',
                    tagLabelBackground: '#8b5cf6',
                    tagLabelBorder: '#a78bfa',
                    
                    // Font
                    fontFamily: 'var(--font-family-main)',
                    fontSize: '14px',
                }
            } : {
                theme: 'base',
                themeVariables: {
                    // Base colors  
                    primaryColor: '#f9fafb',
                    primaryTextColor: '#1e1e1e',
                    primaryBorderColor: '#8b5cf6',
                    
                    secondaryColor: '#f3f4f6',
                    secondaryTextColor: '#1e1e1e',
                    secondaryBorderColor: '#8b5cf6',
                    
                    tertiaryColor: '#e5e7eb',
                    tertiaryTextColor: '#1e1e1e',
                    tertiaryBorderColor: '#9ca3af',
                    
                    // Critical: Main backgrounds
                    background: '#ffffff',
                    mainBkg: '#f9fafb',
                    secondBkg: '#f3f4f6',
                    tertiaryBkg: '#e5e7eb',
                    
                    // Lines and text
                    lineColor: '#9ca3af',
                    textColor: '#1e1e1e',
                    
                    // Borders
                    border1: '#d1d5db',
                    border2: '#9ca3af',
                    
                    // Arrows
                    arrowheadColor: '#6b7280',
                    
                    // Flowchart
                    nodeBkg: '#f9fafb',
                    nodeTextColor: '#1e1e1e',
                    nodeBorder: '#8b5cf6',
                    clusterBkg: '#f3f4f6',
                    clusterBorder: '#9ca3af',
                    defaultLinkColor: '#6b7280',
                    titleColor: '#1e1e1e',
                    edgeLabelBackground: '#ffffff',
                    
                    // Class diagram
                    classText: '#1e1e1e',
                    
                    // State diagram
                    labelColor: '#1e1e1e',
                    
                    // Sequence diagram
                    actorBkg: '#f3f4f6',
                    actorBorder: '#8b5cf6',
                    actorTextColor: '#1e1e1e',
                    actorLineColor: '#d1d5db',
                    signalColor: '#6b7280',
                    signalTextColor: '#1e1e1e',
                    labelBoxBkgColor: '#ffffff',
                    labelBoxBorderColor: '#d1d5db',
                    labelTextColor: '#1e1e1e',
                    loopTextColor: '#1e1e1e',
                    noteBkgColor: '#fef3c7',
                    noteTextColor: '#1e1e1e',
                    noteBorderColor: '#d97706',
                    activationBkgColor: '#8b5cf6',
                    activationBorderColor: '#a78bfa',
                    sequenceNumberColor: '#ffffff',
                    
                    // Gantt
                    gridColor: '#d1d5db',
                    doneTaskBkgColor: '#d1d5db',
                    doneTaskBorderColor: '#9ca3af',
                    activeTaskBkgColor: '#8b5cf6',
                    activeTaskBorderColor: '#a78bfa',
                    taskTextColor: '#1e1e1e',
                    taskTextOutsideColor: '#1e1e1e',
                    taskTextLightColor: '#1e1e1e',
                    taskTextDarkColor: '#ffffff',
                    taskTextClickableColor: '#1e1e1e',
                    todayLineColor: '#ef4444',
                    sectionBkgColor: '#ffffff',
                    sectionBkgColor2: '#f3f4f6',
                    altSectionBkgColor: '#f9fafb',
                    altBackgroundColor: '#f9fafb',
                    
                    // ER diagram
                    attributeBackgroundColorOdd: '#f9fafb',
                    attributeBackgroundColorEven: '#f3f4f6',
                    
                    // Git
                    git0: '#8b5cf6',
                    git1: '#a78bfa',
                    git2: '#c4b5fd',
                    git3: '#ddd6fe',
                    gitInv0: '#ffffff',
                    gitInv1: '#ffffff',
                    gitInv2: '#1e1e1e',
                    gitInv3: '#1e1e1e',
                    commitLabelColor: '#1e1e1e',
                    commitLabelBackground: '#f3f4f6',
                    tagLabelColor: '#ffffff',
                    tagLabelBackground: '#8b5cf6',
                    tagLabelBorder: '#a78bfa',
                    
                    // Font
                    fontFamily: 'var(--font-family-main)',
                    fontSize: '14px',
                }
            };
            
            mermaid.initialize({
                startOnLoad: false,
                ...themeConfig,
                flowchart: {
                    useMaxWidth: true,
                    htmlLabels: true,
                    curve: 'basis',
                    padding: 20,
                },
                sequence: {
                    useMaxWidth: true,
                    wrap: true,
                    diagramMarginX: 50,
                    diagramMarginY: 10,
                    boxMargin: 10,
                    boxTextMargin: 5,
                    noteMargin: 10,
                    messageMargin: 35,
                },
                gantt: {
                    useMaxWidth: true,
                    leftPadding: 75,
                    gridLineStartPadding: 35,
                    fontSize: 14,
                    numberSectionStyles: 4,
                },
                class: {
                    useMaxWidth: true,
                },
                state: {
                    useMaxWidth: true,
                },
                er: {
                    useMaxWidth: true,
                },
                pie: {
                    useMaxWidth: true,
                },
                git: {
                    useMaxWidth: true,
                },
                securityLevel: 'loose',
            });
            console.log('Mermaid initialized with', isDarkTheme ? 'dark' : 'light', 'theme');
            
            // Find all mermaid diagrams
            const mermaidElements = document.querySelectorAll('.mermaid');
            console.log('Found', mermaidElements.length, 'Mermaid diagram elements');
            
            // Render all diagrams
            if (mermaidElements.length > 0) {
                console.log('Calling mermaid.run()...');
                mermaid.run({
                    querySelector: '.mermaid'
                }).then(() => {
                    console.log('Mermaid rendering completed successfully');
                }).catch(error => {
                    console.error('Mermaid rendering error:', error);
                });
            } else {
                console.warn('No Mermaid elements found to render!');
            }
        };
        
        // Re-initialize Mermaid when theme changes
        window.addEventListener('themechange', function() {
            console.log('=== THEME CHANGE EVENT ===');
            console.log('Theme changed, re-initializing Mermaid diagrams');
            
            // Helper function to decode HTML entities
            function decodeHtml(html) {
                const txt = document.createElement('textarea');
                txt.innerHTML = html;
                return txt.value;
            }
            
            // Clear all existing SVG renders and restore original code
            document.querySelectorAll('.mermaid').forEach(el => {
                // Find and remove the SVG
                const svg = el.querySelector('svg');
                if (svg) {
                    console.log('Removing SVG from element:', el.id);
                    svg.remove();
                }
                
                // Remove Mermaid-added attributes to force complete re-render
                el.removeAttribute('data-processed');
                
                // Restore original Mermaid code from data attribute (decode HTML entities)
                const encodedContent = el.getAttribute('data-diagram');
                if (encodedContent) {
                    const decodedContent = decodeHtml(encodedContent);
                    console.log('Restoring original content for:', el.id);
                    el.textContent = decodedContent;
                } else {
                    console.warn('No original content found for:', el.id);
                }
            });
            
            // CRITICAL: Wait for DOM cleanup and theme application
            setTimeout(() => {
                console.log('Calling initializeMermaid after theme change');
                window.initializeMermaid();
            }, 150);
        });
        
        // Wait for window load event to ensure all DOM is parsed
        window.addEventListener('load', window.initializeMermaid);
        
        // Global ABC Music Notation Initialization
        
        window.initializeABCNotation = function(containerId) {
            const ABCJS = window.ABCJS || window.abcjs || window.Abc;
            if (!ABCJS) {
                console.error('ABCJS library not available');
                return;
            }
            
            const container = document.getElementById(containerId);
            if (!container) {
                console.error('ABC container not found:', containerId);
                return;
            }
            
            // Get data from container attributes
            const sourceData = container.getAttribute('data-abc-source');
            const optionsData = container.getAttribute('data-abc-options');
            
            if (!sourceData) {
                console.error('ABC source data not found for container:', containerId);
                return;
            }
            
            // Decode base64 and parse JSON
            let source;
            let options = {};
            
            try {
                source = JSON.parse(atob(sourceData));
            } catch (e) {
                console.error('Failed to decode/parse ABC source for container:', containerId, e);
                return;
            }
            
            if (optionsData) {
                try {
                    options = JSON.parse(atob(optionsData));
                } catch (e) {
                    console.error('Failed to decode/parse ABC options for container:', containerId, e);
                }
            }
            
            console.log('Initializing ABC notation for container:', containerId);
            
            // Clear loading message
            container.innerHTML = '';
            
            const defaultOptions = {
                add_classes: true,
                responsive: 'resize'
            };
            
            try {
                // Render the ABC notation (source is already parsed from JSON)
                const renderResp = ABCJS.renderAbc(container, source, Object.assign({}, defaultOptions, options));
                console.log('ABC rendered successfully for container:', containerId);
                
                // Set up MIDI playback if available
                if (renderResp && renderResp[0] && ABCJS.synth && ABCJS.synth.supportsAudio && ABCJS.synth.supportsAudio()) {
                    const synthController = new ABCJS.synth.SynthController();
                    const midiBuffer = new ABCJS.synth.CreateSynth();
                    
                    // Create playback controls element if it doesn't exist
                    let controlsEl = document.getElementById('abcjs-playback-controls');
                    if (!controlsEl) {
                        controlsEl = document.createElement('div');
                        controlsEl.id = 'abcjs-playback-controls';
                        controlsEl.style.display = 'none';
                        document.body.appendChild(controlsEl);
                    }
                    
                    // Note highlighter implementation
                    const noteHighlighter = {
                        beatSubdivisions: 2,
                        onStart: function() {
                            // Remove is-playing class from all ABC containers
                            const allContainers = document.querySelectorAll('.abcjs-container');
                            allContainers.forEach(function(c) {
                                c.classList.remove('is-playing');
                            });
                            // Add is-playing class to current container only
                            container.classList.add('is-playing');
                        },
                        onFinished: function() {
                            container.classList.remove('is-playing');
                            const highlighted = Array.from(container.querySelectorAll('.abcjs-highlight'));
                            highlighted.forEach(function(el) { el.classList.remove('abcjs-highlight'); });
                        },
                        onEvent: function(event) {
                            if (event.measureStart && event.left === null) return;
                            
                            // Clear previous highlights
                            const highlighted = Array.from(container.querySelectorAll('.abcjs-highlight'));
                            highlighted.forEach(function(el) { el.classList.remove('abcjs-highlight'); });
                            
                            // Highlight current notes
                            if (event.elements) {
                                event.elements.flat().forEach(function(el) { el.classList.add('abcjs-highlight'); });
                            }
                        }
                    };
                    
                    // Load synth controller
                    synthController.load(controlsEl, noteHighlighter);
                    
                    // Initialize MIDI
                    midiBuffer.init({
                        visualObj: renderResp[0],
                        options: {}
                    }).then(function() {
                        synthController.setTune(renderResp[0], false, { qpm: 120 });
                        console.log('MIDI initialized for container:', containerId);
                    }).catch(function(error) {
                        console.warn('Failed to initialize MIDI for container:', containerId, error);
                    });
                    
                    // Add click handlers for playback
                    container.style.cursor = 'pointer';
                    container.addEventListener('click', function() {
                        try {
                            const isPlaying = midiBuffer.isRunning;
                            if (isPlaying) {
                                synthController.pause();
                            } else {
                                synthController.play();
                            }
                        } catch (error) {
                            console.error('Playback error for container:', containerId, error);
                        }
                    });
                    
                    container.addEventListener('dblclick', function() {
                        try {
                            synthController.restart();
                        } catch (error) {
                            console.error('Restart error for container:', containerId, error);
                        }
                    });
                    
                    console.log('ABC playback setup complete for container:', containerId);
                }
            } catch (error) {
                console.error('Failed to render ABC notation for container:', containerId, error);
                container.innerHTML = '<div class="abcjs-error">Failed to render ABC notation: ' + error.message + '</div>';
            }
        };
        
        // Initialize all ABC containers on page load
        window.initializeAllABCNotation = function() {
            // Find all ABC containers in the current DOM
            const containers = document.querySelectorAll('.abcjs-container[data-abc-source]');
            
            if (containers.length === 0) {
                return;
            }
            
            console.log('Initializing', containers.length, 'ABC containers found in DOM');
            containers.forEach(function(container) {
                if (container.id) {
                    window.initializeABCNotation(container.id);
                }
            });
        };
        
        // Auto-initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', window.initializeAllABCNotation);
        } else {
            // DOM already ready, initialize immediately
            window.initializeAllABCNotation();
        }
    </script>
    <script src="/assets/d3.min.js"></script>
    <script src="/assets/search.js"></script>
    <script src="/assets/table-of-contents.js"></script>
    <script src="/assets/graph.js"></script>
    <script src="/assets/app.js"></script>
</body>
</html>`;
}

export function generateNoteTemplate(title: string, content: string, frontMatterHtml: string = '', backlinks: string[] = []): string {
    const backlinksHtml = backlinks.length > 0
        ? `<div class="backlinks">
         <h4>Backlinks</h4>
         <ul>
           ${backlinks.map(link => `<li><a href="/${link}" class="internal-link">${link}</a></li>`).join('')}
         </ul>
       </div>`
        : '';

    return `<h1 class="note-title">${title}</h1>
${frontMatterHtml ? frontMatterHtml : ''}
<div class="note-body">
  ${content}
</div>
${backlinksHtml}`;
}

export function generateBaseTemplate(base: Base, markdownProcessor: any): string {
    const baseControls = markdownProcessor.generateBaseControls(base);
    const baseContent = markdownProcessor.generateBaseViewContent(base);

    return `<h1 class="note-title">${base.title}</h1>
    <div class="base-controls-container">
        ${baseControls}
    </div>
    <div class="base-content" id="base-content">
        ${baseContent}
    </div>`;
}

function generateBaseViewContent(base: Base, view: BaseView): string {
    const notes = base.matchedNotes || [];

    if (notes.length === 0) {
        return '<div class="empty-base">No items found</div>';
    }

    switch (view.type) {
        case 'table':
            return generateTableView(notes, view);
        case 'cards':
            return generateCardsView(notes, view);
        case 'calendar':
            return generateCalendarView(notes, view);
        default:
            return generateTableView(notes, view);
    }
}

function generateCardsView(notes: Note[], view: BaseView): string {
    // Delegate to client-side rendering for consistency with embedded cards
    const baseData = {
        notes: notes.map(note => ({
            id: note.id,
            title: note.title,
            content: note.content,
            frontMatter: note.frontMatter,
            fileStats: note.fileStats
        })),
        view: view,
        filters: null // Standalone base views don't need base filters
    };

    // Create a div that will be populated by client-side JavaScript
    return `<div class="cards-view" data-base-cards='${JSON.stringify(baseData).replace(/'/g, "&apos;")}'>
        <div class="cards-container">
            <!-- Cards will be rendered by client-side JavaScript for consistency -->
        </div>
    </div>`;
}

function generateTableView(notes: Note[], view: BaseView): string {
    if (notes.length === 0) {
        return '<div class="table-view"><p class="empty-state">No notes match the current filters.</p></div>';
    }

    // Determine columns to show
    const columns = view.order || ['file.name', 'file.tags', 'file.mtime'];

    const headerHtml = columns.map(col => {
        const columnName = getColumnDisplayName(col);
        return `<th data-column="${col}" class="sortable">
            ${columnName}
        </th>`;
    }).join('');

    const rowsHtml = notes.map(note => {
        const cellsHtml = columns.map(col => {
            const value = getColumnValue(note, col);
            return `<td data-column="${col}">${value}</td>`;
        }).join('');

        return `<tr data-note-id="${note.id}" class="table-row">
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

function generateCalendarView(notes: Note[], view: BaseView): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();

    // Group notes by date
    const notesByDate: { [key: string]: Note[]; } = {};
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
                ${dayNotes.map(note => `<div class="calendar-note" title="${note.title}">${note.title}</div>`).join('')}
            </div>
        </div>`;
    }

    calendarHtml += '</div></div></div>';
    return calendarHtml;
}

function getColumnDisplayName(column: string): string {
    const displayNames: Record<string, string> = {
        'file.name': 'Name',
        'file.path': 'Path',
        'file.tags': 'Tags',
        'file.mtime': 'Modified',
        'file.ctime': 'Created',
    };

    return displayNames[column] || column;
}

function getColumnValue(note: Note, column: string): string {
    switch (column) {
        case 'file.name':
            return `<a href="/${note.id}" class="internal-link">${note.title}</a>`;

        case 'file.path':
            return note.relativePath;

        case 'file.size':
            return getFileSize(note);

        case 'file.tags':
            const tags = note.frontMatter.tags || [];
            const tagList = Array.isArray(tags) ? tags : [tags];
            return tagList.filter(tag => tag && tag.trim()).map(tag => `<span class="tag">${tag.trim()}</span>`).join('');

        case 'file.mtime':
            const mtime = getFileModificationTime(note);
            return mtime ? formatDate(mtime) : '';

        case 'file.ctime':
            const ctime = getFileCreationTime(note);
            return ctime ? formatDate(ctime) : '';

        case 'file.starred':
            const starred = note.frontMatter.starred || note.frontMatter.pinned;
            return starred ? '⭐' : '';

        default:
            // Check for computed properties first
            if (note.frontMatter.computed && note.frontMatter.computed[column]) {
                const value = note.frontMatter.computed[column];
                if (typeof value === 'number') {
                    return formatNumber(value);
                }
                return String(value);
            }

            // Custom property from frontmatter
            const value = note.frontMatter[column];
            if (value === undefined || value === null) return '';

            // Handle different value types
            if (Array.isArray(value)) {
                if (value.every(item => typeof item === 'string')) {
                    return value.filter(item => item && item.trim()).map(item => `<span class="tag">${item.trim()}</span>`).join('');
                }
                return value.join(', ');
            }

            if (typeof value === 'boolean') {
                return value ? '✓' : '✗';
            }

            if (typeof value === 'number') {
                return formatNumber(value);
            }

            if (value instanceof Date) {
                return formatDate(value);
            }

            return String(value);
    }
}

function getFileModificationTime(note: Note): Date | null {
    try {
        const fs = require('fs');
        const stats = fs.statSync(note.path);
        return stats.mtime;
    } catch {
        return null;
    }
}

function getFileCreationTime(note: Note): Date | null {
    try {
        const fs = require('fs');
        const stats = fs.statSync(note.path);
        return stats.ctime;
    } catch {
        return null;
    }
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2
    }).format(value);
}

function getFileSize(note: Note): string {
    try {
        const fs = require('fs');
        const stats = fs.statSync(note.path);
        const size = stats.size;

        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
        return `${Math.round(size / (1024 * 1024))} MB`;
    } catch {
        return '';
    }
}
