import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { VaultProcessor } from './vault-processor';
import { generateMainTemplate, generateNoteTemplate, generateBaseHTML, generateNoteHTML } from './templates';
import { VaultStructure, SiteConfig, Note, Base } from './types';

export class SiteGenerator {
  private vaultProcessor: VaultProcessor;

  constructor() {
    this.vaultProcessor = new VaultProcessor();
  }

  /**
   * Generate a complete static site from an Obsidian vault
   */
  async generateSite(
    vaultPath: string,
    outputPath: string,
    config: SiteConfig = { title: 'Obsidian Vault' }
  ): Promise<void> {
    console.log('🚀 Starting site generation...');
    console.log(`📁 Vault: ${vaultPath}`);
    console.log(`📤 Output: ${outputPath}`);

    // Process the vault
    console.log('📖 Processing vault...');
    const vaultStructure = await this.vaultProcessor.processVault(vaultPath);

    // Ensure output directory exists and is clean
    await fs.ensureDir(outputPath);
    await this.cleanOutputDirectory(outputPath);

    // Copy assets
    console.log('📋 Copying assets...');
    await this.copyAssets(outputPath, config);

    // Apply custom CSS
    await this.applyCustomCSS(outputPath, config);

    // Copy attachments
    console.log('🖼️ Copying attachments...');
    await this.copyAttachments(vaultPath, outputPath);

    // Generate HTML files
    console.log('📝 Generating HTML files...');
    await this.generateHTML(vaultStructure, outputPath, config);

    // Generate data files for JavaScript
    console.log('💾 Generating data files...');
    await this.generateDataFiles(vaultStructure, outputPath);

    console.log('✅ Site generation complete!');
  }

  /**
   * Clean the output directory but preserve .git if it exists
   */
  private async cleanOutputDirectory(outputPath: string): Promise<void> {
    const items = await fs.readdir(outputPath).catch(() => []);

    for (const item of items) {
      if (item === '.git') continue; // Preserve git directory
      const itemPath = path.join(outputPath, item);
      await fs.remove(itemPath);
    }
  }

  /**
   * Copy CSS and JavaScript assets
   */
  private async copyAssets(outputDir: string, config: SiteConfig = { title: 'Obsidian Vault' }): Promise<void> {
    const assetsDir = path.join(process.cwd(), 'src', 'assets');
    const outputAssetsDir = path.join(outputDir, 'assets');

    // Create assets directory
    await fs.mkdir(outputAssetsDir, { recursive: true });

    // Copy main assets
    const files = await fs.readdir(assetsDir);
    for (const file of files) {
      const sourcePath = path.join(assetsDir, file);
      const targetPath = path.join(outputAssetsDir, file);

      // Read the file
      let content = await fs.readFile(sourcePath, 'utf-8');

      // If it's main.css and we have a basePath, update font URLs
      if (file === 'main.css' && config.basePath) {
        content = content.replace(/url\('\/assets\//g, `url('${config.basePath}/assets/`);
        content = content.replace(/url\("\/assets\//g, `url("${config.basePath}/assets/`);
        content = content.replace(/url\(\/assets\//g, `url(${config.basePath}/assets/`);
      }

      await fs.writeFile(targetPath, content);
    }

    // Create fonts directory
    const fontsDir = path.join(outputAssetsDir, 'fonts');
    await fs.mkdir(fontsDir, { recursive: true });

    // Copy Monaspace Neon font
    const monaspaceFont = path.join(
      process.cwd(),
      'node_modules/@fontsource/monaspace-neon/files/monaspace-neon-latin-400-normal.woff2'
    );

    const monaspaceTarget = path.join(fontsDir, 'MonaspaceNeon-Regular.woff2');
    await fs.copyFile(monaspaceFont, monaspaceTarget);

    // Copy Mona Sans fonts
    const monaSansWeights = ['400', '500', '600', '700'];
    for (const weight of monaSansWeights) {
      const monaSansFont = path.join(
        process.cwd(),
        `node_modules/@fontsource/mona-sans/files/mona-sans-latin-${weight}-normal.woff2`
      );
      const monaSansTarget = path.join(fontsDir, `MonaSans-${weight}.woff2`);
      await fs.copyFile(monaSansFont, monaSansTarget);
    }

    // Copy KaTeX CSS for math rendering
    const katexCSS = path.join(
      process.cwd(),
      'node_modules/katex/dist/katex.min.css'
    );
    const katexTarget = path.join(outputAssetsDir, 'katex.min.css');
    await fs.copyFile(katexCSS, katexTarget);

    // Copy D3.js for graph rendering
    const d3JS = path.join(
      process.cwd(),
      'node_modules/d3/dist/d3.min.js'
    );
    const d3Target = path.join(outputAssetsDir, 'd3.min.js');
    await fs.copyFile(d3JS, d3Target);

    // Copy Mermaid.js for diagram rendering
    const mermaidJS = path.join(
      process.cwd(),
      'node_modules/mermaid/dist/mermaid.min.js'
    );
    const mermaidTarget = path.join(outputAssetsDir, 'mermaid.min.js');
    await fs.copyFile(mermaidJS, mermaidTarget);

    // Copy KaTeX fonts to the existing fonts directory
    const katexFontsSource = path.join(
      process.cwd(),
      'node_modules/katex/dist/fonts'
    );
    const katexFontsTarget = path.join(outputAssetsDir, 'fonts');

    // Ensure fonts directory exists and copy KaTeX fonts
    await fs.ensureDir(katexFontsTarget);
    const katexFontFiles = await fs.readdir(katexFontsSource);
    for (const fontFile of katexFontFiles) {
      await fs.copy(
        path.join(katexFontsSource, fontFile),
        path.join(katexFontsTarget, fontFile)
      );
    }
  }

  /**
   * Copy attachment files (images, etc.) from the entire vault
   */
  private async copyAttachments(vaultPath: string, outputPath: string): Promise<void> {
    // Copy traditional Attachments folder if it exists
    const attachmentsPath = path.join(vaultPath, 'Attachments');
    const outputAttachmentsPath = path.join(outputPath, 'attachments');

    if (await fs.pathExists(attachmentsPath)) {
      await fs.copy(attachmentsPath, outputAttachmentsPath);
    }

    // Also copy all image files from the vault, preserving folder structure
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

    for (const ext of imageExtensions) {
      const imageFiles = await glob(`**/*${ext}`, {
        cwd: vaultPath,
        absolute: false,
        nodir: true
      });

      for (const imageFile of imageFiles) {
        const sourcePath = path.join(vaultPath, imageFile);
        const destPath = path.join(outputPath, imageFile);

        // Ensure destination directory exists
        await fs.ensureDir(path.dirname(destPath));

        // Copy the image file
        await fs.copy(sourcePath, destPath);
      }
    }
  }

  /**
   * Generate HTML files for all notes and the main index
   */
  private async generateHTML(
    vaultStructure: VaultStructure,
    outputPath: string,
    config: SiteConfig
  ): Promise<void> {
    const { notes, bases } = vaultStructure;
    const basePath = config.basePath || '';

    // Generate index.html (main page)
    const indexHtml = generateMainTemplate(config.title, basePath);
    await fs.writeFile(path.join(outputPath, 'index.html'), indexHtml);

    // Generate individual note pages
    for (const note of notes.values()) {
      const backlinks = note.backlinks
        .map(id => notes.get(id))
        .filter((n): n is Note => n !== undefined)
        .map(n => n.title);

      // Use generateNoteTemplate with the actual note content
      const noteContent = generateNoteTemplate(note.title, note.html, note.frontMatterHtml, backlinks);
      // Wrap the note content in a proper HTML structure - pass both vault title and note title
      const noteHtml = generateNoteHTML(noteContent, config.title, basePath, note.title);
      const noteFileName = `${note.id}.html`;

      // Create nested directory structure if needed  
      const noteFilePath = path.join(outputPath, noteFileName);
      const noteDir = path.dirname(noteFilePath);
      await fs.ensureDir(noteDir);

      await fs.writeFile(noteFilePath, noteHtml);
    }

    // Generate individual base pages
    for (const base of bases.values()) {
      const baseHtml = generateBaseHTML(base, config.title, basePath, this.vaultProcessor.getMarkdownProcessor());

      // Create proper folder structure for bases, just like notes
      const baseDir = path.join(outputPath, base.folderPath.toLowerCase());
      await fs.ensureDir(baseDir);

      const baseFileName = `${path.basename(base.relativePath, '.base').toLowerCase()}.html`;
      const baseFilePath = path.join(baseDir, baseFileName);

      await fs.writeFile(baseFilePath, baseHtml);
    }
  }

  /**
   * Generate JSON data files for client-side JavaScript
   */
  private async generateDataFiles(
    vaultStructure: VaultStructure,
    outputPath: string
  ): Promise<void> {
    const dataDir = path.join(outputPath, 'data');
    await fs.ensureDir(dataDir);

    const { notes, bases, linkGraph, categories, tags, folderStructure } = vaultStructure;

    // Convert maps to objects for JSON serialization
    const notesObject: Record<string, any> = {};
    notes.forEach((note, id) => {
      notesObject[id] = {
        id: note.id,
        title: note.title,
        html: note.html,
        frontMatterHtml: note.frontMatterHtml,
        content: note.content.substring(0, 500), // Truncate for search
        links: note.links,
        backlinks: note.backlinks,
        frontMatter: note.frontMatter,
        fileStats: note.fileStats, // Include file statistics
        folderPath: note.folderPath // Include folder path for image resolution
      };
    });

    const linkGraphObject: Record<string, string[]> = {};
    linkGraph.forEach((targets, source) => {
      linkGraphObject[source] = Array.from(targets);
    });

    const categoriesObject: Record<string, string[]> = {};
    categories.forEach((noteIds, category) => {
      categoriesObject[category] = noteIds;
    });

    const tagsObject: Record<string, string[]> = {};
    tags.forEach((noteIds, tag) => {
      tagsObject[tag] = noteIds;
    });

    // Convert bases map to object
    const basesObject: Record<string, any> = {};
    bases.forEach((base, id) => {
      basesObject[id] = {
        id: base.id,
        title: base.title,
        relativePath: base.relativePath,
        folderPath: base.folderPath,
        filters: base.filters,
        views: base.views,
        properties: base.properties,
        formulas: base.formulas,
        matchedNotes: base.matchedNotes?.map(note => note.id) || []
      };
    });

    // Write data files
    await fs.writeFile(
      path.join(dataDir, 'notes.json'),
      JSON.stringify({
        notes: notesObject,
        bases: basesObject,
        linkGraph: linkGraphObject,
        categories: categoriesObject,
        tags: tagsObject,
        folderStructure: folderStructure
      }, null, 2)
    );

    // Generate search index
    const searchIndex = Array.from(notes.values()).map(note => ({
      id: note.id,
      title: note.title,
      content: note.content.substring(0, 1000),
      url: `${note.id}.html`
    }));

    await fs.writeFile(
      path.join(dataDir, 'search.json'),
      JSON.stringify(searchIndex, null, 2)
    );
  }

  /**
   * Apply custom configuration to CSS
   */
  private async applyCustomCSS(
    outputPath: string,
    config: SiteConfig
  ): Promise<void> {
    const cssPath = path.join(outputPath, 'styles', 'main.css');

    if (!await fs.pathExists(cssPath)) return;

    let css = await fs.readFile(cssPath, 'utf-8');

    // Apply theme-aware customization
    if (config.customization) {
      // Apply common variables to :root - replace existing values
      if (config.customization.common) {
        for (const [key, value] of Object.entries(config.customization.common)) {
          const regex = new RegExp(`(--${key}):\\s*[^;]+;`, 'g');
          css = css.replace(regex, `$1: ${value};`);
        }
      }

      // Apply light theme variables - replace existing values only in light theme section
      if (config.customization.light) {
        // Find the light theme section
        const lightThemeStart = css.indexOf(':root,\n[data-theme="light"] {');
        const lightThemeEnd = css.indexOf('}', lightThemeStart);

        if (lightThemeStart !== -1 && lightThemeEnd !== -1) {
          let lightThemeSection = css.substring(lightThemeStart, lightThemeEnd + 1);

          for (const [key, value] of Object.entries(config.customization.light)) {
            const regex = new RegExp(`(--${key}):\\s*[^;]+;`, 'g');
            lightThemeSection = lightThemeSection.replace(regex, `$1: ${value};`);
          }

          // Replace the light theme section in the full CSS
          css = css.substring(0, lightThemeStart) + lightThemeSection + css.substring(lightThemeEnd + 1);
        }
      }

      // Apply dark theme variables - replace existing values only in dark theme section
      if (config.customization.dark) {
        // Find the dark theme section
        const darkThemeStart = css.indexOf('[data-theme="dark"] {');
        const darkThemeEnd = css.indexOf('}', darkThemeStart);

        if (darkThemeStart !== -1 && darkThemeEnd !== -1) {
          let darkThemeSection = css.substring(darkThemeStart, darkThemeEnd + 1);

          for (const [key, value] of Object.entries(config.customization.dark)) {
            const regex = new RegExp(`(--${key}):\\s*[^;]+;`, 'g');
            darkThemeSection = darkThemeSection.replace(regex, `$1: ${value};`);
          }

          // Replace the dark theme section in the full CSS
          css = css.substring(0, darkThemeStart) + darkThemeSection + css.substring(darkThemeEnd + 1);
        }
      }
    }

    // Legacy support for cssVariables (deprecated)
    if (config.cssVariables) {
      const customVariables = Object.entries(config.cssVariables)
        .map(([key, value]) => `  --${key}: ${value};`)
        .join('\n');

      css = css.replace(
        ':root {',
        `:root {\n${customVariables}`
      );
    }

    // Apply custom fonts
    if (config.fonts) {
      if (config.fonts.main) {
        css = css.replace(
          /--font-family-main:.*?;/,
          `--font-family-main: ${config.fonts.main};`
        );
      }
      if (config.fonts.heading) {
        css = css.replace(
          /--font-family-heading:.*?;/,
          `--font-family-heading: ${config.fonts.heading};`
        );
      }
      if (config.fonts.code) {
        css = css.replace(
          /--font-family-code:.*?;/,
          `--font-family-code: ${config.fonts.code};`
        );
      }
    }

    await fs.writeFile(cssPath, css);
  }

  /**
   * Generate a simple sitemap
   */
  private async generateSitemap(
    vaultStructure: VaultStructure,
    outputPath: string,
    baseUrl: string = ''
  ): Promise<void> {
    const { notes } = vaultStructure;

    const sitemap = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      `  <url><loc>${baseUrl}/</loc></url>`,
      ...Array.from(notes.values()).map(note =>
        `  <url><loc>${baseUrl}/${note.id}.html</loc></url>`
      ),
      '</urlset>'
    ].join('\n');

    await fs.writeFile(path.join(outputPath, 'sitemap.xml'), sitemap);
  }
}
