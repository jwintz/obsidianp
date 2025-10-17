#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as chokidar from 'chokidar';
import stripComments from 'strip-json-comments';
import { SiteGenerator } from './site-generator';
import { SiteConfig } from './types';

// Shared default configuration used across all commands
const DEFAULT_CONFIG: SiteConfig = {
  title: 'Vault',
};

const program = new Command();

program
  .name('obsidianp')
  .description('Static Site Generator for Obsidian vaults')
  .version('1.0.0');

program
  .command('generate')
  .alias('gen')
  .description('Generate a static site from an Obsidian vault')
  .argument('<vault-path>', 'Path to the Obsidian vault directory')
  .argument('<output-path>', 'Path to the output directory')
  .option('-t, --title <title>', 'Site title (overrides config file)')
  .option('-b, --base-path <path>', 'Base path for hosting in subfolders (e.g., "/poseidon")')
  .option('-c, --config <config-file>', 'Path to configuration file')
  .action(async (vaultPath: string, outputPath: string, options: any) => {
    try {
      // Resolve paths
      const resolvedVaultPath = path.resolve(vaultPath);
      const resolvedOutputPath = path.resolve(outputPath);

      // Validate vault path
      if (!await fs.pathExists(resolvedVaultPath)) {
        console.error(`❌ Error: Vault directory does not exist: ${resolvedVaultPath}`);
        process.exit(1);
      }

      // Load configuration with defaults
      let config: SiteConfig = { ...DEFAULT_CONFIG };

      if (options.config) {
        const configPath = path.resolve(options.config);
        if (await fs.pathExists(configPath)) {
          try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            // Handle both .json and .jsonc files by stripping comments
            const cleanedContent = stripComments(configContent);
            const configData = JSON.parse(cleanedContent);
            config = { ...config, ...configData };
            console.log(`📝 Loaded configuration from ${configPath}`);
          } catch (error) {
            console.warn(`⚠️ Warning: Could not load config file: ${configPath}`);
            console.warn(`   Error: ${error instanceof Error ? error.message : error}`);
          }
        } else {
          console.warn(`⚠️ Warning: Config file not found: ${configPath}`);
        }
      }

      // Override config with command line options
      if (options.title) {
        config.title = options.title;
        console.log(`📝 Using title from command line: "${options.title}"`);
      }

      if (options.basePath !== undefined) {
        config.basePath = options.basePath;
        console.log(`📝 Using base path from command line: "${options.basePath}"`);
      }

      console.log('');
      console.log('🔮 Obsidian Static Site Generator');
      console.log('================================');
      console.log('');

      // Generate the site
      const generator = new SiteGenerator();
      await generator.generateSite(resolvedVaultPath, resolvedOutputPath, config);

      console.log('');
      console.log('🎉 Success! Your Obsidian vault has been converted to a static site.');
      console.log(`📂 Output: ${resolvedOutputPath}`);
      console.log('');
      console.log('To serve the site locally, run:');
      console.log(`   cd ${path.relative(process.cwd(), resolvedOutputPath)}`);
      console.log(`   npx serve`);
      console.log('');
      console.log('Then open http://localhost:3000 in your browser.');

    } catch (error) {
      console.error('❌ Error generating site:', error);
      process.exit(1);
    }
  });

program
  .command('serve')
  .description('Generate and serve the site locally with file watching')
  .argument('<vault-path>', 'Path to the Obsidian vault directory')
  .option('-p, --port <port>', 'Port to serve on', '8000')
  .option('-t, --title <title>', 'Site title (overrides config file)')
  .option('-b, --base-path <path>', 'Base path for hosting in subfolders (e.g., "/poseidon")')
  .option('-c, --config <config-file>', 'Path to configuration file')
  .option('--no-watch', 'Disable file watching')
  .action(async (vaultPath: string, options: any) => {
    try {
      const { spawn } = await import('child_process');

      // Create temporary output directory
      const tmpDir = await fs.mkdtemp(path.join(require('os').tmpdir(), 'obsidianp-'));

      const resolvedVaultPath = path.resolve(vaultPath);

      // Validate vault path
      if (!await fs.pathExists(resolvedVaultPath)) {
        console.error(`❌ Error: Vault directory does not exist: ${resolvedVaultPath}`);
        process.exit(1);
      }

      console.log('🔮 Generating site...');

      let config: SiteConfig = { ...DEFAULT_CONFIG };

      // Load configuration
      const loadConfig = async () => {
        config = { ...DEFAULT_CONFIG };

        if (options.config) {
          const configPath = path.resolve(options.config);
          if (await fs.pathExists(configPath)) {
            try {
              const configContent = await fs.readFile(configPath, 'utf-8');
              const cleanedContent = stripComments(configContent);
              const configData = JSON.parse(cleanedContent);
              config = { ...config, ...configData };
              console.log(`📝 Loaded configuration from ${configPath}`);
            } catch (error) {
              console.warn(`⚠️ Warning: Could not load config file: ${configPath}`);
              console.warn(`   Error: ${error instanceof Error ? error.message : error}`);
            }
          }
        }

        // Override config with command line options
        if (options.title) {
          config.title = options.title;
        }

        if (options.basePath !== undefined) {
          config.basePath = options.basePath;
        }
      };

      await loadConfig();

      const generator = new SiteGenerator();

      // Generate site initially
      await generator.generateSite(resolvedVaultPath, tmpDir, config);
      console.log('✅ Initial generation complete');

      let isRegenerating = false;
      let debounceTimer: NodeJS.Timeout | null = null;

      // Function to regenerate the site
      const regenerate = async (changedPath?: string) => {
        if (isRegenerating) return;

        isRegenerating = true;

        try {
          const relativePath = changedPath ? path.relative(resolvedVaultPath, changedPath) : '';
          console.log(`📝 File changed${relativePath ? `: ${relativePath}` : ''}`);
          console.log('🔄 Regenerating site...');

          // Reload config in case it changed
          await loadConfig();

          await generator.generateSite(resolvedVaultPath, tmpDir, config);
          console.log('✅ Regeneration complete');
        } catch (error) {
          console.error('❌ Error during regeneration:', error);
        } finally {
          isRegenerating = false;
        }
      };

      // Set up file watching if enabled
      if (options.watch !== false) {
        console.log('👀 Watching for file changes...');

        const watcher = chokidar.watch(resolvedVaultPath, {
          ignored: [
            '**/.*', // Hidden files
            '**/node_modules/**',
            '**/.obsidian/**',
            '**/Attachments/**' // Obsidian attachments (we copy these separately)
          ],
          ignoreInitial: true,
          persistent: true
        });

        // Debounced regeneration
        const debouncedRegenerate = (filePath: string) => {
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }

          debounceTimer = setTimeout(() => {
            regenerate(filePath);
          }, 500); // 500ms debounce
        };

        watcher.on('change', debouncedRegenerate);
        watcher.on('add', debouncedRegenerate);
        watcher.on('unlink', debouncedRegenerate);

        // Also watch config files
        const configFiles = ['obsidianp.config.jsonc', 'obsidianp.config.json'];
        if (options.config) {
          configFiles.push(path.resolve(options.config));
        }

        for (const configFile of configFiles) {
          if (await fs.pathExists(configFile)) {
            chokidar.watch(configFile, { ignoreInitial: true })
              .on('change', () => {
                console.log('⚙️ Configuration changed');
                debouncedRegenerate(configFile);
              });
          }
        }
      }

      console.log(`🌐 Starting server on http://localhost:${options.port}`);
      console.log('Press Ctrl+C to stop the server');
      console.log('');

      // Use npx serve
      const server = spawn('npx', ['serve', '-l', options.port], {
        cwd: tmpDir,
        stdio: 'inherit'
      });

      // Cleanup on exit
      const cleanup = () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        server.kill();
        fs.remove(tmpDir).catch(() => { });
        console.log('\n👋 Server stopped');
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      server.on('error', (error: any) => {
        if (error.code === 'ENOENT') {
          console.error('❌ Failed to start server. Please ensure you have Node.js installed.');
          console.error('   You can also manually serve the generated files with any static server.');
        } else {
          console.error('❌ Error starting server:', error);
        }
        process.exit(1);
      });

    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a configuration file')
  .option('-o, --output <file>', 'Output configuration file', 'obsidianp.config.json')
  .action(async (options: any) => {
    const configPath = path.resolve(options.output);

    try {
      await fs.writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
      console.log(`✅ Configuration file created: ${configPath}`);
      console.log('');
      console.log('You can now edit this file to customize your site appearance.');
      console.log('Available options:');
      console.log('  - title: Site title');
      console.log('  - basePath: Base path for hosting in subfolders (e.g., "/poseidon")');
      console.log('  - theme: Default theme (light, dark, auto)');
      console.log('  - fonts: Custom font families');
      console.log('  - customization: Theme-aware CSS variables (common, light, dark)');
    } catch (error) {
      console.error('❌ Error creating configuration file:', error);
      process.exit(1);
    }
  });

// Show help if no arguments provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse();
