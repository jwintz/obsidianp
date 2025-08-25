/**
 * Shared card rendering utilities for both server-side and client-side contexts
 */

/**
 * Extract properties used in filter conditions
 */
export function extractPropertiesFromFilter(filter: any, usedProperties: Set<string>): void {
    if (!filter) return;

    // Handle logical operators
    if (filter.and && Array.isArray(filter.and)) {
        filter.and.forEach((subFilter: any) => extractPropertiesFromFilter(subFilter, usedProperties));
    }

    if (filter.or && Array.isArray(filter.or)) {
        filter.or.forEach((subFilter: any) => extractPropertiesFromFilter(subFilter, usedProperties));
    }

    if (filter.not) {
        extractPropertiesFromFilter(filter.not, usedProperties);
    }

    // Handle string-based filters - look for property patterns
    if (typeof filter === 'string') {
        // Common patterns: file.hasTag, file.tags, file.path, etc.
        const propertyMatch = filter.match(/file\.(hasTag|tags|path|mtime|ctime|size)/g);
        if (propertyMatch) {
            propertyMatch.forEach(prop => {
                // Convert file.hasTag to file.tags since that's what we display
                if (prop === 'file.hasTag') {
                    usedProperties.add('file.tags');
                } else {
                    usedProperties.add(prop);
                }
            });
        }
    }

    // Handle object-based filters
    if (typeof filter === 'object' && filter !== null) {
        Object.keys(filter).forEach(key => {
            if (key.startsWith('file.')) {
                usedProperties.add(key);
            }
        });
    }
}

/**
 * Determine which properties are used for filtering and sorting
 */
export function getUsedProperties(baseView: any, baseFilters?: any): string[] {
    const usedProperties = new Set<string>();

    // Add properties used in filtering from the base configuration
    if (baseFilters) {
        extractPropertiesFromFilter(baseFilters, usedProperties);
    }

    // Add properties used in sorting
    if (baseView.sort && Array.isArray(baseView.sort)) {
        baseView.sort.forEach((sortRule: any) => {
            if (typeof sortRule === 'object' && sortRule.property) {
                usedProperties.add(sortRule.property);
            } else if (typeof sortRule === 'string') {
                usedProperties.add(sortRule);
            }
        });
    }

    // If no specific filtering/sorting properties are identified, fall back to showing tags and mtime
    // since most bases use tags for filtering and mtime for sorting
    if (usedProperties.size === 0) {
        usedProperties.add('file.tags');
        usedProperties.add('file.mtime');
    }

    return Array.from(usedProperties);
}

/**
 * Get human-readable label for property
 */
export function getPropertyLabel(property: string): string {
    switch (property) {
        case 'file.tags': return 'file tags';
        case 'file.mtime': return 'modified time';
        case 'file.ctime': return 'created time';
        case 'file.size': return 'file size';
        case 'file.path': return 'file path';
        default: return property.replace('file.', '').replace(/([A-Z])/g, ' $1').toLowerCase();
    }
}

/**
 * Convert markdown content to HTML for card preview
 */
export function renderMarkdownForPreview(content: string | undefined): string {
    if (!content) return '';

    // Remove frontmatter first
    let htmlContent = content.replace(/^---[\s\S]*?---\s*/, '');

    // Convert markdown to HTML while preserving formatting
    htmlContent = htmlContent
        // Convert headers (keep them but make them smaller for previews)
        .replace(/^### (.+)$/gm, '<h6>$1</h6>')
        .replace(/^## (.+)$/gm, '<h5>$1</h5>')
        .replace(/^# (.+)$/gm, '<h4>$1</h4>')
        // Convert bold and italic
        .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        .replace(/_([^_]+)_/g, '<em>$1</em>')
        // Convert strikethrough
        .replace(/~~([^~]+)~~/g, '<del>$1</del>')
        // Convert inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Convert wiki links [[link]] and [[link|alias]]
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<a href="/$1" class="internal-link">$2</a>')
        .replace(/\[\[([^\]]+)\]\]/g, '<a href="/$1" class="internal-link">$1</a>')
        // Convert markdown links [text](url)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // Convert line breaks to paragraphs (simple approach)
        .replace(/\n\n/g, '</p><p>')
        .replace(/^\s*$\n/gm, '') // Remove empty lines
        .trim();

    // Wrap in paragraph if not empty and doesn't start with a heading
    if (htmlContent && !htmlContent.startsWith('<h')) {
        htmlContent = '<p>' + htmlContent + '</p>';
    }

    // If content is too short or problematic, don't show preview
    if (htmlContent.length < 10) {
        return '';
    }

    return htmlContent;
}

/**
 * Generate card HTML for a single note
 */
export function generateCardHtml(
    note: any,
    usedProperties: string[],
    getPropertyValueFn: (note: any, property: string) => string,
    contentPreviewLength: number = 150,
    view?: any
): string {
    // Generate top section (image or skeleton)
    const topSectionHtml = generateCardTopSection(note, view);

    // Title comes after the top section
    const titleHtml = `<div class="card-title-section">
        <h3 class="card-title">
            <a href="/${note.id}" class="internal-link">${note.title}</a>
        </h3>
    </div>`;

    // Generate properties table for filtering/sorting fields
    const propertiesTableHtml = generateCardPropertiesTable(usedProperties, note, getPropertyValueFn);

    return `<div class="card" data-note-id="${note.id}">
        ${topSectionHtml}
        ${titleHtml}
        ${propertiesTableHtml}
    </div>`;
}

/**
 * Generate the top section of a card (image or skeleton)
 */
function generateCardTopSection(note: any, view?: any): string {
    // Check if the view has an image entry
    if (view?.image) {
        const imageValue = getImageFromNote(note, view.image);
        if (imageValue) {
            return `<div class="card-top-image">
                <img src="${imageValue}" alt="${note.title}" />
            </div>`;
        }
    }

    // Generate content-based skeleton if no image
    return generateContentBasedSkeleton(note);
}

/**
 * Generate skeleton lines based on actual note content structure
 */
function generateContentBasedSkeleton(note: any): string {
    if (!note.content) {
        // Default skeleton if no content - fill available space
        return generateDefaultSkeleton();
    }

    // Remove frontmatter first
    let content = note.content.replace(/^---[\s\S]*?---\s*/, '');

    // Split into lines and analyze structure
    const lines = content.split('\n').filter((line: string) => line.trim().length > 0);
    const skeletonLines: string[] = [];

    // With thinner lines and gap spacing, calculate available space
    // Height: 200px, padding: 24px (12px * 2), gap: 4px between lines, average line height: ~10px
    const availableHeight = 200 - (24 * 2); // 152px available
    const avgLineHeight = 10; // Average line height
    const gapSize = 4; // Gap between lines
    // Calculate lines with gap: (height - (gaps * (lines-1))) / lineHeight = lines
    // Rearranging: height = lines * lineHeight + gaps * (lines-1)
    // height = lines * (lineHeight + gap) - gap
    const effectiveLineHeight = avgLineHeight + gapSize;
    const maxPossibleLines = Math.floor((availableHeight + gapSize) / effectiveLineHeight); // ~12 lines

    // Analyze content structure for the number of lines we can fit
    const contentLines = Math.min(lines.length, maxPossibleLines);

    for (let i = 0; i < contentLines; i++) {
        const line = lines[i].trim();

        if (!line) continue;

        // Determine skeleton line type based on content
        let skeletonClass = '';

        if (line.startsWith('# ')) {
            // Main heading - tall and prominent
            skeletonClass = 'skeleton-line-heading-1';
        } else if (line.startsWith('## ')) {
            // Secondary heading
            skeletonClass = 'skeleton-line-heading-2';
        } else if (line.startsWith('### ') || line.startsWith('#### ')) {
            // Sub-headings
            skeletonClass = 'skeleton-line-heading-3';
        } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
            // Bullet list items - with bullet point
            skeletonClass = 'skeleton-line-list';
        } else if (line.match(/^\d+\. /)) {
            // Numbered list items
            skeletonClass = 'skeleton-line-medium';
        } else if (line.startsWith('```')) {
            // Code blocks - monospaced feel
            skeletonClass = 'skeleton-line-code';
        } else if (line.startsWith('> ')) {
            // Quotes - medium width
            skeletonClass = 'skeleton-line-medium';
        } else if (line.length > 80) {
            // Long paragraphs
            skeletonClass = 'skeleton-line-long';
        } else if (line.length > 50) {
            // Medium paragraphs
            skeletonClass = 'skeleton-line-medium';
        } else if (line.length > 20) {
            // Short paragraphs
            skeletonClass = 'skeleton-line-short';
        } else {
            // Very short lines
            skeletonClass = 'skeleton-line-short';
        }

        skeletonLines.push(`<div class="skeleton-line ${skeletonClass}"></div>`);
    }

    // If we have room for more lines and haven't used all content, add more based on remaining content
    if (skeletonLines.length < maxPossibleLines && lines.length > contentLines) {
        const remainingSpace = maxPossibleLines - skeletonLines.length;
        const remainingContent = lines.slice(contentLines);

        // Add more skeleton lines based on remaining content patterns
        for (let i = 0; i < Math.min(remainingSpace, remainingContent.length); i++) {
            const line = remainingContent[i].trim();
            let skeletonClass;

            if (line.startsWith('- ') || line.startsWith('* ')) {
                skeletonClass = 'skeleton-line-list';
            } else if (line.length > 60) {
                skeletonClass = 'skeleton-line-long';
            } else if (line.length > 30) {
                skeletonClass = 'skeleton-line-medium';
            } else {
                skeletonClass = 'skeleton-line-short';
            }

            skeletonLines.push(`<div class="skeleton-line ${skeletonClass}"></div>`);
        }
    }

    // If we still have space and no more content, fill with varied lines to use all space
    if (skeletonLines.length < maxPossibleLines) {
        const remainingSpace = maxPossibleLines - skeletonLines.length;
        const patterns = ['skeleton-line-long', 'skeleton-line-medium', 'skeleton-line-short', 'skeleton-line-medium'];

        for (let i = 0; i < remainingSpace; i++) {
            const patternIndex = i % patterns.length;
            skeletonLines.push(`<div class="skeleton-line ${patterns[patternIndex]}"></div>`);
        }
    }

    return `<div class="card-top-skeleton">
        ${skeletonLines.join('')}
    </div>`;
}

/**
 * Generate default skeleton when no content is available
 */
function generateDefaultSkeleton(): string {
    // Fill available space with varied skeleton lines that look like a document
    const availableHeight = 200 - (24 * 2); // 152px available
    const avgLineHeight = 10; // Average line height
    const gapSize = 4; // Gap between lines
    const effectiveLineHeight = avgLineHeight + gapSize;
    const maxLines = Math.floor((availableHeight + gapSize) / effectiveLineHeight); // ~12 lines

    // Create a realistic document structure
    const documentStructure = [
        'skeleton-line-heading-1', // Title
        'skeleton-line-long',      // First paragraph
        'skeleton-line-medium',    // Second line
        'skeleton-line-short',     // Third line
        'skeleton-line-heading-2', // Subheading
        'skeleton-line-list',      // List item
        'skeleton-line-list',      // List item
        'skeleton-line-list',      // List item
        'skeleton-line-medium',    // Paragraph
        'skeleton-line-long',      // Long paragraph
        'skeleton-line-short',     // Short line
        'skeleton-line-medium',    // Medium line
        'skeleton-line-heading-3', // Another heading
        'skeleton-line-long',      // Content
        'skeleton-line-medium'     // More content
    ];

    const skeletonLines: string[] = [];
    const linesToUse = Math.min(maxLines, documentStructure.length);

    for (let i = 0; i < linesToUse; i++) {
        skeletonLines.push(`<div class="skeleton-line ${documentStructure[i]}"></div>`);
    }

    return `<div class="card-top-skeleton">
        ${skeletonLines.join('')}
    </div>`;
}

/**
 * Extract image value from note based on view configuration
 */
function getImageFromNote(note: any, imageConfig: string): string | null {
    if (!imageConfig || !note) return null;

    // Handle note.cover or similar property references
    if (imageConfig.startsWith('note.')) {
        const property = imageConfig.substring(5); // Remove 'note.' prefix

        // Try frontmatter first
        if (note.frontMatter && note.frontMatter[property]) {
            return note.frontMatter[property];
        }

        // Try other note properties
        if (note[property]) {
            return note[property];
        }
    }

    return null;
}

/**
 * Generate properties table for filtering and sorting fields
 */
function generateCardPropertiesTable(usedProperties: string[], note: any, getPropertyValueFn: (note: any, property: string) => string): string {
    if (!usedProperties || usedProperties.length === 0) {
        return '';
    }

    const propertyRows = usedProperties
        .filter(property => property !== 'file.name') // Skip file.name since title is shown above
        .map(property => {
            const value = getPropertyValueFn(note, property);
            if (!value) return '';

            const label = getPropertyLabel(property);

            // Special handling for different property types
            let valueHtml = '';
            if (property === 'file.tags') {
                valueHtml = `<div class="card-tags">${value}</div>`;
            } else if (property.includes('time')) {
                valueHtml = `<div class="card-date">${value}</div>`;
            } else {
                valueHtml = `<div class="card-property-value">${value}</div>`;
            }

            return `<tr class="card-property-row">
                <td class="card-property-label">${label}</td>
                <td class="card-property-value-cell">${valueHtml}</td>
            </tr>`;
        })
        .filter(row => row)
        .join('');

    if (!propertyRows) {
        return '';
    }

    return `<div class="card-properties-table">
        <table class="properties-table">
            <tbody>
                ${propertyRows}
            </tbody>
        </table>
    </div>`;
}
