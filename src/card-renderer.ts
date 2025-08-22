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
    contentPreviewLength: number = 150
): string {
    // Always show title in header
    const headerHtml = `<div class="card-header">
    <h3 class="card-title">
      <a href="/${note.id}" class="internal-link">${note.title}</a>
    </h3>
  </div>`;

    // Generate meta content based only on properties used for filtering/sorting
    const metaElements = usedProperties.map(property => {
        // Skip file.name since that's always in the header
        if (property === 'file.name') return '';

        const value = getPropertyValueFn(note, property);
        if (value) {
            // Get human-readable label for the property
            const label = getPropertyLabel(property);

            if (property === 'file.tags') {
                return `<div class="card-property">
          <div class="card-property-label">${label}</div>
          <div class="card-tags">${value}</div>
        </div>`;
            }
            if (property.includes('time')) {
                return `<div class="card-property">
          <div class="card-property-label">${label}</div>
          <div class="card-date">${value}</div>
        </div>`;
            }
            return `<div class="card-property">
        <div class="card-property-label">${label}</div>
        <div class="card-${property.replace('file.', '')}">${value}</div>
      </div>`;
        }
        return '';
    }).filter(element => element).join('');

    const renderedContent = renderMarkdownForPreview(note.content);

    return `<div class="card" data-note-id="${note.id}">
    ${headerHtml}
    <div class="card-content">
      <div class="card-meta">
        ${metaElements}
      </div>
      ${renderedContent ? `<div class="card-preview">${renderedContent.length > contentPreviewLength ? renderedContent.substring(0, contentPreviewLength) + '...' : renderedContent}</div>` : ''}
    </div>
  </div>`;
}
