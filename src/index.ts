// Main exports for the Obsidian SSG library
export { SiteGenerator } from './site-generator';
export { VaultProcessor } from './vault-processor';
export { MarkdownProcessor } from './markdown-processor';
export { generateMainTemplate, generateNoteTemplate } from './templates';
export type { Note, VaultStructure, SiteConfig, FrontMatter } from './types';

// Re-export the CLI for programmatic usage
export * from './cli';
