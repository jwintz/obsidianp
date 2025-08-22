import yaml from 'js-yaml';
import path from 'path';
import { Base, BaseFilter, BaseFormula, Note } from './types';

export class BaseProcessor {
    /**
     * Process a .base file and create a Base object
     */
    processBase(filePath: string, content: string, vaultPath: string): Base {
        try {
            // Parse frontmatter separately from markdown content
            let yamlContent = content;
            let description = '';

            if (content.startsWith('---')) {
                const parts = content.split('---');
                if (parts.length >= 3) {
                    yamlContent = parts[1].trim();
                    description = parts.slice(2).join('---').trim();
                }
            }

            // Parse YAML content
            const data = yaml.load(yamlContent) as any;

            // Extract title from filename
            const fileName = path.basename(filePath, '.base');
            const title = fileName;

            // Generate base ID from file path
            const id = this.generateBaseId(filePath);

            // Get folder path relative to vault
            const relativePath = path.relative(vaultPath, filePath);
            const folderPath = path.dirname(relativePath);

            const base: Base = {
                id,
                title: data.title || title,
                source: data.source || '',
                path: filePath,
                relativePath,
                folderPath: folderPath === '.' ? '' : folderPath,
                description: description || data.description || '',
                filters: data.filters,
                views: data.views || [],
                properties: data.properties || [],
                formulas: data.formulas || [],
                matchedNotes: [] as Note[]
            };

            return base;
        } catch (error) {
            console.warn(`Failed to process base file ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Filter notes based on base criteria
     */
    filterNotes(base: Base, allNotes: Map<string, Note>): Note[] {
        if (!base.filters) {
            return Array.from(allNotes.values());
        }

        const filteredNotes: Note[] = [];

        for (const note of allNotes.values()) {
            if (this.evaluateFilter(base.filters, note)) {
                filteredNotes.push(note);
            }
        }

        return filteredNotes;
    }

    /**
     * Process formulas for notes in a base
     */
    processFormulas(base: Base, notes: Note[]): Note[] {
        if (!base.formulas || base.formulas.length === 0) {
            return notes;
        }

        return notes.map(note => {
            const processedNote = { ...note };

            // Add computed properties for each formula
            if (base.formulas) {
                base.formulas.forEach(formula => {
                    const result = this.evaluateFormula(formula, note, base);
                    if (processedNote.frontMatter.computed) {
                        processedNote.frontMatter.computed[formula.name] = result;
                    } else {
                        processedNote.frontMatter.computed = { [formula.name]: result };
                    }
                });
            }

            return processedNote;
        });
    }

    /**
     * Evaluate a formula for a specific note
     */
    private evaluateFormula(formula: BaseFormula, note: Note, base: Base): any {
        try {
            // Simple formula evaluation - in a full implementation, this would be more robust
            let expression = formula.formula;

            // Replace common variables
            expression = expression.replace(/file\.name/g, `"${note.title}"`);
            expression = expression.replace(/file\.path/g, `"${note.relativePath}"`);
            expression = expression.replace(/file\.size/g, String(this.getFileSize(note) || 0));

            // Replace frontmatter properties
            Object.keys(note.frontMatter).forEach(key => {
                const value = note.frontMatter[key];
                if (typeof value === 'string') {
                    expression = expression.replace(new RegExp(`${key}`, 'g'), `"${value}"`);
                } else if (typeof value === 'number') {
                    expression = expression.replace(new RegExp(`${key}`, 'g'), String(value));
                } else if (typeof value === 'boolean') {
                    expression = expression.replace(new RegExp(`${key}`, 'g'), String(value));
                }
            });

            // Handle simple mathematical operations
            if (/^[\d\s+\-*/()\.]+$/.test(expression)) {
                return eval(expression);
            }

            // Handle string concatenation
            if (expression.includes('+') && expression.includes('"')) {
                return eval(expression);
            }

            // Return formula as-is if we can't evaluate it
            return formula.formula;
        } catch (error) {
            console.warn(`Failed to evaluate formula "${formula.name}":`, error);
            return formula.formula;
        }
    }

    /**
     * Evaluate a filter against a note
     */
    private evaluateFilter(filter: BaseFilter | string, note: Note): boolean {
        // Handle string filters (like "file.hasTag("project")")
        if (typeof filter === 'string') {
            return this.evaluateStringFilter(filter, note);
        }

        // Handle logical operators
        if (filter.and) {
            return filter.and.every(subFilter => this.evaluateFilter(subFilter, note));
        }

        if (filter.or) {
            return filter.or.some(subFilter => this.evaluateFilter(subFilter, note));
        }

        if (filter.not) {
            return !this.evaluateFilter(filter.not, note);
        }

        // Handle specific filters
        for (const [key, value] of Object.entries(filter)) {
            if (key === 'and' || key === 'or' || key === 'not') continue;

            if (!this.evaluateCondition(key, value, note)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Evaluate a string-based filter like 'file.hasTag("project")'
     */
    private evaluateStringFilter(filter: string, note: Note): boolean {
        // Parse function-like filters
        const hasTagMatch = filter.match(/file\.hasTag\("([^"]+)"\)/);
        if (hasTagMatch) {
            const tag = hasTagMatch[1];
            return this.evaluateHasTag(tag, note);
        }

        const inFolderMatch = filter.match(/file\.inFolder\("([^"]+)"\)/);
        if (inFolderMatch) {
            const folder = inFolderMatch[1];
            return note.folderPath === folder || note.folderPath.startsWith(folder + '/');
        }

        // Parse comparison operators
        const nameMatch = filter.match(/file\.name\s*(==|!=|contains|startsWith|endsWith)\s*"([^"]+)"/);
        if (nameMatch) {
            const operator = nameMatch[1];
            const value = nameMatch[2];
            return this.evaluateStringComparison(note.title, operator, value);
        }

        const pathMatch = filter.match(/file\.path\s*(==|!=|contains|startsWith|endsWith)\s*"([^"]+)"/);
        if (pathMatch) {
            const operator = pathMatch[1];
            const value = pathMatch[2];
            return this.evaluateStringComparison(note.relativePath, operator, value);
        }

        // Parse size comparisons
        const sizeMatch = filter.match(/file\.size\s*(==|!=|>|>=|<|<=)\s*(\d+)/);
        if (sizeMatch) {
            const operator = sizeMatch[1];
            const value = parseInt(sizeMatch[2]);
            const fileSize = this.getFileSize(note);
            return this.evaluateNumberComparison(fileSize, operator, value);
        }

        // Parse date comparisons
        const dateMatch = filter.match(/file\.(mtime|ctime)\s*(==|!=|>|>=|<|<=|before|after|on)\s*"([^"]+)"/);
        if (dateMatch) {
            const dateType = dateMatch[1];
            const operator = dateMatch[2];
            const value = dateMatch[3];
            const noteDate = dateType === 'mtime' ? this.getFileMtime(note) : this.getFileCtime(note);
            return this.evaluateDateComparison(noteDate, operator, value);
        }

        // Parse boolean properties
        const starredMatch = filter.match(/file\.starred\s*(==|!=)\s*(true|false)/);
        if (starredMatch) {
            const operator = starredMatch[1];
            const value = starredMatch[2] === 'true';
            const isStarred = this.isFileStarred(note);
            return operator === '==' ? isStarred === value : isStarred !== value;
        }

        return false;
    }

    /**
     * Evaluate string comparison operations
     */
    private evaluateStringComparison(noteValue: string, operator: string, filterValue: string): boolean {
        const lowerNote = noteValue.toLowerCase();
        const lowerFilter = filterValue.toLowerCase();

        switch (operator) {
            case '==':
                return noteValue === filterValue;
            case '!=':
                return noteValue !== filterValue;
            case 'contains':
                return lowerNote.includes(lowerFilter);
            case 'startsWith':
                return lowerNote.startsWith(lowerFilter);
            case 'endsWith':
                return lowerNote.endsWith(lowerFilter);
            default:
                return false;
        }
    }

    /**
     * Evaluate number comparison operations
     */
    private evaluateNumberComparison(noteValue: number | null, operator: string, filterValue: number): boolean {
        if (noteValue === null) return false;

        switch (operator) {
            case '==':
                return noteValue === filterValue;
            case '!=':
                return noteValue !== filterValue;
            case '>':
                return noteValue > filterValue;
            case '>=':
                return noteValue >= filterValue;
            case '<':
                return noteValue < filterValue;
            case '<=':
                return noteValue <= filterValue;
            default:
                return false;
        }
    }

    /**
     * Evaluate date comparison operations
     */
    private evaluateDateComparison(noteDate: Date | null, operator: string, filterValue: string): boolean {
        if (!noteDate) return false;

        const filterDate = new Date(filterValue);
        if (isNaN(filterDate.getTime())) return false;

        switch (operator) {
            case '==':
            case 'on':
                return this.isSameDay(noteDate, filterDate);
            case '!=':
                return !this.isSameDay(noteDate, filterDate);
            case '>':
            case 'after':
                return noteDate > filterDate;
            case '>=':
                return noteDate >= filterDate;
            case '<':
            case 'before':
                return noteDate < filterDate;
            case '<=':
                return noteDate <= filterDate;
            default:
                return false;
        }
    }

    /**
     * Check if two dates are on the same day
     */
    private isSameDay(date1: Date, date2: Date): boolean {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    }

    /**
     * Evaluate a specific condition
     */
    private evaluateCondition(property: string, value: any, note: Note): boolean {
        switch (property) {
            case 'file.hasTag':
            case 'file.tag':
            case 'file.tags':
                return this.evaluateHasTag(value, note);

            case 'file.name':
                return this.evaluatePropertyValue(note.title, value, 'string');

            case 'file.path':
                return this.evaluatePropertyValue(note.relativePath, value, 'string');

            case 'file.size':
                return this.evaluatePropertyValue(this.getFileSize(note), value, 'number');

            case 'file.mtime':
                return this.evaluatePropertyValue(this.getFileMtime(note), value, 'date');

            case 'file.ctime':
                return this.evaluatePropertyValue(this.getFileCtime(note), value, 'date');

            case 'file.inFolder':
                const folder = typeof value === 'string' ? value : '';
                return note.folderPath === folder || note.folderPath.startsWith(folder + '/');

            case 'file.starred':
                return this.evaluatePropertyValue(this.isFileStarred(note), value, 'boolean');

            default:
                // Handle custom properties from frontmatter
                if (property.startsWith('frontmatter.')) {
                    const propName = property.substring('frontmatter.'.length);
                    return this.evaluateCustomProperty(note.frontMatter[propName], value);
                }
                // Direct property access
                return this.evaluateCustomProperty(note.frontMatter[property], value);
        }
    }

    /**
     * Evaluate property value with enhanced comparison support
     */
    private evaluatePropertyValue(noteValue: any, filterValue: any, type: string): boolean {
        if (noteValue === null || noteValue === undefined) {
            return filterValue === null || filterValue === undefined;
        }

        // Handle simple equality
        if (typeof filterValue === 'string' || typeof filterValue === 'number' || typeof filterValue === 'boolean') {
            return noteValue === filterValue;
        }

        // Handle complex filter objects
        if (typeof filterValue === 'object' && filterValue !== null) {
            return this.evaluateComplexFilter(noteValue, filterValue, type);
        }

        return false;
    }

    /**
     * Evaluate complex filter objects (contains, startsWith, etc.)
     */
    private evaluateComplexFilter(noteValue: any, filterObject: any, type: string): boolean {
        switch (type) {
            case 'string':
                return this.evaluateStringFilterObject(noteValue, filterObject);
            case 'number':
                return this.evaluateNumberFilter(noteValue, filterObject);
            case 'date':
                return this.evaluateDateFilter(noteValue, filterObject);
            case 'boolean':
                return this.evaluateBooleanFilter(noteValue, filterObject);
            default:
                return false;
        }
    }

    /**
     * Evaluate string filters (contains, startsWith, etc.)
     */
    private evaluateStringFilterObject(noteValue: string, filterObject: any): boolean {
        const lowerNote = noteValue.toLowerCase();

        for (const [operator, value] of Object.entries(filterObject)) {
            const filterValue = String(value).toLowerCase();
            switch (operator) {
                case 'contains':
                    if (!lowerNote.includes(filterValue)) return false;
                    break;
                case 'startsWith':
                    if (!lowerNote.startsWith(filterValue)) return false;
                    break;
                case 'endsWith':
                    if (!lowerNote.endsWith(filterValue)) return false;
                    break;
                case 'matches':
                    try {
                        const regex = new RegExp(String(value), 'i');
                        if (!regex.test(noteValue)) return false;
                    } catch {
                        return false;
                    }
                    break;
                case '=':
                    if (noteValue !== String(value)) return false;
                    break;
                case '!=':
                    if (noteValue === String(value)) return false;
                    break;
            }
        }
        return true;
    }

    /**
     * Evaluate number filters (>, <, etc.)
     */
    private evaluateNumberFilter(noteValue: number, filterObject: any): boolean {
        for (const [operator, value] of Object.entries(filterObject)) {
            const filterValue = Number(value);
            if (isNaN(filterValue)) continue;

            switch (operator) {
                case '=':
                    if (noteValue !== filterValue) return false;
                    break;
                case '!=':
                    if (noteValue === filterValue) return false;
                    break;
                case '>':
                    if (noteValue <= filterValue) return false;
                    break;
                case '>=':
                    if (noteValue < filterValue) return false;
                    break;
                case '<':
                    if (noteValue >= filterValue) return false;
                    break;
                case '<=':
                    if (noteValue > filterValue) return false;
                    break;
            }
        }
        return true;
    }

    /**
     * Evaluate date filters
     */
    private evaluateDateFilter(noteDate: Date, filterObject: any): boolean {
        for (const [operator, value] of Object.entries(filterObject)) {
            const filterDate = new Date(String(value));
            if (isNaN(filterDate.getTime())) continue;

            switch (operator) {
                case 'before':
                    if (noteDate >= filterDate) return false;
                    break;
                case 'after':
                    if (noteDate <= filterDate) return false;
                    break;
                case 'on':
                    if (!this.isSameDay(noteDate, filterDate)) return false;
                    break;
                case '=':
                    if (!this.isSameDay(noteDate, filterDate)) return false;
                    break;
                case '!=':
                    if (this.isSameDay(noteDate, filterDate)) return false;
                    break;
                case '>':
                    if (noteDate <= filterDate) return false;
                    break;
                case '>=':
                    if (noteDate < filterDate) return false;
                    break;
                case '<':
                    if (noteDate >= filterDate) return false;
                    break;
                case '<=':
                    if (noteDate > filterDate) return false;
                    break;
            }
        }
        return true;
    }

    /**
     * Evaluate boolean filters
     */
    private evaluateBooleanFilter(noteValue: boolean, filterObject: any): boolean {
        for (const [operator, value] of Object.entries(filterObject)) {
            const filterValue = Boolean(value);
            switch (operator) {
                case '=':
                    if (noteValue !== filterValue) return false;
                    break;
                case '!=':
                    if (noteValue === filterValue) return false;
                    break;
            }
        }
        return true;
    }

    /**
     * Evaluate hasTag filter
     */
    private evaluateHasTag(value: string | string[], note: Note): boolean {
        const tags = note.frontMatter.tags || [];
        const noteTags = Array.isArray(tags) ? tags : [tags];

        if (Array.isArray(value)) {
            return value.some(tag => noteTags.includes(tag));
        } else {
            return noteTags.includes(value);
        }
    }

    /**
     * Evaluate string property (name, path)
     */
    private evaluateStringProperty(noteValue: string, filterValue: any): boolean {
        if (typeof filterValue === 'string') {
            return noteValue === filterValue;
        }

        if (typeof filterValue === 'object') {
            if (filterValue.contains) {
                return noteValue.toLowerCase().includes(filterValue.contains.toLowerCase());
            }
            if (filterValue.startsWith) {
                return noteValue.toLowerCase().startsWith(filterValue.startsWith.toLowerCase());
            }
            if (filterValue.endsWith) {
                return noteValue.toLowerCase().endsWith(filterValue.endsWith.toLowerCase());
            }
        }

        return false;
    }

    /**
     * Evaluate date property
     */
    private evaluateDateProperty(noteDate: Date | null, filterValue: any): boolean {
        if (!noteDate) return false;

        if (typeof filterValue === 'string') {
            const filterDate = new Date(filterValue);
            return noteDate.getTime() === filterDate.getTime();
        }

        if (typeof filterValue === 'object') {
            if (filterValue.before) {
                const beforeDate = new Date(filterValue.before);
                return noteDate < beforeDate;
            }
            if (filterValue.after) {
                const afterDate = new Date(filterValue.after);
                return noteDate > afterDate;
            }
        }

        return false;
    }

    /**
     * Evaluate custom property
     */
    private evaluateCustomProperty(noteValue: any, filterValue: any): boolean {
        if (noteValue === undefined || noteValue === null) {
            return false;
        }

        // Simple equality check for now
        return noteValue === filterValue;
    }

    /**
     * Get file modification time
     */
    private getFileMtime(note: Note): Date | null {
        try {
            const fs = require('fs');
            const stats = fs.statSync(note.path);
            return stats.mtime;
        } catch {
            return null;
        }
    }

    /**
     * Get file creation time
     */
    private getFileCtime(note: Note): Date | null {
        try {
            const fs = require('fs');
            const stats = fs.statSync(note.path);
            return stats.ctime;
        } catch {
            return null;
        }
    }

    /**
     * Sort notes based on view configuration
     */
    sortNotes(notes: Note[], view: any): Note[] {
        if (!view.sort || !Array.isArray(view.sort)) {
            return notes;
        }

        return notes.sort((a, b) => {
            for (const sortRule of view.sort) {
                const comparison = this.compareNotes(a, b, sortRule.property);
                if (comparison !== 0) {
                    return sortRule.direction === 'DESC' ? -comparison : comparison;
                }
            }
            return 0;
        });
    }

    /**
     * Compare two notes by a property
     */
    private compareNotes(a: Note, b: Note, property: string): number {
        let valueA: any, valueB: any;

        switch (property) {
            case 'file.name':
                valueA = a.title;
                valueB = b.title;
                break;
            case 'file.path':
                valueA = a.relativePath;
                valueB = b.relativePath;
                break;
            case 'file.mtime':
                valueA = this.getFileMtime(a);
                valueB = this.getFileMtime(b);
                break;
            case 'file.ctime':
                valueA = this.getFileCtime(a);
                valueB = this.getFileCtime(b);
                break;
            case 'file.tags':
                valueA = (a.frontMatter.tags || []).join(',');
                valueB = (b.frontMatter.tags || []).join(',');
                break;
            default:
                valueA = a.frontMatter[property];
                valueB = b.frontMatter[property];
        }

        // Handle different data types
        if (valueA instanceof Date && valueB instanceof Date) {
            return valueA.getTime() - valueB.getTime();
        }

        if (typeof valueA === 'number' && typeof valueB === 'number') {
            return valueA - valueB;
        }

        // Default to string comparison
        const strA = String(valueA || '');
        const strB = String(valueB || '');
        return strA.localeCompare(strB);
    }

    /**
     * Generate a unique ID for a base based on its file path
     */
    private generateBaseId(filePath: string): string {
        const relativePath = path.parse(filePath);
        const folderName = path.basename(relativePath.dir);
        const fileName = relativePath.name;

        // For base files, use only the filename (without the "bases" folder)
        // This ensures base IDs are simple like "projects", "advanced-projects"
        return fileName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    }

    /**
     * Get file size in bytes
     */
    private getFileSize(note: Note): number | null {
        try {
            const fs = require('fs');
            const stats = fs.statSync(note.path);
            return stats.size;
        } catch {
            return null;
        }
    }

    /**
     * Check if file is starred (placeholder implementation)
     */
    private isFileStarred(note: Note): boolean {
        // In a full implementation, this would check against Obsidian's starred files
        // For now, check if there's a starred property in frontmatter
        return note.frontMatter.starred === true || note.frontMatter.pinned === true;
    }
}
