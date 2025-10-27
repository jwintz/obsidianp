---
description: Complete documentation for Obsidian:P - a static site generator for Obsidian vaults
tags:
  - documentation
  - overview
  - getting-started
  - home
type: index
category: documentation
audience: all
difficulty: beginner
last_updated: 2025-10-17
---

# Obsidian:P Documentation

Welcome to the **Obsidian:P** documentation vault - a static site generator that transforms your Obsidian vault into a beautiful, interactive website.

## Overview

Obsidian:P is a TypeScript-based static site generator specifically designed for Obsidian vaults. It preserves the interconnected nature of your notes while adding powerful features like interactive graph views, search, and navigation.

## Key Features

### Core Features
- **[[Features/Interactive Graph Views|Interactive Graph Views]]** - Local and global graph visualization with D3.js
- **[[Features/Search System|Full-Text Search]]** - Fast, client-side search
- **Wiki-Links** - Full support for `[[Wiki Links]]` with automatic resolution
- **Backlinks** - Automatic bidirectional linking between notes
- **Responsive Design** - Mobile-friendly with light/dark theme support
- **[[Features/Syntax Reference|Complete Syntax Support]]** - All Obsidian markdown features

### Obsidian Syntax Support
- **Math Rendering** - LaTeX equations with KaTeX (inline `$...$` and block `$$...$$`)
- **Mermaid Diagrams** - Flow charts, sequence diagrams, gantt charts, and more
- **ABC Music Notation** - Musical scores with ABCJS rendering
- **Code Highlighting** - Syntax highlighting for 100+ languages with Shiki (dual theme support)
- **Callouts** - Obsidian-style callouts (`> [!note]`, `> [!warning]`, etc.)
- **Obsidian Databases** - Native database support with `.base` files for table and card views
- **Embeds** - Image and note embeds (`![[image.png]]`, `![[note]]`, `![[note#view]]`)
- **Tags** - Full tag support with `#` syntax

## Getting Started

1. [[Getting-Started/Installation|Installation]] - Set up Obsidian:P
2. [[Getting-Started/Configuration|Configuration]] - Configure your site
3. [[Getting-Started/Building Sites|Building Sites]] - Generate your static site
4. [[Getting-Started/Deployment|Deployment]] - Deploy to hosting services

## Architecture

- [[Architecture/Core Components|Core Components]] - Main system components
- File structure and organization
- Processing pipeline overview

## API Reference

- [[API-Reference/VaultProcessor API|VaultProcessor API]] - Vault processing and structure building
- [[API-Reference/MarkdownProcessor API|MarkdownProcessor API]] - Markdown transformation
- [[API-Reference/SiteGenerator API|SiteGenerator API]] - Site generation
- [[API-Reference/BaseProcessor API|BaseProcessor API]] - Database file processing

## Features

- [[Features/Syntax Reference|Syntax Reference]] - Complete syntax guide with examples
- [[Features/Interactive Graph Views|Interactive Graph Views]] - Graph visualization
- [[Features/Search System|Search System]] - Client-side search

---

Read Next: [[Getting-Started/Installation|Installation]]
