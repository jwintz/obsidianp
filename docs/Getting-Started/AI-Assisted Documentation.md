---
description: Using AI assistants to create and maintain comprehensive documentation
tags:
  - documentation
  - ai
  - prompts
  - automation
  - best-practices
type: guide
category: getting-started
audience: developers
difficulty: intermediate
estimated_time: 20 minutes
last_updated: 2025-10-17
---

# AI-Assisted Documentation

Learn how to use AI assistants effectively to create and maintain high-quality documentation for existing codebases using ObsidianP.

## Core Documentation Prompts

These are the essential prompts for initializing and maintaining documentation for an existing codebase.

### Initial Documentation Creation

**Primary Initialization Prompt:**

```
Under the `docs` directory, create comprehensive documentation for this codebase 
focusing on both theoretical and technical aspects.

Requirements:
- Use folders to organize notes by category (Getting-Started, Architecture, 
  Features, API-Reference)
- Each note must have YAML frontmatter with a consistent comprehensive set of 
  properties: description, tags, type, category, audience, difficulty, 
  estimated_time, last_updated
- Each note must end with a "Read Next" section mentioning ONE note to build 
  a linear reading flow through the entire documentation
- Do not include tags in note contents except in the frontmatter
- Never use emojis in documentation
- Do not create summary documents or overview files (except Home.md)
- Use wiki-link format [[Note Name]] for cross-references
- Use code blocks with proper language tags for all code examples

Structure:
1. Home.md - Entry point with feature overview and getting started links
2. Getting-Started/ - Installation, configuration, usage tutorials  
3. Architecture/ - System design, core components, patterns
4. Features/ - Individual feature documentation with examples
5. API-Reference/ - Class/module/function documentation

Analyze the codebase structure to determine:
- Primary programming language(s)
- Main frameworks and libraries used
- Entry points and core modules
- Key abstractions and patterns

Source code location: [specify source directory, e.g., src/, lib/, app/]
```

### Maintenance and Updates

**Update Prompt:**

```
Whenever the source code updates, maintain the documentation to be consistent.

Process:
1. Identify changed files and their impact
2. Find all documentation that references changed APIs or features
3. Update code examples to match new signatures
4. Add documentation for new features
5. Remove or update deprecated content
6. Verify all wiki-links still resolve
7. Maintain the linear reading flow in "Read Next" sections

Never use emojis. Do not create summary files.
```

**Validation Prompt:**

```
Cross-check documentation against current source code:

1. Verify all API signatures match actual implementations
2. Check configuration examples against type definitions
3. Validate code examples would execute correctly
4. Ensure all public APIs are documented
5. Confirm wiki-links point to existing notes
6. Verify linear reading path is complete and coherent

Report discrepancies with file locations and corrections.
Never use emojis. Do not create summary documents.
```

## Documentation Constraints

### Style Guidelines

**Always:**
- Use YAML frontmatter on every note
- Organize with clear folder structure
- Create linear reading flow with single "Read Next" link
- Use wiki-links for cross-references
- Include code examples with proper syntax highlighting
- Document both theory and implementation

**Never:**
- Use emojis (❌ ✅ 🎉 📝 etc.)
- Create summary or overview files (except Home.md)
- Use tags in note body (only in frontmatter)
- Break the linear reading path
- Leave notes without "Read Next" section
- Include outdated code examples

### Frontmatter Template

Every note must include:

```yaml
---
description: Brief description of note content
tags:
  - relevant
  - categorization
  - keywords
type: guide | api-reference | tutorial | architecture
category: getting-started | features | architecture | api
audience: all | developers | users
difficulty: beginner | intermediate | advanced
estimated_time: X minutes
last_updated: YYYY-MM-DD
related_components:
  - Component1
  - Component2
---
```

## Why AI-Assisted Documentation?

Modern AI assistants can help you:
- Generate comprehensive documentation from code
- Maintain consistency across documentation
- Update docs when code changes
- Create examples and tutorials
- Fix documentation errors and omissions

## Specific Documentation Tasks

### Document New Feature

```
Document the [FEATURE_NAME] feature added in [source_file]

Requirements:
- Create docs/Features/[Feature Name].md
- Include YAML frontmatter with all required properties
- Explain theory: what it does and why
- Provide technical details: how it works
- Show code examples with proper syntax highlighting for [language]
- Add to linear reading flow with appropriate "Read Next"
- Link from related documentation

Constraints: No emojis. No summary files.
Language: [specify: TypeScript, Python, Go, Rust, Java, C++, etc.]
```

### Document API/Module/Class

```
Create API reference for [CLASS/MODULE/FUNCTION_NAME] from [source_file]

Include:
- Purpose and use cases
- Signature/interface with parameter explanations
- For classes: constructor, public methods, properties
- For modules: exported functions, constants, types
- For functions: parameters, return values, side effects
- Type definitions and interfaces (if applicable)
- Usage examples in [language]
- Add to docs/API-Reference/ folder

Format: Obsidian markdown with proper frontmatter
Constraints: No emojis. Technical audience.
Language: [specify programming language]
```

### Update After Code Change

```
Source file [source_file] was modified:
[PASTE DIFF OR DESCRIBE CHANGES]

Update affected documentation:
1. Find all docs referencing changed code
2. Update API signatures and examples
3. Add new features to appropriate sections
4. Update configuration if interfaces/contracts changed
5. Maintain reading flow integrity

Constraints: No emojis. No summary files.
Language-specific notes: [mention language features, type systems, conventions]
```

### Fix Broken Examples

```
Find and fix all broken code examples in documentation:

1. Extract every code block from docs/
2. Verify syntax is valid for declared language
3. Check against actual API signatures in source code
4. Test imports/dependencies exist and are correct
5. Verify language-specific conventions (naming, structure, idioms)
6. Provide corrections for each broken example

Report format:
- File and line number
- What's wrong
- Corrected version

No emojis.
Languages to check: [list languages used in codebase]
```

### Create Tutorial

```
Create step-by-step tutorial for [TASK] in docs/Getting-Started/

Structure:
1. Prerequisites (tools, knowledge required)
2. Step-by-step instructions with code
3. Explanation of each step
4. Expected output/results
5. Common issues and solutions
6. Reference to related API docs

Frontmatter: all required fields
Reading flow: link to logical next tutorial
Constraints: No emojis. Technical but accessible.
```

## Best Practices

### Documentation Structure

Organize documentation hierarchically (adapt to your project):

```
docs/
  ├── Home.md                    # Entry point
  ├── Getting-Started/           # Tutorials and guides
  │   ├── Installation.md
  │   ├── Configuration.md
  │   └── [Usage Guide].md
  ├── Architecture/              # System design
  │   └── Core Components.md
  ├── Features/                  # Feature documentation
  │   ├── [Feature 1].md
  │   └── [Feature 2].md
  └── API-Reference/             # Technical reference
      ├── [Module/Class 1] API.md
      └── [Module/Class 2] API.md
```

**Language-Specific Adaptations:**

- **TypeScript/JavaScript:** Document classes, interfaces, modules
- **Python:** Document modules, classes, functions, decorators
- **Go:** Document packages, interfaces, structs, functions
- **Rust:** Document crates, modules, traits, structs
- **Java:** Document packages, classes, interfaces, annotations
- **C/C++:** Document headers, classes, functions, macros
- **Ruby:** Document modules, classes, mixins, methods

### Frontmatter Consistency

Every note must have complete frontmatter:

```yaml
---
description: One-line description of content
tags:
  - categorization
  - keywords
type: guide | api-reference | tutorial | architecture
category: getting-started | features | architecture | api
audience: all | developers | users
difficulty: beginner | intermediate | advanced
estimated_time: X minutes
last_updated: YYYY-MM-DD
---
```

### Linear Reading Path

Create a single path through documentation (example):

1. Home.md → Installation
2. Installation → Configuration
3. Configuration → [Basic Usage/Quick Start]
4. [Basic Usage] → [Core Concepts/Architecture]
5. [Core Concepts] → [First Feature]
6. [Feature 1] → [Feature 2]
7. [Last Feature] → [Advanced Topics or API Reference]

**Note:** API references typically use "See also" instead of "Read Next" since they're reference material, not sequential learning content.

### Version Control Integration

Commit documentation with related code:

```bash
git commit -m "feat: add [feature name]

- Implement [feature] in [source_file]
- Add docs/Features/[Feature].md
- Update feature list in Home.md
- Add to API reference section
"
```

**Language-Specific Examples:**

**Python:**
```bash
git commit -m "feat: add data validator

- Implement Validator class in validators.py
- Add docs/Features/Data Validation.md
- Update API reference
"
```

**Go:**
```bash
git commit -m "feat: add HTTP middleware

- Implement middleware in pkg/middleware/
- Document in docs/Features/Middleware.md
- Update package documentation
"
```

**Rust:**
```bash
git commit -m "feat: add custom error types

- Define error types in src/error.rs
- Document in docs/Architecture/Error Handling.md
- Update API reference
"
```

## Real-World Example Prompts

These are actual prompts used to create and maintain this documentation (for a TypeScript static site generator). Adapt the language-specific parts for your project.

### Initial Creation

```
What are relevant agentic prompts to initialize and update documentation 
like our docs folder? Create a documentation page about that.
```

### Quality and Accuracy Review

```
Review all documentation and identify:
1. Incorrect code examples (check against [language] syntax)
2. Missing features  
3. Broken examples
4. Inconsistencies with code
5. Outdated API signatures
```

### Feature Completeness

```
The [project] supports [list features].
Update the documentation to include all features prominently.
```

### Accuracy Validation

```
[Documentation file] contains false information - [describe issue].
Cross-check against actual implementation in [source files].
Are there any other inconsistencies?
```

### Malformed Content Fix

```
Some notes in the documentation are malformed. Fix them all.
Check for:
- Unbalanced code blocks
- Invalid language tags
- Broken wiki-links
- Missing frontmatter
```

### Reading Flow Creation

```
In the Read Next sections of the docs, create a linear reading path.
The set of Read Next must chain ONE note at a time to read the whole 
vault (except for appendices, API references and so on).
Ensure logical progression from beginner to advanced topics.
```

## Workflow Examples

### Adding a New Feature

1. **Implement** the feature in source code
2. **Document** immediately with AI:
   ```
   Document the new [FEATURE] feature from [source_file]
   Create docs/Features/[Feature].md with proper frontmatter
   Include theory and implementation details
   Add code examples in [language]
   Insert into linear reading path after [Previous Note]
   No emojis.
   ```
3. **Update** feature lists in Home.md and README.md
4. **Cross-reference** from related documentation
5. **Validate** examples work with actual code
6. **Commit** with documentation changes

**Language-Specific Example (Python):**
```
Document the new caching decorator from utils/cache.py
Create docs/Features/Caching.md
Include: decorator syntax, parameters, cache backends
Add Python code examples with type hints
Insert after [[Performance Optimization]]
No emojis.
```

### Fixing Documentation Issues

1. **Identify** with validation prompt:
   ```
   Check documentation for: broken examples, incorrect APIs,
   missing features, broken links, emoji usage, summary files
   ```
2. **Fix** each issue:
   ```
   Fix these documentation issues:
   [LIST WITH FILE:LINE]
   Provide corrected versions
   No emojis. No summaries.
   ```
3. **Verify** by regenerating site
4. **Commit** with issue summary

### Major Refactoring

1. **Before changes:** Document current state
2. **During changes:** Note affected APIs/modules
3. **After changes:** Update documentation:
   ```
   Source code refactored: [DESCRIBE CHANGES]
   Update all affected documentation:
   - API signatures in docs/API-Reference/
   - Examples in all docs (ensure [language] syntax is correct)
   - Configuration if interfaces/contracts changed
   - Architecture docs if structure changed
   Maintain reading flow. No emojis.
   ```
4. **Validate** everything still works
5. **Commit** with "docs: update for refactoring"

**Language-Specific Considerations:**

- **TypeScript/JavaScript:** Update type definitions, interfaces
- **Python:** Update type hints, docstrings, class hierarchies
- **Go:** Update package paths, interface implementations
- **Rust:** Update trait bounds, lifetime annotations
- **Java:** Update generics, annotations, inheritance chains

## Prompt Templates

### Feature Documentation Template

```
Document [FEATURE_NAME] from [source_file]

Location: docs/Features/[Feature Name].md

Include:
- YAML frontmatter (all required fields)
- Overview: what it does and why
- Theory: concepts and design  
- Implementation: how it works technically
- Configuration: relevant options
- Code examples: basic and advanced usage in [language]
- Edge cases and limitations
- Related features with wiki-links

Reading flow: Insert after [[Previous Feature]]
Style: Technical but accessible
Constraints: No emojis. No summaries.
Language: [specify: Python, Go, Rust, Java, TypeScript, etc.]
```

### API Documentation Template

```
Create API reference for [CLASS/MODULE/FUNCTION_NAME] from [source_file]

Location: docs/API-Reference/[Name] API.md

Structure:
- Purpose and architecture role
- Signature/interface (language-specific syntax)
- For classes: constructor, methods, properties
- For modules: exported functions, constants, types
- For functions: parameters, return values, side effects
- Type definitions (if applicable)
- Usage patterns and best practices
- Error handling (exceptions, error types, Result types, etc.)

Frontmatter: Complete with api-reference type
Links: Related components and features
Constraints: No emojis. Technical audience.
Language: [specify programming language and conventions]

Examples by language:
- Python: Include type hints, docstrings format
- Go: Include package, interface definitions
- Rust: Include trait bounds, lifetime parameters
- Java: Include generics, annotations
- TypeScript: Include interfaces, type aliases
```

### Tutorial Template

```
Create tutorial: [TASK_DESCRIPTION]

Location: docs/Getting-Started/[Tutorial Name].md

Content:
1. Prerequisites (knowledge, tools, setup)
2. Overview of what will be built
3. Step-by-step instructions:
   - Clear numbered steps
   - Code for each step
   - Explanation of what each step does
   - Expected output
4. Complete working example
5. Common issues and solutions
6. What to read next

Frontmatter: Type=tutorial, difficulty appropriate
Reading flow: Connect to logical next tutorial
Style: Beginner-friendly, assume minimal background
Constraints: No emojis.
```

### Update Documentation Template

```
Update documentation for changes in [source_file]

Changes made:
[DESCRIBE OR PASTE DIFF]

Tasks:
1. Find all docs referencing changed code
2. Update API signatures/interfaces: [LIST CHANGES]
3. Fix code examples in: [LIST FILES]
4. Update configuration docs if contracts changed
5. Add new features to feature lists
6. Maintain reading flow consistency
7. Update last_updated dates

Constraints: No emojis. No summary files.
Language: [specify language and key syntax changes]
Verify: All examples compile/run with new code.

Language-specific checks:
- Types/interfaces are correct
- Imports/dependencies updated
- Language idioms maintained
- Framework conventions followed
```

## Maintaining This Meta-Documentation

This page itself should be updated when:
- New documentation patterns emerge
- Better prompts are discovered
- AI capabilities change
- Documentation structure evolves

Use this prompt to update this page:
```
Based on recent documentation work, update the AI-Assisted Documentation
page with:
- New effective prompts we used
- Patterns that worked well
- Issues we encountered and solved
- Better practices discovered
```

---

**Meta-Documentation:** This guide is reference material for maintaining documentation, not part of the main learning path.

See also: [[Configuration]] • [[Building Sites]] • [[../Architecture/Core Components|Core Components]]
