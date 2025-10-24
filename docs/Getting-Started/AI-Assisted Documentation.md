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
last_updated: 2025-10-24
---

# AI-Assisted Documentation

Learn how to use AI assistants effectively to create and maintain high-quality documentation that accurately reflects your codebase.

## Critical Principles

### 1. Factual Reality Only - MANDATORY

**BEFORE documenting ANYTHING, you MUST:**

1. **Open the actual source file** - Don't assume, don't guess, READ THE CODE
2. **Check dependency manifest** - If you mention a library, verify it's actually a dependency
3. **Verify every class/function/module exists** - Search for the actual definition in the source
4. **Copy exact signatures** - Parameters, method/function names, return types
5. **Test code examples** - Try to run them, or at least verify imports/includes exist
6. **Check for implementation** - Just because a definition exists doesn't mean it's used

### 2. Common Lies AI Tell (DO NOT REPEAT)

**Wrong:** "Powered by [Library X]" - Check dependency manifest first!
**Wrong:** "Class/module with advanced API" - Read the actual implementation file!
**Wrong:** "Keyboard shortcuts Cmd+K" - Search for actual event handlers!
**Wrong:** "Implemented in [Language/Framework]" - Verify the actual language and location!
**Wrong:** "function(param1, param2)" - Read the actual function signature!
**Wrong:** "method() returns ComplexType" - Check the actual method!

### 3. Verification Checklist

For EVERY documented item, verify:

- [ ] File exists in source directory
- [ ] Class/function is actually exported
- [ ] Parameters match actual code
- [ ] Return type matches actual code
- [ ] Method names are spelled correctly
- [ ] Examples use real imports/APIs
- [ ] Configuration options are supported in config type definitions
- [ ] CLI commands match actual command definitions
- [ ] Libraries mentioned are in dependency manifest (package.json, requirements.txt, go.mod, Cargo.toml, etc.)

### 2. Regular Validation

**MANDATORY before any documentation update:**

```
Step 1: Read the ACTUAL source files
Step 2: Open dependency manifest and verify dependencies
Step 3: Search for class/function/module names in source directory
Step 4: Copy exact signatures from source
Step 5: Test that examples would work
Step 6: Document only what EXISTS

Use this prompt to find lies in documentation:

The documentation makes false claims. Compare EVERY documented feature 
against actual source code implementation.

For EACH documented item:
1. Find the source file - does it exist?
2. Read the actual code - does the class/function/module exist?
3. Check signatures - do parameters match?
4. Verify libraries - is it in the dependency manifest?
5. Check examples - would they actually run?

Report format:
- Documentation claims: [exact quote from docs]
- Reality: [what the source code actually shows]
- Source: [file:line in source directory]
- Status: FALSE | MISLEADING | INCOMPLETE | TRUE

Report ALL false claims, no matter how small.
```

### Examples of False Documentation Patterns

These are COMMON false claim patterns to watch for:

**False Claim Pattern 1:**
```markdown
# Feature Name
Project includes a powerful system built with [Library X].
```
**Reality:** Library X not in dependency manifest. Simpler implementation used.

**False Claim Pattern 2:**
```
// Example in any language
class/function SomeProcessor(path, config)
```
**Reality:** Constructor/function takes different parameters or NO parameters. Always verify.

**False Claim Pattern 3:**
```markdown
## Keyboard Shortcuts
Cmd/Ctrl + K to open [feature]
```
**Reality:** No keyboard shortcut implemented. Check actual event handlers.

**False Claim Pattern 4:**
```
// Any language example
class/module FeatureRenderer {
  renderFeature(container)
}
```
**Reality:** Class/module doesn't exist as documented, may be different language or location.

## Core Documentation Prompts

### Initial Documentation Creation

**CRITICAL: AI will make things up. You MUST verify everything.**

**Primary Initialization Prompt:**

```
Create documentation ONLY for what EXISTS in the source code.

MANDATORY VERIFICATION STEPS:
1. Read dependency manifest - list ALL dependencies (package.json, requirements.txt, go.mod, Cargo.toml, pom.xml, etc.)
2. List ALL files in source directory  
3. For EACH source file, read its COMPLETE contents
4. Extract EXACT class names, method signatures, parameters
5. Verify CLI commands from actual command definitions
6. Check type/interface definition files for actual types

STRICT RULES:
- NO ASSUMPTIONS about what "should" exist
- NO documentation of planned features
- NO invented APIs or methods
- EVERY signature must be copied from source
- EVERY example must use actual imports
- EVERY library must be in package.json

Process:
1. Read dependency manifest (package.json, requirements.txt, go.mod, etc.)
2. List all files in source directory
3. For each file: read entire contents
4. Extract: exports, classes, functions, interfaces, public APIs
5. Document ONLY what was found

Verification:
- If docs mention a library, find it in dependency manifest
- If docs show a class, find it in source directory
- If docs show a method, copy signature from source
- If docs show config option, find it in config type definitions
- If docs show CLI command, find it in command definitions

Source: [your source directory]
Language: [your project language]
Dependencies: Check dependency manifest first
```

### Validation and Accuracy Checks

**Critical Validation Prompt:**

```
Cross-check all documentation against actual source code implementation.

For each documented item, verify:

1. **Class/Constructor APIs:**
   - Does the class exist in source directory?
   - Do constructor parameters match the actual signature?
   - Are parameter types correct?
   
2. **Methods:**
   - Do documented methods exist?
   - Are signatures (params, return types) accurate?
   - Are method names spelled correctly?
   
3. **CLI Commands:**
   - Check actual command definition files for command structure
   - Verify all options and flags exist
   - Confirm argument order and requirements
   
4. **Configuration:**
   - Check config type definitions for actual config interface
   - Verify all documented options are supported
   - Confirm default values match code
   
5. **Features:**
   - Does the feature actually exist?
   - Is it fully implemented or just mentioned in code?
   - Do the examples work with current implementation?
   
6. **Dependencies:**
   - Check dependency manifest for actual dependencies
   - Verify versions if mentioned
   - Confirm libraries are actually used in code

Report format:
- File: [doc file name]
- Claim: [what documentation says]
- Reality: [what actually exists in source]
- Source: [actual file and line in src/]
- Fix: [corrected documentation]

NO ASSUMPTIONS. Only document what exists.
```

### Update After Code Changes

**Reality-Check Update Prompt:**

```
Source files changed: [list files]

Update documentation following these rules:

1. **Read the actual code** - Don't assume what changed
2. **Verify current state** - Check actual signatures, not cached knowledge
3. **Test examples** - Ensure all code examples still work
4. **No speculation** - Don't document planned features
5. **Check all references** - Find every doc that mentions changed code

Process:
1. Read the changed source files completely
2. Note actual signatures, parameters, return types
3. Find all docs referencing these files
4. Update with exact current implementation
5. Test that examples compile/run
6. Update last_updated dates

Verify against source before updating.
```

### Common Documentation Errors to Avoid

**WRONG: Documenting ideal/planned API:**
```
// Documentation claims (example in any language):
DataProcessor(path, config)

// Reality in source:
DataProcessor()  // NO parameters
```

**RIGHT: Document actual API:**
Read the source file, find the actual signature, document exactly what exists.

**WRONG: Non-existent modules/classes:**
```
// Documentation claims FeatureRenderer exists in server code
// Reality: It's client-side code or in a different location
```

**RIGHT: Document what exists:**
Check if file exists in source directory, if not, clarify actual location or implementation.

**WRONG: Wrong CLI commands:**
```bash
# Documentation claims:
myapp build [options]

# Reality in command definitions:
myapp generate <input> <output> [options]
```

**RIGHT: Check command definitions:**
Read actual command/argument parsing code, document exact syntax.

**WRONG: Assuming technologies:**
```
// Documentation claims: "powered by [Library X]"  
// Reality in dependency manifest: Library X not in dependencies
```

**RIGHT: Check dependency manifest:**
Only mention libraries that are actually dependencies.

## Documentation Workflow

### Step 1: Gather Facts

Before writing documentation:

```bash
# Check actual dependencies
# Examples: package.json, requirements.txt, go.mod, Cargo.toml, pom.xml, etc.
cat [dependency manifest file]

# Find all source files
ls -R [source directory]  # or tree, dir, Get-ChildItem, etc.

# Check actual types/interfaces/definitions
cat [type definition files]  # .ts, .h, .py, .rs, .java, etc.

# Read actual CLI implementation
cat [CLI entry point file]

# Check what's exported/public
cat [main entry point]  # index.*, __init__.py, main.*, lib.rs, etc.
```

### Step 2: Verify Each API

For each class/function you document:

1. **Open the source file**
2. **Read the actual signature**
3. **Copy the exact types**
4. **Note all parameters**
5. **Check return types**
6. **See what it actually does**

### Step 3: Test Examples

For each code example:

1. **Create a test file**
2. **Copy the example code**
3. **Try to run it**
4. **Fix any errors**
5. **Use the working version in docs**

### Step 4: Cross-Reference

When documenting features:

1. **Check if feature is implemented** (search codebase)
2. **Find all related files**
3. **Document actual behavior** (not planned behavior)
4. **Link to actual source locations**

### Step 5: Validate Links

```
Check all wiki-links resolve:
1. Extract all [[Link]] references
2. Verify each linked note exists
3. Fix broken links
4. Remove links to non-existent notes
```

## Specific Tasks

### Document a New Feature

Only after the feature is fully implemented and verified:

```
Document [FEATURE] that exists in [source files].

VERIFICATION FIRST (do this before writing ANY documentation):
1. Open source file and read it completely
2. Verify the feature actually works (try it if possible)
3. List all files involved
4. Copy exact function/class signatures
5. Note all parameters and return types from source
6. Check if any libraries are used (verify in dependency manifest)
7. Test that example code would work

Only AFTER verification, document:
- Location: docs/Features/[Feature].md
- What it does (from reading the code)
- How to use it (with verified examples)
- Limitations (from implementation, not assumptions)

MANDATORY: Include a "Verification" section at end:
```
Verified against:
- [source file 1] line X-Y
- [source file 2] line A-B
- Dependencies used: [list actual deps from manifest]
```

NO ASSUMPTIONS. Read code first, document second.
Source: [list EXACT files to check]
```

### Document an API

```
Create API reference for [ClassName/ModuleName/FunctionName] from [source file]

STEP 1 - VERIFICATION (do this first, before writing anything):
1. Open source file in editor
2. Search for the class/function/module definition - does it exist?
3. If not found: STOP. Do not document non-existent code.
4. If found: Read the ENTIRE definition
5. Count constructor/function parameters - how many?
6. List ALL public methods/functions - what are their names?
7. For EACH method/function: what parameters? what return type?
8. Copy signatures EXACTLY as written in source

STEP 2 - CROSS-REFERENCE:
1. Check if exported from main entry point
2. Check imports/dependencies - what does it depend on?
3. Search codebase for usage examples
4. Verify types/interfaces match usage

STEP 3 - DOCUMENT (only after steps 1-2):
- Location: docs/API-Reference/[Name] API.md
- Signature (EXACT copy from source)
- All public methods/functions (EXACT signatures from source)
- Parameter types (from actual code, not assumptions)
- Return types (from actual code)
- Usage examples (that would actually work)

MANDATORY FOOTER:
```
Verified against: [source file] (lines X-Y)
Last verified: [date]
Signature: [exact signature from source]
Public members: [count]
```

If you cannot find the code in source: Document that it doesn't exist.
```

### Fix Documentation Errors

```
Documentation file docs/[filename].md has incorrect information:
[Describe what's wrong]

Fix process:
1. Read the actual source file(s): [source files]
2. Find the real implementation
3. Compare with what docs claim
4. Note all differences
5. Update docs with factual reality
6. Test any code examples
7. Update last_updated date

Provide:
- What docs currently (incorrectly) say
- What source code actually has
- Corrected documentation
- Any other related inaccuracies found

Source files to check: [list]
```

### Validate All Documentation

Regular check (weekly or after major changes):

```
Comprehensive documentation accuracy check:

1. **CLI Commands** - Check command definitions:
   - All command names
   - All options/flags
   - Required vs optional arguments
   - Actual command structure

2. **API Signatures** - Check each class/module in source:
   - Constructor/function parameters
   - Method/function names and signatures
   - Public vs private members
   - Return types

3. **Configuration** - Check config type definitions:
   - Config interface/struct/class
   - All config options
   - Default values
   - Optional vs required

4. **Features** - Check implementation:
   - Is feature fully implemented?
   - Does it work as documented?
   - Are examples correct?

5. **Dependencies** - Check dependency manifest:
   - Are mentioned libraries actually used?
   - Are versions mentioned correct?

6. **Links** - Check all [[wiki-links]]:
   - Do target notes exist?
   - Are paths correct?

Report all discrepancies with corrections.
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

Adapt the structure to match your project's organization patterns (classes, modules, packages, crates, etc.).

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

- Implement [feature] in [source_files]
- Add docs/Features/[Feature].md
- Update feature list in Home.md
- Add to API reference section
"
```

Examples for different languages/frameworks - adapt to your project structure and conventions.

## Real-World Example Prompts

These are example prompts to create and maintain documentation for any codebase. Adapt the language-specific parts for your project.

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
No emojis.
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
- Emoji usage (remove all)
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
3. **Verify** by testing/building documentation
4. **Commit** with issue summary

### Major Refactoring

1. **Before changes:** Document current state
2. **During changes:** Note affected APIs/modules
3. **After changes:** Update documentation:
   ```
   Source code refactored: [DESCRIBE CHANGES]
   Update all affected documentation:
   - API signatures in docs/API-Reference/
   - Examples in all docs (ensure correct syntax for [language])
   - Configuration if interfaces/contracts changed
   - Architecture docs if structure changed
   Maintain reading flow.
   No emojis. No summaries.
   ```
4. **Validate** everything still works
5. **Commit** with "docs: update for refactoring"

Consider the specific needs of your programming paradigm (OOP, functional, procedural, etc.).

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
Language: [specify your programming language]
```

### API Documentation Template

```
Create API reference for [CLASS/MODULE/FUNCTION_NAME] from [source_file]

Location: docs/API-Reference/[Name] API.md

Structure:
- Purpose and architecture role
- Signature/interface (using your language's syntax)
- For classes/objects: constructor, methods, properties
- For modules/packages: exported functions, constants, types
- For functions: parameters, return values, side effects
- Type definitions (if applicable to your language)
- Usage patterns and best practices
- Error handling (exceptions, error types, Result types, etc.)

Frontmatter: Complete with api-reference type
Links: Related components and features
Constraints: No emojis. Technical audience.
Language: [specify programming language and follow its conventions]
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
Verify: All examples compile/run/execute with new code.

Verification checklist:
- Types/interfaces/signatures are correct
- Imports/dependencies/includes updated
- Language idioms maintained
- Framework/library conventions followed
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

See also: [[Configuration]] • [[Building Sites]]
