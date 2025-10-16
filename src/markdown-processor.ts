import { marked } from 'marked';
import matter from 'gray-matter';
import path from 'path';
import { createHighlighter } from 'shiki';
import * as katex from 'katex';
import { Note, FrontMatter, Base, BaseView } from './types';
import { getLucideIcon } from './templates';
import { BaseProcessor } from './base-processor';
import { generateCardHtml, getUsedProperties } from './card-renderer';
import { AbcProcessor } from './abc-processor';
import { MermaidProcessor } from './mermaid-processor';

export class MarkdownProcessor {
  private linkPattern = /\[\[([^\]]+)\]\]/g;
  private embedPattern = /!\[\[([^\]]+?)(#([^|\]]+))?(\|([^\]]+))?\]\]/g;
  private highlighter: any = null;
  private mathPlaceholders: Map<string, string> = new Map();
  private mathCounter = 0;
  private baseProcessor: BaseProcessor;

  constructor() {
    // Configure marked with basic settings first
    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    this.baseProcessor = new BaseProcessor();
  }

  async initialize() {
    if (!this.highlighter) {
      await this.initializeHighlighter();
    }
  }

  private async initializeHighlighter() {
    try {
      this.highlighter = await createHighlighter({
        themes: ['github-light', 'github-dark'],
        langs: [
          'javascript', 'typescript', 'python', 'java', 'cpp', 'c',
          'html', 'css', 'json', 'yaml', 'bash', 'sql', 'markdown'
        ]
      });

      console.log('✅ Shiki highlighter initialized successfully');

      // Set up custom marked renderer for code blocks
      const renderer = new marked.Renderer();
      renderer.code = ({ text, lang, escaped }: { text: string; lang?: string; escaped?: boolean; }) => {
        // Debug logging to see what language we get
        if (lang && (lang.includes('abc') || lang.includes('music'))) {
          console.log(`🎵 Processing code block with language: "${lang}"`);
        }

        // Handle inline base syntax
        if (lang === 'base') {
          try {
            console.log(`📊 Processing inline base syntax with ${text.length} characters`);
            return this.processInlineBase(text);
          } catch (error) {
            console.log(`⚠️  Inline base rendering failed, falling back to plain text:`, error);
            return `<div class="base-error">❌ Failed to render base: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
          }
        }

        // Handle ABC music notation
        if (lang === 'music-abc' || lang === 'abc') {
          try {
            console.log(`🎵 Processing ABC notation with ${text.length} characters`);
            const abcProcessor = new AbcProcessor(text);
            const result = abcProcessor.generateHtml();
            return result;
          } catch (error) {
            console.log(`⚠️  ABC rendering failed, falling back to plain text:`, error);
            return `<pre><code class="language-abc">${text}</code></pre>`;
          }
        }

        // Handle Mermaid diagrams
        if (lang === 'mermaid') {
          try {
            console.log(`🎨 Processing Mermaid diagram with ${text.length} characters`);
            // Unescape HTML entities if the text was escaped by marked
            const unescapedText = this.unescapeHtml(text);
            const mermaidProcessor = new MermaidProcessor(unescapedText);
            const result = mermaidProcessor.generateHtml();
            return result;
          } catch (error) {
            console.log(`⚠️  Mermaid rendering failed, falling back to plain text:`, error);
            return `<pre><code class="language-mermaid">${text}</code></pre>`;
          }
        }

        if (this.highlighter && lang) {
          try {
            const lightHtml = this.highlighter.codeToHtml(text, {
              lang: lang,
              theme: 'github-light'
            });
            const darkHtml = this.highlighter.codeToHtml(text, {
              lang: lang,
              theme: 'github-dark'
            });

            // Wrap in theme-specific containers
            return `
              <div class="shiki-container">
                <div class="shiki-light" data-theme="light">${lightHtml}</div>
                <div class="shiki-dark" data-theme="dark" style="display: none;">${darkHtml}</div>
              </div>
            `;
          } catch (error) {
            console.log(`⚠️  Shiki highlighting failed for language '${lang}', falling back to plain text`);
          }
        }

        // Fallback to plain code block
        return `<pre><code class="language-${lang || 'text'}">${text}</code></pre>`;
      };

      marked.setOptions({ renderer });
    } catch (error) {
      console.log('⚠️  Failed to initialize Shiki highlighter:', error);
      console.log('   Syntax highlighting disabled');
    }
  }

  /**
   * Process a markdown file and extract metadata, content, and links
   */
  processMarkdown(filePath: string, content: string, vaultPath: string, allNotes?: Map<string, Note>): Note {
    const { data: frontMatter, content: markdownContent } = matter(content);

    // Extract title from frontMatter or filename
    const fileName = path.basename(filePath, '.md');
    const title = frontMatter.title || fileName;

    // Get folder path relative to vault
    const relativePath = path.relative(vaultPath, filePath);
    const folderPath = path.dirname(relativePath);

    // Generate note ID from relative path (without .md extension) to ensure uniqueness
    const relativePathWithoutExt = relativePath.replace(/\.md$/, '');
    const id = this.generateNoteId(relativePathWithoutExt);

    // Extract links from content
    const links = this.extractLinks(markdownContent);

    // Process Obsidian-specific syntax
    let processedContent = this.processObsidianSyntax(markdownContent, allNotes, folderPath);

    // Preserve math expressions before markdown processing
    processedContent = this.preserveMathExpressions(processedContent);

    // Convert to HTML
    let html = marked(processedContent) as string;

    // Restore math expressions after markdown processing
    html = this.restoreMathExpressions(html);

    // Generate frontmatter HTML
    const frontMatterHtml = this.generateFrontMatterHtml(frontMatter as FrontMatter);

    // Get file statistics
    let fileStats;
    try {
      const fs = require('fs');
      const stats = fs.statSync(filePath);
      fileStats = {
        size: stats.size,
        mtime: stats.mtime,
        ctime: stats.ctime
      };
    } catch (error) {
      console.warn(`Could not get file stats for ${filePath}:`, error);
    }

    return {
      id,
      title,
      path: filePath,
      relativePath,
      folderPath: folderPath === '.' ? '' : folderPath,
      content: markdownContent,
      frontMatter: frontMatter as FrontMatter,
      frontMatterHtml,
      html: html as string,
      links,
      backlinks: [],
      fileStats
    };
  }

  /**
   * Preserve math expressions by replacing them with placeholders
   */
  private preserveMathExpressions(content: string): string {
    // Reset counter and clear map for each document
    this.mathCounter = 0;
    this.mathPlaceholders.clear();

    let processed = content;

    // Preserve display math blocks ($$...$$) FIRST - handle multiline blocks
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, mathContent) => {
      const placeholder = `<!--MATHBLOCK${this.mathCounter++}-->`;
      this.mathPlaceholders.set(placeholder, match);
      return placeholder;
    });

    // Preserve inline math ($...$) AFTER display blocks
    processed = processed.replace(/\$([^$\n]+?)\$/g, (match, mathContent) => {
      const placeholder = `<!--MATHINLINE${this.mathCounter++}-->`;
      this.mathPlaceholders.set(placeholder, match);
      return placeholder;
    });

    return processed;
  }

  /**
   * Restore math expressions from placeholders with KaTeX rendering
   */
  private restoreMathExpressions(html: string): string {
    let processed = html;

    // Restore all placeholders with KaTeX rendered math
    this.mathPlaceholders.forEach((original, placeholder) => {
      let rendered = original;

      try {
        // Determine if it's display or inline math
        const isDisplayMath = original.startsWith('$$') && original.endsWith('$$');
        const mathContent = isDisplayMath
          ? original.slice(2, -2).trim()
          : original.slice(1, -1).trim();

        // Render with KaTeX
        rendered = katex.renderToString(mathContent, {
          displayMode: isDisplayMath,
          throwOnError: false,
          strict: false
        });
      } catch (error) {
        console.log(`⚠️  Failed to render math: ${original.substring(0, 50)}...`);
        // Fall back to original math expression
        rendered = original;
      }

      // Replace placeholder with rendered math
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      processed = processed.replace(regex, rendered);
    });

    return processed;
  }

  /**
 * Generate a unique ID for a note based on its path
 */
  generateNoteId(linkText: string): string {
    return linkText.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-\/]/g, '')  // Keep forward slashes for folder structure
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Generate a unique ID for a base based on its path (should match base processor)
   */
  generateBaseId(linkText: string): string {
    return linkText.toLowerCase()
      .replace(/\.base$/, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w\-\/]/g, '')  // Keep forward slashes for folder structure
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Generate base icon SVG
   */
  generateBaseIcon(): string {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9l7-6z"></path>
        <polyline points="12,3 12,9 19,9"></polyline>
        <path d="M12 3v6h7"></path>
        <path d="M3 10h18"></path>
        <path d="M3 15h18"></path>
      </svg>
    `;
  }

  /**
 * Generate base controls (used in both standalone and embedded contexts)
 */
  generateBaseControls(base: Base): string {
    const defaultView = base.views && base.views.length > 0 ? base.views[0] : { type: 'cards', name: 'Default' };
    const viewButtons = base.views && base.views.length > 0 ? base.views.map(view => {
      let iconSvg = '';
      switch (view.type) {
        case 'cards':
          iconSvg = getLucideIcon('LayoutGrid', 16);
          break;
        case 'table':
          iconSvg = getLucideIcon('Table', 16);
          break;
        case 'calendar':
          iconSvg = getLucideIcon('Calendar', 16);
          break;
        default:
          iconSvg = getLucideIcon('Table', 16);
      }

      return `<button class="view-button ${view === defaultView ? 'active' : ''}" data-view-type="${view.type}" data-view-name="${view.name}" title="${view.name}">
            ${iconSvg}
            <span class="view-button-text">${view.name}</span>
        </button>`;
    }).join('') : '';

    return `<div class="base-controls">
            <div class="view-switcher">
                ${viewButtons}
            </div>
            <div class="base-actions">
                <button class="action-button" id="sort-button">
                    ${getLucideIcon('ArrowUpDown', 16)}
                    Sort
                </button>
                <button class="action-button" id="filter-button">
                    ${getLucideIcon('Filter', 16)}
                    Filter
                </button>
                ${base.properties && (Array.isArray(base.properties) ? base.properties.length > 0 : Object.keys(base.properties).length > 0) ?
        `<button class="action-button" id="properties-button">
                        ${getLucideIcon('Settings', 16)}
                        Properties
                    </button>` : ''
      }
            </div>
        </div>`;
  }

  /**
   * Generate base view content (used in both standalone and embedded contexts)
   */
  generateBaseViewContent(base: Base, specifiedView?: BaseView): string {
    let notes = base.matchedNotes || [];

    // Use specified view if provided, otherwise use the first view or default to cards
    const defaultView: BaseView = specifiedView || (base.views && base.views.length > 0 ? base.views[0] : { type: 'cards', name: 'Default' });

    // Apply view-specific filters if defined
    if (defaultView.filter || (defaultView as any).filters) {
      const viewFilter = defaultView.filter || (defaultView as any).filters;
      notes = notes.filter(note => this.baseProcessor.evaluateFilter(viewFilter, note));
    }

    if (notes.length === 0) {
      return '<div class="empty-base">No items found matching the filters</div>';
    }

    // Apply sorting if defined in the view
    if (defaultView.sort && Array.isArray(defaultView.sort)) {
      notes = this.baseProcessor.sortNotes(notes, defaultView);
    }

    switch (defaultView.type) {
      case 'cards':
        return this.generateCardsViewContent(notes, defaultView, base);
      case 'table':
        return this.generateTableViewContent(notes, defaultView);
      default:
        return this.generateCardsViewContent(notes, defaultView, base);
    }
  }

  /**
   * Generate embedded base content with controls in context-appropriate locations
   */
  generateEmbeddedBaseContent(base: Base, includeControls: boolean = false, specifiedView?: BaseView): string {
    const baseContent = this.generateBaseViewContent(base, specifiedView);

    if (includeControls) {
      // For standalone context: controls in separate cartridge
      const baseControls = this.generateBaseControls(base);
      return `<div class="embedded-base-controls">
        ${baseControls}
    </div>${baseContent}`;
    } else {
      // For embedded context: just the content (controls go in header)
      return baseContent;
    }
  }

  /**
   * Generate base controls for embedded header
   */
  generateEmbedHeaderControls(base: Base, currentView?: BaseView): string {
    const defaultView = (base.views && base.views.length > 0 ? base.views[0] : { type: 'cards', name: 'Default' }) as BaseView;
    const activeView = currentView || defaultView;

    // Check if base has sort or filter rules - use active view instead of default
    const hasSortRules = activeView.sort && activeView.sort.length > 0;
    const hasFilterRules = (base.filters && (
      (typeof base.filters === 'string') ||
      (typeof base.filters === 'object' && base.filters !== null && Object.keys(base.filters).length > 0)
    )) || (activeView.filter && (
      (typeof activeView.filter === 'string') ||
      (typeof activeView.filter === 'object' && activeView.filter !== null && Object.keys(activeView.filter).length > 0)
    ));

    const viewButtons = base.views && base.views.length > 0 ? base.views.map(view => {
      let iconSvg = '';
      switch (view.type) {
        case 'cards':
          iconSvg = getLucideIcon('LayoutGrid', 14);
          break;
        case 'table':
          iconSvg = getLucideIcon('Table', 14);
          break;
        case 'calendar':
          iconSvg = getLucideIcon('Calendar', 14);
          break;
        default:
          iconSvg = getLucideIcon('Table', 14);
      }

      return `<button class="embed-view-button ${view === activeView ? 'active' : ''}" data-view-type="${view.type}" data-view-name="${view.name}" onclick="event.stopPropagation();" title="${view.name}">
            ${iconSvg}
        </button>`;
    }).join('') : '';

    return `<span class="embed-base-controls">
        ${viewButtons}
        <button class="embed-action-button ${hasSortRules ? 'has-rules' : ''}" data-action="sort" data-base-id="${base.id}" onclick="event.stopPropagation();" title="Sort">
            ${getLucideIcon('ArrowUpDown', 14)}
        </button>
        <button class="embed-action-button ${hasFilterRules ? 'has-rules' : ''}" data-action="filter" data-base-id="${base.id}" onclick="event.stopPropagation();" title="Filter">
            ${getLucideIcon('Filter', 14)}
        </button>
    </span>`;
  }

  /**
   * Generate cards view content for embedded bases
   */
  generateCardsViewContent(notes: Note[], baseView: BaseView, base?: Base): string {
    // Instead of server-side rendering, we'll create a placeholder that gets rendered client-side
    // This ensures embedded and standalone cards use the exact same rendering code
    const baseData = {
      notes: notes.map(note => ({
        id: note.id,
        title: note.title,
        content: note.content,
        frontMatter: note.frontMatter,
        fileStats: note.fileStats,
        folderPath: note.folderPath
      })),
      view: baseView,
      filters: base?.filters || null
    };

    // Create a div that will be populated by client-side JavaScript
    return `<div class="cards-view" data-base-cards='${JSON.stringify(baseData).replace(/'/g, "&apos;")}'>
      <div class="cards-container">
        <!-- Cards will be rendered by client-side JavaScript for consistency -->
      </div>
    </div>`;
  }  /**
   * Generate table view content for embedded bases
   */
  getPropertyValue(note: Note, property: string): string {
    switch (property) {
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
        return note.frontMatter.mtime || '';

      case 'file.ctime':
        if (note.fileStats && note.fileStats.ctime) {
          const ctime = new Date(note.fileStats.ctime);
          return this.formatDate(ctime);
        }
        return '';

      default:
        return '';
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  generateTableViewContent(notes: Note[], baseView: BaseView): string {
    // Get the order from the baseView, defaulting to name, tags, and mtime
    const order = baseView.order || ['file.name', 'file.tags', 'file.mtime'];

    // Generate table headers based on order
    const headersHtml = order.map(property => {
      const label = property.replace('file.', '').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      return `<th>${label}</th>`;
    }).join('');

    // Generate table rows
    const rowsHtml = notes.map(note => {
      const cellsHtml = order.map(property => {
        const value = this.getPropertyValue(note, property);
        return `<td>${value}</td>`;
      }).join('');

      return `<tr data-note-id="${note.id}">${cellsHtml}</tr>`;
    }).join('');

    return `<div class="table-view">
      <table class="base-table">
        <thead>
          <tr>
            ${headersHtml}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>`;
  }

  /**
   * Extract [[wiki-style]] links from markdown content
   */
  private extractLinks(content: string): string[] {
    const links: string[] = [];
    let match;

    // Extract regular links
    while ((match = this.linkPattern.exec(content)) !== null) {
      const link = match[1];
      if (link && !link.startsWith('!')) {
        // Handle display text with pipe separator: extract only the actual link target
        const actualLink = link.split('|')[0].trim();
        // Keep the full path for proper linking
        links.push(actualLink);
      }
    }

    // Reset regex
    this.linkPattern.lastIndex = 0;

    return [...new Set(links)]; // Remove duplicates
  }

  /**
   * Process Obsidian-specific syntax and convert to HTML-friendly format
   */
  private processObsidianSyntax(content: string, allNotes?: Map<string, Note>, noteFolderPath?: string): string {
    let processed = content;

    // Process embeds first (images, other notes)
    processed = processed.replace(this.embedPattern, (match, link, viewHash, viewName, displayPipe, displayText) => {
      if (this.isImageFile(link)) {
        // Build the correct path for the image
        // If the link is relative (like "figs/image.png"), prepend the note's folder path
        let imagePath = link;
        if (noteFolderPath && !link.startsWith('/')) {
          // Relative path - combine with note folder and make absolute
          imagePath = `/${noteFolderPath}/${link}`;
        } else if (!link.startsWith('/') && !link.startsWith('http')) {
          // Make it absolute if it's not already
          imagePath = `/${link}`;
        }

        // Create an embed-style container for images (will be styled like embedded notes)
        const imageAlt = displayText || path.basename(link);
        return `<div class="embed-image">
          <img src="${imagePath}" alt="${imageAlt}" />
        </div>`;
      } else {
        // Create placeholder that will be resolved later with actual content
        return `<div class="embed-placeholder" data-embed-target="${link}" data-embed-view="${viewName || ''}" data-embed-display="${displayText || ''}"></div>`;
      }
    });

    // Process regular wiki links
    processed = processed.replace(this.linkPattern, (match, link) => {
      // Handle display text with pipe separator: [[Target|Display Text]]
      const parts = link.split('|');
      const actualLink = parts[0].trim();
      const displayText = parts.length > 1 ? parts[1].trim() : actualLink;

      // Try to find the actual note to get the correct path
      let fullPath = actualLink;
      if (allNotes) {
        // Strategy 1: Direct lookup by generated ID
        const directId = this.generateNoteId(actualLink);
        let targetNote = allNotes.get(directId);

        // Strategy 2: Search by filename if direct path fails
        if (!targetNote) {
          const fileName = actualLink.includes('/') ? actualLink.split('/').pop() || actualLink : actualLink;
          for (const note of allNotes.values()) {
            const noteFileName = path.basename(note.path, '.md');
            if (noteFileName === fileName || note.title === fileName) {
              targetNote = note;
              break;
            }
          }
        }

        // Strategy 3: Search by title
        if (!targetNote) {
          for (const note of allNotes.values()) {
            if (note.title === actualLink) {
              targetNote = note;
              break;
            }
          }
        }

        // If we found the note, use its ID for the link
        if (targetNote) {
          fullPath = targetNote.id;
        }
      }

      // Generate final link ID
      const linkId = fullPath.includes('/') ? fullPath : this.generateNoteId(actualLink);

      return `<a href="/${linkId}" class="internal-link" data-note="${actualLink}">${displayText}</a>`;
    });

    return processed;
  }

  /**
   * Fix wiki link paths to use correct full paths with folders
   */
  fixWikiLinks(html: string, allNotes: Map<string, Note>): string {
    // Match internal links and fix their href paths
    return html.replace(/<a href="([^"]+)" class="internal-link" data-note="([^"]+)">([^<]+)<\/a>/g,
      (match, currentHref, dataNoteValue, displayText) => {
        // Remove .html extension from href for comparison
        const hrefWithoutExt = currentHref.replace(/\.html$/, '');

        // Find the actual note by searching for the data-note value
        let targetNote: Note | undefined;

        // Strategy 1: Search by title
        for (const note of allNotes.values()) {
          if (note.title === dataNoteValue) {
            targetNote = note;
            break;
          }
        }

        // Strategy 2: Search by filename (without extension)  
        if (!targetNote) {
          for (const note of allNotes.values()) {
            const noteFileName = path.basename(note.path, '.md');
            if (noteFileName === dataNoteValue) {
              targetNote = note;
              break;
            }
          }
        }

        // Strategy 3: Handle folder/file format like "Drums/Notation"
        if (!targetNote && dataNoteValue.includes('/')) {
          const generatedId = this.generateNoteId(dataNoteValue);
          targetNote = allNotes.get(generatedId);
        }

        // If we found the note and the href doesn't match the correct ID, fix it
        if (targetNote && hrefWithoutExt !== targetNote.id) {
          return `<a href="/${targetNote.id}" class="internal-link" data-note="${dataNoteValue}">${displayText}</a>`;
        }

        // If not found, return original link
        return match;
      }
    );
  }

  /**
   * Resolve embedded notes and bases by replacing placeholders with actual content
   */
  resolveEmbeddedNotes(html: string, allNotes: Map<string, Note>, bases?: Map<string, Base>): string {
    return html.replace(/<div class="embed-placeholder" data-embed-target="([^"]+)" data-embed-view="([^"]*)" data-embed-display="([^"]*)"><\/div>/g, (match, linkText, viewName, displayText) => {
      // First try to find a note to embed
      let targetNote: Note | undefined;
      let targetBase: Base | undefined;

      // Strategy 1: Direct note ID match using full path
      const directId = this.generateNoteId(linkText);
      targetNote = allNotes.get(directId);

      // Strategy 2: Search by filename if direct path fails
      if (!targetNote) {
        const fileName = linkText.includes('/') ? linkText.split('/').pop() || linkText : linkText;
        const fileId = this.generateNoteId(fileName);
        targetNote = allNotes.get(fileId);
      }

      // Strategy 3: Search by title across all notes
      if (!targetNote) {
        for (const note of allNotes.values()) {
          if (note.title === linkText) {
            targetNote = note;
            break;
          }
        }
      }

      // Strategy 4: Search by filename (without extension)
      if (!targetNote) {
        for (const note of allNotes.values()) {
          const fileName = path.basename(note.path, '.md');
          if (fileName === linkText) {
            targetNote = note;
            break;
          }
        }
      }

      // Strategy 5: Try to find a base if note not found
      if (!targetNote && bases) {
        // Check if it's a .base file reference
        const baseFileName = linkText.replace(/\.base$/, '');

        // Strategy 5a: Direct base ID lookup (for full path references like "Bases/Projects.base")
        const baseId = this.generateBaseId(linkText);
        targetBase = bases.get(baseId);

        // Strategy 5b: Search by base filename (for short references like "Projects.base")
        if (!targetBase) {
          for (const base of bases.values()) {
            const fileName = path.basename(base.path, '.base');
            if (fileName === baseFileName) {
              targetBase = base;
              break;
            }
          }
        }

        // Strategy 5c: Search by base title
        if (!targetBase) {
          for (const base of bases.values()) {
            if (base.title === linkText || base.title === baseFileName) {
              targetBase = base;
              break;
            }
          }
        }
      }

      // Handle base embedding - use same structure as notes with actual base content
      if (targetBase) {
        const safeBaseId = targetBase.id.replace(/\//g, '-');
        const embedId = `embed-${safeBaseId}-${Math.random().toString(36).substr(2, 9)}`;

        // Use the specified view if provided, otherwise use default view
        const specifiedView = viewName ? targetBase.views.find(v => v.name === viewName || v.type === viewName) : null;
        const baseContent = this.generateEmbeddedBaseContent(targetBase, false, specifiedView || undefined); // No controls in content, specific view
        const headerControls = this.generateEmbedHeaderControls(targetBase, specifiedView || undefined); // Controls in header, pass specified view
        const baseUrl = `/${targetBase.folderPath.toLowerCase()}/${path.basename(targetBase.relativePath, '.base').toLowerCase()}`;

        // Use display text as title if provided, otherwise use base title
        const titleText = displayText || targetBase.title;

        return `<div class="embed-note embed-base" data-embed-id="${embedId}" data-base-id="${targetBase.id}" data-embed-view="${viewName || ''}">
          <div class="embed-header" onclick="toggleEmbed('${embedId}')">
            <span class="embed-title">
              <a href="${baseUrl}" class="embed-title-link" onclick="event.stopPropagation();">
                ${this.generateEmbeddedBaseIcon()}
                <span class="embed-title-text">${titleText}</span>
              </a>
            </span>
            <span class="embed-controls">
              ${headerControls}
              <span class="embed-maximize" onclick="event.stopPropagation(); toggleEmbedMaximize('${embedId}')" title="Limit height">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon minimize-2">
                  <polyline points="4,14 10,14 10,20"></polyline>
                  <polyline points="20,10 14,10 14,4"></polyline>
                  <line x1="14" y1="10" x2="21" y2="3"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              </span>
              <span class="embed-chevron" onclick="event.stopPropagation(); toggleEmbed('${embedId}')" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle">
                  <path d="M3 8L12 17L21 8"></path>
                </svg>
              </span>
            </span>
          </div>
          <div class="embed-content" id="embed-content-${embedId}">
            ${baseContent}
          </div>
        </div>`;
      }

      // Handle note embedding
      if (!targetNote) {
        // Neither note nor base found
        return `<div class="embed-note embed-error">❌ Note not found: ${linkText}</div>`;
      }

      // Create collapsible embed cartridge
      const safeNoteId = targetNote.id.replace(/\//g, '-');
      const embedId = `embed-${safeNoteId}-${Math.random().toString(36).substr(2, 9)}`;
      const noteUrl = `/${targetNote.id}`;

      return `
        <div class="embed-note" data-embed-id="${embedId}">
          <div class="embed-header" onclick="toggleEmbed('${embedId}')">
            <span class="embed-title">
              <a href="${noteUrl}" class="embed-title-link" onclick="event.stopPropagation();">
                ${this.generateEmbeddedIcon()}
                <span class="embed-title-text">${targetNote.title}</span>
              </a>
            </span>
            <span class="embed-controls">
              <span class="embed-maximize" onclick="event.stopPropagation(); toggleEmbedMaximize('${embedId}')" title="Limit height">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon minimize-2">
                  <polyline points="4,14 10,14 10,20"></polyline>
                  <polyline points="20,10 14,10 14,4"></polyline>
                  <line x1="14" y1="10" x2="21" y2="3"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              </span>
              <span class="embed-chevron" onclick="event.stopPropagation(); toggleEmbed('${embedId}')" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle">
                  <path d="M3 8L12 17L21 8"></path>
                </svg>
              </span>
            </span>
          </div>
          <div class="embed-content" id="embed-content-${embedId}">
            ${targetNote.html}
          </div>
        </div>
      `.trim();
    });
  }

  /**
   * Check if a link is an image file
   */
  private isImageFile(filename: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  /**
   * Generate embedded icon SVG (Lucide FileText icon)
   */
  private generateEmbeddedIcon(): string {
    // Using static SVG of Lucide FileText icon for reliability
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="embed-icon">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14,2 14,8 20,8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10,9 9,9 8,9"></polyline>
    </svg>`;
  }

  /**
   * Generate embedded base icon SVG (Lucide Database icon)
   */
  private generateEmbeddedBaseIcon(): string {
    // Using static SVG of Lucide Database icon for bases
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="embed-icon">
      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
      <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"></path>
      <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"></path>
    </svg>`;
  }

  /**
   * Generate HTML for frontmatter properties display
   */
  generateFrontMatterHtml(frontMatter: FrontMatter): string {
    if (!frontMatter || Object.keys(frontMatter).length === 0) {
      return '';
    }

    let propertiesHtml = '';

    // Calculate the maximum property name width for consistent alignment
    const propertyNames = Object.keys(frontMatter).filter(key =>
      frontMatter[key] !== undefined && frontMatter[key] !== null
    );

    // More accurate width calculation based on character width
    // Using a character map for more precise width estimation
    const getTextWidth = (text: string): number => {
      const charWidths: Record<string, number> = {
        'i': 3, 'j': 3, 'l': 3, 'r': 4, 't': 4, 'f': 4,
        'I': 4, 'J': 4, 'T': 6, 'F': 6, 'L': 5, 'P': 6,
        'm': 8, 'w': 8, 'M': 9, 'W': 10,
        '_': 5, '-': 4, '.': 3
      };

      let width = 0;
      for (const char of text) {
        width += charWidths[char] || 6; // default 6px for most characters
      }
      return width;
    };

    const maxPropertyNameWidth = Math.max(...propertyNames.map(name => getTextWidth(name)));
    // Add padding and ensure minimum/maximum bounds
    const propertyNameWidth = Math.min(Math.max(maxPropertyNameWidth + 12, 50), 120);

    // Handle each property type
    Object.entries(frontMatter).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      let propertyHtml = '';

      if (key === 'tags' && Array.isArray(value)) {
        // Special handling for tags - escape HTML to prevent overflow
        const tagsHtml = value.map(tag =>
          `<span class="tag">${this.escapeHtml(String(tag))}</span>`
        ).join('');
        propertyHtml = `
          <div class="property-row">
            <div class="property-name">${this.escapeHtml(key)}</div>
            <div class="property-value property-tags">${tagsHtml}</div>
          </div>
        `;
      } else if (Array.isArray(value)) {
        // Handle other arrays (categories, topics, etc.) - escape HTML
        const arrayHtml = value.map(item =>
          `<span class="property-list-item">${this.escapeHtml(String(item))}</span>`
        ).join('');
        propertyHtml = `
          <div class="property-row">
            <div class="property-name">${this.escapeHtml(key)}</div>
            <div class="property-value property-list">${arrayHtml}</div>
          </div>
        `;
      } else {
        // Handle simple values (strings, numbers, dates) - escape HTML and handle overflow
        const valueStr = this.escapeHtml(String(value));
        const isDate = key.includes('date') || key === 'created' || key === 'published';
        const valueClass = isDate ? 'property-date' : 'property-text';

        propertyHtml = `
          <div class="property-row">
            <div class="property-name">${this.escapeHtml(key)}</div>
            <div class="property-value ${valueClass}">${valueStr}</div>
          </div>
        `;
      }

      propertiesHtml += propertyHtml;
    });

    if (propertiesHtml) {
      const propertiesId = `properties-${Math.random().toString(36).substr(2, 9)}`;
      return `
        <div class="note-properties" style="--property-name-width: ${propertyNameWidth}px;">
          <div class="properties-header" onclick="toggleProperties('${propertiesId}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="properties-chevron">
              <path d="M9 18L15 12L9 6"></path>
            </svg>
            <span class="properties-title">Properties</span>
          </div>
          <div class="properties-content collapsed" id="${propertiesId}">
            ${propertiesHtml}
          </div>
        </div>
      `;
    }

    return '';
  }

  /**
   * Escape HTML to prevent XSS and text overflow issues
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Unescape HTML entities back to original characters
   */
  private unescapeHtml(text: string): string {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  /**
   * Generate backlinks for all notes
   */
  generateBacklinks(notes: Map<string, Note>): void {
    // Clear existing backlinks
    notes.forEach(note => {
      note.backlinks = [];
    });

    // Generate backlinks
    notes.forEach(note => {
      note.links.forEach(linkText => {
        // Use the same multi-strategy approach as in processObsidianSyntax
        let targetNote: Note | undefined;

        // Strategy 1: Direct lookup by generated ID
        const directId = this.generateNoteId(linkText);
        targetNote = notes.get(directId);

        // Strategy 2: Search by filename if direct path fails
        if (!targetNote) {
          const fileName = linkText.includes('/') ? linkText.split('/').pop() || linkText : linkText;
          for (const candidateNote of notes.values()) {
            const noteFileName = path.basename(candidateNote.path, '.md');
            if (noteFileName === fileName || candidateNote.title === fileName) {
              targetNote = candidateNote;
              break;
            }
          }
        }

        // Strategy 3: Search by title
        if (!targetNote) {
          for (const candidateNote of notes.values()) {
            if (candidateNote.title === linkText) {
              targetNote = candidateNote;
              break;
            }
          }
        }

        if (targetNote) {
          targetNote.backlinks.push(note.id);
        }
      });
    });
  }

  /**
   * Process inline base syntax and render it as an embedded base
   */
  private processInlineBase(yamlContent: string): string {
    try {
      // Parse YAML content to get base configuration
      const { data: baseConfig } = matter(`---\n${yamlContent}\n---`);

      // Create a temporary base object from the inline configuration
      const inlineBase: Base = {
        id: `inline-base-${Math.random().toString(36).substr(2, 9)}`,
        title: baseConfig.title || 'Inline Base',
        source: '',
        path: '',
        relativePath: '',
        folderPath: '',
        description: baseConfig.description || '',
        views: baseConfig.views || [{ type: 'cards', name: 'Default' }],
        properties: baseConfig.properties || [],
        formulas: baseConfig.formulas || [],
        filters: baseConfig.filters || null,
        matchedNotes: [] // Will be populated when the base is actually processed
      };

      // Generate the embedded base content
      // Note: We can't filter notes here because we don't have access to all notes
      // This will need to be handled client-side or during a later processing phase
      const embedId = `embed-${inlineBase.id}`;
      const viewName = inlineBase.views.length > 0 ? inlineBase.views[0].name : 'Default';

      // Create the embed structure similar to how regular bases are embedded
      const headerControls = this.generateEmbedHeaderControls(inlineBase, inlineBase.views[0]);

      return `<div class="embed-note embed-base inline-base" data-embed-id="${embedId}" data-base-id="${inlineBase.id}" data-embed-view="${viewName}" data-base-config='${JSON.stringify(baseConfig).replace(/'/g, "&apos;")}'>
        <div class="embed-header" onclick="toggleEmbed('${embedId}')">
          <span class="embed-title">
            <span class="embed-title-link">
              ${this.generateEmbeddedBaseIcon()}
              <span class="embed-title-text">${inlineBase.title}</span>
            </span>
          </span>
          <span class="embed-controls">
            ${headerControls}
            <span class="embed-maximize" onclick="event.stopPropagation(); toggleEmbedMaximize('${embedId}')" title="Limit height">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon minimize-2">
                <polyline points="4,14 10,14 10,20"></polyline>
                <polyline points="20,10 14,10 14,4"></polyline>
                <line x1="14" y1="10" x2="21" y2="3"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </span>
            <span class="embed-chevron" onclick="event.stopPropagation(); toggleEmbed('${embedId}')" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle">
                <path d="M3 8L12 17L21 8"></path>
              </svg>
            </span>
          </span>
        </div>
        <div class="embed-content" id="embed-content-${embedId}">
          <div class="inline-base-placeholder" data-base-config='${JSON.stringify(baseConfig).replace(/'/g, "&apos;")}'>
            <div class="inline-base-loading">Processing inline base...</div>
          </div>
        </div>
      </div>`;
    } catch (error) {
      console.error('Failed to parse inline base YAML:', error);
      return `<div class="base-error">❌ Invalid base configuration: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
    }
  }
}
