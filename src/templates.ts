export function generateMainTemplate(title: string = "Obsidian Vault"): string {
    const timestamp = Date.now(); // Cache busting for development
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="assets/main.css?v=${timestamp}">
    <link rel="stylesheet" href="assets/katex.min.css">
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                        </svg>
                    </button>
                    <button id="graph-toggle" class="icon-button" title="Toggle graph view">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="12" r="1"></circle>
                            <circle cx="9" cy="5" r="1"></circle>
                            <circle cx="9" cy="19" r="1"></circle>
                            <circle cx="15" cy="12" r="1"></circle>
                            <circle cx="15" cy="5" r="1"></circle>
                            <circle cx="15" cy="19" r="1"></circle>
                        </svg>
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                        </svg>
                    </button>
                    <button id="graph-toggle-desktop" class="icon-button" title="Toggle graph view">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="12" r="1"></circle>
                            <circle cx="9" cy="5" r="1"></circle>
                            <circle cx="9" cy="19" r="1"></circle>
                            <circle cx="15" cy="12" r="1"></circle>
                            <circle cx="15" cy="5" r="1"></circle>
                            <circle cx="15" cy="19" r="1"></circle>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="search-container">
                <input type="text" id="search-input" placeholder="Search notes..." autocomplete="off">
                <div id="search-results" class="search-results hidden"></div>
            </div>
            
            <div class="sidebar-content">
                <div class="nav-section">
                    <h3>Files</h3>
                    <div id="folder-tree" class="folder-tree"></div>
                </div>
            </div>
        </nav>
        
        <main class="main-content">
            <article class="note-content" id="note-content">
                <h1>Welcome to your Obsidian vault</h1>
                <p>Select a note from the sidebar to get started.</p>
                
                <aside class="backlinks-panel" id="backlinks-panel">
                    <div id="backlinks-content"></div>
                </aside>
            </article>
        </main>
        
        <div class="graph-panel hidden" id="graph-panel">
            <div class="graph-header">
                <h3>Graph View</h3>
                <button id="close-graph" class="icon-button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div id="graph-container"></div>
        </div>
    </div>
    
    <script src="assets/search.js"></script>
    <script src="assets/graph.js"></script>
    <script src="assets/app.js"></script>
</body>
</html>`;
}

export function generateNoteTemplate(title: string, content: string, backlinks: string[] = []): string {
    const backlinksHtml = backlinks.length > 0
        ? `<div class="backlinks">
         <h4>Backlinks</h4>
         <ul>
           ${backlinks.map(link => `<li><a href="${link}.html" class="internal-link">${link}</a></li>`).join('')}
         </ul>
       </div>`
        : '';

    return `<h1 class="note-title">${title}</h1>
<div class="note-body">
  ${content}
</div>
${backlinksHtml}`;
}
