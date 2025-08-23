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

export function generateMainTemplate(title: string = "Obsidian Vault"): string {
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

export function generateBaseHTML(base: Base, title: string = "Obsidian Vault", markdownProcessor?: any): string {
    const baseContent = generateBaseTemplate(base, markdownProcessor);
    return generateTemplate(title, `
        <article class="note-content base-page" id="note-content">
            ${baseContent}
        </article>
    `);
}

export function generateNoteHTML(noteContent: string, title: string = "Note"): string {
    return generateTemplate(title, `
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
                    <button id="graph-toggle" class="icon-button" title="Toggle graph view">
                        ${getLucideIcon('Waypoints', 16)}
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
                    <button id="graph-toggle-desktop" class="icon-button" title="Toggle graph view">
                        ${getLucideIcon('Waypoints', 16)}
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
            ${mainContent}
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
    
    <script src="/assets/abcjs-basic-min.js"></script>
    <script>
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
    <script src="/assets/search.js"></script>
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
    const cardsHtml = notes.map(note => {
        const tags = note.frontMatter.tags || [];
        const tagsHtml = Array.isArray(tags)
            ? tags.map(tag => `<span class="tag">${tag}</span>`).join('')
            : `<span class="tag">${tags}</span>`;

        const mtime = getFileModificationTime(note);

        return `<div class="card" data-note-id="${note.id}">
            <div class="card-header">
                <h3 class="card-title">
                    <a href="/${note.id}" class="internal-link">${note.title}</a>
                </h3>
            </div>
            <div class="card-content">
                <div class="card-meta">
                    ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
                    ${mtime ? `<div class="card-date">${formatDate(mtime)}</div>` : ''}
                </div>
                ${note.content.length > 200
                ? `<div class="card-preview">${note.content.substring(0, 200)}...</div>`
                : `<div class="card-preview">${note.content}</div>`
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
            return tagList.map(tag => `<span class="tag">${tag}</span>`).join('');

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
                    return value.map(item => `<span class="tag">${item}</span>`).join('');
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
