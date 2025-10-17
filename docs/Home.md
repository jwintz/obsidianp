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
- **[[Features/Search System|Full-Text Search]]** - Fast, client-side search powered by Lunr.js
- **Wiki-Links** - Full support for `[[Wiki Links]]` with automatic resolution
- **Backlinks** - Automatic bidirectional linking between notes
- **Responsive Design** - Mobile-friendly with light/dark theme support

### Obsidian Syntax Support
- **Math Rendering** - LaTeX equations with KaTeX (inline `$...$` and block `$$...$$`)
- **Mermaid Diagrams** - Flow charts, sequence diagrams, gantt charts, and more
- **ABC Music Notation** - Musical scores with ABC.js rendering
- **Code Highlighting** - Syntax highlighting for 100+ languages with Shiki
- **Callouts** - Obsidian-style callouts (`> [!note]`, `> [!warning]`, etc.)
- **Obsidian Databases** - Native database support with table, card, and calendar views
- **Embeds** - Image and note embeds (`![[image.png]]`, `![[note]]`)
- **Tags** - Full tag support with # syntax

## Getting Started

1. [[Getting-Started/Installation|Installation]] - Set up Obsidian:P
2. [[Getting-Started/Configuration|Configuration]] - Configure your site
3. [[Getting-Started/Building Sites|Building Sites]] - Generate your static site
4. [[Getting-Started/Deployment|Deployment]] - Deploy to hosting services

**Additional Resources:**
- [[Getting-Started/AI-Assisted Documentation|AI-Assisted Documentation]] - Maintain docs with AI

## Architecture

- [[Architecture/Core Components|Core Components]] - Main system components
- File structure and organization
- Processing pipeline overview

## API Reference

- [[API-Reference/VaultProcessor API|VaultProcessor API]] - Vault processing
- [[API-Reference/GraphRenderer API|GraphRenderer API]] - Graph visualization
- [[API-Reference/MarkdownProcessor API|MarkdownProcessor API]] - Markdown transformation
- [[API-Reference/SiteGenerator API|SiteGenerator API]] - Site generation

---

Read Next: [[Getting-Started/Installation|Installation]]
