#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
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
      } else {
        // Look for default config files
        const defaultConfigs = ['obsidianp.config.jsonc', 'obsidianp.config.json'];
        for (const configFile of defaultConfigs) {
          if (await fs.pathExists(configFile)) {
            try {
              const configContent = await fs.readFile(configFile, 'utf-8');
              const cleanedContent = stripComments(configContent);
              const configData = JSON.parse(cleanedContent);
              config = { ...config, ...configData };
              console.log(`📝 Found and loaded configuration from ${configFile}`);
              break;
            } catch (error) {
              console.warn(`⚠️ Warning: Could not load config file: ${configFile}`);
            }
          }
        }
      }

      // Override config with command line options
      if (options.title) {
        config.title = options.title;
        console.log(`📝 Using title from command line: "${options.title}"`);
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
  .description('Generate and serve the site locally')
  .argument('<vault-path>', 'Path to the Obsidian vault directory')
  .option('-p, --port <port>', 'Port to serve on', '8000')
  .option('-t, --title <title>', 'Site title (overrides config file)')
  .option('-c, --config <config-file>', 'Path to configuration file')
  .action(async (vaultPath: string, options: any) => {
    try {
      const { spawn } = await import('child_process');

      // Create temporary output directory
      const tmpDir = await fs.mkdtemp(path.join(require('os').tmpdir(), 'obsidianp-'));

      console.log('🔮 Generating site...');

      // Generate site
      const resolvedVaultPath = path.resolve(vaultPath);
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
        }
      } else {
        // Look for default config files
        const defaultConfigs = ['obsidianp.config.jsonc', 'obsidianp.config.json'];
        for (const configFile of defaultConfigs) {
          if (await fs.pathExists(configFile)) {
            try {
              const configContent = await fs.readFile(configFile, 'utf-8');
              const cleanedContent = stripComments(configContent);
              const configData = JSON.parse(cleanedContent);
              config = { ...config, ...configData };
              console.log(`📝 Found and loaded configuration from ${configFile}`);
              break;
            } catch (error) {
              console.warn(`⚠️ Warning: Could not load config file: ${configFile}`);
            }
          }
        }
      }

      // Override config with command line options
      if (options.title) {
        config.title = options.title;
        console.log(`📝 Using title from command line: "${options.title}"`);
      }

      const generator = new SiteGenerator();
      await generator.generateSite(resolvedVaultPath, tmpDir, config);

      console.log(`🌐 Starting server on http://localhost:${options.port}`);
      console.log('Press Ctrl+C to stop the server');
      console.log('');

      // Use npx serve - users already have Node.js if they're using this tool
      const server = spawn('npx', ['serve', '-l', options.port], {
        cwd: tmpDir,
        stdio: 'inherit'
      });

      // Cleanup on exit
      process.on('SIGINT', () => {
        server.kill();
        fs.remove(tmpDir).catch(() => { });
        console.log('\n👋 Server stopped');
        process.exit(0);
      });

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
