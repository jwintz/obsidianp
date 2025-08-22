import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { MarkdownProcessor } from './markdown-processor';
import { BaseProcessor } from './base-processor';
import { Note, VaultStructure, SiteConfig, FolderNode, Base } from './types';

export class VaultProcessor {
  private markdownProcessor: MarkdownProcessor;
  private baseProcessor: BaseProcessor;

  constructor() {
    this.markdownProcessor = new MarkdownProcessor();
    this.baseProcessor = new BaseProcessor();
  }

  /**
   * Process an entire Obsidian vault directory
   */
  async processVault(vaultPath: string): Promise<VaultStructure> {
    // Initialize the markdown processor (including Shiki)
    await this.markdownProcessor.initialize();

    const notes = new Map<string, Note>();
    const bases = new Map<string, Base>();
    const linkGraph = new Map<string, Set<string>>();
    const categories = new Map<string, string[]>();
    const tags = new Map<string, string[]>();

    // Find all markdown files
    const markdownFiles = await glob('**/*.md', {
      cwd: vaultPath,
      absolute: true
    });

    // Find all base files
    const baseFiles = await glob('**/*.base', {
      cwd: vaultPath,
      absolute: true
    });

    // Process each markdown file
    for (const filePath of markdownFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const note = this.markdownProcessor.processMarkdown(filePath, content, vaultPath);

        notes.set(note.id, note);

        // Build link graph
        linkGraph.set(note.id, new Set(note.links.map(link =>
          this.generateNoteId(link)
        )));

        // Index categories
        if (note.frontMatter.categories) {
          const categoryList = Array.isArray(note.frontMatter.categories)
            ? note.frontMatter.categories
            : [note.frontMatter.categories];

          categoryList.forEach(category => {
            const cleanCategory = this.cleanWikiLink(category);
            if (!categories.has(cleanCategory)) {
              categories.set(cleanCategory, []);
            }
            categories.get(cleanCategory)?.push(note.id);
          });
        }

        // Index tags
        if (note.frontMatter.tags) {
          const tagList = Array.isArray(note.frontMatter.tags)
            ? note.frontMatter.tags
            : [note.frontMatter.tags];

          tagList.forEach(tag => {
            if (!tags.has(tag)) {
              tags.set(tag, []);
            }
            tags.get(tag)?.push(note.id);
          });
        }
      } catch (error) {
        console.warn(`Failed to process file ${filePath}:`, error);
      }
    }

    // Process base files
    console.log('🗄️ Processing base files...');
    for (const filePath of baseFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const base = this.baseProcessor.processBase(filePath, content, vaultPath);

        // Filter notes for this base
        const filteredNotes = this.baseProcessor.filterNotes(base, notes);

        // Process formulas if any
        const processedNotes = this.baseProcessor.processFormulas(base, filteredNotes);
        base.matchedNotes = processedNotes;

        bases.set(base.id, base);
      } catch (error) {
        console.warn(`Failed to process base file ${filePath}:`, error);
      }
    }

    // Generate backlinks
    this.markdownProcessor.generateBacklinks(notes);

    // Resolve embedded notes now that all notes are processed
    console.log('🔗 Resolving embedded notes...');
    notes.forEach(note => {
      note.html = this.markdownProcessor.resolveEmbeddedNotes(note.html, notes, bases);
    });

    // Build folder structure
    const folderStructure = this.buildFolderStructure(notes, bases, vaultPath);

    return { notes, bases, linkGraph, categories, tags, folderStructure };
  }

  /**
   * Clean wiki-style links by removing [[ ]]
   */
  private cleanWikiLink(link: string): string {
    return link.replace(/^\[\[|\]\]$/g, '');
  }

  /**
   * Generate a note ID from a title or filename
   */
  private generateNoteId(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  /**
   * Build folder structure tree from notes and bases
   */
  private buildFolderStructure(notes: Map<string, Note>, bases: Map<string, Base>, vaultPath: string): FolderNode[] {
    const folderMap = new Map<string, FolderNode>();
    const rootNodes: FolderNode[] = [];

    // Create folder nodes
    notes.forEach(note => {
      const parts = note.folderPath.split('/').filter(part => part !== '');
      let currentPath = '';
      let parentNode: FolderNode | undefined = undefined;

      // Create folder hierarchy
      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!folderMap.has(currentPath)) {
          const folderNode: FolderNode = {
            name: part,
            path: currentPath,
            type: 'folder',
            children: []
          };

          folderMap.set(currentPath, folderNode);

          if (parentNode) {
            parentNode.children.push(folderNode);
          } else {
            rootNodes.push(folderNode);
          }
        }

        parentNode = folderMap.get(currentPath);
      });

      // Add the note as a file node
      const fileNode: FolderNode = {
        name: note.title,
        path: note.relativePath,
        type: 'file',
        children: [],
        noteId: note.id
      };

      if (parentNode !== undefined) {
        (parentNode as FolderNode).children.push(fileNode);
      } else {
        // Note is in root directory
        rootNodes.push(fileNode);
      }
    });

    // Add bases to the folder structure
    bases.forEach(base => {
      const parts = base.folderPath.split('/').filter(part => part !== '');
      let currentPath = '';
      let parentNode: FolderNode | undefined = undefined;

      // Create folder hierarchy for bases (same logic as notes)
      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!folderMap.has(currentPath)) {
          const folderNode: FolderNode = {
            name: part,
            path: currentPath,
            type: 'folder',
            children: []
          };

          folderMap.set(currentPath, folderNode);

          if (parentNode) {
            parentNode.children.push(folderNode);
          } else {
            rootNodes.push(folderNode);
          }
        }

        parentNode = folderMap.get(currentPath);
      });

      // Add the base as a file node
      const baseFileNode: FolderNode = {
        name: base.title,
        path: base.relativePath,
        type: 'file',
        children: [],
        noteId: base.id
      };

      if (parentNode !== undefined) {
        (parentNode as FolderNode).children.push(baseFileNode);
      } else {
        // Base is in root directory
        rootNodes.push(baseFileNode);
      }
    });

    // Sort nodes (folders first, then files, both alphabetically)
    const sortNodes = (nodes: FolderNode[]): FolderNode[] => {
      return nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      }).map(node => ({
        ...node,
        children: sortNodes(node.children)
      }));
    };

    return sortNodes(rootNodes);
  }
}
