import { marked } from 'marked';
import matter from 'gray-matter';
import path from 'path';
import { createHighlighter } from 'shiki';
import * as katex from 'katex';
import { Note, FrontMatter } from './types';

export class MarkdownProcessor {
  private linkPattern = /\[\[([^\]]+)\]\]/g;
  private embedPattern = /!\[\[([^\]]+)\]\]/g;
  private highlighter: any = null;
  private mathPlaceholders: Map<string, string> = new Map();
  private mathCounter = 0;

  constructor() {
    // Configure marked with basic settings first
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
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
  processMarkdown(filePath: string, content: string, vaultPath: string): Note {
    const { data: frontMatter, content: markdownContent } = matter(content);

    // Extract title from frontMatter or filename
    const fileName = path.basename(filePath, '.md');
    const title = frontMatter.title || fileName;

    // Generate note ID from file path
    const id = this.generateNoteId(filePath);

    // Get folder path relative to vault
    const relativePath = path.relative(vaultPath, filePath);
    const folderPath = path.dirname(relativePath);

    // Extract links from content
    const links = this.extractLinks(markdownContent);

    // Process Obsidian-specific syntax
    let processedContent = this.processObsidianSyntax(markdownContent);

    // Preserve math expressions before markdown processing
    processedContent = this.preserveMathExpressions(processedContent);

    // Convert to HTML
    let html = marked(processedContent) as string;

    // Restore math expressions after markdown processing
    html = this.restoreMathExpressions(html);

    return {
      id,
      title,
      path: filePath,
      relativePath,
      folderPath: folderPath === '.' ? '' : folderPath,
      content: markdownContent,
      frontMatter: frontMatter as FrontMatter,
      html: html as string,
      links,
      backlinks: []
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
   * Generate a unique ID for a note based on its file path
   */
  private generateNoteId(filePath: string): string {
    // Use the relative path to ensure uniqueness across folders
    const relativePath = path.parse(filePath);
    const folderName = path.basename(relativePath.dir);
    const fileName = relativePath.name;

    // If file is in a subfolder, include folder name in ID
    if (folderName && folderName !== '.') {
      return `${folderName}-${fileName}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }

    // For root level files, just use the filename
    return fileName.toLowerCase().replace(/[^a-z0-9]/g, '-');
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
  private processObsidianSyntax(content: string): string {
    let processed = content;

    // Process embeds first (images, other notes)
    processed = processed.replace(this.embedPattern, (match, link) => {
      if (this.isImageFile(link)) {
        return `![${link}](attachments/${link})`;
      } else {
        // Create placeholder that will be resolved later with actual content
        return `<div class="embed-placeholder" data-embed-target="${link}"></div>`;
      }
    });

    // Process regular wiki links
    processed = processed.replace(this.linkPattern, (match, link) => {
      // Handle display text with pipe separator: [[Target|Display Text]]
      const parts = link.split('|');
      const actualLink = parts[0].trim();
      const displayText = parts.length > 1 ? parts[1].trim() : actualLink;

      const linkId = this.generateNoteId(actualLink);
      return `<a href="${linkId}.html" class="internal-link" data-note="${actualLink}">${displayText}</a>`;
    });

    return processed;
  }

  /**
   * Resolve embedded notes by replacing placeholders with actual note content
   */
  resolveEmbeddedNotes(html: string, allNotes: Map<string, Note>): string {
    return html.replace(/<div class="embed-placeholder" data-embed-target="([^"]+)"><\/div>/g, (match, linkText) => {
      // Find the note to embed - try multiple ID generation strategies
      let targetNote: Note | undefined;

      // Strategy 1: Direct ID match
      const directId = this.generateNoteId(linkText);
      targetNote = allNotes.get(directId);

      // Strategy 2: Search by title across all notes
      if (!targetNote) {
        for (const note of allNotes.values()) {
          if (note.title === linkText) {
            targetNote = note;
            break;
          }
        }
      }

      // Strategy 3: Search by filename (without extension)
      if (!targetNote) {
        for (const note of allNotes.values()) {
          const fileName = path.basename(note.path, '.md');
          if (fileName === linkText) {
            targetNote = note;
            break;
          }
        }
      }

      if (!targetNote) {
        // Note not found, return a placeholder
        return `<div class="embed-note embed-error">❌ Note not found: ${linkText}</div>`;
      }

      // Create collapsible embed cartridge
      const embedId = `embed-${targetNote.id}-${Math.random().toString(36).substr(2, 9)}`;

      return `
        <div class="embed-note" data-embed-id="${embedId}">
          <div class="embed-header" onclick="toggleEmbed('${embedId}')">
            <span class="embed-title">${targetNote.title}</span>
            <span class="embed-chevron" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle">
                <path d="M3 8L12 17L21 8"></path>
              </svg>
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
        const linkedNoteId = this.generateNoteId(linkText);
        const linkedNote = notes.get(linkedNoteId);

        if (linkedNote) {
          linkedNote.backlinks.push(note.id);
        }
      });
    });
  }
}
